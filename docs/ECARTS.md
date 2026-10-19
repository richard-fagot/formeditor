# Écarts connus

Écarts non bloquants relevés en relecture, à corriger seulement à la demande.

Catégories :

- **CODE** : le code ne respecte pas la spec (comportement faux ou incomplet).
- **TEST** : comportement conforme, mais test absent, partiel ou trop faible pour le prouver.
- **SPEC** : comportement du code non décrit (ou ambigu) dans la spec ou le guide.
- **I18N** : texte destiné à l'utilisateur incorrect dans une des langues.
- **TEXT** : commentaire de code ou titre de test obsolète.
- **ENV** : l'environnement d'exécution de Claude est limitant (conteneur, proxy, navigateurs).

| Date | Origine | Gravité | Catégorie | Constat | Fichier(s) |
| --- | --- | --- | --- | --- | --- |
| 2026-10-12 | EVO-007 (environnement) | mineur | ENV | `npm run check` rouge à l'étape Playwright seulement : navigateurs de `@playwright/test` 1.64 (chromium 1248, firefox) non installables dans ce conteneur (`cdn.playwright.dev` bloqué par le proxy). Les 24 tests de fumée passent sous le Chromium 1194 présent (`/opt/pw-browsers`, `executablePath` dans une configuration locale non versionnée) ; Firefox non exécuté. À relancer dans un conteneur où `npx playwright install chromium firefox` aboutit. | `playwright.config.ts`, `tests/smoke/*` |
| 2026-10-12 | EVO-008 | mineur | TEST | Le test « vue côte à côte » adapté ne vérifie plus l'indisponibilité avec un seul questionnaire (l'exemple en a désormais deux). | `src/app/commands/settings-commands.test.ts:60` |
| 2026-10-12 | EVO-008 | mineur | TEXT | Commentaires parlant encore de « bloc ». | `src/app/commands/edit-commands.ts:46`, `src/app/commands/image-commands.ts:6`, `src/ui/diagram/Diagram.tsx:115`, `src/core/model/question.ts:81` |
| 2026-10-12 | EVO-009 | mineur | I18N | Titre de la fenêtre d'avertissement assemblé en dur avec « : » à la française (espace fautive en anglais). | `src/ui/properties/HiddenFields.tsx:25` |
| 2026-10-13 | harnais | mineur | ENV | Conteneur cloud : navigateurs Playwright non téléchargeables (proxy) ; fumée sur Chromium 1194 préinstallé, sans Firefox. Sur `main` (avant EVO-012), `app.spec.ts:252` échoue de façon reproductible (vue du fragment : 1 nœud au lieu de 2) ; non investigué, le test est corrigé dans EVO-012. | `playwright.config.ts`, `tests/smoke/app.spec.ts` |
| 2026-10-13 | EVO-012 | mineur | TEST | Pas de test direct : une question surchargée « Obligatoire » mais non présentée n'est pas exigée (moteur inchangé sur ce point). | `src/core/runtime/required.test.ts` |
| 2026-10-13 | EVO-013 | mineur | TEST | Le défilement jusqu'à la question ouverte n'est pas réellement testé (liste d'exemple trop courte, `toBeInViewport` passe toujours). | `tests/smoke/evo-013.spec.ts:344` |
| 2026-10-13 | EVO-014 | mineur | TEST | Pas de test vérifiant que les messages de format des plugins mail, téléphone et adresse se taisent contrôles désactivés (seul un nombre hors bornes est testé). | `tests/smoke/evo-014.spec.ts` |
| 2026-10-13 | EVO-014 | mineur | SPEC | Une page quittée contrôles désactivés reste exclue de la garde de fin jusqu'à « Recommencer », même revisitée contrôles activés (cas limite non documenté). | `src/ui/preview/Preview.tsx:375`, `src/ui/preview/path-check.ts:21` |
| 2026-10-13 | EVO-016 | mineur | TEST | Critères « valeur unique » et « doublons » couverts seulement en unitaire. | `src/core/runtime/suggestions.test.ts` |
| 2026-10-13 | EVO-017 | mineur | TEST | Le test « projet antérieur » réécrit les options avant de prévisualiser : il ne vérifie pas une question groupée enregistrée telle quelle (format inchangé, risque faible). | `tests/smoke/evo-017.spec.ts:13-41` |
| 2026-10-14 | EVO-018 | mineur | TEXT | Le titre du test « le format courant est la version 12 » ne correspond plus à sa vérification (`>= 12`). | `src/format/format.test.ts:371-372` |
| 2026-10-14 | EVO-018 | mineur | TEST | Cas d'un tri-state ayant déjà « Ne sais pas » (option conservée) non testé. | `src/format/migrate-tristate.test.ts:31`, `src/format/migrate.ts:109` |
| 2026-10-14 | harnais | mineur | TEST | D'autres tests de fumée rouvrant l'exemple plusieurs fois dans la même page pourraient réutiliser la session restaurée (cause du défaut corrigé dans `evo-017.spec.ts`). Non vérifié. | `tests/smoke/` |
| 2026-10-14 | EVO-019 | mineur | TEST | Le critère « outline masqué, prévisualisation identique » n'est vérifié qu'en partie (largeur du wizard, sans comparaison au rendu antérieur). | `tests/smoke/evo-019.spec.ts:188-195` |
| 2026-10-14 | EVO-020 | mineur | TEST | Les chemins attendus n'ont pas de JSON Schema : le test du kit vérifie seulement leurs clés obligatoires (§15) ; leur rejeu est couvert par `tests/reference/paths.test.ts`. | `scripts/kit-dev.test.ts` |
| 2026-10-14 | EVO-023 | mineur | TEST | Le test de fumée vérifie seulement qu'un titre est dessiné, pas que version et statut y arrivent ; l'assemblage (`imageHeading`) n'est couvert qu'en unitaire. | `tests/smoke/evo-023.spec.ts:56-58`, `src/ui/diagram/useImageExport.ts:114` |
| 2026-10-14 | EVO-025 | mineur | TEST | Le contrôle de voie unique ne détecte que `.notice =` et `window.confirm` ; il ne voit pas une écriture sous forme d'objet (`set({ notice })`, `Object.assign(s, { notice })`) ni `globalThis.confirm(` ou un `confirm(` global. Aucun cas existant. | `src/app/feedback/single-path.test.ts:26-29` |
| 2026-10-19 | EVO-029 | mineur | TEST | EVO-029-038 : le test vérifie seulement `FORMAT_VERSION` et la version des fichiers d'exemple, sans charger un projet pour prouver l'absence de migration. | `src/app/commands/inventory-file.test.ts` |
| 2026-10-19 | EVO-029 | mineur | TEST | EVO-029-039 : la partie « la sauvegarde automatique s'exécute » n'est pas exercée (aucune sauvegarde déclenchée dans le test). | `src/app/commands/inventory-file.test.ts` |
| 2026-10-19 | EVO-029 | mineur | CODE | `writeXlsxFile(sheets).toBlob().then(...)` sans `catch` : un échec de génération du xlsx n'est pas signalé à l'utilisateur (`fail`, voir `docs/ERREURS.md`). | `src/app/commands/inventory-commands.ts` |
| 2026-10-19 | EVO-029 | mineur | TEST | EVO-029-020 : test unitaire quasi trivial ; « ni onglet » couvert seulement indirectement par le test EVO-029-032. | `src/core/model/inventory.test.ts` |
