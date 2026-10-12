# Écarts connus

Écarts non bloquants relevés en relecture, à corriger seulement à la demande.

| Date | Origine | Gravité | Constat | Fichier(s) |
| --- | --- | --- | --- | --- |
| 2026-10-12 | EVO-006 | mineur | La description de `choiceGroup.code` ne mentionne que `AUTRE` comme code réservé, pas `NSP`. | `src/format/schemas/common.schema.json:163` |
| 2026-10-12 | EVO-006 | mineur | Pas de test du rendu interpolé `{…}` du libellé « Ne sais pas » dans le wizard (seules la collecte et le renommage des références sont testés). | `tests/smoke/evo-006.spec.ts` |
| 2026-10-12 | EVO-006 (préexistant) | mineur | Une commande de la palette lancée juste après la création d'une question rouvre la saisie de son intitulé (ex. « Activer « Autre » », « Ne sais pas »). | palette / `app/commands` |
| 2026-10-12 | Harnais | instable | `EVO-004 : sans surbrillance…` sous Firefox échoue parfois dans `npm run check` (capture blanche, `bodyInk` = 0) ; passe en relance isolée. | `tests/smoke/evo-004.spec.ts:183` |
