# Écarts connus

Écarts non bloquants relevés en relecture, à corriger seulement à la demande.

| Date | Origine | Gravité | Constat | Fichier(s) |
| --- | --- | --- | --- | --- |
| 2026-10-12 | EVO-007 (environnement) | mineur | `npm run check` rouge à l'étape Playwright seulement : navigateurs de `@playwright/test` 1.64 (chromium 1248, firefox) non installables dans ce conteneur (`cdn.playwright.dev` bloqué par le proxy). Les 24 tests de fumée passent sous le Chromium 1194 présent (`/opt/pw-browsers`, `executablePath` dans une configuration locale non versionnée) ; Firefox non exécuté. À relancer dans un conteneur où `npx playwright install chromium firefox` aboutit. | `playwright.config.ts`, `tests/smoke/*` |
| 2026-10-12 | EVO-007 | mineur | Le message `option` de la civilité (produit par `contactErrors` sur une donnée importée invalide) n'est pas proposé à la surcharge par `messageParams`, contrairement au choix unique. | `src/core/validation/field.ts:168-181` |
| 2026-10-12 | EVO-007 | mineur | `displayFormatters` associe la mise en forme à la première question de même clé trouvée dans tout l'espace de travail : une question texte homonyme d'une civilité ou d'un téléphone ailleurs peut être reformatée à l'interpolation. | `src/core/contact/display.ts:18-28` |
