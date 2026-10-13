# EVO-017 — Séparer « Autre (préciser) » des groupes de choix dans la prévisualisation

Statut : en cours
Dépend de : aucune

## Besoin

Aujourd'hui, dans la prévisualisation d'une question à choix organisée en **groupes**, l'option
**« Autre (préciser) »** s'affiche à la suite des choix du dernier groupe, sans distinction. On a
l'impression qu'elle est un choix de ce groupe, alors qu'elle signifie **« aucun des choix
proposés, tous groupes confondus »**. Je veux pouvoir **identifier visuellement « Autre (préciser) »
comme une option à part, hors de tout groupe**, afin que le répondant comprenne sa portée.

Exemple de saisie :

```
Moyen de transport principal
# Transports en commun
Bus
Métro
Train
# Véhicule personnel
Voiture
Vélo
Autre (préciser)
```

Affichage attendu : le groupe « Transports en commun » et ses choix, le groupe « Véhicule
personnel » et ses choix, puis une **séparation visuelle**, puis « Autre (préciser) » au niveau des
titres de groupe (et non indenté comme un choix du dernier groupe), toujours en dernière position.

## Comportement attendu

- **Prévisualisation** :
  - Quand la question contient au moins un groupe et l'option « Autre (préciser) », celle-ci est
    séparée du dernier groupe (ex. trait séparateur ou espacement marqué) et alignée hors groupe.
  - Elle reste en dernière position et son champ de précision se comporte comme aujourd'hui.
  - Le rendu vaut pour le choix unique comme pour le choix multiple.
  - Accessibilité : « Autre (préciser) » n'est pas annoncée comme appartenant au dernier groupe.
  - Compatibilité : une question à choix **sans groupe** s'affiche exactement comme aujourd'hui.
- **Modèle / règles métier** : aucun changement ; seul le rendu évolue.

## Critères d'acceptation

- Quand je prévisualise l'exemple ci-dessus, alors « Autre (préciser) » apparaît en dernier,
  séparée visuellement du groupe « Véhicule personnel » et alignée au niveau des titres de groupe.
- Quand la question est à choix multiple avec groupes, alors la même séparation s'applique.
- Quand je sélectionne « Autre (préciser) », alors le champ de précision apparaît comme aujourd'hui.
- Quand une question avec groupes n'a pas d'option « Autre », alors l'affichage est identique à
  aujourd'hui.
- Quand une question à choix n'a pas de groupe, alors l'affichage est identique à aujourd'hui,
  avec ou sans « Autre (préciser) ».
- Quand j'ouvre un projet antérieur, alors il se charge sans erreur et ses questions groupées
  bénéficient de la nouvelle séparation.
- Quand j'exporte puis réimporte, alors le JSON est inchangé.
- Le guide utilisateur montre une question groupée avec « Autre (préciser) » séparée.

## Impacts attendus

- **Spec** : section Prévisualisation (rendu des questions à choix groupées).
- **Guide** : section sur les groupes de choix et l'option « Autre (préciser) » (capture à jour).

## Analyse demandée avant de coder

Ajouter une section « Analyse » en bas de ce fichier :

1. Faisabilité et modules impactés (d'après `docs/MAP.md`).
2. Accessibilité : vérifier la structure (fieldset / `role="group"`) pour que « Autre (préciser) »
   ne soit pas annoncée dans le dernier groupe par un lecteur d'écran.

Faisable sans ambiguïté bloquante → choix notés dans l'analyse et `docs/DECISIONS.md`, puis
réalisation. Sinon → statut « à arbitrer », options et conséquences, arrêt sans coder.
