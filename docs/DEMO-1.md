# Démo n°1 — tranche verticale (fin de phase 5)

Ouvrir `dist/index.html` (double-clic, `file://`, Firefox ou Chromium), après `npm run build`.

## Faisable aujourd'hui
- **Projet** : nouveau, ouvrir/importer (bundle ou fichiers unitaires, erreurs détaillées), ouvrir l'exemple
  « déclaration de sinistre » (icône ✨), exporter en bundle (Ctrl+S) ou en fichiers unitaires.
  Sauvegarde automatique continue dans le navigateur ; indicateur « modifications non exportées ».
- **Onglets** de questionnaires (plusieurs ouverts, Alt+←/→, nouveau questionnaire « + »), sous-onglets
  Logigramme / Prévisualisation (P).
- **Logigramme au clavier** (cliquer d'abord dans le graphe) :
  N nouvelle question à la suite (saisie de l'intitulé immédiate, clé dérivée : « Âge du conducteur » → `age_conducteur`),
  Shift+N branche conditionnée (focus sur la condition), Alt+I / Alt+S / Alt+F information / synthèse / fin,
  T / B type texte / booléen, O obligatoire, A « Autre », Entrée ou double-clic éditer l'intitulé,
  C éditer la condition, E relier à un nœud (palette), flèches pour naviguer entre nœuds reliés,
  Ctrl+D dupliquer, Suppr supprimer, Ctrl+Z / Ctrl+Shift+Z annuler/rétablir (par questionnaire), F ajuster la vue.
  Souris : glisser les nœuds, relier par les poignées.
- **Palette** Ctrl+K : toutes les commandes (avec leur raccourci) et recherche de nœud par clé ou intitulé.
- **Panneau de propriétés** : intitulé multilingue avec variantes conditionnelles et interpolation `{cle}`,
  clé (renommage propagé dans toutes les expressions), type, obligatoire (ou « obligatoire si »), aide,
  texte indicatif, paramètres du type, contraintes libres, messages d'erreur ; arêtes : condition avec
  autocomplétion, coloration et validation en direct, rang (monter/descendre).
- **Problèmes** (panneau repliable) : références inconnues, clés en double, nœuds inaccessibles ou sans
  sortie, absence de « sinon », boucles fermées, références pas garanties, traductions manquantes…
- **Prévisualisation** : wizard sur le moteur réel, scénario d'état du système, langue, validation des
  contraintes, synthèse cliquable, fin.

## Limites connues (phases suivantes)
- Types date, nombre, choix, tri-state, structure : phase 6 (dans l'exemple, ces pages s'affichent sans champ).
- Bibliothèque, blocs, insertion (I), regroupement (Ctrl+G) : phase 7. Panneau d'état du système, débogage : phase 8.
- Mise en page automatique (L), écran des raccourcis, vue côte à côte : phase 9.

## Points à valider
Ergonomie de la création chaînée, lisibilité des nœuds et des arêtes, panneau de propriétés, palette.
