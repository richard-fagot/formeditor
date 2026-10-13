# EVO-010 — Copier-coller de questions et duplication d'objets

Statut : en cours
Dépend de : EVO-008 (fragments, pour le collage dans et depuis un fragment)

## Besoin

Aujourd'hui, pour reprendre dans un questionnaire des questions proches de celles d'un autre, je
dois les recréer une à une. Et pour partir d'un questionnaire ou d'un objet de la bibliothèque
existant, je dois tout ressaisir. Je veux pouvoir :

- **copier-coller** une ou plusieurs questions d'un questionnaire ou d'un fragment vers un autre
  questionnaire ou fragment (ou vers le même) ;
- **dupliquer** un questionnaire ou un objet de la bibliothèque (question, bloc, fragment).

Dans les deux cas, **aucun lien** n'est conservé avec l'original : tout se passe comme si j'avais
créé les copies à la main. Modifier la copie ne touche pas l'original, et inversement.

Cas particulier qui structure le besoin : une copie peut contenir un nœud qui, lui, **référence**
un objet de la bibliothèque (instance de bloc ou de fragment). Créé à la main, ce nœud serait une
référence ; la copie reste donc une référence au même objet, pas une copie de l'objet.

Exemple d'usage :

```
Questionnaire « declaration-sinistre »
  … → date_sinistre → lieu_sinistre → [tiers implique ?] ─oui→ nom_tiers
  sélection : date_sinistre, lieu_sinistre, [tiers implique ?], nom_tiers   →  Ctrl+C

Questionnaire « demande-remboursement »   (contient déjà une question date_sinistre)
  Ctrl+V
```

Affichage attendu : les quatre nœuds apparaissent dans `demande-remboursement`, à l'emplacement
du pointeur, avec les arêtes qui les reliaient entre eux, **non raccordés** au reste du graphe et
sélectionnés pour pouvoir être déplacés. La clé `date_sinistre` étant déjà prise, la copie devient
`date_sinistre_2`, et la condition de `[tiers implique ?]` qui la citait est mise à jour.

## Comportement attendu

- **Copier-coller — sélection** :
  - Copier (Ctrl+C, menu contextuel) porte sur les nœuds sélectionnés dans le logigramme ; coller
    (Ctrl+V, menu contextuel) les insère dans l'onglet actif, questionnaire ou fragment.
  - Tous les types de nœuds sont copiables, y compris les instances de bloc et de fragment.
  - Les **arêtes internes** à la sélection (les deux extrémités copiées) sont copiées avec leurs
    conditions et leur rang. Les arêtes vers des nœuds non sélectionnés sont abandonnées.
  - Les nœuds collés sont placés à l'emplacement du pointeur (ou décalés par rapport à l'original
    si le pointeur est hors du logigramme), en conservant leur disposition relative, et restent
    sélectionnés après le collage.
  - Coller plusieurs fois le même contenu crée à chaque fois de nouveaux objets.
  - Un collage s'annule en une seule fois (Ctrl+Z).
  - Hors périmètre : couper (Ctrl+X) et le lien entre copie et original.
- **Copier-coller — règles métier** :
  - Les nœuds collés reçoivent de **nouveaux identifiants internes**.
  - **Clés** : une clé déjà utilisée dans la cible est suffixée (`_2`, `_3`…). Les références à ces
    clés **à l'intérieur de la sélection** (conditions d'affichage, conditions d'arêtes, entrées
    dynamiques, expressions) sont réécrites avec la nouvelle clé.
  - Les références à des questions **hors sélection** sont conservées telles quelles. Si la cible
    ne contient pas ces questions, l'outil le signale par les vérifications, sans bloquer.
  - Les **alias** d'instances de bloc ou de fragment suivent la même règle que les clés.
  - Une instance collée référence **le même objet** de la bibliothèque que l'original.
  - Tout le contenu de la question est copié : libellés multilingues, options et groupes
    (EVO-003), « Autre (préciser) », « Ne sais pas » (EVO-006), contrôles, propriétés.
  - **Collage dans un fragment** : les nœuds de départ et de fin ne sont pas collés (un fragment
    n'en a pas, EVO-008). Les arêtes qui y aboutissaient sont abandonnées. Un message indique ce
    qui a été écarté.
  - **Cycle** : une instance d'un fragment collée dans ce même fragment (ou dans un fragment qu'il
    appelle) est refusée, comme à la création manuelle ; un message l'indique, le reste est collé.
  - Une seule fin et un seul départ par questionnaire : un départ collé dans un questionnaire qui
    en a déjà un n'est pas collé (même règle que la création manuelle), avec message.
- **Copier-coller — portée** : à l'intérieur du projet ouvert, entre ses onglets (ou dans le même
  onglet). Pas de copie entre deux projets.
- **Duplication** :
  - Action « Dupliquer » sur un questionnaire (liste des questionnaires) et sur chaque objet de la
    bibliothèque (question, bloc, fragment), par le menu contextuel.
  - La copie est créée juste après l'original, nommée « Copie de <nom> » (puis « Copie 2 de… »),
    avec un nouvel identifiant et une clé ou un nom technique unique. Elle s'ouvre en édition.
  - Le contenu est copié intégralement. Les références qu'il contient vers d'autres objets de la
    bibliothèque **restent des références** : un fragment dupliqué qui appelle un autre fragment
    appelle toujours le même.
  - La copie n'a **aucun appelant** : les questionnaires qui utilisaient l'original continuent à
    utiliser l'original.
- **Logigramme** : aucun nouvel affichage ; les nœuds collés ont le rendu habituel.
- **Prévisualisation** : une copie se comporte exactement comme un objet créé à la main.
- **Vérifications** (§4.6) : les vérifications existantes s'appliquent après collage (nœuds non
  raccordés, références à des clés absentes, etc.) ; pas de nouvelle vérification.

## Critères d'acceptation

- Quand je copie les quatre nœuds de l'exemple et les colle dans `demande-remboursement`, alors
  quatre nouveaux nœuds apparaissent au pointeur, reliés entre eux comme dans l'original, non
  raccordés au reste et sélectionnés.
- Quand la clé `date_sinistre` existe déjà dans la cible, alors la copie s'appelle
  `date_sinistre_2` et les conditions de la sélection qui la citaient référencent `date_sinistre_2`.
- Quand une question collée référence une question hors sélection absente de la cible, alors la
  référence est conservée et les vérifications la signalent.
- Quand je modifie une question collée, alors l'original est inchangé, et inversement.
- Quand je colle deux fois la même sélection, alors j'obtiens deux jeux de nœuds distincts aux
  clés distinctes.
- Quand je copie une instance de fragment et la colle, alors le nouveau nœud référence le même
  fragment, avec un alias unique dans la cible.
- Quand je colle une sélection contenant un départ et une fin dans un fragment, alors ces deux
  nœuds sont écartés avec un message et le reste est collé.
- Quand je colle dans un fragment une instance de ce même fragment, alors elle est refusée avec un
  message et le reste est collé.
- Quand je fais Ctrl+Z après un collage, alors tout le collage est annulé en une fois.
- Quand je duplique un questionnaire, alors « Copie de <nom> » apparaît, s'ouvre, se prévisualise
  comme l'original, et le modifier ne modifie pas l'original.
- Quand je duplique un fragment utilisé par trois questionnaires, alors la copie n'a aucun
  appelant et les trois questionnaires utilisent toujours l'original.
- Quand je duplique un fragment qui appelle un autre fragment, alors la copie appelle le même
  fragment (pas de copie en cascade).
- Quand je n'utilise ni copier-coller ni duplication, alors le comportement est identique à
  aujourd'hui.
- Quand j'ouvre un projet antérieur, alors il se charge sans erreur.
- Quand j'exporte puis réimporte un projet contenant des objets collés ou dupliqués, alors ils
  sont identiques et indépendants de leurs originaux.
- Le guide utilisateur décrit le copier-coller (raccourcis, règles de renommage, cas du fragment)
  et la duplication.

## Impacts attendus

- **Format JSON** : sans objet (une copie est un objet ordinaire, le presse-papiers est interne).
- **Spec** : §… (logigramme : sélection, raccourcis), §… (bibliothèque : actions sur les objets),
  §… (questionnaires : actions sur la liste).
- **Guide** : édition du logigramme (copier-coller), bibliothèque (dupliquer), raccourcis.

## Analyse demandée avant de coder

Ajouter une section « Analyse » en bas de ce fichier :

1. Faisabilité et modules impactés (d'après `docs/MAP.md`).
2. **Réécriture des références** : cible, réécrire toutes les références internes à la sélection
   (conditions, entrées dynamiques, expressions). Contrainte : les expressions sont-elles
   analysées (arbre) ou stockées en texte ? Alternative attendue : si la réécriture fiable est
   impossible, ne pas renommer silencieusement et signaler les références à revoir.

Faisable sans ambiguïté bloquante → choix notés dans l'analyse et `docs/DECISIONS.md`, puis
réalisation. Sinon → statut « à arbitrer », options et conséquences, arrêt sans coder.
