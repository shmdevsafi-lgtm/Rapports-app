# Architecture Offline-First - SHM Rapports

## Vue d'ensemble

L'application fonctionne en **deux couches**:

```
┌─────────────────────────────────────────────────┐
│         Interface Utilisateur (React)            │
│  Création rapports/séances, consultation, PDF   │
└──────────────────┬──────────────────────────────┘
                   │
        ┌──────────▼──────────┐
        │  Services Métier    │
        │ (Business Logic)    │
        └──────────┬──────────┘
                   │
    ┌──────────────┴──────────────┐
    │                             │
┌───▼────────────────┐  ┌────────▼──────────┐
│  Stockage Local    │  │  Sync Manager     │
│   (IndexedDB)      │  │ (Auto, Retry)     │
└──────────┬─────────┘  └────────┬──────────┘
           │                     │
           │    ┌────────────────┘
           │    │
           └───▶│ Supabase (Backend)
                │
           ┌───▶│ (seulement online)
           │    │
       ┌───┴────────────────┐
       │  Persistance       │
       │  (Authentification)│
       └───────────────────┘
```

---

## 1️⃣ Couche 1: Stockage Local (IndexedDB)

**Fichier**: `client/lib/storage/offlineStorage.ts`

### Responsabilité
- Gérer la base de données locale sur l'appareil
- Persister les rapports et séances
- Tracker l'état de synchronisation

### Structure de données - Rapports

```typescript
{
  id: "1724169600000-abc123",        // Clé primaire (IndexedDB)
  localId: "report-2026-08-21-1",    // Identifiant stable (UNIQUE!)
  title: "Mon rapport",
  content: "Description...",
  date: "2026-08-21T10:30:00Z",
  pdfBase64: "data:application/pdf;base64,...",  // PDF généré localement
  syncStatus: "pending",              // pending | synced | failed
  createdAt: "2026-08-21T10:30:00Z",
  updatedAt: "2026-08-21T10:30:00Z",
  supabaseId: undefined,              // Rempli après sync
  lastSyncAttempt: undefined,
  errorMessage: undefined
}
```

### Structure de données - Séances

```typescript
{
  id: "1724169600001-def456",
  localId: "session-2026-08-21-1",
  title: "Séance de scout",
  description: "Activités...",
  date: "2026-08-21T14:00:00Z",
  participants: ["Alice", "Bob", "Charlie"],
  syncStatus: "pending",
  createdAt: "2026-08-21T14:00:00Z",
  updatedAt: "2026-08-21T14:00:00Z",
  supabaseId: undefined,
  lastSyncAttempt: undefined,
  errorMessage: undefined
}
```

### API du service

```typescript
// Rapports
await offlineStorage.saveReport(data);        // Créer
await offlineStorage.getReport(id);           // Lire
await offlineStorage.getAllReports();         // Lister tous
await offlineStorage.getPendingReports();     // Lister non-syncés
await offlineStorage.updateReportSyncStatus(id, status, supabaseId);
await offlineStorage.deleteReport(id);

// Séances
await offlineStorage.saveSession(data);       // Créer
await offlineStorage.getSession(id);          // Lire
await offlineStorage.getAllSessions();        // Lister tous
await offlineStorage.getPendingSessions();    // Lister non-syncés
await offlineStorage.updateSessionSyncStatus(id, status, supabaseId);
await offlineStorage.deleteSession(id);

// Utilitaires
offlineStorage.isOnline();                    // Est online?
offlineStorage.onlineListener(callback);      // Écouter online/offline
```

### Indexes IndexedDB

```
reports:
  - id (keyPath)
  - localId (unique) ← IMPORTANT pour idempotence
  - syncStatus
  - createdAt

sessions:
  - id (keyPath)
  - localId (unique) ← IMPORTANT pour idempotence
  - syncStatus
  - createdAt
```

---

## 2️⃣ Couche 2: Gestionnaire de Synchronisation

**Fichier**: `client/lib/sync/syncManager.ts`

### Responsabilité
- Détecter le retour d'Internet
- Envoyer les données locales vers Supabase
- Garantir l'idempotence (pas de doublons)
- Retry automatique en cas d'erreur

### Workflow

```
Utilisateur crée un rapport OFFLINE
     ↓
offlineStorage.saveReport()
  - stocké dans IndexedDB avec status: "pending"
  - localId généré et UNIQUE
     ↓
Utilisateur ajoute du contenu, génère PDF
     ↓
Connexion Internet revient
     ↓
syncManager.syncAll()
  - récupère tous les rapports pending
  - pour chaque rapport:
     ├─ vérifier si supabaseId existe
     ├─ non? chercher via local_id dans Supabase
     │  ├─ existe? le mettre à jour + marquer synced
     │  └─ existe pas? l'insérer + récupérer supabaseId
     └─ oui? mettre à jour le record
     ↓
Status: "synced" + supabaseId sauvegardé
     ↓
✅ Rapport visible dans Supabase
```

### Idempotence (Pas de doublons)

Le secret: chaque rapport/séance a un `local_id` **unique et stable**.

```typescript
// Avant: sans local_id
// Retry 1: insert → supabaseId: 1
// Retry 2: insert → supabaseId: 2 ❌ DOUBLON!

// Après: avec local_id
// Retry 1: check local_id → pas existe → insert → supabaseId: 1
// Retry 2: check local_id → existe → update (idempotent) → supabaseId: 1 ✅
```

### Cycle de sync

1. **Au démarrage**: Sync des pending si online
2. **Au retour online**: Sync automatique (event window.online)
3. **Périodique**: Toutes les 30 secondes si online
4. **Manuel**: `syncManager.syncAll()` appelé manuellement

### Gestion des erreurs

```
Erreur lors du sync
    ↓
Conserver le rapport dans "pending"
    ↓
Attendre 30 secondes ou retour de connexion
    ↓
Retry automatique
    ↓
Après 5 tentatives: status "failed" + errorMessage sauvegardé
    ↓
Utilisateur peut voir l'erreur et réessayer manuellement
```

### API du service

```typescript
await syncManager.init();           // Initialiser
await syncManager.syncAll();        // Forcer sync maintenant
syncManager.getStatus();            // {isSyncing, isOnline}
await syncManager.destroy();        // Arrêter
```

---

## 3️⃣ Intégration dans React

### Dans App.tsx

```typescript
import { useEffect } from 'react';
import { offlineStorage } from '@/lib/storage/offlineStorage';
import { syncManager } from '@/lib/sync/syncManager';

function App() {
  useEffect(() => {
    // Initialiser au démarrage
    const init = async () => {
      await offlineStorage.init();
      await syncManager.init();
    };
    
    init();

    // Cleanup
    return () => {
      syncManager.destroy();
    };
  }, []);

  return (
    // ... ton app
  );
}
```

### Dans un composant (créer un rapport)

```typescript
import { offlineStorage } from '@/lib/storage/offlineStorage';

function AddReport() {
  const handleSubmit = async (formData) => {
    try {
      // Générer PDF
      const pdfBase64 = await generatePDF(formData);

      // Sauvegarder offline
      const report = await offlineStorage.saveReport({
        localId: `report-${Date.now()}`,  // Unique!
        title: formData.title,
        content: formData.content,
        date: new Date().toISOString(),
        pdfBase64: pdfBase64,
        syncStatus: 'pending'
      });

      // Sync automatique si online
      // (syncManager fait ça en background)

      toast.success('✅ Rapport créé (hors ligne)');
    } catch (error) {
      toast.error('❌ Erreur: ' + error.message);
    }
  };

  return (
    // ... form
  );
}
```

### Dans un composant (lister les rapports)

```typescript
function ReportsList() {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    const loadReports = async () => {
      const allReports = await offlineStorage.getAllReports();
      setReports(allReports);
    };

    loadReports();

    // Écouter les changements de connexion
    return offlineStorage.onlineListener((online) => {
      console.log(`Status: ${online ? 'ONLINE' : 'OFFLINE'}`);
      loadReports(); // Reload après sync
    });
  }, []);

  return (
    <div>
      {reports.map(report => (
        <div key={report.id}>
          <h3>{report.title}</h3>
          <p>Status: {report.syncStatus}</p>
          {report.syncStatus === 'failed' && (
            <p style={{ color: 'red' }}>{report.errorMessage}</p>
          )}
        </div>
      ))}
    </div>
  );
}
```

---

## 4️⃣ Côté Supabase (Backend)

### Tables requises

```sql
-- Rapports
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  local_id TEXT NOT NULL UNIQUE,  -- ← CRUCIAL pour idempotence
  title TEXT NOT NULL,
  content TEXT,
  date TIMESTAMP,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Séances
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  local_id TEXT NOT NULL UNIQUE,  -- ← CRUCIAL pour idempotence
  title TEXT NOT NULL,
  description TEXT,
  date TIMESTAMP,
  participants TEXT[],
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX idx_reports_local_id ON reports(local_id);
CREATE INDEX idx_reports_sync_status ON reports(status);
CREATE INDEX idx_sessions_local_id ON sessions(local_id);
CREATE INDEX idx_sessions_sync_status ON sessions(status);
```

### Payload Supabase

**Lors de l'insert/update**:

```typescript
{
  local_id: "report-2026-08-21-1",  // STABLE et UNIQUE
  title: "Mon rapport",
  content: "Description...",
  date: "2026-08-21T10:30:00Z",
  status: "pending",
  created_at: "2026-08-21T10:30:00Z"
}
```

**Important**:
- Les noms des champs doivent matcher EXACTEMENT les colonnes Supabase
- `local_id` doit être unique (unique constraint)
- `created_at` doit être ISO 8601
- Pas d'ajout de champs supplémentaires

---

## 5️⃣ Flux complet (Exemple)

### Scénario: Rapport créé OFFLINE + SYNC

```
Lundi 10:00 - OFFLINE (pas d'Internet)
├─ Utilisateur crée un rapport
├─ offlineStorage.saveReport()
│  └─ IndexedDB: {id: "123", localId: "R1", status: "pending"}
├─ Utilisateur génère le PDF
├─ PDF stocké en Base64 dans IndexedDB
└─ Utilisateur voit "✓ Rapport créé (hors ligne)"

Lundi 14:30 - ONLINE (Internet revient)
├─ window.online event déclenché
├─ syncManager.syncAll()
├─ Récupère tous les "pending": [R1]
├─ Pour R1:
│  ├─ Check supabaseId (undefined)
│  ├─ Cherche via local_id dans Supabase (pas d'existe)
│  ├─ Crée dans Supabase + retour supabaseId = UUID
│  └─ offlineStorage.updateReportSyncStatus("synced", UUID)
├─ IndexedDB: {id: "123", localId: "R1", status: "synced", supabaseId: UUID}
└─ ✅ Rapport visible dans Supabase

Lundi 14:30 (retry après erreur)
├─ Sync échoue (connection perdue)
├─ syncManager: {status: "failed", errorMessage: "Network error"}
├─ IndexedDB: {status: "failed", errorMessage: "..."}
├─ Retry automatique dans 3 secondes
├─ Succès → status: "synced"
└─ ✅ Rapport sync

Si utilisateur crée 2 fois le même rapport:
├─ Rapport 1: localId = "R1" → sync ok
├─ Rapport 2: localId = "R2" → sync ok
├─ 2 rapports dans Supabase (localId différents)
└─ ✅ Pas de doublon
```

---

## 6️⃣ Gestion des erreurs

### Erreurs courantes

| Erreur | Cause | Solution |
|--------|-------|----------|
| Network error | Internet coupé | Retry auto au retour connexion |
| 401 Unauthorized | Supabase key invalide | Vérifier `.env` |
| Duplicate key | localId existe | Impossible avec idempotence |
| Connection timeout | Réseau lent | Retry avec délai exponentiel |

### Logging

Logs console utiles:

```typescript
// Succès
✓ Report saved locally: R1
✓ Report already synced: UUID
✅ Report synced: UUID

// Erreurs
❌ Report sync failed: Network error
⏸️  Offline, skipping report sync: R1
```

---

## 7️⃣ Performance

### Optimisations

1. **IndexedDB**: Accès local ultra-rapide (< 10ms)
2. **Sync async**: Ne bloque pas l'UI
3. **Batch sync**: Envoie tous les pending en une call
4. **Retry exponentiel**: 3s → 6s → 12s → 24s → 48s
5. **Compression PDF**: Avant upload si possible

### Limites

- IndexedDB: ~50MB par domaine (navigateur)
- Sync: 1 batch ~2-5 secondes
- PDF Base64: ~500KB par rapport
- Supabase: Limit RLS policies

---

## 8️⃣ Schéma Capacitor

```
┌──────────────┐
│ Capacitor    │
├──────────────┤
│ WebView      │ ← React App
│ (offline-ok) │
├──────────────┤
│ Bridge       │ ← Communication
├──────────────┤
│ Android API  │
│ (Plugins)    │
└──────────────┘
```

### Plugins utilisés

- **Filesystem**: Lecture/écriture fichiers
- **Network**: Vérifier connexion
- **Storage**: Préférences simples
- (IndexedDB + localStorage): Côté Web)

---

## 🧪 Testing

### Tester l'offline-first

1. **Ouvrir DevTools** (F12)
2. **Onglet Network** → Throttling
3. **Onglet Application** → Storage → IndexedDB (voir les données)
4. Créer un rapport
5. Éteindre Internet (Airplane mode)
6. Fermer et réouvrir l'app
7. Vérifier que le rapport existe toujours
8. Remettre Internet
9. Vérifier la sync dans Supabase

### Vérifier les logs

```
Browser Console (F12):
✓ IndexedDB initialized
✓ SyncManager initialized
✓ Report saved locally: R1
📡 Network status: ONLINE
🔄 Starting full sync...
📤 Syncing report: R1
✅ Report synced: UUID
```

---

## 📚 Ressources

- [IndexedDB MDN](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Capacitor Docs](https://capacitorjs.com/docs)
- [Service Workers & Offline](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

---

**Questions?** Vois les issues GitHub ou contacte adnane@shm.ma
