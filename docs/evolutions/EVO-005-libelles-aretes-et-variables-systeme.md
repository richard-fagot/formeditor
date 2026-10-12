# EVO-005 — Libellé personnalisé des branches et des variables système

Statut : en cours
Dépend de : aucune

## Besoin

Sur le logigramme, une branche affiche aujourd'hui sa condition brute
(`relation.groupe = "AA" and sys.profil = "UD"`). Sur un graphe chargé, c'est illisible et ça ne
dit pas l'intention métier. Je veux pouvoir donner à une branche un **libellé personnalisé**
(« Ayant droit adhérent », « Sinon », « Sinistre ancien »).

De même, une variable de l'état du système n'est connue que par sa clé technique (`sys.profil`).
Je veux pouvoir lui donner un **libellé personnalisé** (« Profil de l'utilisateur connecté »),
pour savoir de quoi il s'agit sans revenir à la documentation du logiciel hôte.

Ces libellés servent à la **lecture de la spécification** (moi, l'équipe de dev). Ils ne sont jamais
affichés à l'utilisateur final du formulaire.

## Comportement attendu

### Branches (arêtes)

- Toute arête peut porter un libellé facultatif, qu'elle ait une condition ou non (utile pour
  « Sinon »). Cela vaut aussi pour les arêtes issues d'une sortie de bloc.
- Saisie dans le panneau de propriétés de l'arête, au-dessus de la condition. Texte libre sur une
  ligne, sans interpolation, en une seule langue (pas d'internationalisation : ce n'est pas un
  texte destiné à l'utilisateur final).
- **Affichage sur le logigramme** :
  - avec libellé → le libellé est affiché à la place de la condition ;
  - sans libellé → comportement inchangé ;
  - la condition reste consultable au survol de l'arête (infobulle), et le libellé au survol s'il
    est tronqué.
- Le libellé n'a aucun effet sur la navigation : seuls la condition et le rang comptent.

### Variables de l'état du système

- Toute variable du dictionnaire peut porter un libellé facultatif, en une seule langue.
  Pour une variable de type liste d'objets, chaque champ de l'objet peut aussi en porter un.
- Saisie dans l'écran du dictionnaire de l'état du système, à côté de la clé.
- Le libellé apparaît :
  - dans le dictionnaire ;
  - dans l'**autocomplétion** des expressions, à côté de la clé ; la recherche porte aussi sur le
    libellé (taper « profil » propose `sys.profil` même si la clé était `sys.prf`) ;
  - au survol d'une référence `sys.…` dans un éditeur d'expression ;
  - dans l'éditeur de scénarios, en face de chaque valeur à saisir.
- Le libellé ne s'utilise **pas** dans les expressions : on écrit toujours la clé.

## Critères d'acceptation

- Quand je saisis le libellé « Ayant droit » sur une arête conditionnée, alors le logigramme
  affiche « Ayant droit » sur l'arête, et la condition au survol.
- Quand j'efface ce libellé, alors l'arête affiche de nouveau sa condition.
- Quand je mets un libellé sur une arête sans condition, alors il s'affiche.
- Quand je mets un libellé sur une arête issue d'une sortie de bloc, alors il s'affiche.
- Quand le libellé est plus long que l'espace disponible, alors il est tronqué avec « … » et
  complet au survol.
- Quand je prévisualise un parcours, alors les libellés d'arêtes ne changent rien au chemin suivi
  et n'apparaissent pas dans le wizard.
- Quand je donne le libellé « Profil connecté » à `sys.profil`, alors il s'affiche dans le
  dictionnaire, dans l'autocomplétion, au survol de `sys.profil` dans une expression et dans
  l'éditeur de scénarios.
- Quand je tape « connecté » dans un éditeur d'expression, alors l'autocomplétion propose
  `sys.profil`.
- Quand je donne un libellé à un champ d'une variable liste d'objets, alors il apparaît dans
  l'autocomplétion de ce champ.
- Quand j'ouvre un projet antérieur, alors il se charge sans erreur (aucun libellé).
- Quand j'exporte puis réimporte, alors les libellés d'arêtes et de variables sont identiques.
- Toute action d'annulation (undo) annule bien une saisie ou un effacement de libellé.
- Le guide utilisateur décrit les deux actions.

## Impacts attendus

- **Format JSON** : propriété facultative de libellé sur l'arête, sur la variable système et sur
  les champs d'une liste d'objets ; selon la convention du projet, `formatVersion` et migration,
  JSON Schema, `docs/FORMAT.md`, exemple mis à jour (au moins une arête et une variable libellées).
  Le libellé est exporté pour que l'équipe de dev en profite à la lecture du JSON.
- **Spec** : §2 glossaire (arête, état du système), §3.1 (graphe), §3.5 ou §3.6 si l'état du
  système y est décrit, partie IHM du logigramme et de l'autocomplétion.
- **Guide** : sections Arêtes, État du système, Expressions.

## Analyse demandée avant de coder

Ajouter une section « Analyse » en bas de ce fichier :

1. Faisabilité et modules impactés (d'après `docs/MAP.md`).
2. Le nom de la propriété dans le JSON, cohérent avec les noms existants (un libellé non traduit
   ne doit pas être confondu avec un texte multilingue).
3. Le rendu d'un libellé d'arête avec la bibliothèque de graphe utilisée : placement, troncature,
   infobulle.

Faisable sans ambiguïté bloquante → choix notés dans l'analyse et `docs/DECISIONS.md`, puis
réalisation. Sinon → statut « à arbitrer », options et conséquences, arrêt sans coder.
