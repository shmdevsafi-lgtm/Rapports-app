# 📱 SHM Rapports - Application Android Offline-First

> **Application de gestion de rapports et séances pour le Scoutisme Hassania Marocain**  
> Fonctionne **sans connexion Internet** + synchronisation automatique vers Supabase

## ✨ Fonctionnalités

✅ **Offline-First complet**
- Créer des rapports hors connexion
- Créer des séances hors connexion  
- Générer des PDF localement
- Tout est stocké dans la base de données locale

✅ **Synchronisation automatique**
- Détecte le retour d'Internet
- Envoie automatiquement les données pendantes
- Pas de doublons (identifiants stables)
- Retry automatique en cas d'erreur

✅ **Sécurité**
- Pas de perte de données
- Gestion des conflits
- Authentification intégrée
- Aucune donnée sensible dans les logs

✅ **Performance**
- Interface rapide et réactive
- Stockage local via IndexedDB
- Sync en arrière-plan
- Optimisé pour faible bande passante

---

## 🚀 Démarrage rapide

### 1️⃣ Cloner le repo

```bash
git clone https://github.com/USERNAME/SHM-Rapports-Offline.git
cd SHM-Rapports-Offline
```

### 2️⃣ Installer les dépendances

```bash
pnpm install
```

### 3️⃣ Configuration

```bash
cp .env.example .env
```

Puis remplis le fichier `.env` avec tes clés Supabase.

### 4️⃣ Démarrer en développement

```bash
pnpm dev
```

Ouvre http://localhost:5173 dans ton navigateur.

### 5️⃣ Builder pour Android

```bash
pnpm run build:client
pnpm add -D @capacitor/core @capacitor/cli @capacitor/android
npx cap add android
npx cap sync
```

---

## 📖 Documentation complète

👉 **[SETUP.md](./SETUP.md)** - Instructions détaillées étape par étape

---

## 🏗️ Architecture

```
UI (React Components)
        ↓
Business Services
        ↓
Repository (Offline Storage - IndexedDB)
        ↓
Sync Manager (Supabase)
        ↓
Backend API / Supabase
```

### Composants clés

| Fichier | Rôle |
|---------|------|
| `client/lib/storage/offlineStorage.ts` | Stockage local IndexedDB |
| `client/lib/sync/syncManager.ts` | Synchronisation automatique |
| `client/pages/AddReport.tsx` | Interface création rapports |
| `client/pages/AddSession.tsx` | Interface création séances |
| `.github/workflows/build-apk.yml` | Build automatique GitHub Actions |

---

## 🧪 Tests

La solution inclut les tests requis:

- **TEST A** - ONLINE: Connexion → rapport → PDF → sync ✅
- **TEST B** - OFFLINE: Créer hors internet, réouvrir, vérifier ✅
- **TEST C** - RETOUR INTERNET: Auto-sync, pas de doublons ✅
- **TEST D** - OFFLINE SÉANCE: Créer, fermer, reouvrir, sync ✅
- **TEST E** - COUPURE PENDANT SYNC: Retry automatique ✅
- **TEST F** - DOUBLON: Une seule ligne distante ✅

---

## 🔄 Workflow de synchronisation

```
Créer un rapport OFFLINE
    ↓
Stocker dans IndexedDB (status: pending)
    ↓
Générer PDF localement
    ↓
Internet détecté?
    ↓ OUI
Envoyer vers Supabase
    ↓
Supabase répond OK?
    ↓ OUI
Marquer comme synced ✅
    ↓ NON
Garder dans pending, retry plus tard
```

---

## 📱 Installation sur Android

### Via APK

1. Télécharge l'APK depuis **GitHub Actions**
2. Mets-le sur ton téléphone Android
3. Va dans **Paramètres → Sécurité → Sources inconnues** (Autorise)
4. Ouvre le fichier `.apk` et clique **Installer**
5. C'est bon! 🎉

### Via GitHub Actions (Automatique)

1. Pousse du code sur `main`
2. Va sur **Actions** dans ton repo GitHub
3. Attends que le build se termine (~15 min)
4. Télécharge l'APK depuis **Artifacts**

---

## 🛠️ Troubleshooting

### "npm: command not found"
→ Réinstalle Node.js depuis https://nodejs.org/

### "pnpm: command not found"
→ `npm install -g pnpm`

### "Git: command not found"
→ Télécharge depuis https://git-scm.com/download

### Le build échoue
→ Vérifie que tu as rempli le fichier `.env` correctement
→ Attends 30 secondes et réessaie

### Données ne se sync pas
→ Vérify la connexion Internet
→ Vérif les logs: `pnpm dev` et ouvre la Console (F12)
→ Vérify les variables d'environnement

---

## 📋 Variables d'environnement

| Variable | Obligatoire | Exemple |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | ✅ | `https://project.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | ✅ | `eyJ...` |
| `VITE_API_URL` | ❌ | `http://localhost:3000` |
| `VITE_DEBUG` | ❌ | `true` |

---

## 🤝 Contribution

Les contributeurs bienvenues!

1. Fork le repo
2. Crée une branche: `git checkout -b feature/ma-feature`
3. Commit: `git commit -m "Ajoute ma feature"`
4. Push: `git push origin feature/ma-feature`
5. Crée une Pull Request

---

## 📞 Support

Besoin d'aide?

- **GitHub Issues**: https://github.com/USERNAME/SHM-Rapports-Offline/issues
- **Email**: adnane@shm.ma
- **Discord**: [Lien du serveur SHM]

---

## 📜 Licence

MIT © 2026 Scoutisme Hassania Marocain

---

## 🙏 Remerciements

- Merci à **Supabase** pour le backend
- Merci à **Capacitor** pour Android
- Merci à **React** et l'équipe de dev open-source

---

**Fait avec ❤️ par Adnane pour le SHM**
