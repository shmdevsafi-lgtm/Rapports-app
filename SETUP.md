# 📱 SHM Rapports - Application Android Offline-First

## Vue d'ensemble

Cette application permet de créer et gérer des rapports et des séances **sans connexion Internet**. 
Les données sont stockées localement, et synchronisées automatiquement vers Supabase quand la connexion revient.

---

## 🎯 ÉTAPES COMPLÈTES (Copie-colle exactement ce qu'il y a)

### ÉTAPE 1: Ouvrir le Terminal

**Sur Windows:**
- Appuie sur `Windows + R`
- Écris: `cmd` 
- Appuie sur Entrée

**Sur Mac:**
- Ouvre Applications → Utilitaires → Terminal

**Sur Linux:**
- Ouvre un terminal (Ctrl + Alt + T)

---

### ÉTAPE 2: Aller dans le dossier du projet

Copie-colle cette commande EXACTEMENT (change `USERNAME` par ton nom d'utilisateur):

```
cd C:\Users\USERNAME\Desktop\SHM-Rapports-Offline
```

Puis appuie sur **Entrée**.

**Note:** Si tu as extrait le dossier ailleurs, utilise le chemin complet jusqu'où tu l'as mis.

---

### ÉTAPE 3: Installer Node.js (si tu l'as pas)

Tu dois avoir **Node.js** d'abord.

Va ici: https://nodejs.org/

Télécharge la version **LTS** (Long Term Support - la plus grande version).

Installe-la en cliquant sur le fichier téléchargé et en disant "Oui" à tout.

Puis **redémarrage ton ordinateur**.

---

### ÉTAPE 4: Installer pnpm (le gestionnaire de paquets)

Une fois Node.js installé et l'ordinateur redémarré, copie-colle cette commande:

```
npm install -g pnpm
```

Appuie sur **Entrée** et attends que ça se termine.

---

### ÉTAPE 5: Installer les dépendances du projet

Toujours dans le terminal, copie-colle:

```
pnpm install
```

Appuie sur **Entrée** et attends. **Ça peut prendre 2-5 minutes.** C'est normal.

Tu vas voir beaucoup de texte défiler. C'est normal aussi.

**Si ça dit "Done" ou "completed" à la fin, c'est bon!**

---

### ÉTAPE 6: Créer le dossier `.env`

Le dossier `.env` contient tes secrets (connexion à Supabase, etc).

Un fichier `.env.example` est déjà dans le projet. 

Copie-colle cette commande:

```
copy .env.example .env
```

Appuie sur **Entrée**.

Maintenant ouvre le fichier `.env` avec un éditeur de texte (Bloc-notes ou VS Code).

Remplis-le avec tes infos Supabase:

```
VITE_SUPABASE_URL=https://...supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...xxx
```

Sauvegarde le fichier.

---

### ÉTAPE 7: Construire l'application Web

Copie-colle:

```
pnpm run build:client
```

Appuie sur **Entrée** et attends. **Ça va prendre 1-2 minutes.**

À la fin tu dois voir quelque chose qui dit "dist" ou "built".

---

### ÉTAPE 8: Créer un compte GitHub (si tu l'as pas)

Va ici: https://github.com

Clique sur **Sign up** (En haut à droite).

Suis les instructions. C'est gratuit.

---

### ÉTAPE 9: Créer un dépôt GitHub

Une fois connecté à GitHub, clique sur le **"+"** en haut à droite.

Sélectionne **New repository**.

Remplis:
- **Repository name:** `SHM-Rapports-Offline`
- **Description:** `Application SHM - Rapports & Séances Offline-First`
- **Public** (coché)
- Click **Create repository**

Tu vas voir une page avec des commandes.

---

### ÉTAPE 10: Pousser le code sur GitHub

Reviens à ton terminal.

**Première fois seulement**, initialise Git:

```
git config --global user.name "Ton Nom"
```

```
git config --global user.email "tonEmail@gmail.com"
```

Puis copie-colle (remplace `USERNAME` par ton nom d'utilisateur GitHub):

```
git init
```

```
git add .
```

```
git commit -m "Initial commit: SHM Offline-First"
```

```
git branch -M main
```

```
git remote add origin https://github.com/USERNAME/SHM-Rapports-Offline.git
```

```
git push -u origin main
```

Le terminal va te demander ton nom d'utilisateur et mot de passe GitHub.

Saisis-les et appuie sur **Entrée**.

**Si tu vois "Done", c'est bon!** Ton code est maintenant sur GitHub. ✅

---

### ÉTAPE 11: Activer GitHub Actions pour les builds

1. Va sur ton dépôt GitHub: `https://github.com/USERNAME/SHM-Rapports-Offline`
2. Clique sur **Actions** (en haut)
3. Clique sur **I understand my workflows, go ahead and enable them**

Maintenant, GitHub va automatiquement compiler l'APK à chaque fois que tu pousses du code.

---

### ÉTAPE 12: Générer l'APK

Il y a 2 options:

#### **Option A: Via GitHub Actions (Recommandé - zéro travail sur ton ordi)**

1. Va sur ton dépôt GitHub
2. Clique sur **Actions**
3. Attends que le build se fasse (ça prend ~10-15 minutes)
4. Une fois terminé, clique sur le build vert ✅
5. Scroll vers le bas jusqu'à **Artifacts**
6. Télécharge `app-debug.apk`

C'est ton application Android finale!

#### **Option B: Localement (si tu veux le faire sur ton ordi)**

```
pnpm add -D @capacitor/core @capacitor/cli @capacitor/android
```

```
npx cap add android
```

```
npx cap sync
```

Puis tu vas devoir installer Android Studio et gradle, mais c'est lourd pour un ordi "rouillé". Je recommande l'Option A.

---

### ÉTAPE 13: Installer l'APK sur ton téléphone Android

1. Télécharge `app-debug.apk` (depuis GitHub Actions ou localement)
2. Mets le fichier sur ton téléphone (via USB ou email)
3. Sur ton téléphone, va dans **Paramètres → Sécurité**
4. Autorise **Sources inconnues**
5. Ouvre le fichier `.apk` et clique **Installer**
6. C'est prêt! 🎉

---

## 🔧 Commandes utiles après setup

```bash
# Démarrer le dev (site web)
pnpm dev

# Compiler pour le web
pnpm build:client

# Construire pour Android
pnpm add -D @capacitor/core @capacitor/cli @capacitor/android
npx cap add android
npx cap sync

# Voir les logs en direct
npx cap run android
```

---

## ❌ Si quelque chose ne marche pas

1. **"npm command not found"** → Réinstalle Node.js et redémarre ton ordi
2. **"pnpm not found"** → Réexécute: `npm install -g pnpm`
3. **"Git command not found"** → Télécharge Git ici: https://git-scm.com/download
4. **Build échoue** → Attends 30 secondes et réessaie, ou crée une issue sur GitHub

---

## 📚 Structure du projet

```
SHM-Rapports-Offline/
├── client/               # Application React (interface)
│   ├── pages/           # Pages (Rapports, Séances, etc)
│   ├── lib/
│   │   ├── storage/     # Stockage offline (IndexedDB)
│   │   ├── sync/        # Synchronisation automatique
│   │   └── supabase.ts  # Configuration Supabase
│   └── components/      # Composants UI
├── server/              # Backend Express
├── android/             # Code Android (généré)
├── .github/workflows/   # GitHub Actions (build automatique)
├── capacitor.config.ts  # Configuration Capacitor
└── package.json         # Dépendances du projet
```

---

## 🚀 Prochaines étapes

1. **Tester sur le web** : `pnpm dev`
2. **Créer des rapports offline**
3. **Vérifier la sync** dans Supabase
4. **Compiler en APK** via GitHub Actions
5. **Installer sur Android**

Voilà! Besoin d'aide, contacte-moi. 💪
