# EVO-013 — Ouvrir l'objet de bibliothèque depuis son badge « Bib »

Statut : en cours
Dépend de : EVO-008 (fragments de bibliothèque, nœud fragment et son badge « bib. ») ; questions de bibliothèque : spec §3.8 (existant)

## Besoin

Aujourd'hui, quand un **fragment** ou une **question** de la **bibliothèque** est utilisé dans un
questionnaire, le **badge « Bib »** signale seulement le lien avec la bibliothèque. Pour consulter ou
modifier l'objet, je dois ouvrir la bibliothèque et l'y rechercher à la main.
Je veux pouvoir **double-cliquer sur le badge « Bib »** pour **ouvrir directement l'objet lié dans la
bibliothèque**, afin de passer sans recherche de l'usage à la définition.

Exemple d'usage :

```
Questionnaire « Déclaration de sinistre »
  └─ Fragment « Coordonnées assuré »  [Bib]   ← double-clic sur [Bib]
→ La bibliothèque s'ouvre, le fragment « Coordonnées assuré » est sélectionné et affiché.
```

Affichage attendu : la bibliothèque s'affiche avec l'objet lié sélectionné et visible (liste déroulée
jusqu'à lui), son détail ouvert comme si je l'avais sélectionné moi-même.

## Comportement attendu

- **Interaction** :
  - Le double-clic agit sur le badge « Bib » partout où il est affiché pour un fragment ou une question
    de bibliothèque.
  - Le double-clic sur le badge ne déclenche pas l'action de double-clic existante sur l'élément
    porteur (nœud, ligne) : le badge capte l'événement.
  - Un simple clic sur le badge ne change pas de comportement par rapport à aujourd'hui.
  - Une infobulle sur le badge indique « Double-clic pour ouvrir dans la bibliothèque ».
- **Navigation** :
  - La bibliothèque s'ouvre sur l'objet lié (fragment ou question), sélectionné et affiché.
  - Aucun retour automatique vers le questionnaire n'est prévu.
  - Les modifications non enregistrées du questionnaire ne sont pas perdues.
- **Cas limite** : objet lié introuvable dans la bibliothèque (lien rompu) → message explicite, aucune
  navigation.
- **Logigramme** : le badge « Bib » du nœud est double-cliquable.
- **Panneau de propriétés** : idem si le badge y est affiché.

## Critères d'acceptation

- Quand je double-clique sur le badge « Bib » d'un fragment de bibliothèque, alors la bibliothèque
  s'ouvre avec ce fragment sélectionné et son détail affiché.
- Quand je double-clique sur le badge « Bib » d'une question de bibliothèque, alors la bibliothèque
  s'ouvre avec cette question sélectionnée et son détail affiché.
- Quand je double-clique sur le badge, alors l'action de double-clic de l'élément porteur n'est pas
  déclenchée.
- Quand je double-clique ailleurs que sur le badge, alors le comportement est identique à aujourd'hui.
- Quand je survole le badge, alors une infobulle indique l'action de double-clic.
- Quand le questionnaire comporte des modifications non enregistrées et que j'ouvre l'objet lié,
  alors ces modifications ne sont pas perdues.
- Quand l'objet lié est introuvable dans la bibliothèque, alors un message l'indique et je reste sur
  le questionnaire.
- Quand j'ouvre un projet antérieur, alors il se charge sans erreur et les badges « Bib » existants
  sont double-cliquables.
- Quand j'exporte puis réimporte, alors le JSON est identique.
- Le guide utilisateur décrit l'ouverture de l'objet lié depuis le badge « Bib ».

## Impacts attendus

- **Format JSON** : aucun (le lien vers l'objet de bibliothèque est déjà stocké).
- **Spec** : §… (bibliothèque — navigation vers l'objet lié), §… (logigramme — badge « Bib »).
- **Guide** : section bibliothèque (utilisation d'un objet de bibliothèque dans un questionnaire).

## Analyse demandée avant de coder

Ajouter une section « Analyse » en bas de ce fichier :

1. Faisabilité et modules impactés (d'après `docs/MAP.md`).
2. Résolution du lien : comment l'identifiant porté par l'élément du questionnaire permet de retrouver
   l'objet dans la bibliothèque ; comportement si le lien est rompu.
3. Conflit d'événements : vérifier qu'aucune action de double-clic existante (édition du nœud,
   zoom du logigramme…) n'est perturbée ; préciser comment le badge isole son double-clic.
4. Conservation de l'état non enregistré du questionnaire lors du passage à la bibliothèque.
5. Recenser tous les endroits où le badge « Bib » est affiché et confirmer que chacun est couvert.

Faisable sans ambiguïté bloquante → choix notés dans l'analyse et `docs/DECISIONS.md`, puis
réalisation. Sinon → statut « à arbitrer », options et conséquences, arrêt sans coder.

## Analyse

Conclusion : **faisable sans ambiguïté bloquante**, réalisée. Format JSON inchangé.

1. **Faisabilité, modules** (matrice de `docs/MAP.md`, lignes « Logigramme », « Questions et fragments de bibliothèque »,
   « Fragments (EVO-008) ») : `ui/diagram` (`NodeView` : badge), `app/commands` (`library-item-commands.ts` : nouvelle commande
   cachée `library.openRef`, réutilise `showLibraryItem`), `app/i18n` (infobulle, message), `ui/library` (`Library` : élément
   affiché gardé visible dans la liste). Ni `core`, ni `format`, ni plugin.
2. **Résolution du lien** : le nœud porte `ref` (id de la question ou du fragment de bibliothèque) ; son genre (`question` /
   `fragment`) donne la liste où chercher (`library.questions` / `library.fragments`). Trouvé → `showLibraryItem` : question
   dans l'onglet Bibliothèque (`libraryItem`, détail à droite), fragment dans son onglet `f:<id>` (c'est ainsi que la
   bibliothèque affiche un fragment depuis EVO-008). Introuvable → fenêtre « Objet de bibliothèque introuvable » (`notice`),
   onglet inchangé.
3. **Conflit d'événements** : le double-clic d'un nœud (React Flow `onNodeDoubleClick` → édition de l'intitulé) passe par
   l'événement React du nœud : `stopPropagation` dans le `onDoubleClick` du badge l'arrête. Le zoom au double-clic du fond
   (d3-zoom, écouteur natif sur le conteneur) applique le filtre de React Flow, qui écarte les cibles dans un élément `nopan` :
   le badge porte cette classe. Le clic simple n'est pas intercepté (sélection du nœud inchangée). Double-clic ailleurs :
   inchangé. Le double-clic d'une entrée du panneau latéral (insertion) n'est pas concerné (pas de badge).
4. **État non enregistré** : l'ouverture ne fait que changer d'onglet (`openTab`, `libraryItem`) ; l'espace de travail, son
   historique et l'indicateur « modifié » ne sont pas touchés, l'onglet du questionnaire reste ouvert.
5. **Endroits où le badge « bib. » est affiché** : un seul composant, `NodeView` (`ui/diagram`), pour une question de
   bibliothèque ou un nœud fragment ; il sert le logigramme d'un questionnaire, celui d'un fragment et la vue côte à côte
   (lecture seule) : tous couverts. Le panneau de propriétés n'affiche pas de badge (texte « Question de bibliothèque : … »
   et bouton « Ouvrir dans la bibliothèque » existants) : rien à couvrir. Le contenu déplié d'un nœud fragment et le panneau
   latéral de la bibliothèque n'affichent pas de badge. Une référence de question rompue s'affiche « ? » sans badges
   (existant) : le cas « lien rompu » ne se présente donc que sur un nœud fragment.

Choix notés dans `docs/DECISIONS.md`. Le badge s'intitule « bib. » dans l'outil (« Bib » dans la demande).

