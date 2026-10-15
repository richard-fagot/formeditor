# CLAUDE.md — Éditeur de questionnaires

Outil interne de spécification de questionnaires métier (logigramme, prévisualisation wizard, export JSON).
Spécification : `docs/spec.md`. Plan et avancement : `docs/PLAN.md`. Existant réellement implémenté : `docs/EXISTANT.md`. Toujours écrire en français.

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

1. Lire la « Matrice fonctionnalité → modules » de `docs/MAP.md`, puis seulement les lignes
   des modules concernés (pas toute la carte).
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
- Pendant le travail, ne lancer que les tests ciblés : `npx vitest run <fichiers touchés>`,
  `npx playwright test <spec> --project=chromium`. `npm run check` complet **une seule fois**,
  à la fin, par le `realisateur` ; il indique le commit sur lequel il est vert.
- Test instable préexistant : au-delà de 3 relances, le signaler dans le compte rendu
  et dans `docs/ECARTS.md`, sans l'investiguer davantage.
- Pas de répétitions ni de tests sous charge (`--repeat-each`, workers multipliés…) : l'outil tourne seul
  sur une machine non chargée ; un échec qui n'apparaît que sous charge est hors périmètre.
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
| `npm run guide` | Régénère l'index des raccourcis de `docs/GUIDE.md` |
| `npm run kit-dev` | (Re)crée `kit-dev/` : FORMAT.md, schémas, exemple sans `*.layout.json`, LISEZMOI.md, à livrer aux développeurs |
| `npm run build` | Produit `dist/index.html` (fichier unique) |

## Orchestration par sous-agents

La session principale orchestre et ne code pas elle-même. Pour chaque phase de `docs/PLAN.md` :

1. Créer la branche de la phase, puis confier la phase au sous-agent `realisateur`.
2. À son retour, faire relire la phase par le sous-agent `relecteur`.
3. Si le verdict est ÉCARTS avec au moins un point bloquant ou majeur : confier la liste au
   `realisateur`, puis refaire relire. Trois allers-retours au plus ; au-delà, noter les écarts
   restants dans `docs/ECARTS.md` et continuer.
4. Verdict CONFORME (ou seulement des mineurs) : fusionner dans `main`, push, phase suivante.
5. Avant de fusionner, vérifier que le dernier commit de la branche est celui où le `realisateur`
   a eu `npm run check` vert, ou que le `relecteur` a lancé le harnais complet ; sinon relancer
   `npm run check` une fois.
6. Écarts mineurs : l'orchestrateur corrige lui-même ceux qui ne touchent que la documentation ;
   ceux qui touchent le code sont notés dans `docs/ECARTS.md`, et corrigés seulement à la demande
   de l'utilisateur, par un seul passage du `realisateur` sans nouvelle relecture si `npm run check` est vert.
7. Consignes aux sous-agents : courtes, elles renvoient aux fichiers (EVO, spec) au lieu de les
   paraphraser, et ne demandent ni refactorisation ni amélioration annexe. Elles ne demandent jamais
   de répétitions ni de tests sous charge (voir Harnais). Une petite correction se limite à :
   corriger la cause, un test ciblé qui la couvre, `npm run check` une fois, compte rendu bref.

Les points d'arrêt des démos restent valables.

## Évolutions (après la livraison initiale)

Une demande par fichier : `docs/evolutions/EVO-NNN-titre.md`, avec une ligne `Statut :`
(à faire | en cours | fait AAAA-MM-JJ | abandonné). Pour chaque évolution « à faire », par numéro croissant :
1. Branche `evo-NNN`, statut « en cours ».
2. Confier l'évolution au `realisateur` en une seule passe : analyse (si l'EVO la demande),
   mise à jour de `docs/spec.md` (le § concerné), code, tests (un test par critère d'acceptation),
   guide (`docs/GUIDE.md` et sa date « jusqu'à EVO-NNN », dans le même commit que le changement
   de comportement). Si l'analyse conclut « à arbitrer », il s'arrête avant de coder et rend les options.
3. Faire relire par `relecteur` (guide compris), corriger si besoin (règles de l'orchestration ci-dessus).
4. Confier la branche à l'`inventoriste`, qui met à jour `docs/EXISTANT.md` (inventaire factuel du code)
   et le commite sur la branche. Même étape en fin de phase de `docs/PLAN.md`, ou après toute
   modification de code fusionnée hors évolution.
5. Fusionner, statut « fait » avec la date.
Si une demande contredit la spec sans que ce soit explicitement voulu, demander avant de coder.