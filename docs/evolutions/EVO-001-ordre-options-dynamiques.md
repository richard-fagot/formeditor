# EVO-001 — Options dynamiques placées librement parmi les options

Statut : à faire

## Besoin

L'ordre d'affichage des options d'une question a une importance métier et doit être garanti.

Aujourd'hui, les options statiques s'affichent dans l'ordre saisi, mais les options issues d'une
source dynamique (spec §3.4, « Source dynamique ») sont toujours ajoutées **en fin de liste**.
On ne peut donc pas, par exemple, proposer d'abord les personnes connues du système puis des
choix fixes.

Je veux supprimer la configuration séparée de la source dynamique et pouvoir placer une entrée
dynamique **directement dans la liste des options**, à la position voulue, en la traitant comme
une option ordinaire. Exemple de saisie (syntaxe à confirmer, voir Précisions) :

```
$sys.champ_dynamique
Une de ses amicales
Un tiers
```

Affichage attendu : les valeurs de `sys.champ_dynamique` d'abord, puis « Une de ses amicales »,
puis « Un tiers ».

## Comportement attendu

- La liste des options devient une suite ordonnée d'**entrées**. Chaque entrée est soit une option
  statique, soit une entrée dynamique (une référence : variable système, réponse précédente,
  sous-champ…).
- Dans la saisie rapide (une option par ligne), une ligne écrite avec la syntaxe de référence crée
  une entrée dynamique. Toute autre ligne crée une option statique.
- Une entrée dynamique se comporte comme les autres options :
  - elle peut être déplacée (glisser-déposer, raccourcis), supprimée, dupliquée ;
  - elle peut avoir une condition d'affichage (options conditionnées, spec §3.4) ;
  - ses réglages propres restent dans le panneau de propriétés : pour une liste d'objets,
    l'expression du libellé affiché et celle de la valeur retenue.
- Au rendu, une entrée dynamique se déploie **à sa position** en autant d'options que la référence
  fournit de valeurs (zéro, une ou plusieurs), dans l'ordre de la source.
- Plusieurs entrées dynamiques peuvent coexister dans une même liste, à n'importe quelle position.
- L'aperçu du logigramme (spec §4.2) affiche la référence à sa position, comme les autres options
  (troncature « … » inchangée).
- La prévisualisation (wizard, synthèse) respecte strictement l'ordre des entrées.

## Précisions (décisions métier)

- **Types concernés** : choix unique, choix multiple, booléen et tri-state — tous les types qui
  acceptent une source dynamique.
- **Option « Autre (préciser) »** : inchangée, toujours affichée en dernier. Elle ne devient pas
  une entrée positionnable.
- **Syntaxe de saisie** : une ligne qui commence par `<` doit pouvoir rester une option statique.
  Soit on adopte un autre marqueur (piste : `$sys.champ_dynamique`), soit on prévoit un
  échappement. Choisir la solution la plus simple et la documenter. Une référence inconnue ou mal
  écrite est signalée par les vérifications non bloquantes (§4.6).
- **Doublons** entre valeur dynamique et option statique : hors périmètre, aucun traitement.
- **Réponse devenue invalide** : si une réponse désigne une valeur dynamique qui n'existe plus
  (source modifiée après coup : retour depuis la synthèse, changement de scénario, etc.), elle
  n'est plus valide. L'utilisateur doit repasser par les questions concernées avant de terminer
  le parcours. Le mécanisme est à choisir, en cohérence avec la spec (§5 : les réponses hors
  chemin sont effacées).

## Critères d'acceptation

- Quand je saisis les trois lignes de l'exemple (avec la syntaxe retenue), alors la question
  contient une entrée dynamique suivie de deux options statiques, dans cet ordre.
- Quand `sys.champ_dynamique` vaut `["A", "B"]` dans le scénario de prévisualisation, alors le
  wizard affiche A, B, « Une de ses amicales », « Un tiers », dans cet ordre.
- Quand `sys.champ_dynamique` est vide ou absent, alors seules les deux options statiques
  s'affichent, sans ligne vide ni erreur.
- Quand je déplace l'entrée dynamique en dernière position, alors le logigramme et le wizard
  l'affichent en dernière position, mais toujours avant « Autre (préciser) » si elle est activée.
- Quand une entrée dynamique porte une condition fausse, alors aucune de ses valeurs n'est affichée.
- Quand la source est une liste d'objets (ex. sinistres avec date et nature), alors les expressions
  de libellé et de valeur s'appliquent à chaque objet, à la position de l'entrée.
- Quand une question booléenne ou tri-state contient une entrée dynamique, alors l'ordre saisi
  est respecté de la même façon.
- Quand je saisis une option statique dont le libellé commence par `<`, alors elle reste une option
  statique.
- Quand une réponse désigne une valeur dynamique qui a disparu, alors le parcours ne peut pas être
  terminé tant que la question concernée n'a pas été répondue à nouveau.
- Quand j'ouvre un projet enregistré avant cette évolution, alors il se charge sans erreur et ses
  options dynamiques restent affichées **en fin de liste**, comme avant.
- Quand j'exporte puis réimporte un questionnaire, alors l'ordre des entrées est identique.

## Impacts attendus

- **Format JSON** : changement structurel → nouvelle `formatVersion`, migration des anciens
  fichiers (source dynamique convertie en entrée placée après les options statiques), JSON Schema,
  `docs/FORMAT.md` et questionnaire d'exemple mis à jour (l'exemple doit contenir au moins une
  entrée dynamique placée en tête ou au milieu).
- **Spec** : §3.4 (options, source dynamique), §4.2 (aperçu), §5 (réponses invalidées), §6 si besoin.
- **Tests** : un test par critère d'acceptation, test de migration, tests de référence mis à jour.

## Analyse demandée avant de coder

Ajouter en bas de ce fichier une section « Analyse » qui donne :

1. La **faisabilité** dans l'architecture actuelle et les modules impactés (d'après `docs/MAP.md`).
2. La **syntaxe de saisie** retenue (marqueur ou échappement), et pourquoi.
3. Le **mécanisme** choisi pour obliger à repasser par une question dont la réponse est devenue
   invalide.

Décision :
- faisable sans ambiguïté bloquante → noter les choix dans l'analyse et dans `docs/DECISIONS.md`,
  puis réaliser l'évolution ;
- un point remet en cause la demande ou demande un arbitrage métier → statut « à arbitrer »,
  options listées avec leurs conséquences, **arrêt sans coder**.
