# Changelog - SHM Offline-First

## v1.0.0 - Offline-First Release (2026-08-21)

### ✨ Fonctionnalités ajoutées

#### Stockage Offline
- ✅ Service `offlineStorage.ts` - Gestion IndexedDB complète
  - Stockage des rapports avec métadonnées
  - Stockage des séances avec métadonnées
  - Suivi du statut de synchronisation (pending/synced/failed)
  - Identifiants stables (`localId`) pour idempotence
  - Timestamps précis (createdAt, updatedAt, lastSyncAttempt)

#### Synchronisation Automatique
- ✅ Service `syncManager.ts` - Sync robuste
  - Détection automatique du retour d'Internet (window.online/offline)
  - Sync au démarrage de l'app
  - Sync périodique (toutes les 30 secondes si online)
  - Retry automatique en cas d'erreur
  - Idempotence via `local_id` (pas de doublons)
  - Gestion correcte des payloads Supabase

#### Capacitor & Android
- ✅ Configuration `capacitor.config.ts` complète
- ✅ Structure Android prêt pour build
- ✅ Permissions minimales configurées
- ✅ WebView optimisée pour offline

#### GitHub Actions CI/CD
- ✅ Workflow `.github/workflows/build-apk.yml`
  - Build automatique sur push vers main/develop
  - Compilation Web (Vite)
  - Setup Android SDK
  - Build APK debug
  - Upload artifacts pour téléchargement

#### Documentation
- ✅ `SETUP.md` - Instructions complètes pas à pas
- ✅ `README_FR.md` - Présentation générale en français
- ✅ `CHANGELOG.md` - Ce fichier

### 🔧 Changements techniques

#### Couche de stockage
```typescript
// Avant: localStorage simple (peu fiable)
localStorage.setItem('report', JSON.stringify(data));

// Après: IndexedDB robuste
await offlineStorage.saveReport({
  localId: 'unique-id',
  title: 'Mon rapport',
  syncStatus: 'pending',
  // ... autres champs
});
```

#### Synchronisation
```typescript
// Avant: Sync manuel, pas de retry
if (navigator.onLine) { fetch(...) }

// Après: Sync automatique, retry, idempotent
await syncManager.syncAll(); // Auto-retry, pas de doublon
```

#### Architecture API
```
Avant:
Composant React → Appel direct Supabase

Après:
Composant React → Service métier → Repository local → SyncManager → Supabase
```

### 🐛 Corrections

- ✅ Problème de payload Supabase (champs mal nommés)
  - Avant: `title`, `content` envoyés à Supabase directement
  - Après: Validation du payload + noms exacts des champs
  - Vérification: `local_id`, `created_at`, `status` correctement mappés

- ✅ Perte de données lors de coupure réseau
  - Avant: Données perdues si sync échouait
  - Après: Conservées dans IndexedDB + retry automatique

- ✅ Doublons lors de retry
  - Avant: Chaque retry créait un nouveau record
  - Après: Vérification `local_id` → une seule ligne Supabase

### 📊 Statistiques de code

| Métrique | Avant | Après |
|----------|-------|-------|
| Fichiers de storage | 0 | 1 (offlineStorage.ts) |
| Service de sync | 0 | 1 (syncManager.ts) |
| Couches d'abstraction | 1 | 3 (storage, sync, API) |
| Gestion des erreurs | Basique | Complète (retry, fallback) |
| Support offline | Non | ✅ Complet |
| Idempotence | Non | ✅ Via local_id |

### 🧪 Tests couverts

- ✅ TEST A: ONLINE - Sync normal
- ✅ TEST B: OFFLINE - Persistence des données
- ✅ TEST C: RETOUR INTERNET - Auto-sync
- ✅ TEST D: OFFLINE SÉANCE - Séances stockées
- ✅ TEST E: COUPURE PENDANT SYNC - Retry auto
- ✅ TEST F: DOUBLON - Une seule ligne distante

### 📝 Notes de migration

#### Pour les développeurs

1. **Ajouter au App.tsx:**
```typescript
import { offlineStorage } from '@/lib/storage/offlineStorage';
import { syncManager } from '@/lib/sync/syncManager';

useEffect(() => {
  offlineStorage.init();
  syncManager.init();
}, []);
```

2. **Utiliser dans les composants:**
```typescript
// Créer un rapport
const report = await offlineStorage.saveReport({
  localId: generateId(),
  title: formData.title,
  content: formData.content,
  syncStatus: 'pending',
  // ...
});

// Récupérer tous les rapports
const reports = await offlineStorage.getAllReports();

// Sync manuel (optionnel)
await syncManager.syncAll();
```

3. **Configuration Supabase:**
- Vérifie que les tables ont les colonnes: `local_id`, `created_at`, `status`
- Ajoute un index sur `local_id` pour performance
- Les noms des colonnes doivent matcher exactement

#### Pour les utilisateurs

1. Télécharge l'APK depuis GitHub Actions
2. Installe sur Android (Paramètres → Sources inconnues)
3. Crée des rapports/séances hors ligne
4. Quand Internet revient, tout se sync automatiquement

### 🚀 Prochaines améliorations

- [ ] Compression des PDF avant sync
- [ ] Support des images/pièces jointes
- [ ] Gestion multi-utilisateurs (conflits avancés)
- [ ] Encryption locale des données sensibles
- [ ] Mode de synch sélectif (wifi uniquement)
- [ ] Analytics offline
- [ ] Support dark mode

### 🔐 Sécurité

- ✅ Pas de stockage de mots de passe en clair
- ✅ Variables d'env dans `.env` (jamais en git)
- ✅ HTTPS obligatoire pour Supabase
- ✅ Validation des données avant sync
- ✅ Logs sécurisés (pas de données sensibles)

### 📞 Support

Besoin d'aide pour la migration?
- Vois SETUP.md pour les instructions pas à pas
- Crée une issue sur GitHub
- Contact: adnane@shm.ma

---

**Release créée**: 2026-08-21  
**Responsable**: Adnane (SHM)  
**Statut**: Production-ready ✅
