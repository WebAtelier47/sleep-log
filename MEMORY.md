# Mémoire de reprise - Sleep Log PWA

Dernière mise à jour: 2026-03-01

## Contexte

- Projet: PWA de suivi du sommeil, offline-first, 100% frontend.
- Stack: HTML/CSS/JS vanilla (ES modules), IndexedDB, Service Worker.
- Repo local: `D:\Projets-Codex\Sleep-Log`
- Repo GitHub: `https://github.com/WebAtelier47/sleep-log`
- Branche active: `main`
- Dernier commit: `ba9b0a1 Fix empty action column and harden PWA cache updates`

## État actuel

- Déploiement GitHub Pages opérationnel sur push `main` via `.github/workflows/deploy-pages.yml`.
- URL publique: `https://webatelier47.github.io/sleep-log/`
- Exécutions Pages récentes: runs #2 à #6 en succès (run #1 en échec initial corrigé).

Fonctionnalités principales en place:

- App PWA avec vues `Matin`, `Dashboard`, `Réglages`.
- Stockage IndexedDB (`sleep_log_db`, stores `entries` + `settings`).
- Export/import JSON.
- Installation PWA améliorée:
  - bouton d’installation Android (via `beforeinstallprompt`)
  - message guide iOS (Ajout à l’écran d’accueil)
- Dashboard:
  - actions `Modifier` / `Supprimer` par ligne
  - affichage de toutes les entrées enregistrées
- Dates affichées utilisateur au format `JJ-MM-AAAA` (ex: `01-03-2026`).

## Correctifs récents importants

- `9b13d22`: workflow Pages initial.
- `fd40ddf`: activation auto Pages (`configure-pages` avec `enablement: true`).
- `5e80d8d`: flux d’installation PWA mobile.
- `fc5efd0`: édition/suppression des entrées dashboard + date `JJ-MM-AAAA`.
- `e19d7f1`: généralisation du format date dans l’UI et export.
- `ba9b0a1`: correction colonne Actions vide + robustesse mise à jour cache SW.

## Points techniques

- Le stockage interne des dates reste en `YYYY-MM-DD` (clé IndexedDB),
  l’affichage utilisateur est converti en `JJ-MM-AAAA`.
- Service Worker versionné (`sleep-log-cache-v2`) avec activation accélérée
  (`SKIP_WAITING`) et rafraîchissement contrôlé côté client.

## Commandes utiles

Validation locale:

```bash
npm run check
```

Serveur local:

```bash
npx serve public -s -l 5173
```

Suivi Git:

```bash
git status --short --branch
git log --oneline -n 10
```

## Fichiers clés

- `.github/workflows/deploy-pages.yml`
- `public/index.html`
- `public/app.js`
- `public/db.js`
- `public/sw.js`
- `public/manifest.webmanifest`
- `public/styles.css`
- `README.md`

## Prochaine action prioritaire

- Faire un passage QA mobile (Android + iOS) sur:
  - installation PWA
  - bouton `Modifier` / `Supprimer` dashboard
  - cohérence du format date `JJ-MM-AAAA`
