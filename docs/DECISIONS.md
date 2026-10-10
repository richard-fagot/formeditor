# Décisions

Une ligne par choix notable pris en cours de réalisation (écart à la spec, ambiguïté tranchée, librairie remplacée).

| Date | Décision | Raison |
| --- | --- | --- |
| 2026-10-10 | TypeScript 6 au lieu de 7 | dependency-cruiser ne prend pas encore en charge TypeScript 7. |
| 2026-10-10 | Les plugins peuvent importer `ui/expression-editor` en plus de `core` et `ui-kit` | Leurs panneaux de propriétés saisissent des expressions ; évite de réinjecter l'éditeur par props. |
| 2026-10-10 | Tailwind v4 (plugin Vite) ; composants Radix copiés dans `ui-kit` au besoin, sans la CLI shadcn | Moins d'outillage, même résultat. |
