#!/bin/bash

echo ""
echo "========================================"
echo " SHM Rapports - Setup Automatique"
echo "========================================"
echo ""

# Vérifie si Node.js est installé
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé!"
    echo "Télécharge-le ici: https://nodejs.org/"
    echo ""
    exit 1
fi

echo "✅ Node.js trouvé"
node --version

# Vérifie si Git est installé
if ! command -v git &> /dev/null; then
    echo "⚠️  Git n'est pas installé"
    echo "Télécharge-le ici: https://git-scm.com/download/mac"
    echo ""
fi

echo ""
echo "📦 Installation de pnpm..."
npm install -g pnpm
if [ $? -ne 0 ]; then
    echo "❌ Erreur lors de l'installation de pnpm"
    exit 1
fi

echo "✅ pnpm installé"
pnpm --version

echo ""
echo "📦 Installation des dépendances du projet..."
pnpm install
if [ $? -ne 0 ]; then
    echo "❌ Erreur lors de l'installation des dépendances"
    exit 1
fi

echo "✅ Dépendances installées"

echo ""
echo "📄 Création du fichier .env..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Fichier .env créé"
    echo ""
    echo "⚠️  IMPORTANT: Ouvre le fichier .env et remplis tes infos Supabase!"
else
    echo "✅ Fichier .env existe déjà"
fi

echo ""
echo "🎉 Setup terminé!"
echo ""
echo "Prochaines étapes:"
echo "1. Ouvre le fichier .env avec un éditeur"
echo "2. Remplis tes clés Supabase"
echo "3. Lance: pnpm dev (pour tester)"
echo "4. Lance: pnpm run build:client (pour compiler)"
echo ""
