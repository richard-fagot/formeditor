# EVO-009 — Copier une question dans la bibliothèque et masquer des champs d'une question structurée

Statut : en cours
Dépend de : EVO-XXX (bibliothèque de questions : création, référence d'une question de bibliothèque dans un questionnaire) et EVO-YYY (questions de type structuré) — à compléter

## Besoin

Aujourd'hui, une question créée directement dans un questionnaire ne peut pas être réutilisée ailleurs : pour la retrouver dans un autre questionnaire, je dois la ressaisir entièrement dans la bibliothèque. Je veux pouvoir **copier une question du questionnaire dans la bibliothèque** en un clic, la question du questionnaire étant **automatiquement remplacée par une référence** à la question de bibliothèque qui vient d'être créée.

Par ailleurs, une **question structurée** issue de la bibliothèque s'utilise aujourd'hui en bloc. Je veux pouvoir, **au niveau de chaque instance** dans un questionnaire, **masquer certains champs** de la question structurée, afin de réutiliser une définition complète sans la dupliquer en variantes réduites.

Exemple d'usage :

```
Bibliothèque — question structurée « identite » :
  civilite, nom, prenom, date_naissance, adresse, mail, telephone

Questionnaire A (adhésion)        → instance de « identite », tous les champs affichés
Questionnaire B (demande de rappel) → instance de « identite », seuls nom, prenom, mail affichés
```

Affichage attendu : dans le questionnaire B, le wizard ne présente que Nom, Prénom et Mail, dans l'ordre défini dans la bibliothèque. Le questionnaire A est inchangé.

## Comportement attendu

- **Copie en bibliothèque** :
  - Un bouton « Copier dans la bibliothèque » est disponible sur une question du questionnaire qui ne provient pas déjà de la bibliothèque.
  - L'action crée dans la bibliothèque une question reprenant la définition complète (libellé, type, aide, options / groupes d'options, champs d'une question structurée, contrôles de saisie).
  - La question du questionnaire est remplacée par une instance référençant cette question de bibliothèque, à la même position.
  - Ce qui relève du questionnaire et non de la définition (identifiant dans le questionnaire, conditions d'affichage, place dans le logigramme) reste attaché à l'instance et n'est pas copié dans la bibliothèque.
  - Les expressions et conditions qui référençaient la question continuent de fonctionner sans modification.
  - Si l'identifiant de la question existe déjà dans la bibliothèque, l'utilisateur choisit un autre identifiant avant validation (pas d'écrasement silencieux).
  - Pour une question déjà issue de la bibliothèque, le bouton est masqué ou désactivé.
- **Masquage de champs (question structurée)** :
  - Sur une instance d'une question structurée de bibliothèque, chaque champ peut être affiché ou masqué. Par défaut, tous les champs sont affichés.
  - Au moins un champ doit rester affiché.
  - Le masquage ne modifie jamais la définition en bibliothèque ni les autres instances.
  - L'ordre des champs reste celui de la bibliothèque (pas de réordonnancement au niveau de l'instance).
  - Si un champ est ajouté ultérieurement à la question de bibliothèque, il apparaît **affiché** dans les instances existantes (on mémorise les champs masqués, pas les champs affichés).
  - Si un champ masqué est supprimé de la bibliothèque, son masquage est ignoré sans erreur.
- **Expressions** :
  - Une référence à un champ masqué est signalée comme une erreur de validation (le champ ne sera jamais renseigné).
  - Masquer un champ déjà référencé dans une expression du questionnaire déclenche un avertissement listant les expressions concernées.
- **Panneau de propriétés** :
  - Bouton « Copier dans la bibliothèque » sur une question locale.
  - Pour une instance de question structurée : liste des champs avec une case à cocher « affiché », et indication de l'origine bibliothèque.
- **Logigramme** : le nœud indique que la question provient de la bibliothèque et, pour une question structurée avec champs masqués, le nombre de champs affichés (ex. « 3 / 7 champs »).
- **Prévisualisation** : les champs masqués ne sont pas présentés dans le wizard.

## Critères d'acceptation

- Quand je clique sur « Copier dans la bibliothèque » sur une question locale, alors une question identique apparaît dans la bibliothèque et la question du questionnaire devient une instance de celle-ci, à la même position.
- Quand une condition ou une expression référençait la question copiée, alors elle donne le même résultat après la copie.
- Quand l'identifiant existe déjà dans la bibliothèque, alors la copie est bloquée tant que je n'ai pas choisi un autre identifiant.
- Quand la question est déjà une instance de bibliothèque, alors le bouton de copie n'est pas proposé.
- Quand je masque civilite, date_naissance, adresse et telephone sur l'instance « identite » du questionnaire B, alors la prévisualisation de B n'affiche que Nom, Prénom et Mail, et celle de A affiche toujours les 7 champs.
- Quand je tente de masquer tous les champs, alors le dernier champ affiché ne peut pas être décoché.
- Quand j'ajoute un champ à « identite » dans la bibliothèque, alors il apparaît affiché dans les instances existantes, champs masqués conservés.
- Quand une expression référence un champ masqué, alors la validation le signale.
- Quand je n'utilise ni la copie ni le masquage, alors le comportement est identique à aujourd'hui.
- Quand j'ouvre un projet antérieur, alors il se charge sans erreur et toutes les instances ont tous leurs champs affichés.
- Quand j'exporte puis réimporte, alors la bibliothèque, les références et les champs masqués sont identiques.
- Le guide utilisateur décrit la copie en bibliothèque et le masquage de champs.

## Impacts attendus

- **Format JSON** : nouvelle `formatVersion` et migration (aucun champ masqué par défaut), JSON Schema, `docs/FORMAT.md` (propriété de masquage sur une instance de question structurée), exemple mis à jour avec une instance « identite » réduite.
- **Spec** : §… (bibliothèque de questions), §… (questions structurées), §… (validation des expressions).
- **Guide** : sections bibliothèque et questions structurées.

## Analyse demandée avant de coder

Ajouter une section « Analyse » en bas de ce fichier :

1. Faisabilité et modules impactés (d'après `docs/MAP.md`).
2. Séparation définition / instance lors de la copie : cible = les références des expressions et conditions restent valides sans réécriture. Contrainte : selon le modèle actuel, les références peuvent pointer vers l'identifiant de la définition plutôt que vers celui de l'instance. Si la cible est irréalisable, réécriture automatique des références avec rapport des modifications.
3. Stockage du masquage : cible = liste des champs masqués sur l'instance (pour que les champs ajoutés plus tard apparaissent). Préciser la migration et le traitement d'un identifiant de champ disparu.
4. Export destiné à l'équipe de dev : indiquer si l'export résout les instances (définition complète, champs masqués retirés) ou conserve référence + liste de masquage, et justifier.
5. Interaction avec le caractère obligatoire : un champ obligatoire en bibliothèque peut-il être masqué ? Cible proposée : oui, le masquage l'emporte (le champ n'est pas demandé).

Faisable sans ambiguïté bloquante → choix notés dans l'analyse et `docs/DECISIONS.md`, puis réalisation. Sinon → statut « à arbitrer », options et conséquences, arrêt sans coder.
