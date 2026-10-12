# Écarts connus

Écarts non bloquants relevés en relecture, à corriger seulement à la demande.

| Date | Origine | Gravité | Constat | Fichier(s) |
| --- | --- | --- | --- | --- |
| 2026-10-12 | Harnais | instable sous charge | `EVO-004 : sans surbrillance…` dépasse parfois 30 s sous Firefox avec 6 navigateurs en parallèle (aussi sur `main` avant le correctif : 13/60) ; non observé dans `npm run check`. | `tests/smoke/evo-004.spec.ts:173` |
