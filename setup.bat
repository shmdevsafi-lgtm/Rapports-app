@echo off
REM Script d'installation automatique pour Windows

echo.
echo ========================================
echo  SHM Rapports - Setup Automatique
echo ========================================
echo.

REM Vérifie si Node.js est installé
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js n'est pas installé!
    echo Télécharge-le ici: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo ✅ Node.js trouvé
node --version

REM Vérifie si Git est installé
where git >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️  Git n'est pas installé
    echo Télécharge-le ici: https://git-scm.com/download/win
    echo.
    pause
)

echo.
echo 📦 Installation de pnpm...
call npm install -g pnpm
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Erreur lors de l'installation de pnpm
    pause
    exit /b 1
)

echo ✅ pnpm installé
pnpm --version

echo.
echo 📦 Installation des dépendances du projet...
call pnpm install
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Erreur lors de l'installation des dépendances
    pause
    exit /b 1
)

echo ✅ Dépendances installées

echo.
echo 📄 Création du fichier .env...
if not exist .env (
    copy .env.example .env
    echo ✅ Fichier .env créé
    echo.
    echo ⚠️  IMPORTANT: Ouvre le fichier .env et remplis tes infos Supabase!
) else (
    echo ✅ Fichier .env existe déjà
)

echo.
echo 🎉 Setup terminé!
echo.
echo Prochaines étapes:
echo 1. Ouvre le fichier .env avec un éditeur
echo 2. Remplis tes clés Supabase
echo 3. Lance: pnpm dev (pour tester)
echo 4. Lance: pnpm run build:client (pour compiler)
echo.
pause
