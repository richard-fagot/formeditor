# EVO-019 — Outline du logigramme dans la prévisualisation

Statut : fait 2026-10-14
Dépend de : aucune

## Besoin

Aujourd'hui, la prévisualisation (wizard) et le logigramme sont dans deux onglets séparés. Pour relier
une question affichée à sa place dans le parcours, ou pour comprendre quelle branche conditionnelle
mène à elle, je dois passer sans arrêt d'un onglet à l'autre. En plus, à chaque retour sur l'onglet
Logigramme, celui-ci est remis en pleine page : je perds le zoom sur la zone qui m'intéressait.

Je veux pouvoir afficher, à côté de la prévisualisation, un **panneau latéral « outline »** montrant
le logigramme **centré et zoomé sur le nœud de la question affichée**, et **naviguer dans le
formulaire en cliquant sur un nœud** de cet outline, afin de mettre en relation ce que j'ai décrit
avec ce que voit le répondant, et de visualiser les branches conditionnelles sans quitter la
prévisualisation.

Exemple d'usage :

```
Q1 « Avez-vous des enfants ? »  Oui → Q2 « Combien ? » → Q3 « Situation familiale »
                                Non → Q3
```

- J'ouvre la prévisualisation sur Q1 : l'outline est centré sur Q1, je vois les deux branches Oui / Non.
- Je réponds « Oui » et passe à la suivante : l'outline se recentre sur Q2.
- Je passe à Q3 : Q1, Q2 et Q3 sont actives dans l'outline.
- Je clique sur Q1 dans l'outline : la prévisualisation affiche Q1 avec ma réponse « Oui »,
  l'outline se centre sur Q1.

Affichage attendu : prévisualisation à gauche (ou au centre), outline dans un panneau latéral ; le
nœud de la question courante est mis en évidence et reste visible quand la question change.

## Comportement attendu

- **Panneau outline** :
  - Panneau latéral dans l'onglet Prévisualisation, affichable / masquable.
  - Contenu : le même logigramme que l'onglet Logigramme (mêmes nœuds, liens, libellés de conditions),
    en **lecture seule** — aucune édition depuis l'outline.
  - L'état affiché / masqué du panneau est conservé pendant la session.
- **Synchronisation prévisualisation → outline** :
  - À chaque changement de question (suivant, précédent, saut conditionnel), l'outline se recentre
    sur le nœud de la question affichée, avec un niveau de zoom permettant de lire le nœud et ses
    voisins immédiats (branches entrantes et sortantes).
  - Le nœud courant est mis en évidence visuellement.
  - Si j'ai modifié le zoom ou déplacé la vue manuellement dans l'outline, le changement de question
    suivant recentre quand même sur le nœud courant.
- **Navigation outline → prévisualisation** :
  - Seules les questions **déjà passées du parcours courant** (et la question courante) sont
    actives. Les questions non encore passées ou hors du parcours courant (branche non empruntée
    avec les réponses saisies) sont **grisées et inactives** : un clic dessus est sans effet.
  - Un clic sur un nœud de question actif affiche cette question dans la prévisualisation.
  - Clic sur un nœud qui n'est pas une question (condition, début, fin, regroupement…) : aucune
    navigation ; la vue de l'outline n'est pas modifiée.
  - Après un retour en arrière sans modification de réponse, les questions déjà passées situées
    après la question courante restent actives.
  - Quand je modifie une réponse après être revenu en arrière, les questions qui sortent du
    parcours redeviennent grisées et inactives.
  - Les réponses déjà saisies dans la prévisualisation sont conservées lors d'un saut par l'outline.
- **Logigramme (onglet)** : inchangé. La conservation du zoom de l'onglet Logigramme entre deux
  changements d'onglet est hors périmètre de cette fiche.
- **Prévisualisation** : la mise en page du wizard s'adapte à la largeur restante quand l'outline
  est affiché ; sans outline, rendu identique à aujourd'hui.

## Critères d'acceptation

- Quand j'ouvre la prévisualisation avec l'outline affiché, alors l'outline est centré sur le nœud
  de la première question, mis en évidence.
- Quand je passe à la question suivante (y compris via une branche conditionnelle), alors l'outline
  se recentre sur le nœud de la nouvelle question.
- Quand je reviens à la question précédente, alors l'outline se recentre sur le nœud correspondant.
- Quand je zoome ou déplace la vue dans l'outline puis change de question, alors l'outline se
  recentre sur le nouveau nœud courant.
- Quand je clique sur une question déjà passée dans l'outline, alors la prévisualisation affiche
  cette question et les réponses déjà saisies sont conservées.
- Quand je clique sur un nœud qui n'est pas une question, alors la prévisualisation ne change pas.
- Quand une question n'est pas encore passée ou est hors du parcours courant, alors son nœud est
  grisé dans l'outline et un clic dessus est sans effet.
- Quand je suis sur Q3 et reviens sur Q1 sans modifier ma réponse, alors Q2 et Q3 restent actives
  et un clic sur Q3 l'affiche.
- Quand je reviens sur Q1 et change la réponse de « Oui » à « Non », alors Q2 devient grisée et
  inactive dans l'outline.
- Quand je masque l'outline, alors la prévisualisation est identique à aujourd'hui.
- Quand je tente de modifier un nœud dans l'outline (déplacement, édition, suppression), alors
  rien n'est modifié dans le formulaire.
- Quand j'ouvre un projet antérieur, alors il se charge sans erreur et l'outline s'affiche.
- Quand j'exporte puis réimporte, alors le JSON est identique (aucun impact format).
- Le guide utilisateur décrit l'outline : affichage / masquage, synchronisation et navigation par clic.

## Impacts attendus

- **Format JSON** : aucun (fonctionnalité d'interface uniquement).
- **Spec** : §… (Prévisualisation), §… (Logigramme — réutilisation du rendu en lecture seule).
- **Guide** : section Prévisualisation.

## Analyse demandée avant de coder

Ajouter une section « Analyse » en bas de ce fichier :

1. Faisabilité et modules impactés (d'après `docs/MAP.md`).
2. Réutilisation du rendu du logigramme : cible = le même composant que l'onglet Logigramme, en
   mode lecture seule, avec contrôle programmatique du zoom et du centrage. Contrainte possible : le
   composant n'expose pas ce contrôle, ou deux instances simultanées posent problème. Alternative
   attendue si irréalisable : rendu simplifié dédié à l'outline, à justifier.
3. Détermination des questions actives : cible = questions déjà passées, restreintes au parcours
   recalculé avec les réponses actuelles, en réutilisant l'historique de navigation du wizard.
   Vérifier que cet historique conserve les questions passées après un retour en arrière ; sinon,
   proposer comment le reconstituer.
4. Niveau de zoom par défaut sur le nœud courant (lisibilité vs contexte des branches), et
   comportement si le logigramme est très large ou très profond.

Faisable sans ambiguïté bloquante → choix notés dans l'analyse et `docs/DECISIONS.md`, puis
réalisation. Sinon → statut « à arbitrer », options et conséquences, arrêt sans coder.

## Analyse

Conclusion : **faisable sans ambiguïté bloquante** ; aucun impact sur le format JSON.

1. **Faisabilité, modules** (matrice de `docs/MAP.md`, lignes « Prévisualisation » et « Logigramme ») :
   `ui/preview` (panneau, synchronisation, saut), `ui/diagram` (mode outline du composant existant),
   `core/runtime` (questions actives, saut : pur, testé d'abord), `app/store` (`previewPanels.outline`),
   `app/commands` (`preview.toggleOutline`), `app/i18n`, `docs/GUIDE.md`, `docs/spec.md` §5.
2. **Réutilisation du rendu** : le composant `Diagram` a déjà un mode `readOnly` (vue côte à côte) qui
   n'autorise ni sélection, ni glisser, ni liaison, ni dépôt, ni édition en place, ni menu, ni commentaires ;
   chaque instance a son propre `ReactFlowProvider`, et la vue côte à côte prouve que deux instances
   simultanées fonctionnent. Le contrôle programmatique passe par `useReactFlow().setCenter` à
   l'intérieur du fournisseur : on ajoute une prop `outline` (nœud courant, nœuds actifs, clic) qui
   active ce centrage, la mise en évidence et le grisage. Pas de rendu simplifié dédié.
3. **Questions actives** : l'historique du wizard (`Session.history`) est **tronqué** par « Précédent »
   (`back`) : il ne conserve pas les questions passées après un retour. Les réponses ne suffisent pas
   non plus (une question affichée sans réponse, comme Q3 dans l'exemple, doit rester active). On
   reconstitue donc avec une liste des pages affichées, `PreviewState.visited` (état de l'éditeur, non
   enregistré), alimentée à chaque nouvelle session du wizard et vidée par « Recommencer ». Questions
   actives (`core/runtime`, `passedQuestions`) : parcours depuis le départ avec les réponses **actuelles**
   (`successor`), arrêté à la première page jamais affichée ; ses questions sont actives. Changer « Oui »
   en « Non » sur Q1 retire Q2 du parcours recalculé : grisée tout de suite, même avant « Suivant ».
   Saut (`jumpTo`) : l'historique devient le préfixe de ce parcours jusqu'à la question cliquée
   (« Précédent » reste cohérent), réponses inchangées, sans validation de la page quittée (comme « Précédent »).
4. **Zoom** : centrage exact sur le nœud courant ; zoom choisi pour que les voisins immédiats (arêtes
   entrantes et sortantes) tiennent dans le panneau, borné à [0,5 ; 1] : 1 = lisible comme le logigramme
   à 100 %, 0,5 = plancher de lisibilité. Logigramme très large ou très profond : le plancher l'emporte,
   un voisin lointain (arête de retour, branche éloignée) peut sortir du cadre ; l'utilisateur zoome ou
   déplace la vue, recentrée au changement de question suivant. Nœud dans un fragment : le nœud fragment
   de l'appelant est mis en évidence (comme le clic sur une page de fragment), non cliquable.
