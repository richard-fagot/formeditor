# EVO-023 — Version et statut dans l'export d'image du logigramme

Statut : en cours
Dépend de : EVO-004 (export image du logigramme), EVO-022 (version et statut)

## Besoin

EVO-022 a ajouté une version et un statut (validé / provisoire) aux questionnaires, et les a reportés dans
le nom et le contenu du JSON exporté. L'image du logigramme (EVO-004) ne les montre pas : on ne sait pas
à quelle livraison correspond une image partagée. Je veux retrouver la version et le statut dans le nom du
fichier image et dans le titre dessiné sur l'image.

Exemple :

```
Projet « sinistres », questionnaire « blessure », version 1.0.5, provisoire, exporté le 14/10/2026
→ sinistres - blessure - 1.0.5 - provisoire - 20261014.png
→ titre dessiné : « blessure — 1.0.5 — provisoire »
```

## Comportement attendu

- **Nom du fichier** : `<projet> - <questionnaire> - <version> - <final|provisoire> - AAAAMMJJ.png`.
  - Version vide : le segment version est omis (`sinistres - blessure - provisoire - 20261014.png`).
  - Caractères interdits dans la version remplacés par `_`, comme pour le JSON (EVO-022).
  - `final` / `provisoire` : mêmes mots que le nom du fichier JSON (pas traduits).
- **Titre dessiné** (option « titre » cochée) : titre du questionnaire, puis la version (si elle n'est
  pas vide) et le statut, séparés par « — ». Le statut est affiché dans la langue de l'interface
  (« Validé » / « Provisoire », comme dans le panneau de propriétés).
  - Option « titre » décochée : l'image ne porte aucun titre, comme aujourd'hui.

## Critères d'acceptation

- Quand j'exporte l'image de « blessure » en 1.0.5 provisoire, alors le fichier s'appelle
  `<projet> - blessure - 1.0.5 - provisoire - AAAAMMJJ.png`.
- Quand j'exporte l'image d'un questionnaire validé en 1.0.4, alors le nom contient `- 1.0.4 - final -`.
- Quand la version est vide, alors le segment version est omis du nom.
- Quand la version contient un caractère interdit (ex. `1/2`), alors le nom de fichier contient `1_2`.
- Quand l'option « titre » est cochée, alors le titre dessiné contient le titre, la version et le statut.
- Quand l'option « titre » est décochée, alors l'image n'a pas de titre (comportement inchangé).
- Le guide utilisateur (section export d'image) décrit le nouveau nom de fichier et le titre.

## Impacts attendus

- **Format JSON** : aucun.
- **Spec** : § 6.4 (export image : nom du fichier et titre).
- **Guide** : section export d'image.
