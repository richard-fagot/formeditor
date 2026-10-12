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

## Analyse

Conclusion : **faisable sans ambiguïté bloquante**, PNG seul. Essai jetable réalisé le 2026-10-12
(retiré du dépôt) : `html-to-image@1.11.11` + `rf.getNodesBounds` sur `.react-flow__viewport`,
`dist/index.html` ouvert en `file://`, Playwright Chromium et Firefox, fenêtre 900×600 zoomée
(1 nœud visible sur 19) sur le questionnaire d'exemple.

### 1. Technique — résultats

| Vérification | Chromium | Firefox |
| --- | --- | --- |
| Fichier produit et non vide (logigramme entier, titre) | 3136×3810 px, ≈ 250–850 Ko | 3136×3810 px, ≈ 60–600 Ko |
| 19 nœuds, 27 arêtes, 19 libellés d'arête présents malgré le zoom | oui | oui |
| Mini-carte, contrôles de zoom, fond quadrillé, invitation « graphe vide » | absents (hors de `.react-flow__viewport`) | idem |
| Poignées | absentes (filtre DOM `react-flow__handle`) | idem |
| Surbrillance de sélection | absente une fois la sélection vidée (voir pièges) | idem |
| Sélection seule (2 nœuds reliés + leur arête) | 1216×330 px, correcte | idem |
| Résolution | `pixelRatio: 2` → 2× la taille à 100 % | idem |
| Polices, monospace, accents, « — », marqueurs SVG des arêtes | corrects (polices système, rien d'externe) | idem |
| Téléchargement `<a download>` d'un Blob en `file://` (nom avec espaces) | conservé | conservé |
| Erreurs console / CSP / canvas « tainted » | aucune | aucune |
| Durée (19 nœuds) | ≈ 1,1 s | ≈ 1,2 s |

Méthode retenue :
- capturer `.react-flow__viewport` avec `toCanvas` en forçant `style.transform = translate(-x+marge, -y+marge) scale(1)`,
  `width/height` = boîte englobante + marges, `backgroundColor: '#ffffff'`, `pixelRatio: 2` ; tous les nœuds sont dans
  le DOM (`onlyRenderVisibleElements` non utilisé), le zoom et la portion visible n'interviennent donc pas ;
- les libellés d'arête (`EdgeLabelRenderer`) sont bien dans `.react-flow__viewport` ; les contrôles et le fond n'y sont pas ;
- titre : dessiné sur un second canvas (bandeau blanc en tête, `fillText`, police système) puis `toBlob('image/png')`.

Pièges rencontrés et contournements :
- **Capture blanche** dans les deux navigateurs si la capture démarre dans la même tâche que la modification du store
  (sélection vidée) : React n'a pas encore validé son rendu. Contournement vérifié : attendre une tâche (`setTimeout(0)`)
  puis une image (`requestAnimationFrame`) avant `toCanvas` ; deux `requestAnimationFrame` seuls ne suffisent pas dans Chromium.
- **Surbrillance de sélection** encore visible après avoir vidé la sélection : `NodeView` a `transition-shadow` (150 ms),
  la capture copie le style calculé en pleine transition. Contournement vérifié : attribut `data-exporting` sur le conteneur
  pendant la capture + règle `[data-exporting] * { transition: none !important }` ; sélection restaurée ensuite.
- **Sélection seule** : filtre DOM sur `.react-flow__node[data-id]`, `.react-flow__edge[data-id]` (arêtes dont les deux
  extrémités sont sélectionnées) et sur les libellés d'arête, qui n'ont pas d'identifiant : ajouter `data-edge-label={id}`
  au libellé dans `EdgeView`. Boîte englobante : `rf.getNodesBounds(nœuds sélectionnés)`.
- **Arêtes hors boîte** : `getNodesBounds` ignore les arêtes ; les arêtes qui reviennent vers la poignée haute d'un nœud
  bombent au-dessus de lui. Marge de 24 px suffisante sur l'exemple ; retenir 40 px, ou l'union avec `getBBox()` des
  `.react-flow__edge-path`.
- **Version** : `html-to-image` épinglé à `1.11.11` (version utilisée par l'exemple d'export de React Flow).
- **Thème sombre** : l'outil n'en a pas aujourd'hui (aucune classe `dark:`, pas de `prefers-color-scheme`) ; le fond blanc
  est imposé par `backgroundColor` et le critère reste testable avec `page.emulateMedia({ colorScheme: 'dark' })`.
- **Icônes lucide** : aucune dans les nœuds ni les arêtes actuellement ; les SVG en ligne (marqueurs) sont bien rendus,
  une icône lucide le serait de la même façon.
- **Très grands graphes** : à 2×, ~100 nœuds peuvent dépasser la taille maximale d'un canvas (de l'ordre de 16 000 px
  de côté selon le navigateur). Au-delà de 16 384 px de côté, réduire `pixelRatio` et le signaler (cas hors volumétrie cible).

### 2. SVG

`toSvg` produit un `<svg>` contenant **un `foreignObject` unique** qui enveloppe tout le XHTML cloné (≈ 4,2–4,6 Mo,
styles en ligne), sans aucune forme vectorielle native. Word, PowerPoint et la plupart des éditeurs vectoriels ne
l'affichent pas. **Conclusion : PNG seul** ; pas de choix de format dans le dialogue ; à mentionner dans « Ce que l'outil
ne fait pas » du guide.

### 3. Raccourci par défaut : `X`

Lettre seule, portée `graph` (active quand le logigramme a le focus, comme L, F, P), mnémonique « eXporter l'image ».
Libre dans le catalogue (lettres prises : N, I, O, A, C, E, F, P, L, T, D, R, U, M, B, 3, S ; combinaisons : Ctrl+K/O/S/D/G/Z/Y,
Ctrl+Shift+Z, Shift+N, Alt+I/S/F, Alt+flèches, Ctrl+Tab) et sans conflit navigateur (une lettre seule n'est captée par
aucun raccourci de Firefox ni de Chromium ; écartés : Ctrl+Shift+S = capture d'écran Firefox, Ctrl+P = impression,
Ctrl+E / Ctrl+Shift+E = recherche / outils réseau, Alt+E = menu Édition). Toujours accessible par la palette hors du logigramme.

### Modules impactés (d'après MAP.md)

- `app/commands` : nouveau fichier `image-commands.ts` (ou dans `settings-commands.ts` à côté de `view.layout`) ;
  `download` accepte un `Blob` ; fonction pure de nom de fichier (testée en Vitest).
- `app/store` : options mémorisées et demande d'export (compteur, comme `layoutRequest` / `fitRequest`), dialogue ouvert.
- `app/persistence` : persistance des options avec `uiLang` / `keymap` (session IndexedDB, hors du projet).
- `app/i18n` : libellés (commande, dialogue, message d'erreur).
- `ui/diagram` : `useImageExport.ts` (capture, filtre, titre, téléchargement), `data-edge-label` dans `EdgeView`, dialogue d'options.
- `ui/shell` : bouton dans la barre du logigramme (`QuestionnaireView`, à côté de « Mise en page automatique »).
- `package.json` : `html-to-image` 1.11.11 (version exacte). Pas de changement de format JSON.
- `tests/smoke/evo-004.spec.ts`, `docs/GUIDE.md` (section 3 Logigramme, « Ce que l'outil ne fait pas », index), README des modules.

### Choix de conception retenus

- **Commandes** : `view.exportImage` (visible, `X`, portée `graph`) ouvre le dialogue ; `view.exportImageRun` (cachée,
  `arg` = options) mémorise les options et incrémente la demande, que `ui/diagram` exécute (le noyau des commandes
  n'importe pas l'interface). Le bouton du dialogue passe par cette commande.
- **Disponibilité** : onglet de questionnaire en vue Logigramme, questionnaire non vide ; sinon commande désactivée
  (grisée dans la palette). Pas d'export des blocs de la bibliothèque ni de la vue côte à côte dans cette évolution.
- **Dialogue** (`Dialog` d'`ui-kit`) : périmètre (« logigramme entier » / « sélection seulement », la seconde proposée
  seulement si au moins un nœud est sélectionné), case « titre » (cochée par défaut), format affiché « PNG ». Ouvert avec
  les derniers choix ; `Entrée` lance l'export ; « sélection » mémorisée mais sans sélection → logigramme entier.
- **Mémorisation** : `{ scope, title }` dans le store, sauvegardés dans la session IndexedDB comme la langue de l'outil
  et les raccourcis (préférence de l'outil, pas du projet).
- **Nom du fichier** : `<nom du projet> - <titre du questionnaire> - AAAAMMJJ.png`, titre dans la langue de contenu affichée
  (repli : langue par défaut, puis clé), nom du projet vide → `projet`, date locale du jour. Caractères `\ / : * ? " < > |`
  et de contrôle remplacés par `_`, espaces multiples réduits, espaces et points finaux retirés ; accents et espaces conservés.
- **Titre de l'image** : même titre que dans le nom du fichier.
- **Rendu** : marge 40 px, fond blanc, `pixelRatio` 2, sélection vidée et transitions coupées pendant la capture puis
  sélection restaurée ; indicateur « Export en cours… » (≈ 1 s) ; échec → message, pas d'exception.
- **Tests** : Vitest pour le nom de fichier ; Playwright (Chromium et Firefox) : téléchargement non vide au bon nom,
  dimensions ≥ 2× la boîte englobante, logigramme zoomé, sélection de deux nœuds reliés, `colorScheme: 'dark'` → pixel
  de fond blanc, titre (hauteur supérieure avec titre).
