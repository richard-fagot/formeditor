# Écarts connus

Écarts non bloquants relevés en relecture, à corriger seulement à la demande.

| Date | Origine | Gravité | Constat | Fichier(s) |
| --- | --- | --- | --- | --- |
| 2026-10-12 | EVO-007 (environnement) | à vérifier | `npm run check` rouge à l'étape Playwright seulement : navigateurs de `@playwright/test` 1.64 (chromium 1248, firefox) non installables dans ce conteneur (`cdn.playwright.dev` bloqué par le proxy). Les 24 tests de fumée passent sous le Chromium 1194 présent (`/opt/pw-browsers`, `executablePath` dans une configuration locale non versionnée) ; Firefox non exécuté. À relancer dans un conteneur où `npx playwright install chromium firefox` aboutit. | `playwright.config.ts`, `tests/smoke/*` |
