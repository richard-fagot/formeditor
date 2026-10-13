# Écarts connus

Écarts non bloquants relevés en relecture, à corriger seulement à la demande.

| Date | Origine | Gravité | Constat | Fichier(s) |
| --- | --- | --- | --- | --- |
| 2026-10-12 | EVO-007 (environnement) | mineur | `npm run check` rouge à l'étape Playwright seulement : navigateurs de `@playwright/test` 1.64 (chromium 1248, firefox) non installables dans ce conteneur (`cdn.playwright.dev` bloqué par le proxy). Les 24 tests de fumée passent sous le Chromium 1194 présent (`/opt/pw-browsers`, `executablePath` dans une configuration locale non versionnée) ; Firefox non exécuté. À relancer dans un conteneur où `npx playwright install chromium firefox` aboutit. | `playwright.config.ts`, `tests/smoke/*` |
| 2026-10-12 | EVO-007 | mineur | Le message `option` de la civilité (produit par `contactErrors` sur une donnée importée invalide) n'est pas proposé à la surcharge par `messageParams`, contrairement au choix unique. | `src/core/validation/field.ts:168-181` |
| 2026-10-12 | EVO-007 | mineur | `displayFormatters` associe la mise en forme à la première question de même clé trouvée dans tout l'espace de travail : une question texte homonyme d'une civilité ou d'un téléphone ailleurs peut être reformatée à l'interpolation. | `src/core/contact/display.ts:18-28` |
| 2026-10-12 | EVO-008 | mineur | Le test « vue côte à côte » adapté ne vérifie plus l'indisponibilité avec un seul questionnaire (l'exemple en a désormais deux). | `src/app/commands/settings-commands.test.ts:60` |
| 2026-10-12 | EVO-008 | mineur | Commentaires parlant encore de « bloc ». | `src/app/commands/edit-commands.ts:46`, `src/app/commands/image-commands.ts:6`, `src/ui/diagram/Diagram.tsx:115`, `src/core/model/question.ts:81` |
| 2026-10-12 | EVO-008 | mineur | Une question de bibliothèque utilisée seulement dans un fragment a ses références signalées « inconnues » (`scopesFor` ne prend que les questionnaires ; préexistant avec les blocs). | `src/core/validation/refs-check.ts` |
| 2026-10-12 | EVO-008 | mineur | Débogage : sur la dernière page d'un fragment, « Conditions évaluées » ne montre pas les arêtes de l'appelant qui seront suivies. | prévisualisation |
| 2026-10-12 | EVO-009 | mineur | L'avertissement au masquage ne liste que les expressions du graphe de l'instance ; dans un fragment, les références `alias.cle.champ` des appelants n'y figurent pas (la vérification `hiddenField` les signale ensuite). | `src/app/store/library-edits.ts:146-150` |
| 2026-10-12 | EVO-009 | mineur | Titre de la fenêtre d'avertissement assemblé en dur avec « : » à la française (espace fautive en anglais). | `src/ui/properties/HiddenFields.tsx:25` |
| 2026-10-13 | EVO-010 | mineur | `questionnaire.duplicate` et `library.duplicate` restent actifs dans la palette quand rien n'est à dupliquer (onglet actif non questionnaire, aucun élément de bibliothèque affiché) ; la commande ne fait alors rien, sans message. | `src/app/commands/clipboard-commands.ts` |
| 2026-10-13 | EVO-010 | mineur | Non couverts par les tests (hors critères d'acceptation) : décalage de 40 px quand le pointeur est hors du logigramme, refus d'un cycle d'appels indirect au collage, annulation d'une duplication. | `src/app/commands/clipboard-commands.test.ts` |
| 2026-10-13 | EVO-010 | mineur | `Ctrl+D` (`node.duplicate`, préexistant) suffixe les clés sans réécrire les références internes à la sélection, contrairement au collage ; la différence est visible dans le menu contextuel d'un nœud. | `src/app/store` (duplication de nœuds) |
| 2026-10-13 | EVO-011 | mineur | Supprimer un fragment dont des questions sont commentées ne demande pas de confirmation ; les commentaires disparaissent avec sa mise en page (annulable). | `src/app/commands/library-item-commands.ts` (`library.delete`) |
