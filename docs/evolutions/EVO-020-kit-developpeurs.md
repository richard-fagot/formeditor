# EVO-020 — Kit de livraison aux développeurs

Statut : en cours
Dépend de : aucune

## Besoin

Pour livrer un projet à l'équipe de dev (qui implémente les formulaires avec l'IA), je fournis les
JSON exportés (fichiers unitaires, hors `*.layout.json`) **plus** la documentation du format.
Je veux :

1. **Être sûr que cette documentation est à jour** avec le format réellement produit (version 13) :
   `docs/FORMAT.md`, `src/format/schemas/*.schema.json`, `examples/declaration-sinistre/` (projet,
   bibliothèque, questionnaires) et ses `chemins/*.json`.
2. **La récupérer d'un seul coup**, dans un répertoire unique prêt à joindre aux JSON des questionnaires.

## Attendu

1. **Audit** de cohérence, corrigé dans la foulée : chaque propriété acceptée par les schémas est décrite
   dans FORMAT.md et inversement ; FORMAT.md et les schémas reflètent EVO-001 à EVO-019 (notamment
   EVO-016 suggestions, EVO-017 « Autre » hors groupes, EVO-018 suppression du tri-state) ; l'exemple
   et les chemins sont valides en version 13, passent les tests de référence et n'utilisent plus de
   construction obsolète (ex. `tristate`, `cle = "unknown"`). Écarts trouvés et corrections listés dans
   le compte rendu.
2. **Commande `npm run kit-dev`** qui (re)crée un répertoire `kit-dev/` (ignoré par git) contenant :
   - `FORMAT.md` ;
   - `schemas/` : tous les `*.schema.json` ;
   - `exemple/` : l'exemple sans les `*.layout.json`, avec `chemins/` ;
   - `LISEZMOI.md` court : ce que contient le kit, la version du format, les fichiers à joindre par
     l'équipe métier (export « fichiers unitaires » hors `*.layout.json`), et que seuls les
     questionnaires `status: "validated"` sont livrables.
   Dans le kit, les renvois de FORMAT.md vers les schémas et l'exemple doivent pointer vers des fichiers
   présents (adapter FORMAT.md ou les réécrire à la copie, au plus simple).
3. Une ligne dans `docs/GUIDE.md` (« Livrer aux développeurs ») et dans le tableau des commandes de `CLAUDE.md`.

## Critères d'acceptation

- `npm run kit-dev` produit exactement l'arborescence ci-dessus ; relancé, il remplace l'ancien contenu.
- Aucun `*.layout.json` dans le kit ; tout JSON de `kit-dev/exemple/` est valide pour son schéma.
- Tout chemin de fichier cité dans `kit-dev/FORMAT.md` et `LISEZMOI.md` existe dans le kit.
