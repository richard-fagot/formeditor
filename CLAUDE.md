# CLAUDE.md — Éditeur de questionnaires

Outil interne de spécification de questionnaires métier (logigramme, prévisualisation wizard, export JSON).
Spécification : `docs/spec.md`. Plan et avancement : `docs/PLAN.md`. Toujours écrire en français.

C'est un **outil**, pas un projet industriel : il doit fonctionner correctement et ne pas régresser,
sans cérémonie. Préférer la solution la plus simple qui respecte la spec.

## Autonomie

- Travailler sans poser de questions. En cas d'ambiguïté : choisir l'option la plus simple compatible
  avec la spec, l'écrire en une ligne dans `docs/DECISIONS.md`, continuer.
- S'arrêter et demander seulement si la spec se contredit, ou avant une action irréversible hors du dépôt.
- Dérouler `docs/PLAN.md` dans l'ordre. Cocher chaque case terminée. Une session qui démarre reprend
  à la première case non cochée.
- Points d'arrêt obligatoires : fin de la phase 5 (démo n°1) et fin de la phase 8 (démo n°2).
  Y écrire un court résumé de ce qui est faisable dans l'outil, puis attendre.
- Si une librairie de la pile (spec §8.1) bloque : passer à l'alternative indiquée, le noter dans DECISIONS.md.
- Outil système manquant : l'installer (`sudo apt-get install -y …`) et l'ajouter au Dockerfile
  (`.devcontainer/Dockerfile`) pour qu'il survive à une reconstruction.

## Avant de modifier du code

1. Lire `docs/MAP.md` pour savoir quels modules sont concernés.
2. Lire le `README.md` de ces modules, puis seulement leur code.

## Architecture (spec §8)

- `src/core/*` : noyau métier pur, sans import d'`app`, `ui`, `plugins` ni de librairie d'interface.
- `src/plugins/question-types/<type>/`, `src/plugins/node-kinds/<kind>/` : un dossier autonome par type ;
  un plugin n'importe jamais un autre plugin. `src/registry` est le seul à connaître la liste des plugins.
- Chaque module expose son API via `index.ts` ; pas d'import de fichiers internes d'un autre module.
- Fichiers courts (≤ 200 lignes visés), noms explicites.

## Harnais (spec §8.4) — ne jamais casser

- `npm run check` = typage + Vitest + tests de référence + dependency-cruiser + build + test de fumée Playwright
  (Firefox et Chromium, `dist/index.html` ouvert en `file://`). Il doit être vert à la fin de chaque phase.
- `core` et `format` : écrire le test avant le code.
- Tests de référence sur le questionnaire d'exemple : schéma, aller-retour import/export, chemin attendu par scénario.
  Un changement de comportement voulu met à jour le fichier attendu, jamais l'inverse en silence.
- Hook pre-commit (typage + Vitest). Ne jamais utiliser `--no-verify`.
- Playwright : après l'ajout de `@playwright/test`, lancer `npx playwright install chromium firefox`
  (les dépendances système sont déjà dans l'image). Si Firefox ne s'installe pas sur cette architecture,
  limiter les projets Playwright à Chromium et le noter dans DECISIONS.md.

## Environnement

- État du conteneur : `bash .devcontainer/verifier.sh`.
- Si `docs/spec.md` est absent, s'arrêter et le signaler : c'est la seule source fonctionnelle.

## Invariants

- Changement du format JSON → schéma, migration (`formatVersion`), `docs/FORMAT.md` et exemple mis à jour.
- Toute action utilisateur passe par le catalogue de commandes (`app/commands`), donc par la palette et les raccourcis.
- Tout texte destiné à l'utilisateur final est multilingue.
- `docs/GUIDE.md` : toute action ajoutée, modifiée ou supprimée met à jour le guide (entrée, balise `[cmd: …]`,
  `npm run guide` pour l'index des raccourcis). `npm run check` contrôle la cohérence avec le catalogue de commandes.

## Git

- Une branche par phase (`phase-N-nom`), commits Conventional Commits en français.
- Fin de phase : `npm run check` vert, `npm run map`, `docs/MAP.md` et README des modules touchés à jour,
  case cochée dans PLAN.md, fusion dans `main`, push.

## Commandes (créées en phase 1)

| Commande | Effet |
| --- | --- |
| `npm run dev` | Serveur Vite (port 5173) |
| `npm test` | Vitest |
| `npm run check` | Harnais complet |
| `npm run map` | Régénère la partie factuelle de `docs/MAP.md` |
| `npm run build` | Produit `dist/index.html` (fichier unique) |

## Orchestration par sous-agents

La session principale orchestre et ne code pas elle-même. Pour chaque phase de `docs/PLAN.md` :

1. Créer la branche de la phase, puis confier la phase au sous-agent `realisateur`.
2. À son retour, faire relire la phase par le sous-agent `relecteur`.
3. Si le verdict est ÉCARTS avec au moins un point bloquant ou majeur : confier la liste au
   `realisateur`, puis refaire relire. Trois allers-retours au plus ; au-delà, noter les écarts
   restants dans `docs/ECARTS.md` et continuer.
4. Verdict CONFORME (ou seulement des mineurs) : fusionner dans `main`, push, phase suivante.

Les points d'arrêt des démos restent valables.

## Évolutions (après la livraison initiale)

Une demande par fichier : `docs/evolutions/EVO-NNN-titre.md`, avec une ligne `Statut :`
(à faire | en cours | fait AAAA-MM-JJ | abandonné). Pour chaque évolution « à faire », par numéro croissant :
1. Branche `evo-NNN`, statut « en cours ».
2. Mettre à jour `docs/spec.md` (le § concerné) pour qu'elle décrive le nouveau comportement.
3. Confier la réalisation au sous-agent `realisateur`, avec la spec mise à jour et les critères
   d'acceptation ; un test couvre chaque critère.
4. Mettre à jour le guide (`docs/GUIDE.md`) pour les actions touchées, et sa date « jusqu'à EVO-NNN »
   (fait par le `realisateur` dans le même commit que le changement de comportement).
5. Faire relire par `relecteur` (guide compris), corriger si besoin.
6. Fusionner, statut « fait » avec la date.
Si une demande contredit la spec sans que ce soit explicitement voulu, demander avant de coder.