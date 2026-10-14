# EVO-022 — Versionning des questionnaires et des éléments de bibliothèque

Statut : à faire
Dépend de : aucune (s'appuie sur la validation existante des questionnaires et des éléments de bibliothèque)

## Besoin

Aujourd'hui, un questionnaire ou un élément de bibliothèque n'a pas de numéro de version : rien ne permet
de distinguer deux livraisons d'un même questionnaire, ni de savoir lesquels ont changé. Je veux pouvoir
**affecter une version** à chaque **questionnaire** et à chaque **élément de bibliothèque**, afin
d'identifier et de livrer **uniquement ce qui a changé**.

La version est un **champ libre, géré manuellement** : l'outil n'impose ni format ni incrément. La version
en production est, par convention, la plus haute qu'un questionnaire ait obtenue ; l'outil ne fait aucune
comparaison de versions.

Seule règle : **une version validée est figée**. Pour la modifier, je dois d'abord **désactiver la
validation**. Cela m'oblige à prendre conscience que je fais évoluer l'objet. L'inverse n'est pas vrai :
je peux désactiver puis réactiver la validation **sans changer la version** (correction d'un souci sans
nouvelle livraison).

Cas particulier structurant : un questionnaire qui utilise un élément de bibliothèque dont la version a
changé doit, en pratique, changer lui aussi de version. Cela reste manuel, mais l'outil doit **m'alerter**.

Exemple d'usage :

```
Bibliothèque  : « Identité assuré »   version 2.1.0   validé
Questionnaire : « blessure »          version 1.0.5   provisoire   (utilise « Identité assuré »)
Questionnaire : « dc »                version 1.0.4   validé       (utilise « Identité assuré »)

→ Je désactive la validation de « Identité assuré », je passe sa version à 2.2.0, je revalide.
→ « dc » affiche une alerte : « Identité assuré » est passé de 2.1.0 à 2.2.0 depuis sa validation.
```

Affichage attendu : la version et le statut (Validé / Provisoire) apparaissent dans le panneau de
propriétés du questionnaire et de l'élément de bibliothèque ; le champ version est grisé tant que l'objet
est validé ; l'alerte de dépendance est visible sur le questionnaire concerné.

Fichiers exportés :

```
blessure - 1.0.5 - provisoire.json
dc - 1.0.4 - final.json
```

## Comportement attendu

- **Saisie / syntaxe** :
  - Champ texte libre, sans contrôle de format (convention recommandée dans le guide : `X.Y.Z`).
  - Le champ peut être vide tant que l'objet est provisoire.
  - Compatibilité : un questionnaire ou un élément sans version reste utilisable comme aujourd'hui.
- **Modèle / règles métier** :
  - Questionnaire et élément de bibliothèque portent chacun une `version` et un statut
    `provisoire` | `final` (= validé).
  - Objet validé → version non modifiable. Désactiver la validation → version de nouveau modifiable,
    sans obligation de la changer.
  - La validation est refusée si la version est vide (message explicite).
  - À la validation d'un questionnaire, l'outil mémorise la version de chaque élément de bibliothèque
    qu'il utilise (**versions de référence**). Revalider met à jour ces versions de référence.
- **Alertes (non bloquantes)** :
  - Questionnaire : si la version actuelle d'un élément de bibliothèque utilisé diffère de sa version de
    référence, alerte listant les éléments concernés (« ancienne → nouvelle version »). L'alerte disparaît
    à la revalidation du questionnaire.
  - Élément de bibliothèque : quand je modifie sa version, l'outil indique les questionnaires qui
    l'utilisent (validés ou non).
  - Questionnaire validé utilisant un élément de bibliothèque provisoire : alerte à la validation.
- **Panneau de propriétés** : champ « Version » et indicateur de statut pour le questionnaire et pour
  l'élément de bibliothèque ; champ grisé avec infobulle « Désactiver la validation pour modifier la
  version » quand l'objet est validé.
- **Export** :
  - Le JSON contient `version` et `statut` (`final` | `provisoire`) du questionnaire, ainsi que la version
    et le statut de chaque élément de bibliothèque utilisé.
  - Nom de fichier : `<nom> - <version> - <final|provisoire>.json`.
  - Version vide : le segment version est omis (`blessure - provisoire.json`).
  - Les caractères interdits dans un nom de fichier, présents dans la version, sont remplacés par `_`.

## Critères d'acceptation

- Quand je saisis « 1.0.5 » sur un questionnaire provisoire, alors la version est enregistrée telle quelle.
- Quand le questionnaire est validé, alors le champ version n'est pas modifiable.
- Quand je désactive la validation, alors le champ version redevient modifiable.
- Quand je désactive puis réactive la validation sans toucher à la version, alors la version est conservée
  et aucune erreur n'est levée.
- Quand je tente de valider avec une version vide, alors la validation est refusée avec un message.
- Les quatre critères précédents valent à l'identique pour un élément de bibliothèque.
- Quand je change la version d'un élément de bibliothèque utilisé par un questionnaire validé, alors le
  questionnaire affiche une alerte « <élément> : 2.1.0 → 2.2.0 ».
- Quand je revalide ce questionnaire, alors l'alerte disparaît.
- Quand je modifie la version d'un élément de bibliothèque, alors la liste des questionnaires qui
  l'utilisent est affichée.
- Quand je valide un questionnaire qui utilise un élément provisoire, alors une alerte non bloquante
  s'affiche.
- Quand j'exporte « blessure » en 1.0.5 provisoire, alors le fichier s'appelle
  `blessure - 1.0.5 - provisoire.json` et contient `version` et `statut`.
- Quand j'exporte « dc » en 1.0.4 validé, alors le fichier s'appelle `dc - 1.0.4 - final.json`.
- Quand la version contient un caractère interdit (ex. `1/2`), alors le nom de fichier est valide (`1_2`).
- Quand je n'utilise pas la version, alors le comportement est identique à aujourd'hui (hors suffixe
  de statut dans le nom de fichier).
- Quand j'ouvre un projet antérieur, alors il se charge sans erreur, versions vides, statuts conservés, et
  aucune alerte de dépendance n'apparaît.
- Quand j'exporte puis réimporte, alors versions, statuts et versions de référence sont identiques.
- Le guide utilisateur décrit la version, le verrouillage par la validation, les alertes de dépendance et
  le nommage des fichiers exportés.

## Impacts attendus

- **Format JSON** : nouvelle `formatVersion` et migration (version vide, versions de référence
  initialisées sur les versions actuelles), JSON Schema, `docs/FORMAT.md` (champs `version`, `statut`,
  versions de référence), exemple mis à jour avec un questionnaire validé utilisant un élément de
  bibliothèque.
- **Spec** : § Bibliothèque (version, statut), § Validation (verrouillage de la version), § Export
  (contenu et nommage des fichiers).
- **Guide** : sections Validation, Bibliothèque, Export.

## Analyse demandée avant de coder

Ajouter une section « Analyse » en bas de ce fichier :

1. Faisabilité et modules impactés (d'après `docs/MAP.md`).
2. Détection des dépendances : cible = savoir, pour chaque questionnaire, quels éléments de bibliothèque
   il utilise (y compris indirectement si un élément en inclut un autre). Si le parcours indirect est
   coûteux ou ambigu, se limiter aux dépendances directes et le noter.
3. Format de stockage : où ranger les versions de référence (dans le questionnaire, à côté de chaque
   référence à un élément ?) et migration des projets existants sans fausse alerte.
4. Export des éléments de bibliothèque : s'ils sont exportés en fichiers distincts, appliquer la même
   règle de nommage ; sinon, confirmer qu'ils ne figurent que dans le JSON du questionnaire.

Faisable sans ambiguïté bloquante → choix notés dans l'analyse et `docs/DECISIONS.md`, puis
réalisation. Sinon → statut « à arbitrer », options et conséquences, arrêt sans coder.
