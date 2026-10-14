# EVO-021 — Astérisque d'obligation conforme à la surcharge en prévisualisation

Statut : en cours
Dépend de : aucune (s'appuie sur le mécanisme de surcharge de question existant)

## Besoin

Aujourd'hui, la prévisualisation affiche l'astérisque de champ obligatoire d'après la définition
d'origine de la question, sans tenir compte de sa **surcharge**. Une question obligatoire surchargée
en **facultative** garde son astérisque ; à l'inverse, une question facultative surchargée en
**obligatoire** n'en a pas. La prévisualisation induit donc en erreur sur ce que verra le répondant.

Je veux que l'astérisque reflète le **caractère obligatoire effectif** de la question à l'endroit où
elle est affichée, c'est-à-dire après application de la surcharge.

Exemple d'usage :

```
Question « Date de naissance » : obligatoire (définition d'origine)
  → surcharge dans l'écran « Ayant droit » : facultative

Question « Téléphone » : facultative (définition d'origine)
  → surcharge dans l'écran « Souscripteur » : obligatoire
```

Affichage attendu :

- écran « Ayant droit » : « Date de naissance » **sans** astérisque ;
- écran « Souscripteur » : « Téléphone » **avec** astérisque ;
- partout où ces questions ne sont pas surchargées : affichage d'origine inchangé.

## Comportement attendu

- **Modèle / règles métier** :
  - Caractère obligatoire effectif = valeur de la surcharge si elle porte sur l'obligation, sinon
    valeur de la définition d'origine.
  - Une surcharge qui ne touche pas à l'obligation (libellé, aide, etc.) ne change rien à
    l'astérisque.
  - Une même question peut apparaître avec et sans astérisque selon le contexte où elle est
    surchargée.
- **Prévisualisation** :
  - L'astérisque est affiché si et seulement si la question est obligatoire effective.
  - Le contrôle de saisie bloquant (champ vide refusé) suit la même valeur effective que
    l'astérisque : pas d'astérisque sans blocage, pas de blocage sans astérisque.
- **Logigramme / panneau de propriétés** : sans objet (aucun changement attendu).

## Critères d'acceptation

- Quand une question obligatoire est surchargée en facultative, alors elle s'affiche sans astérisque
  dans la prévisualisation et peut être laissée vide.
- Quand une question facultative est surchargée en obligatoire, alors elle s'affiche avec astérisque
  et ne peut pas être laissée vide.
- Quand une surcharge ne modifie pas le caractère obligatoire, alors l'astérisque est celui de la
  définition d'origine.
- Quand une même question est surchargée différemment dans deux contextes, alors chaque contexte
  affiche l'astérisque correspondant à sa propre surcharge.
- Quand je modifie ou supprime la surcharge, alors la prévisualisation se met à jour en conséquence.
- Quand une question n'est pas surchargée, alors le comportement est identique à aujourd'hui.
- Quand j'ouvre un projet antérieur, alors il se charge sans erreur et les astérisques reflètent les
  surcharges existantes.
- Quand j'exporte puis réimporte, alors surcharges et affichage des astérisques sont identiques.
- Le guide utilisateur précise que l'astérisque reflète l'obligation après surcharge.

## Impacts attendus

- **Format JSON** : a priori aucun (correction d'affichage) — à confirmer à l'analyse.
- **Spec** : §… (surcharge de question), §… (prévisualisation / champs obligatoires).
- **Guide** : section prévisualisation et section surcharge.

## Analyse demandée avant de coder

Ajouter une section « Analyse » en bas de ce fichier :

1. Faisabilité et modules impactés (d'après `docs/MAP.md`).
2. Origine de l'écart : identifier où la prévisualisation lit le caractère obligatoire et pourquoi la
   surcharge n'est pas appliquée. Cible : une seule fonction de résolution de la valeur effective,
   utilisée à la fois par l'astérisque et par le contrôle de saisie. Si le contrôle de saisie applique
   déjà la surcharge, le noter : l'écart est alors purement visuel.
3. Obligation conditionnelle : si le caractère obligatoire peut être porté par une expression
   (y compris dans une surcharge), préciser comment l'astérisque se comporte (évaluation dynamique
   attendue) ; si ce cas sort du périmètre, le signaler plutôt que l'implémenter partiellement.
4. Autres rendus concernés : vérifier si d'autres affichages (export, récapitulatif, impression)
   montrent l'obligation et doivent suivre la même règle ; les lister sans les traiter s'ils sortent
   du périmètre.

Faisable sans ambiguïté bloquante → choix notés dans l'analyse et `docs/DECISIONS.md`, puis
réalisation. Sinon → statut « à arbitrer », options et conséquences, arrêt sans coder.
