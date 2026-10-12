# plugins/node-kinds/fragment

Appel d'un fragment de la bibliothèque (`kind: "fragment"`, `ref`, `alias`, EVO-008 ; ex-instance de bloc).
Forme : rectangle ambre en pointillés : « Fragment », nom du fragment, alias, nombre de questions (fragments appelés
compris), bouton « Déplier » qui liste en lecture seule ses questions (`alias.cle`), ses appels (`alias.sous_alias`) et
ses sorties nommées (état local du composant). Le badge « bib. », le bouton « Ouvrir » (commande `node.openFragment`),
les poignées de sortie et les propriétés (alias, sorties, clés attendues) sont fournis par l'éditeur (`ui/diagram`, `ui/properties`).
