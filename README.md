# Sleep Log PWA (100% local)

Application web offline-first pour suivre le sommeil, en Vanilla JS (ES modules), avec stockage durable dans IndexedDB.

## Démarrage local

Depuis la racine du projet :

```bash
npx serve public -s -l 5173
```

Puis ouvrir : `http://localhost:5173`

Alternative sans Node :

```bash
python -m http.server 5173 --directory public
```

## Scripts optionnels (sans framework)

Le projet inclut des scripts Node simples (pas de dépendances npm).

```bash
npm run lint   # vérifie présence des fichiers requis + syntaxe JS
npm run build  # copie public/ vers dist/
npm run check  # lint + build
```

## Installation PWA

1. Ouvrir l’app dans Chrome/Edge/Brave.
2. Cliquer sur l’icône d’installation dans la barre d’adresse.
3. Valider "Installer".
4. Ouvrir ensuite l’app depuis son icône (mode standalone).

## Export / Import

- `Réglages > Export JSON` : télécharge `sleep-log-export.json`.
- `Réglages > Import JSON` : sélectionne un fichier JSON exporté puis confirme la restauration.
- `Réglages > Tout effacer` : supprime toutes les données locales (confirmation demandée).

## Architecture

```text
/public
  index.html
  styles.css
  app.js
  db.js
  stats.js
  sw.js
  manifest.webmanifest
  /assets
    icon-192.svg
    icon-512.svg
/scripts
  lint.mjs
  build.mjs
package.json
README.md
```

- `app.js` : SPA minimale (Matin / Dashboard / Réglages), navigation, formulaires, import/export, indicateur en ligne/hors ligne, enregistrement du service worker.
- `db.js` : couche IndexedDB (`sleep_log_db`, stores `entries` et `settings`).
- `stats.js` : utilitaires temps, calculs TIB/TST, moyennes, pattern coucher.
- `sw.js` : cache-first pour assets statiques.
- `manifest.webmanifest` : métadonnées d’installation PWA.
- `scripts/lint.mjs` : vérification locale rapide.
- `scripts/build.mjs` : build statique simple vers `dist/`.

## Schéma IndexedDB

- Base : `sleep_log_db`
- Store `entries` :
  - `keyPath`: `date` (`YYYY-MM-DD`)
  - Champs : `bedtime`, `wakeFinal`, `wakeCount`, `awakeMinutes`, `energy`, `ruminations`, `note`, `updatedAt`
- Store `settings` :
  - `keyPath`: `key`
  - Clé utilisée : `target_wake` (défaut `06:40`)

## Tests manuels guidés (pas à pas)

### Préparation

1. Lancer le serveur local.
2. Ouvrir l’app.
3. Aller dans `Réglages` puis cliquer `Tout effacer` pour repartir proprement.

### Test 1: Saisie Matin et persistance

1. Aller sur `Matin`.
2. Date = aujourd’hui.
3. Coucher = `22:30`, Réveil final = `05:10`, Awake = `0`, Énergie = `7`.
4. Cliquer `Enregistrer`.
5. Résultat attendu :
   - Message `Enregistré`.
   - Dans `Dashboard`, la ligne du jour apparaît.
   - `TIB = 06:40`, `TST = 06:40`.

### Test 2: Deuxième jour

1. Retourner sur `Matin`.
2. Changer la date (hier), saisir d’autres valeurs.
3. Cliquer `Enregistrer`.
4. Résultat attendu :
   - Les deux jours sont visibles dans `Dashboard`.
   - Les cartes de moyenne se mettent à jour.

### Test 3: Rechargement

1. Recharger la page (`Ctrl+R`).
2. Résultat attendu :
   - Les données sont toujours présentes (IndexedDB persistante).

### Test 4: Offline

1. Ouvrir DevTools > Network > mode Offline.
2. Recharger la page.
3. Résultat attendu :
   - L’app s’ouvre sans réseau.
   - Le badge affiche `Hors ligne`.
   - Saisie/enregistrement continuent de fonctionner localement.

### Test 5: Export / Import

1. `Réglages > Export JSON`.
2. `Réglages > Tout effacer`.
3. Vérifier que le Dashboard est vide.
4. `Réglages > Import JSON` avec le fichier exporté.
5. Résultat attendu :
   - Les entrées et réglages reviennent à l’identique.

## Notes techniques

- Aucune API distante, aucun compte, aucune télémétrie.
- Données métier stockées uniquement dans IndexedDB.
- Service worker limité au cache d’assets statiques (pas d’appel API).
