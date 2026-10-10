# Démo n°2 — prévisualisation complète (fin de phase 8)

Ouvrir `dist/index.html` (double-clic, `file://`, Firefox ou Chromium), après `npm run build`.
Tout ce qui figure dans `docs/DEMO-1.md` reste valable ; ci-dessous, ce qui s'y ajoute depuis.

## Faisable aujourd'hui
- **Tous les types de questions** (phase 6) : texte, date (bornes littérales ou calculées), nombre (nature,
  bornes, décimales, unité), choix unique et multiple (saisie rapide des options, option « Autre (préciser) »,
  options conditionnées, source dynamique depuis une réponse ou une liste de l'état du système), booléen et
  tri-state avec jeux de libellés, structure (répétable, « Ajouter » / « Supprimer », champs conditionnés).
- **Bibliothèque et blocs** (phase 7) : onglet Bibliothèque (questions, blocs, jeux de libellés), panneau latéral
  filtrable avec glisser-déposer, insertion par la palette (I), libellé surchargé localement, blocs avec sorties
  nommées et alias (`alias.cle`), dépliage en lecture seule, regroupement d'une sélection en bloc (Ctrl+G).
- **Dictionnaire de l'état du système** (onglet « État du système ») : variables avec nom, type (texte, nombre,
  date, booléen, énumération avec ses valeurs, liste d'objets avec son schéma), description, valeur d'exemple,
  nombre d'usages. Renommer une variable met à jour les expressions et les scénarios. L'autocomplétion des
  expressions propose `sys.…`, avec la description et les valeurs possibles d'une énumération.
- **Scénarios nommés** dans le même onglet : création, duplication, suppression, saisie des valeurs par variable
  (contrôle indicatif du type, listes en JSON).
- **Prévisualisation** (P) :
  - pages d'information et de fin interpolées et conditionnées ; pages de synthèse : un clic sur une réponse ramène
    à la question, puis « Revenir à la synthèse » repasse les pages déjà répondues (les réponses sorties du chemin
    sont effacées ; on s'arrête sur toute page nouvelle du chemin) ;
  - **panneau d'état du système** (repliable) : choix du scénario, édition libre des valeurs en cours de parcours
    avec réévaluation immédiate (libellés, options, conditions), retour aux valeurs du scénario, enregistrement
    comme nouveau scénario ;
  - **panneau de débogage** (repliable) : chemin parcouru, conditions des arêtes sortantes de la page courante
    (vrai / faux / sinon / erreur, arête retenue), valeurs courantes (réponses et `sys`) ;
  - langue, validation des contraintes avec les messages spécifiés, clic sur une page → nœud sélectionné.

## À essayer
Ouvrir l'exemple (palette : « exemple »), onglet « État du système », puis le questionnaire en prévisualisation :
changer `sys.nom_assure` ou `sys.contrat_actif` sur la première page, choisir « Amicale sans sinistre »
(la question sur les sinistres liés disparaît), aller jusqu'au récapitulatif et modifier une réponse.

## Limites connues (phase suivante)
- Gestion des langues des contenus (déclaration, écran des traductions manquantes) : phase 9.
- Mise en page automatique (L), écran de paramétrage des raccourcis, vue côte à côte : phase 9.

## Points à valider
Lisibilité du récapitulatif et du retour pour modifier, utilité du panneau de débogage, saisie du dictionnaire
et des scénarios (notamment les listes d'objets en JSON).
