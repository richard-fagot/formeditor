# Plan de réalisation

Dérouler dans l'ordre (spec §9). Cocher au fur et à mesure. Fin de phase = `npm run check` vert,
carte à jour, fusion dans `main`, push.

## Phase 1 — Socle
- [x] Vite + vite-plugin-singlefile, TypeScript strict, React
- [x] Vitest, Playwright (+ `npx playwright install chromium firefox`), dependency-cruiser (règles spec §8.2)
- [x] `npm run check` et hook pre-commit (typage + Vitest)
- [x] Squelette des modules du §8.2, chacun avec `index.ts` et `README.md`
- [x] `docs/MAP.md` + script `npm run map`
- [x] Test de fumée : `dist/index.html` s'ouvre en `file://` dans Firefox et Chromium

## Phase 2 — Modèle, format et exemple
- [x] Types du domaine (`core/model`)
- [x] JSON Schema des fichiers (projet, bibliothèque, questionnaire, layout), validation Ajv
- [x] Sérialisation, bundle, migrations (`formatVersion`)
- [x] Questionnaire d'exemple « déclaration de sinistre » + 2 ou 3 scénarios d'état du système
- [x] `docs/FORMAT.md` (modèle, navigation, grammaire des expressions, interpolation, exemples)
- [x] Tests de référence : schéma + aller-retour à l'identique

## Phase 3 — Expressions et références
- [x] Évaluation JSONata isolée dans `core/expressions`
- [x] Extraction des références, espaces de noms (`sys.`, alias de bloc, sous-champs, occurrences)
- [x] Renommage de clé propagé
- [x] Interpolation et variantes conditionnelles des libellés

## Phase 4 — Moteur de parcours et vérifications
- [x] Navigation par arêtes (rang, « sinon »), convergence, boucles (la réponse remplace la précédente)
- [x] Structures répétables, retour arrière, effacement des réponses hors chemin
- [x] Vérifications non bloquantes du §4.6
- [x] Tests de référence : chemin attendu par scénario

## Phase 5 — Tranche verticale UI → DÉMO 1 (arrêt)
- [x] Shell, onglets de questionnaires, import/export, sauvegarde automatique IndexedDB
- [x] Logigramme React Flow + panneau de propriétés
- [x] Catalogue de commandes, palette Ctrl+K, raccourcis par défaut du §4.4, annuler/rétablir
- [x] Types booléen et texte ; arêtes conditionnées avec éditeur d'expression
- [x] Prévisualisation minimale
- [x] Test de fumée enrichi : créer 2 questions au clavier, relier, prévisualiser, exporter
- [x] Résumé de démo écrit, puis attendre la validation

## Phase 6 — Types restants
- [ ] Date, nombre
- [ ] Choix unique et multiple, option « Autre », sources dynamiques, options conditionnées
- [ ] Tri-state et jeux de libellés
- [ ] Structure (répétable, bouton « Ajouter »)

## Phase 7 — Bibliothèque et blocs
- [ ] Questions et blocs référencés, surcharge locale du libellé
- [ ] Blocs : sorties nommées, alias, accès libre aux questions de l'hôte
- [ ] Insertion par palette et glisser-déposer, regroupement d'une sélection en bloc

## Phase 8 — Prévisualisation complète → DÉMO 2 (arrêt)
- [ ] Écran du dictionnaire de l'état du système (§4.5) : nom, type, description, valeur d'exemple ; autocomplétion des expressions
- [ ] Pages d'information, de synthèse (retour pour modifier), de fin
- [ ] Panneau d'état du système, scénarios nommés, édition libre, débogage
- [ ] Résumé de démo écrit, puis attendre la validation

## Phase 9 — i18n, paramètres, finitions
- [ ] Langues des contenus, traductions manquantes, changement de langue en prévisualisation
- [ ] Écran de paramétrage des raccourcis
- [ ] Vue côte à côte, mise en page automatique ELK

## Phase 10 — Livraison à l'équipe de dev
- [ ] `docs/FORMAT.md` relu et complet, schémas, exemple à jour
