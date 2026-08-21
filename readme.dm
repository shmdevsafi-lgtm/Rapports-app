# Rapports SHM

Application de gestion des rapports de la الكشفية الحسنية المغربية.

## Développement


pnpm install
pnpm dev
```

## Vérifications

```bash
pnpm typecheck
pnpm test
pnpm build
```

## Déploiement manuel Netlify

Configuration utilisée dans `netlify.toml` :

- Build command : `pnpm build`
- Publish directory : `dist/spa`
- Functions directory : `netlify/functions`
- API : `/api/*` vers `/.netlify/functions/api`

Variables à configurer dans Netlify :

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

`SUPABASE_SERVICE_ROLE_KEY` doit rester une variable serveur et ne doit jamais être utilisée dans le code client.

## Fonctionnalités

- Authentification Supabase
- Création et consultation des rapports
- Sauvegarde des rapports dans la table `reports`
- Export PDF client-side avec `html2canvas` et `jsPDF`
- API serverless Netlify pour la persistance et la lecture des rapports
