# EVO-004 — Export du logigramme en image

Statut : en cours

## Besoin

Je veux exporter le logigramme d'un questionnaire sous forme d'image, pour l'insérer dans des
documents (spécifications, supports de présentation, pages de wiki) et le partager avec des
personnes qui n'ont pas l'outil.

## Comportement attendu

- **Déclenchement** : une commande « Exporter le logigramme en image » dans le catalogue de
  commandes, donc accessible par la palette (`Ctrl+K`), un raccourci par défaut (à choisir sans
  conflit avec les raccourcis existants) et l'écran de paramétrage des raccourcis. Un bouton dans
  la barre du logigramme est bienvenu.
- **Périmètre** :
  - par défaut, **le logigramme entier** du questionnaire courant, quel que soit le zoom ou la
    portion visible à l'écran ;
  - si des nœuds sont sélectionnés, proposer d'exporter **la sélection seulement** (les nœuds
    sélectionnés et les arêtes entre eux).
- **Contenu** : le logigramme tel qu'il est affiché (nœuds avec leur aperçu, arêtes avec leurs
  conditions abrégées, blocs repliés ou dépliés comme à l'écran), **sans** les éléments
  d'interface : mini-carte, contrôles de zoom, poignées, surbrillance de sélection, curseurs.
  Les badges (obligatoire, condition, traduction manquante…) sont conservés.
- **Rendu** : fond blanc et thème clair, quel que soit le thème de l'outil ; marge autour du
  contenu ; titre du questionnaire en en-tête de l'image (facultatif, coché par défaut).
- **Formats** :
  - **PNG** obligatoire, en haute résolution (au moins 2× la taille écran) pour rester net une
    fois imprimé ou agrandi dans un document ;
  - **SVG** si l'analyse montre qu'il s'ouvre correctement dans les outils bureautiques courants
    (voir Analyse) ; sinon, ne pas le proposer.
- **Fichier** : téléchargé directement, nommé `<nom-du-projet> - <nom-du-questionnaire> - AAAAMMJJ.png`
  (même modèle avec `.svg` si le SVG est livré). Les caractères interdits dans un nom de fichier
  sont remplacés.
- **Dialogue** : une petite fenêtre d'options (format, périmètre, titre) qui retient les derniers
  choix ; `Entrée` lance l'export avec ces choix.

## Critères d'acceptation

- Quand je lance l'export sur un questionnaire dont seule une partie est visible à l'écran, alors
  l'image contient tous les nœuds et toutes les arêtes.
- Quand je lance l'export avec deux nœuds reliés sélectionnés et l'option « sélection », alors
  l'image ne contient que ces deux nœuds et leur arête.
- Quand l'outil est en thème sombre, alors l'image exportée est sur fond blanc en thème clair.
- Quand j'exporte, alors l'image ne contient ni mini-carte, ni contrôles de zoom, ni surbrillance
  de sélection.
- Quand j'exporte en PNG, alors l'image a une résolution d'au moins deux fois la taille du
  logigramme à 100 % de zoom.
- Quand l'option « titre » est cochée, alors le nom du questionnaire apparaît en en-tête.
- Quand j'exporte, alors le fichier téléchargé suit le modèle de nom ci-dessus.
- Quand j'utilise la palette ou le raccourci, alors la fenêtre d'options s'ouvre avec mes derniers
  choix, et `Entrée` lance l'export.
- L'export fonctionne dans Firefox et Chromium (test de fumée Playwright : le fichier est
  produit et non vide).
- Le guide utilisateur décrit l'export et son raccourci.

## Impacts attendus

- Pas de changement du format JSON.
- **Spec** : §4.1 (barre du logigramme), §4.4 (raccourci), §6 si l'on y liste les sorties de l'outil.
- **Guide** : section Projet et fichiers ou Logigramme, selon l'organisation actuelle.

## Analyse demandée avant de coder

Ajouter une section « Analyse » en bas de ce fichier :

1. **Technique** : l'éditeur de graphe (React Flow) dessine les nœuds en HTML. Sa documentation
   propose une méthode d'export d'image (via une librairie de capture comme `html-to-image`).
   Vérifier qu'elle fonctionne en `file://`, dans Firefox et Chromium, sur un logigramme plus
   grand que l'écran, et sans élément d'interface parasite.
2. **SVG** : un SVG produit par capture de HTML contient généralement des éléments
   `foreignObject` que Word, PowerPoint et la plupart des éditeurs vectoriels n'affichent pas.
   Si c'est le cas, ne livrer que le PNG et le noter dans `docs/DECISIONS.md` et dans la section
   « Ce que l'outil ne fait pas » du guide.
3. Le raccourci par défaut retenu, sans conflit.

Faisable sans ambiguïté bloquante → choix notés dans l'analyse et `docs/DECISIONS.md`, puis
réalisation. Sinon → statut « à arbitrer », options et conséquences, arrêt sans coder.
