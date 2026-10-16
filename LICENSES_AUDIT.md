# Audit des licences des dépendances

Date : 2026-10-16. Commit audité : `e6b049b` (`main`). Licence visée pour le projet : **AGPL-3.0-or-later**,
avec une éventuelle **double licence** (AGPL + licence commerciale propriétaire).

Ce document est un rapport technique, pas un avis juridique. Aucune dépendance n'a été modifiée.

## Synthèse

| Constat | Gravité |
|---|---|
| `elkjs` 0.9.3 (EPL-2.0), dépendance directe embarquée dans `dist/index.html`, est **incompatible avec l'AGPL-3.0** | **Bloquant** pour une publication sous AGPL |
| Le projet n'a pas de licence : ni fichier `LICENSE`, ni champ `license` dans `package.json` (`"private": true`) | **Bloquant** pour toute publication |
| `dist/index.html` ne contient aucune mention de licence ou de copyright des composants embarqués | **Bloquant** pour toute distribution (attributions MIT/ISC/BSD/Apache/EPL non respectées) |
| `.devcontainer/Dockerfile` se dit « inspiré du conteneur de référence d'Anthropic » | Attention : origine et licence à vérifier |
| 3 paquets publiés sans fichier de licence (dont `react-remove-scroll-bar`, embarqué) | Attention |
| Aucune dépendance GPL, AGPL, LGPL, EUPL, ni licence inconnue ou absente | — |
| MPL-2.0 : uniquement `lightningcss` (outil de build, rien n'est livré) | Sans effet |

Répartition des 248 paquets du lockfile (licence déclarée, ou licence effective quand elle diffère) :
MIT 198, MPL-2.0 24, ISC 12, Apache-2.0 7, BSD-3-Clause 3, MIT AND Apache-2.0 1, ISC AND MIT 1, EPL-2.0 1, 0BSD 1.
38 dépendances directes (26 `dependencies`, 12 `devDependencies`), 210 transitives ;
99 paquets de production, 149 de développement ; 92 paquets livrent du code dans `dist/index.html`.

## Méthode

- **Gestionnaires de paquets présents** : npm seulement (`package.json`, `package-lock.json`, lockfile v3).
  Recherche de manifestes Python, Rust, Go, Ruby, PHP, Java : aucun.
- **Outils** :
  - `license-checker-rseidelsohn` 4.4.2, installé hors du projet ; il lit les 205 paquets présents dans `node_modules`.
  - `npm ls --all` (npm 10.9.4, Node 22.22.0) : `node_modules` est conforme au lockfile, sans paquet manquant ni en trop.
  - Analyse du lockfile pour les 248 entrées, dont 42 paquets optionnels propres à d'autres plateformes (binaires
    `lightningcss-*`, `@rolldown/binding-*`, `fsevents`…) qui ne sont pas installés ici : pour eux, seule la licence
    déclarée dans le lockfile a pu être relevée.
- **Contrôle croisé** : pour chaque paquet installé, le fichier de licence réel a été comparé à la licence déclarée.
  Il n'y a qu'un écart : `libphonenumber-js` contient aussi `LICENSE.Apache`. `lucide-react` (ISC) contient en plus
  la licence MIT des icônes Feather. `vite` et `vitest` regroupent les licences de leurs sous-dépendances embarquées
  (MIT, ISC, BSD-2/3-Clause, Apache-2.0, CC0-1.0 : toutes permissives).
- **Ce qui est livré** : `src/ui/diagram/autoLayout.ts` importe `elkjs/lib/elk.bundled.js`. Le build embarque les
  dépendances de production, la CSS générée par Tailwind (preflight) et le polyfill `modulepreload` de Vite.
  Les mentions de copyright y sont supprimées.
- **Colonne « Portée »** : `prod (dans dist)` = code livré ; `prod (types seuls)` = déclarations TypeScript,
  rien à l'exécution ; `dev` = outil de développement, de test ou de build, non livré ;
  `dev (sortie dans dist)` = outil dont la sortie est livrée.

## Points bloquants

### 1. `elkjs` 0.9.3 — EPL-2.0 incompatible avec l'AGPL-3.0

- **Usage** : dépendance directe de production, mise en page automatique du logigramme (`src/ui/diagram/autoLayout.ts`).
  Elle est fusionnée dans `dist/index.html` : c'est une œuvre combinée au sens de la GPL.
- **Licence** : EPL-2.0 seule. Les en-têtes portent `SPDX-License-Identifier: EPL-2.0`, et l'Exhibit A
  (« Secondary Licenses Notice ») n'est pas rempli. Sans cette désignation, la FSF considère l'EPL-2.0
  incompatible avec la GPL, et donc avec l'AGPL.
- **Conséquence AGPL** : `dist/index.html` ne peut pas être distribué sous AGPL-3.0-or-later tant qu'il contient elkjs.
  La publication sur GitHub Pages ou en artefact (`.github/workflows/build.yml`) est une distribution.
- **Conséquence licence propriétaire** : l'EPL-2.0 est un copyleft faible, par module. Elle permet de livrer elkjs
  dans un produit fermé, à condition de fournir le source d'elkjs (ou un moyen de l'obtenir), de garder ses mentions
  et de ne pas restreindre les droits sur elkjs lui-même. Le côté propriétaire de la double licence reste donc possible.
- **Pistes** (à arbitrer, rien n'a été changé) :
  - remplacer elkjs par une bibliothèque permissive de mise en page de graphes, par exemple `@dagrejs/dagre` (MIT) ;
  - ou obtenir des auteurs (Kiel University / projet Eclipse ELK) une désignation de licence secondaire GPL, peu probable ;
  - ou réserver la diffusion AGPL au code source seul, sans `dist/index.html` : c'est fragile, puisque toute
    construction par un tiers redonne une œuvre combinée.

### 2. Le projet n'a pas de licence

Il n'y a ni `LICENSE`, ni `COPYING`, ni champ `license` dans `package.json` (`"private": true`), ni en-tête SPDX.
Pour publier sous AGPL-3.0-or-later, il faut au minimum un fichier `LICENSE` avec le texte de l'AGPL-3.0 et le
champ `"license": "AGPL-3.0-or-later"`.

Une double licence suppose aussi de détenir tous les droits sur le code du projet. Toute contribution externe
demandera alors un accord de contribution (CLA ou cession de droits).

### 3. Attributions absentes de `dist/index.html`

MIT, ISC, BSD et Apache-2.0 exigent que les mentions de copyright et de licence accompagnent les copies. L'EPL-2.0
exige en plus d'indiquer comment obtenir le source. Le build actuel supprime tous les commentaires de licence, et
`dist/index.html` est diffusé seul (artefact CI, GitHub Pages).

Il faut livrer `THIRD_PARTY_NOTICES.md` avec le fichier, ou y insérer ces mentions (commentaires légaux conservés,
ou page « À propos / licences » dans l'outil). Cela vaut pour la version AGPL comme pour la version propriétaire.

## Points d'attention (non bloquants)

- **Double licence et copyleft** : aucune dépendance GPL, AGPL, LGPL ou EUPL n'est présente, ni en production, ni en
  développement. Les 24 entrées MPL-2.0 sont toutes `lightningcss` et ses binaires de plateforme. C'est un outil de
  build de Tailwind, et rien de son code n'est livré. Même livré, le copyleft MPL ne porterait que sur ses propres
  fichiers et n'empêcherait pas une version fermée. Seul **elkjs (EPL-2.0)** impose des obligations à une version
  fermée : source et mentions, voir le point 1.
- **Paquets sans fichier de licence** : `react-remove-scroll-bar` 2.3.8 (embarqué ; MIT déclaré, texte reconstitué
  dans `THIRD_PARTY_NOTICES.md` avec l'auteur déclaré, Anton Korzunov), `@rolldown/binding-linux-x64-gnu` et
  `-musl` 1.2.13 (build seulement, MIT déclaré). La licence est connue, mais la mention de copyright exacte est à
  confirmer sur le dépôt amont.
- **Licences composites** : `libphonenumber-js` (MIT pour le code, métadonnées dérivées de Google libphonenumber
  sous Apache-2.0) et `lucide-react` (ISC, plus MIT pour les icônes issues de Feather). Les deux sont compatibles,
  et les deux textes figurent dans les mentions.
- **Paquets non installés ici** (42 binaires optionnels d'autres plateformes) : licence relevée dans le lockfile, sans
  lecture du fichier. Ce sont des variantes des paquets installés, sous la même licence.

## Hors gestionnaire de paquets

Ces éléments ne sont pas livrés avec l'outil. Ils comptent seulement si l'on redistribue l'environnement lui-même.

| Élément | Version | Licence | Usage | Compatibilité AGPL | Justification |
|---|---|---|---|---|---|
| actions/checkout | v7 | MIT | CI | OK | Outil de CI, non livré |
| actions/setup-node | v7 | MIT | CI | OK | Outil de CI, non livré |
| actions/upload-artifact | v7 | MIT | CI | OK | Outil de CI, non livré |
| actions/upload-pages-artifact | v5 | MIT | CI | OK | Outil de CI, non livré |
| actions/deploy-pages | v5 | MIT | CI | OK | Outil de CI, non livré |
| Image `node:22-bookworm` | 22 | MIT (Node.js) + paquets Debian (licences diverses, dont GPL) | devcontainer | OK | Environnement de développement, non livré |
| Paquets apt (git, gh, curl, jq…) | Debian bookworm | Diverses (GPL, MIT…) | devcontainer | OK | Outils, non livrés ni liés |
| Navigateurs Playwright (Chromium, Firefox) | selon `@playwright/test` 1.64.0 | BSD-3-Clause et autres (Chromium) ; MPL-2.0 (Firefox) | tests | OK | Téléchargés pour les tests, non livrés |
| `@anthropic-ai/claude-code` (npm global) et extension VS Code | latest | Propriétaire (conditions commerciales Anthropic) | devcontainer | OK | Outil de développement, non livré ni lié au produit |

## Code et assets d'origine externe dans le dépôt

Recherche effectuée sur tous les fichiers suivis par git : en-têtes de licence et de copyright, SPDX, « copied from »,
« adapted from », « based on », « inspiré de », « repris de », liens vers des dépôts ou des gists, dossiers
`vendor/`, `third_party/`, `lib/`, fichiers binaires.

- **Aucun** fichier vendored, aucun en-tête de licence tiers, aucun asset binaire (image, police, icône) suivi par git.
  Les icônes viennent du paquet `lucide-react`, déjà couvert ci-dessus.
- **`.devcontainer/Dockerfile`, ligne 2** : « Inspiré du conteneur de référence d'Anthropic ». Plusieurs lignes
  reprennent le Dockerfile de référence du dépôt `anthropics/claude-code` : historique bash persistant sur
  `/commandhistory`, `NPM_CONFIG_PREFIX`, `DEVCONTAINER=true`, installation de `@anthropic-ai/claude-code`.
  À ma connaissance, ce dépôt n'est pas publié sous une licence open source : à vérifier. Le contenu est surtout
  fonctionnel et peu original. Pour une publication sous AGPL, il vaut mieux soit confirmer que la reprise est
  permise, soit réécrire ces lignes. Le devcontainer ne fait pas partie de l'outil livré.
- **`src/ui-kit/cn.ts`** : la fonction `cn` (`twMerge(clsx(inputs))`) est identique à l'utilitaire de shadcn/ui
  (MIT), et le README du module parle de composants « dans l'esprit shadcn/ui ». Les autres composants de `src/ui-kit`
  sont écrits pour le projet (classes et structure propres). Ces trois lignes sont un idiome courant, à originalité
  quasi nulle : risque négligeable, une mention de shadcn/ui (MIT) est possible par prudence.
- **`.github/dependabot.yml`** : le commentaire d'en-tête est celui du modèle GitHub. Gabarit de configuration,
  sans enjeu.
- Les données d'exemple (`examples/`), la documentation (`docs/`) et les scripts (`scripts/`) ne contiennent pas de
  contenu tiers identifié.

## Tableau des dépendances npm

Trié par gravité, puis par nom. Toutes les entrées de `package-lock.json` y figurent.

| Dépendance | Version | Licence (SPDX) | Directe / transitive | Portée | Compatibilité AGPL-3.0-or-later | Justification |
|---|---|---|---|---|---|---|
| elkjs | 0.9.3 | EPL-2.0 | directe | prod (dans dist) | INCOMPATIBLE | Incompatible GPL/AGPL (FSF) : aucune licence secondaire GPL désignée (Exhibit A non rempli dans elkjs). Embarqué dans dist/index.html. |
| @rolldown/binding-linux-x64-gnu | 1.2.13 | MIT | transitive | dev ; optionnelle | ATTENTION | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. Aucun fichier de licence dans le paquet publié : texte à reprendre du dépôt amont. |
| @rolldown/binding-linux-x64-musl | 1.2.13 | MIT | transitive | dev ; optionnelle | ATTENTION | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. Aucun fichier de licence dans le paquet publié : texte à reprendre du dépôt amont. |
| react-remove-scroll-bar | 2.3.8 | MIT | transitive | prod (dans dist) | ATTENTION | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. Aucun fichier de licence dans le paquet publié : texte à reprendre du dépôt amont. |
| @codemirror/autocomplete | 6.20.3 | MIT | directe | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @codemirror/commands | 6.11.1 | MIT | directe | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @codemirror/language | 6.13.1 | MIT | directe | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @codemirror/lint | 6.9.7 | MIT | directe | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @codemirror/state | 6.7.6 | MIT | directe | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @codemirror/streamparser | 6.0.0 | MIT | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @codemirror/view | 6.43.14 | MIT | directe | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @floating-ui/core | 1.8.0 | MIT | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @floating-ui/dom | 1.8.0 | MIT | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @floating-ui/react-dom | 2.1.9 | MIT | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @floating-ui/utils | 0.2.12 | MIT | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @jridgewell/gen-mapping | 0.3.13 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @jridgewell/remapping | 2.3.5 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @jridgewell/resolve-uri | 3.1.2 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @jridgewell/sourcemap-codec | 1.6.0 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @jridgewell/trace-mapping | 0.3.31 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @lezer/common | 1.5.3 | MIT | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @lezer/highlight | 1.2.5 | MIT | directe | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @lezer/lr | 1.4.11 | MIT | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @marijn/find-cluster-break | 1.0.4 | MIT | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @oxc-project/types | 0.153.0 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @playwright/test | 1.64.0 | Apache-2.0 | directe | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (pas GPLv2). Licence + NOTICE à conserver. |
| @radix-ui/primitive | 1.1.7 | MIT | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @radix-ui/react-arrow | 1.1.16 | MIT | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @radix-ui/react-collection | 1.1.16 | MIT | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @radix-ui/react-compose-refs | 1.1.5 | MIT | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @radix-ui/react-context | 1.2.2 | MIT | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @radix-ui/react-dialog | 1.2.0 | MIT | directe | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @radix-ui/react-direction | 1.1.5 | MIT | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @radix-ui/react-dismissable-layer | 1.1.20 | MIT | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @radix-ui/react-dropdown-menu | 2.1.25 | MIT | directe | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @radix-ui/react-focus-guards | 1.1.6 | MIT | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @radix-ui/react-focus-scope | 1.2.0 | MIT | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @radix-ui/react-id | 1.1.4 | MIT | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @radix-ui/react-menu | 2.1.25 | MIT | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @radix-ui/react-popper | 1.3.8 | MIT | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @radix-ui/react-portal | 1.1.18 | MIT | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @radix-ui/react-presence | 1.1.11 | MIT | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @radix-ui/react-primitive | 2.1.11 | MIT | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @radix-ui/react-roving-focus | 1.1.20 | MIT | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @radix-ui/react-slot | 1.4.0 | MIT | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @radix-ui/react-tooltip | 1.3.0 | MIT | directe | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @radix-ui/react-use-callback-ref | 1.1.4 | MIT | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @radix-ui/react-use-controllable-state | 1.2.6 | MIT | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @radix-ui/react-use-effect-event | 0.0.5 | MIT | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @radix-ui/react-use-is-hydrated | 0.1.3 | MIT | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @radix-ui/react-use-layout-effect | 1.1.4 | MIT | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @radix-ui/react-use-rect | 1.1.4 | MIT | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @radix-ui/react-use-size | 1.1.5 | MIT | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @radix-ui/react-visually-hidden | 1.2.12 | MIT | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @radix-ui/rect | 1.1.3 | MIT | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @rolldown/binding-android-arm-eabi | 1.2.13 | MIT | transitive | dev ; optionnelle, non installée ici (autre plateforme) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @rolldown/binding-android-arm64 | 1.2.13 | MIT | transitive | dev ; optionnelle, non installée ici (autre plateforme) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @rolldown/binding-darwin-arm64 | 1.2.13 | MIT | transitive | dev ; optionnelle, non installée ici (autre plateforme) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @rolldown/binding-darwin-x64 | 1.2.13 | MIT | transitive | dev ; optionnelle, non installée ici (autre plateforme) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @rolldown/binding-freebsd-x64 | 1.2.13 | MIT | transitive | dev ; optionnelle, non installée ici (autre plateforme) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @rolldown/binding-linux-arm-gnueabihf | 1.2.13 | MIT | transitive | dev ; optionnelle, non installée ici (autre plateforme) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @rolldown/binding-linux-arm64-gnu | 1.2.13 | MIT | transitive | dev ; optionnelle, non installée ici (autre plateforme) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @rolldown/binding-linux-arm64-musl | 1.2.13 | MIT | transitive | dev ; optionnelle, non installée ici (autre plateforme) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @rolldown/binding-linux-ppc64-gnu | 1.2.13 | MIT | transitive | dev ; optionnelle, non installée ici (autre plateforme) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @rolldown/binding-linux-s390x-gnu | 1.2.13 | MIT | transitive | dev ; optionnelle, non installée ici (autre plateforme) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @rolldown/binding-openharmony-arm64 | 1.2.13 | MIT | transitive | dev ; optionnelle, non installée ici (autre plateforme) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @rolldown/binding-win32-arm64-msvc | 1.2.13 | MIT | transitive | dev ; optionnelle, non installée ici (autre plateforme) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @rolldown/binding-win32-x64-msvc | 1.2.13 | MIT | transitive | dev ; optionnelle, non installée ici (autre plateforme) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @rolldown/pluginutils | 1.0.1 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @tailwindcss/node | 4.3.3 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @tailwindcss/oxide | 4.3.3 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @tailwindcss/oxide-android-arm64 | 4.3.3 | MIT | transitive | dev ; optionnelle, non installée ici (autre plateforme) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @tailwindcss/oxide-darwin-arm64 | 4.3.3 | MIT | transitive | dev ; optionnelle, non installée ici (autre plateforme) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @tailwindcss/oxide-darwin-x64 | 4.3.3 | MIT | transitive | dev ; optionnelle, non installée ici (autre plateforme) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @tailwindcss/oxide-freebsd-x64 | 4.3.3 | MIT | transitive | dev ; optionnelle, non installée ici (autre plateforme) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @tailwindcss/oxide-linux-arm-gnueabihf | 4.3.3 | MIT | transitive | dev ; optionnelle, non installée ici (autre plateforme) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @tailwindcss/oxide-linux-arm64-gnu | 4.3.3 | MIT | transitive | dev ; optionnelle, non installée ici (autre plateforme) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @tailwindcss/oxide-linux-arm64-musl | 4.3.3 | MIT | transitive | dev ; optionnelle, non installée ici (autre plateforme) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @tailwindcss/oxide-linux-x64-gnu | 4.3.3 | MIT | transitive | dev ; optionnelle | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @tailwindcss/oxide-linux-x64-musl | 4.3.3 | MIT | transitive | dev ; optionnelle | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @tailwindcss/oxide-wasm32-wasi | 4.3.3 | MIT | transitive | dev ; optionnelle, non installée ici (autre plateforme) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @tailwindcss/oxide-win32-arm64-msvc | 4.3.3 | MIT | transitive | dev ; optionnelle, non installée ici (autre plateforme) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @tailwindcss/oxide-win32-x64-msvc | 4.3.3 | MIT | transitive | dev ; optionnelle, non installée ici (autre plateforme) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @tailwindcss/vite | 4.3.3 | MIT | directe | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @types/chai | 5.2.3 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @types/d3-color | 3.1.3 | MIT | transitive | prod (types seuls) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @types/d3-drag | 3.0.7 | MIT | transitive | prod (types seuls) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @types/d3-interpolate | 3.0.4 | MIT | transitive | prod (types seuls) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @types/d3-selection | 3.0.12 | MIT | transitive | prod (types seuls) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @types/d3-transition | 3.0.9 | MIT | transitive | prod (types seuls) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @types/d3-zoom | 3.0.9 | MIT | transitive | prod (types seuls) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @types/deep-eql | 4.0.2 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @types/estree | 1.0.9 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @types/node | 26.6.5 | MIT | directe | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @types/react | 19.3.0 | MIT | directe | prod (types seuls) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @types/react-dom | 19.3.0 | MIT | directe | prod (types seuls) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @vitejs/plugin-react | 6.1.2 | MIT | directe | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @vitest/mocker | 5.0.3 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @vitest/spy | 5.0.3 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @xyflow/react | 12.12.0 | MIT | directe | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| @xyflow/system | 0.0.83 | MIT | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| acorn | 8.18.0 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| acorn-jsx | 5.3.2 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| acorn-jsx-walk | 2.0.0 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| acorn-loose | 8.5.2 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| acorn-walk | 8.3.5 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| ajv | 8.20.0 | MIT | directe | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| ansi-styles | 4.3.0 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| aria-hidden | 1.2.6 | MIT | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| assertion-error | 2.0.1 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| braces | 3.0.3 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| chai | 6.3.0 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| chalk | 4.1.2 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| classcat | 5.0.5 | MIT | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| clsx | 2.1.1 | MIT | directe | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| cmdk | 1.1.1 | MIT | directe | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| color-convert | 2.0.1 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| color-name | 1.1.4 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| commander | 15.0.0 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| crelt | 1.0.7 | MIT | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| csstype | 3.2.3 | MIT | transitive | prod (types seuls) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| d3-color | 3.1.0 | ISC | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3. Attribution requise. |
| d3-dispatch | 3.0.1 | ISC | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3. Attribution requise. |
| d3-drag | 3.0.0 | ISC | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3. Attribution requise. |
| d3-ease | 3.0.1 | BSD-3-Clause | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3. Attribution requise. |
| d3-interpolate | 3.0.1 | ISC | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3. Attribution requise. |
| d3-selection | 3.0.0 | ISC | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3. Attribution requise. |
| d3-timer | 3.0.1 | ISC | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3. Attribution requise. |
| d3-transition | 3.0.1 | ISC | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3. Attribution requise. |
| d3-zoom | 3.0.0 | ISC | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3. Attribution requise. |
| dependency-cruiser | 18.5.0 | MIT | directe | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| detect-libc | 2.1.2 | Apache-2.0 | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (pas GPLv2). Licence + NOTICE à conserver. |
| detect-node-es | 1.1.0 | MIT | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| enhanced-resolve | 5.26.0 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| es-errors | 1.3.0 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| es-module-lexer | 2.3.2 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| estree-walker | 3.0.3 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| expect-type | 1.4.0 | Apache-2.0 | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (pas GPLv2). Licence + NOTICE à conserver. |
| fast-deep-equal | 3.1.3 | MIT | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| fast-uri | 3.1.8 | BSD-3-Clause | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3. Attribution requise. |
| fdir | 6.5.0 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| fill-range | 7.1.1 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| fsevents | 2.3.3 | MIT | transitive | dev ; optionnelle, non installée ici (autre plateforme) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| function-bind | 1.1.2 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| get-nonce | 1.0.1 | MIT | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| global-directory | 4.0.1 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| graceful-fs | 4.2.11 | ISC | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3. Attribution requise. |
| has-flag | 4.0.0 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| hasown | 2.0.4 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| html-to-image | 1.11.11 | MIT | directe | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| idb-keyval | 6.3.0 | Apache-2.0 | directe | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (pas GPLv2). Licence + NOTICE à conserver. |
| ignore | 7.0.11 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| immer | 11.1.21 | MIT | directe | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| ini | 4.1.1 | ISC | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3. Attribution requise. |
| interpret | 3.1.1 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| is-core-module | 2.17.0 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| is-installed-globally | 1.0.1 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| is-number | 7.0.0 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| is-path-inside | 4.0.0 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| jiti | 2.7.0 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| json-schema-traverse | 1.0.0 | MIT | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| json5 | 2.2.3 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| jsonata | 1.8.9 | MIT | directe | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| kleur | 3.0.3 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| libphonenumber-js | 1.13.15 | MIT AND Apache-2.0 | directe | prod (dans dist) | OK | Code MIT + métadonnées dérivées de Google libphonenumber (Apache-2.0) ; les deux compatibles AGPLv3. |
| lightningcss | 1.32.0 | MPL-2.0 | transitive | dev | OK | Copyleft faible par fichier ; compatible GPL/AGPL (MPL-2.0 §3.3, pas d'Exhibit B). Outil de build : rien de lightningcss n'est livré dans dist/. |
| lightningcss | 1.33.0 | MPL-2.0 | transitive | dev | OK | Copyleft faible par fichier ; compatible GPL/AGPL (MPL-2.0 §3.3, pas d'Exhibit B). Outil de build : rien de lightningcss n'est livré dans dist/. |
| lightningcss-android-arm64 | 1.32.0 | MPL-2.0 | transitive | dev ; optionnelle, non installée ici (autre plateforme) | OK | Copyleft faible par fichier ; compatible GPL/AGPL (MPL-2.0 §3.3, pas d'Exhibit B). Outil de build : rien de lightningcss n'est livré dans dist/. |
| lightningcss-android-arm64 | 1.33.0 | MPL-2.0 | transitive | dev ; optionnelle, non installée ici (autre plateforme) | OK | Copyleft faible par fichier ; compatible GPL/AGPL (MPL-2.0 §3.3, pas d'Exhibit B). Outil de build : rien de lightningcss n'est livré dans dist/. |
| lightningcss-darwin-arm64 | 1.32.0 | MPL-2.0 | transitive | dev ; optionnelle, non installée ici (autre plateforme) | OK | Copyleft faible par fichier ; compatible GPL/AGPL (MPL-2.0 §3.3, pas d'Exhibit B). Outil de build : rien de lightningcss n'est livré dans dist/. |
| lightningcss-darwin-arm64 | 1.33.0 | MPL-2.0 | transitive | dev ; optionnelle, non installée ici (autre plateforme) | OK | Copyleft faible par fichier ; compatible GPL/AGPL (MPL-2.0 §3.3, pas d'Exhibit B). Outil de build : rien de lightningcss n'est livré dans dist/. |
| lightningcss-darwin-x64 | 1.32.0 | MPL-2.0 | transitive | dev ; optionnelle, non installée ici (autre plateforme) | OK | Copyleft faible par fichier ; compatible GPL/AGPL (MPL-2.0 §3.3, pas d'Exhibit B). Outil de build : rien de lightningcss n'est livré dans dist/. |
| lightningcss-darwin-x64 | 1.33.0 | MPL-2.0 | transitive | dev ; optionnelle, non installée ici (autre plateforme) | OK | Copyleft faible par fichier ; compatible GPL/AGPL (MPL-2.0 §3.3, pas d'Exhibit B). Outil de build : rien de lightningcss n'est livré dans dist/. |
| lightningcss-freebsd-x64 | 1.32.0 | MPL-2.0 | transitive | dev ; optionnelle, non installée ici (autre plateforme) | OK | Copyleft faible par fichier ; compatible GPL/AGPL (MPL-2.0 §3.3, pas d'Exhibit B). Outil de build : rien de lightningcss n'est livré dans dist/. |
| lightningcss-freebsd-x64 | 1.33.0 | MPL-2.0 | transitive | dev ; optionnelle, non installée ici (autre plateforme) | OK | Copyleft faible par fichier ; compatible GPL/AGPL (MPL-2.0 §3.3, pas d'Exhibit B). Outil de build : rien de lightningcss n'est livré dans dist/. |
| lightningcss-linux-arm-gnueabihf | 1.32.0 | MPL-2.0 | transitive | dev ; optionnelle, non installée ici (autre plateforme) | OK | Copyleft faible par fichier ; compatible GPL/AGPL (MPL-2.0 §3.3, pas d'Exhibit B). Outil de build : rien de lightningcss n'est livré dans dist/. |
| lightningcss-linux-arm-gnueabihf | 1.33.0 | MPL-2.0 | transitive | dev ; optionnelle, non installée ici (autre plateforme) | OK | Copyleft faible par fichier ; compatible GPL/AGPL (MPL-2.0 §3.3, pas d'Exhibit B). Outil de build : rien de lightningcss n'est livré dans dist/. |
| lightningcss-linux-arm64-gnu | 1.32.0 | MPL-2.0 | transitive | dev ; optionnelle, non installée ici (autre plateforme) | OK | Copyleft faible par fichier ; compatible GPL/AGPL (MPL-2.0 §3.3, pas d'Exhibit B). Outil de build : rien de lightningcss n'est livré dans dist/. |
| lightningcss-linux-arm64-gnu | 1.33.0 | MPL-2.0 | transitive | dev ; optionnelle, non installée ici (autre plateforme) | OK | Copyleft faible par fichier ; compatible GPL/AGPL (MPL-2.0 §3.3, pas d'Exhibit B). Outil de build : rien de lightningcss n'est livré dans dist/. |
| lightningcss-linux-arm64-musl | 1.32.0 | MPL-2.0 | transitive | dev ; optionnelle, non installée ici (autre plateforme) | OK | Copyleft faible par fichier ; compatible GPL/AGPL (MPL-2.0 §3.3, pas d'Exhibit B). Outil de build : rien de lightningcss n'est livré dans dist/. |
| lightningcss-linux-arm64-musl | 1.33.0 | MPL-2.0 | transitive | dev ; optionnelle, non installée ici (autre plateforme) | OK | Copyleft faible par fichier ; compatible GPL/AGPL (MPL-2.0 §3.3, pas d'Exhibit B). Outil de build : rien de lightningcss n'est livré dans dist/. |
| lightningcss-linux-x64-gnu | 1.32.0 | MPL-2.0 | transitive | dev ; optionnelle | OK | Copyleft faible par fichier ; compatible GPL/AGPL (MPL-2.0 §3.3, pas d'Exhibit B). Outil de build : rien de lightningcss n'est livré dans dist/. |
| lightningcss-linux-x64-gnu | 1.33.0 | MPL-2.0 | transitive | dev ; optionnelle | OK | Copyleft faible par fichier ; compatible GPL/AGPL (MPL-2.0 §3.3, pas d'Exhibit B). Outil de build : rien de lightningcss n'est livré dans dist/. |
| lightningcss-linux-x64-musl | 1.32.0 | MPL-2.0 | transitive | dev ; optionnelle | OK | Copyleft faible par fichier ; compatible GPL/AGPL (MPL-2.0 §3.3, pas d'Exhibit B). Outil de build : rien de lightningcss n'est livré dans dist/. |
| lightningcss-linux-x64-musl | 1.33.0 | MPL-2.0 | transitive | dev ; optionnelle | OK | Copyleft faible par fichier ; compatible GPL/AGPL (MPL-2.0 §3.3, pas d'Exhibit B). Outil de build : rien de lightningcss n'est livré dans dist/. |
| lightningcss-win32-arm64-msvc | 1.32.0 | MPL-2.0 | transitive | dev ; optionnelle, non installée ici (autre plateforme) | OK | Copyleft faible par fichier ; compatible GPL/AGPL (MPL-2.0 §3.3, pas d'Exhibit B). Outil de build : rien de lightningcss n'est livré dans dist/. |
| lightningcss-win32-arm64-msvc | 1.33.0 | MPL-2.0 | transitive | dev ; optionnelle, non installée ici (autre plateforme) | OK | Copyleft faible par fichier ; compatible GPL/AGPL (MPL-2.0 §3.3, pas d'Exhibit B). Outil de build : rien de lightningcss n'est livré dans dist/. |
| lightningcss-win32-x64-msvc | 1.32.0 | MPL-2.0 | transitive | dev ; optionnelle, non installée ici (autre plateforme) | OK | Copyleft faible par fichier ; compatible GPL/AGPL (MPL-2.0 §3.3, pas d'Exhibit B). Outil de build : rien de lightningcss n'est livré dans dist/. |
| lightningcss-win32-x64-msvc | 1.33.0 | MPL-2.0 | transitive | dev ; optionnelle, non installée ici (autre plateforme) | OK | Copyleft faible par fichier ; compatible GPL/AGPL (MPL-2.0 §3.3, pas d'Exhibit B). Outil de build : rien de lightningcss n'est livré dans dist/. |
| lucide-react | 1.55.0 | ISC AND MIT | directe | prod (dans dist) | OK | Icônes Lucide (ISC) + icônes dérivées de Feather (MIT) ; compatibles. |
| magic-string | 0.30.21 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| magic-string | 1.4.3 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| magic-string | 1.4.3 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| micromatch | 4.0.8 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| minimist | 1.2.8 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| nanoid | 3.3.20 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| obug | 2.2.1 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| path-parse | 1.0.7 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| picocolors | 1.1.1 | ISC | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3. Attribution requise. |
| picomatch | 2.3.2 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| picomatch | 4.0.7 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| playwright | 1.64.0 | Apache-2.0 | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (pas GPLv2). Licence + NOTICE à conserver. |
| playwright-core | 1.64.0 | Apache-2.0 | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (pas GPLv2). Licence + NOTICE à conserver. |
| postcss | 8.5.29 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| prompts | 2.4.2 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| react | 19.3.0 | MIT | directe | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| react-dom | 19.3.0 | MIT | directe | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| react-remove-scroll | 2.7.2 | MIT | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| react-style-singleton | 2.2.3 | MIT | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| rechoir | 0.8.0 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| regexp-tree | 0.1.27 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| require-from-string | 2.0.2 | MIT | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| resolve | 1.22.13 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| rolldown | 1.2.13 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| safe-regex | 2.1.1 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| scheduler | 0.28.0 | MIT | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| semver | 7.8.5 | ISC | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3. Attribution requise. |
| sisteransi | 1.0.5 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| source-map-js | 1.2.2 | BSD-3-Clause | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3. Attribution requise. |
| std-env | 4.3.0 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| strip-bom | 3.0.0 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| style-mod | 4.1.4 | MIT | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| supports-color | 7.2.0 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| supports-preserve-symlinks-flag | 1.0.0 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| tailwind-merge | 3.7.0 | MIT | directe | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| tailwindcss | 4.3.3 | MIT | directe | dev (sortie dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| tapable | 2.3.3 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| tinybench | 6.2.1 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| tinyexec | 1.3.1 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| tinyglobby | 0.2.17 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| tinykeys | 4.0.1 | MIT | directe | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| to-regex-range | 5.0.1 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| tsconfig-paths | 4.2.0 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| tsconfig-paths-webpack-plugin | 4.2.0 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| tslib | 2.8.1 | 0BSD | transitive | prod (dans dist) | OK | Permissive sans condition ; compatible. |
| typescript | 6.0.3 | Apache-2.0 | directe | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (pas GPLv2). Licence + NOTICE à conserver. |
| undici-types | 8.9.0 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| use-callback-ref | 1.3.3 | MIT | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| use-sidecar | 1.1.3 | MIT | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| use-sync-external-store | 1.7.0 | MIT | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| vite | 8.3.4 | MIT | directe | dev (sortie dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| vite-plugin-singlefile | 2.3.3 | MIT | directe | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| vitest | 5.0.3 | MIT | directe | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| w3c-keyname | 2.2.8 | MIT | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| watskeburt | 6.0.0 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| why-is-node-running | 3.2.1 | MIT | transitive | dev | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| zustand | 4.5.7 | MIT | transitive | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
| zustand | 5.0.15 | MIT | directe | prod (dans dist) | OK | Permissive ; compatible GPLv3/AGPLv3 (liste FSF). Attribution requise. |
