# EVO-012 — Surcharger le caractère obligatoire d'une question réutilisée

Statut : en cours
Dépend de : aucune (s'appuie sur la bibliothèque de questions et les fragments existants)

## Besoin

Aujourd'hui, une question issue de la **bibliothèque** porte son caractère obligatoire/facultatif
une fois pour toutes : partout où elle est utilisée, elle l'est avec le même caractère. Pour
qu'une même question soit obligatoire dans un formulaire et facultative dans un autre, je dois
la dupliquer, ce qui casse le lien avec la bibliothèque.

Je veux pouvoir **surcharger le caractère obligatoire/facultatif** d'une question réutilisée
**au niveau de son utilisation**, sans toucher à la définition de bibliothèque :

- dans un **formulaire** qui utilise une question de la bibliothèque ;
- dans un **fragment** qui utilise une question de la bibliothèque ;
- dans un **formulaire** qui utilise un **fragment**, pour chacune des questions de ce fragment.

Cas structurant : une même question de bibliothèque peut ainsi avoir **trois valeurs
différentes** selon le contexte (bibliothèque, fragment, formulaire). La règle est que **le
niveau le plus proche de l'utilisation l'emporte**.

Exemple d'usage :

```
Bibliothèque
  Q_TEL « Téléphone »                    → facultatif

Fragment F_COORDONNEES
  Q_TEL                                  → surchargé : obligatoire

Formulaire « Adhésion »
  utilise F_COORDONNEES
    Q_TEL                                → hérité (obligatoire, via le fragment)

Formulaire « Demande de rappel »
  utilise F_COORDONNEES
    Q_TEL                                → surchargé : facultatif
```

Affichage attendu : dans le formulaire « Adhésion », Q_TEL apparaît obligatoire, avec
l'indication qu'elle hérite du fragment ; dans « Demande de rappel », elle apparaît facultative,
avec l'indication d'une surcharge locale. La bibliothèque continue d'afficher Q_TEL facultative.

## Comportement attendu

- **Modèle / règles métier** :
  - Le caractère obligatoire d'une question utilisée prend une valeur parmi trois :
    **Hérité** (par défaut), **Obligatoire**, **Facultatif**.
  - Résolution de la valeur effective, du plus proche au plus lointain :
    surcharge dans le formulaire → surcharge dans le fragment → valeur de bibliothèque.
  - Si un fragment en inclut un autre, chaque niveau d'inclusion peut surcharger ; la même
    règle du plus proche s'applique.
  - Tant qu'une utilisation est en « Hérité », elle suit les modifications ultérieures de la
    bibliothèque (ou du fragment). Une surcharge explicite reste figée, même si elle est égale
    à la valeur héritée au moment où elle est posée.
  - La surcharge ne porte **que** sur le caractère obligatoire : libellé, type, options et
    autres propriétés restent ceux de la bibliothèque.
  - Une question obligatoire mais masquée par une condition d'affichage n'est pas exigée
    (comportement inchangé).
  - Compatibilité : une question utilisée sans surcharge se comporte exactement comme
    aujourd'hui.
- **Paramétrage** :
  - Dans le panneau de propriétés d'une question utilisée depuis la bibliothèque (dans un
    formulaire ou un fragment), un sélecteur « Caractère obligatoire » propose
    « Hérité (Obligatoire|Facultatif) », « Obligatoire », « Facultatif ». Le libellé « Hérité »
    affiche la valeur héritée et sa provenance (bibliothèque ou nom du fragment).
  - Dans un formulaire, le panneau de propriétés d'un fragment utilisé liste ses questions
    avec, pour chacune, ce même sélecteur.
  - Une action « Revenir à la valeur héritée » supprime la surcharge.
- **Logigramme** : le nœud d'une question affiche sa valeur effective (marqueur obligatoire
  existant) et un indicateur discret lorsqu'elle est surchargée localement.
- **Prévisualisation** : le wizard applique la valeur effective (astérisque, blocage de la
  progression si non renseignée).
- **Panneau de propriétés** : la valeur effective et sa provenance sont visibles sans ouvrir
  le sélecteur ; les questions surchargées sont repérables dans la liste d'un fragment utilisé.
- **Bibliothèque** : modifier le caractère obligatoire d'une question de bibliothèque se répercute
  sur toutes ses utilisations en « Hérité » ; les utilisations surchargées ne bougent pas.

## Critères d'acceptation

- Quand je passe Q_TEL en « Obligatoire » dans le fragment F_COORDONNEES, alors Q_TEL est
  obligatoire dans ce fragment et dans tous les formulaires qui l'utilisent sans surcharge, et
  reste facultative dans la bibliothèque.
- Quand, dans le formulaire « Demande de rappel », je passe Q_TEL (issue de F_COORDONNEES) en
  « Facultatif », alors elle est facultative dans ce formulaire uniquement ; le fragment et le
  formulaire « Adhésion » ne changent pas.
- Quand je surcharge une question de bibliothèque utilisée directement dans un formulaire, alors
  seule cette utilisation est affectée.
- Quand une utilisation est en « Hérité » et que je modifie la valeur en bibliothèque (ou dans le
  fragment), alors la valeur effective de l'utilisation change en conséquence.
- Quand une utilisation est surchargée et que je modifie la valeur en bibliothèque, alors la
  valeur effective de l'utilisation ne change pas.
- Quand je surcharge avec une valeur égale à la valeur héritée, alors la surcharge est conservée
  et reste figée si la valeur héritée change ensuite.
- Quand je choisis « Revenir à la valeur héritée », alors la surcharge disparaît et la valeur
  effective redevient celle du niveau supérieur.
- Quand un fragment en inclut un autre, alors la surcharge du niveau le plus proche du formulaire
  l'emporte.
- Quand une question est surchargée, alors un indicateur est visible dans le logigramme et le
  panneau de propriétés.
- Quand je prévisualise un formulaire, alors le wizard exige les questions obligatoires selon
  leur valeur effective, et seulement si elles sont affichées.
- Quand je n'utilise pas la surcharge, alors le comportement est identique à aujourd'hui.
- Quand j'ouvre un projet antérieur, alors il se charge sans erreur et toutes les utilisations
  sont en « Hérité ».
- Quand j'exporte puis réimporte, alors les surcharges et les valeurs effectives sont identiques.
- Le guide utilisateur décrit la surcharge du caractère obligatoire, la règle du niveau le plus
  proche et le retour à la valeur héritée.

## Impacts attendus

- **Format JSON** : nouvelle `formatVersion` et migration (aucune surcharge = « Hérité »),
  JSON Schema (propriété facultative sur la référence à une question de bibliothèque et sur la
  référence à une question d'un fragment utilisé), `docs/FORMAT.md` (surcharge et résolution),
  exemple mis à jour avec une surcharge dans un fragment et une dans un formulaire.
- **Spec** : § Bibliothèque de questions (héritage), § Fragments (surcharges des questions
  incluses), § Panneau de propriétés, § Prévisualisation.
- **Guide** : sections Bibliothèque, Fragments, Propriétés d'une question.

## Analyse demandée avant de coder

Ajouter une section « Analyse » en bas de ce fichier :

1. Faisabilité et modules impactés (d'après `docs/MAP.md`).
2. Adressage d'une question à l'intérieur d'un fragment utilisé : la cible est de surcharger
   depuis le formulaire une question précise d'un fragment, y compris à travers des fragments
   imbriqués. Si les questions d'un fragment n'ont pas d'identifiant stable vu du formulaire
   (ou si une même question apparaît deux fois dans un fragment), proposer un mode
   d'adressage (chemin d'identifiants, etc.) ou, à défaut, limiter la surcharge depuis le
   formulaire au premier niveau d'inclusion.
3. Stockage et export : la cible est de ne stocker que la surcharge (absente = hérité). Indiquer
   si l'export destiné aux développeurs doit en plus porter la valeur effective résolue, pour
   leur éviter de réimplémenter la cascade, et comment éviter l'incohérence entre les deux.
4. Comportement lorsqu'une question surchargée disparaît du fragment ou de la bibliothèque :
   surcharge orpheline supprimée silencieusement, conservée, ou signalée.

Faisable sans ambiguïté bloquante → choix notés dans l'analyse et `docs/DECISIONS.md`, puis
réalisation. Sinon → statut « à arbitrer », options et conséquences, arrêt sans coder.
