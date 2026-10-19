---
id: EVO-029
titre: Export de l'inventaire des données (amorce RGPD)
statut: fait 2026-10-19
version: 1.0
qualificatif: final
derniere_exigence: EVO-029-051
depend_de: []
---

# EVO-029 — Export de l'inventaire des données (amorce RGPD)

## Contexte

*Section non normative : elle explique, les exigences font foi.*

Aujourd'hui, l'éditeur exporte le projet en JSON (bundle, fichiers unitaires) et le logigramme en image (EXISTANT « 5. Format JSON d'export », « EVO-004 — Export du logigramme en image »). Aucun export ne liste les données qu'un questionnaire collecte : l'inventaire RGPD se fait à la main en relisant le logigramme. La « Description » d'une question, seul texte libre, n'est exploitée nulle part (EXISTANT « Propriétés d'une question (locale ou de bibliothèque) et clés »).

Demain, l'éditeur exporte pour un questionnaire un fichier xlsx qui liste chaque donnée capturée. Les colonnes que l'outil connaît sont pré-remplies ; les colonnes RGPD sont vides, à compléter par le métier ou le DPO. Le fichier sert d'amorce au registre des traitements, à la mention d'information et à l'AIPD ; l'éditeur ne qualifie rien.

Cas d'usage : le PO exporte l'inventaire et l'envoie au DPO ; après une évolution, il réexporte et l'outil qui reçoit le fichier rapproche les deux exports par l'identifiant de ligne ; un autre outil lit le fichier pour produire les documents finaux.

### Glossaire

| Terme | Définition |
| --- | --- |
| Inventaire | Fichier xlsx produit par la commande « Exporter l'inventaire RGPD » pour un questionnaire. |
| Donnée | Valeur capturée par le questionnaire : réponse à une question, champ de structure, précision « Autre ». Peu importe que la question soit locale, de bibliothèque ou d'un fragment. |
| Chemin | Désignation de la donnée telle qu'elle s'écrit dans les expressions : `cle`, `cle.champ`, `alias.cle`, `a.b.cle`, `cle_other`. |
| Identifiant | `<clé du questionnaire>/<chemin>`. Il change dès que l'une de ces clés change ; le rapprochement entre deux exports revient à l'outil qui reçoit le fichier. |
| Question effective | Question telle qu'elle s'applique dans le formulaire : pour une référence de bibliothèque, la définition avec les surcharges du nœud (intitulé, obligatoire). |
| Colonnes pré-remplies | Colonnes que l'éditeur remplit à partir du questionnaire. |
| Colonnes à compléter | Colonnes RGPD laissées vides par l'éditeur. |
| Textes fixes | Textes écrits par l'éditeur quel que soit le questionnaire : « Oui », « Si : », mention d'amorce. |
| Donnée personnelle présumée | Indication « Oui » posée d'office pour les types mail, téléphone, adresse et civilité. |

### Exemple

```
Questionnaire « declaration_sinistre » 1.0.5 provisoire
  date_sinistre   date        question de bibliothèque
  declarant       structure   champs nom, prenom, email (champ telephone masqué)
  tiers           fragment identite_tiers, alias tiers
  circonstances   texte       « Autre (préciser) » activé

→ declaration_sinistre - 1.0.5 - provisoire - inventaire.xlsx
  declaration_sinistre/date_sinistre        Date
  declaration_sinistre/declarant.nom        Texte
  declaration_sinistre/declarant.prenom     Texte
  declaration_sinistre/declarant.email      Mail   Oui (donnée personnelle présumée)
  declaration_sinistre/tiers.nom            Texte
  declaration_sinistre/circonstances        Texte
  declaration_sinistre/circonstances_other  Texte
```

### Hors périmètre

- Qualification RGPD saisie dans l'éditeur, et relecture d'un inventaire complété.
- Documents dérivés (fiche de registre, mention d'information, pré-analyse AIPD) : fiche ultérieure.
- Variables système : capturées par l'application maître, qui en assure la partie RGPD.
- Inventaire d'un fragment seul, du projet entier, ou dans un autre format que xlsx.
- Origine d'une donnée (formulaire, bibliothèque, fragment) : seul compte le fait que le formulaire la récolte.

## Exigences

### Déclenchement

| ID | Exigence |
| --- | --- |
| EVO-029-001 | Quand un onglet de questionnaire est actif, l'éditeur propose la commande « Exporter l'inventaire RGPD » dans la palette. |
| EVO-029-002 | Quand un onglet de questionnaire est actif, l'éditeur affiche dans la barre de la vue Logigramme un bouton « Inventaire RGPD » à côté du bouton « Image ». |
| EVO-029-040 | Quand je clique sur le bouton « Inventaire RGPD », l'éditeur exporte l'inventaire du questionnaire affiché. |
| EVO-029-003 | Quand l'onglet actif est un fragment, la Bibliothèque, l'État du système, les Paramètres ou les Commentaires, l'éditeur rend la commande indisponible. |
| EVO-029-004 | Quand le questionnaire est validé, l'éditeur rend la commande disponible, comme pour un questionnaire provisoire. |
| EVO-029-005 | Quand je n'ai personnalisé aucun raccourci, l'éditeur n'associe aucun raccourci à la commande. |
| EVO-029-006 | Quand j'associe un raccourci à la commande dans les Paramètres, l'éditeur lance l'export par ce raccourci. |
| EVO-029-039 | Quand je modifie le questionnaire ou que la sauvegarde automatique s'exécute, l'éditeur ne produit aucun inventaire ; seule la commande « Exporter l'inventaire RGPD » le produit. |

### Nom du fichier

| ID | Exigence |
| --- | --- |
| EVO-029-007 | Quand j'exporte l'inventaire, l'éditeur nomme le fichier comme le JSON exporté du questionnaire (`questionnaireFileName`, EVO-022), « .json » remplacé par « - inventaire.xlsx » : `declaration_sinistre - 1.0.5 - provisoire - inventaire.xlsx`. |
| EVO-029-008 | Quand le questionnaire est validé en 1.0.4, l'éditeur nomme le fichier `<clé> - 1.0.4 - final - inventaire.xlsx`. |
| EVO-029-009 | Quand la version est vide, l'éditeur omet le segment version du nom. |
| EVO-029-010 | Quand le nom contient un caractère interdit (ex. une version `1/2`), l'éditeur le remplace par `_`, comme pour le JSON. |

### Lignes de l'onglet « Données »

| ID | Exigence |
| --- | --- |
| EVO-029-011 | Quand le questionnaire contient une question locale ou une référence de question de bibliothèque, l'éditeur écrit une ligne dont le chemin est sa clé. |
| EVO-029-012 | Quand le questionnaire appelle un fragment sous l'alias `tiers`, l'éditeur écrit une ligne par question du fragment, de chemin `tiers.<clé>`. |
| EVO-029-013 | Quand un fragment appelé en appelle un autre, l'éditeur préfixe le chemin par les alias successifs (`a.b.<clé>`). |
| EVO-029-014 | Quand une question est une structure, l'éditeur écrit une ligne par champ, de chemin `<clé>.<champ>`. |
| EVO-029-042 | Quand une question est une structure, l'éditeur n'écrit aucune ligne pour la structure elle-même. |
| EVO-029-015 | Quand un champ de structure est masqué dans une référence de question de bibliothèque, l'éditeur n'écrit aucune ligne pour ce champ. |
| EVO-029-016 | Quand « Autre (préciser) » est activé sur une question, l'éditeur écrit une ligne supplémentaire de chemin `<clé>_other`. |
| EVO-029-043 | Quand j'exporte une ligne `<clé>_other`, l'éditeur écrit en Intitulé « \<intitulé de la question> — Autre (préciser) ». |
| EVO-029-044 | Quand j'exporte une ligne `<clé>_other`, l'éditeur écrit « Texte » en Type. |
| EVO-029-017 | Quand une question est de type téléphone ou adresse, l'éditeur n'écrit aucune ligne pour le pays : il fait partie de la donnée. |
| EVO-029-018 | Quand le graphe contient des nœuds information, synthèse, fin, sortie nommée ou Renvoi, l'éditeur n'écrit aucune ligne pour eux. |
| EVO-029-019 | Quand une question n'est pas atteignable depuis le départ, l'éditeur écrit sa ligne comme les autres, sans signalement. |
| EVO-029-020 | Quand le questionnaire utilise une variable système, l'éditeur n'écrit ni ligne ni onglet pour elle. |
| EVO-029-021 | Quand j'exporte l'inventaire, l'éditeur écrit les lignes dans l'ordre de parcours du logigramme depuis le départ. |
| EVO-029-045 | Quand une question a des champs de structure ou une ligne `_other`, l'éditeur écrit ces lignes à la suite, à la place de la question dans l'ordre de parcours. |

### Colonnes

| ID | Exigence |
| --- | --- |
| EVO-029-022 | Quand j'ouvre l'onglet « Données », l'éditeur y a écrit, dans cet ordre, les colonnes pré-remplies : Identifiant, Chemin, Intitulé, Type, Obligatoire, Répétable, Donnée personnelle présumée, Description. |
| EVO-029-023 | Quand j'ouvre l'onglet « Données », l'éditeur y a écrit, après les colonnes pré-remplies, les colonnes à compléter : Catégorie de donnée, Donnée sensible (art. 9 / 10), Finalité, Justification (minimisation), Base légale, Durée de conservation, Destinataires, Observations. |
| EVO-029-046 | Quand j'ouvre l'onglet « Données », l'éditeur a laissé vides les colonnes à compléter, en texte libre sans liste déroulante. |
| EVO-029-047 | Quand j'ouvre l'onglet « Données », l'éditeur distingue visuellement les en-têtes des colonnes à compléter de ceux des colonnes pré-remplies. |
| EVO-029-024 | Quand j'exporte l'inventaire, l'éditeur écrit en Identifiant `<clé du questionnaire>/<chemin>`. |
| EVO-029-025 | Quand j'exporte l'inventaire, l'éditeur écrit en Intitulé le texte français de l'intitulé de la question effective, non interpolé. |
| EVO-029-048 | Quand un intitulé n'a pas de traduction française, l'éditeur laisse la cellule Intitulé vide. |
| EVO-029-026 | Quand j'exporte l'inventaire, l'éditeur écrit en Type le nom français du type tel qu'affiché dans l'éditeur. |
| EVO-029-028 | Quand j'exporte l'inventaire, l'éditeur écrit en Obligatoire « Oui », « Non » ou « Si : \<expression> », selon le caractère obligatoire de la question effective (EVO-012, EVO-021). |
| EVO-029-049 | Quand j'exporte une ligne `<clé>_other`, l'éditeur écrit en Obligatoire « Oui » si la précision est exigée, sinon « Non ». |
| EVO-029-029 | Quand la donnée est un champ d'une structure répétable, l'éditeur écrit « Oui » en Répétable ; sinon la cellule reste vide. |
| EVO-029-030 | Quand la donnée est de type mail, téléphone, adresse ou civilité, l'éditeur écrit « Oui » en Donnée personnelle présumée ; pour tout autre type, la cellule reste vide, jamais « Non ». |
| EVO-029-031 | Quand j'exporte une question locale, l'éditeur écrit en Description sa « Description » ; la cellule reste vide si elle n'en a pas. |
| EVO-029-050 | Quand j'exporte une référence de question de bibliothèque, l'éditeur écrit en Description celle du nœud si elle est renseignée, sinon celle de la définition dans la bibliothèque. |

### Onglet « À propos » et langue

| ID | Exigence |
| --- | --- |
| EVO-029-032 | Quand j'ouvre l'onglet « À propos », l'éditeur y a écrit le nom du projet, la clé et le titre du questionnaire, la version, le statut, la date d'export, la version du format JSON et la mention « Document d'amorce généré par l'éditeur : les colonnes RGPD sont à compléter et à valider par le DPO. » |
| EVO-029-033 | Quand la langue de l'interface n'est pas le français, l'éditeur écrit quand même en français les noms d'onglets, les en-têtes de colonnes et les textes fixes du fichier. |

### Identifiant

| ID | Exigence |
| --- | --- |
| EVO-029-034 | Quand j'exporte deux fois l'inventaire sans changer de clé ni d'alias, l'éditeur donne à chaque donnée le même identifiant. |
| EVO-029-035 | Quand je renomme une question, un champ ou un alias, l'éditeur donne aux données concernées un nouvel identifiant. |

### Non-régression

| ID | Exigence |
| --- | --- |
| EVO-029-036 | Quand j'exporte l'inventaire, l'éditeur ne modifie ni le projet, ni l'historique d'annulation, ni l'indicateur « Modifications non exportées ». |
| EVO-029-037 | Quand j'exporte le bundle, les fichiers unitaires ou l'image du logigramme, l'éditeur produit le même résultat qu'avant l'évolution. |
| EVO-029-041 | Quand la sauvegarde automatique s'exécute, l'éditeur enregistre le même contenu qu'avant l'évolution. |
| EVO-029-038 | Quand j'ouvre un projet antérieur, l'éditeur le charge sans migration (format JSON en version 15). |
| EVO-029-051 | Quand j'ouvre un projet antérieur, l'éditeur permet d'exporter l'inventaire de chacun de ses questionnaires. |

## Impacts attendus

- **Format JSON** : aucun. `formatVersion` reste 15, pas de migration, schémas, `docs/FORMAT.md` et exemple inchangés.
- **Règles existantes touchées** (réutilisées, non modifiées) :
  - nommage `questionnaireFileName` (EVO-022) pour le nom du fichier ;
  - surcharge du caractère obligatoire et question effective (EVO-012, EVO-021, `instanceQuestion`) pour la colonne Obligatoire ;
  - champs masqués `hiddenFields` (EVO-009) ;
  - alias et fragments imbriqués (EVO-008), chemins tels que les écrivent les expressions ;
  - types contact et `<clé>_pays` (EVO-007) ;
  - nœud Renvoi (EVO-024), sans ligne dans l'inventaire ;
  - catalogue des commandes et raccourcis personnalisés (`keymap`), balise `[cmd: …]` du guide (EVO-002).
- **Spec** : § Export (nouvel export d'inventaire).
- **Guide** : section 1 « Projet et fichiers » (commande, contenu du fichier, usage de l'identifiant) ; index des raccourcis régénéré.

## Analyse demandée avant de coder

Ajouter une section « Analyse » en bas de ce fichier :

1. Faisabilité et modules impactés (d'après `docs/MAP.md`).
2. **Production du xlsx** : cible, une bibliothèque embarquée qui fonctionne hors ligne dans l'application en un seul fichier, avec en-têtes stylés (EVO-029-047). Contrainte : poids ajouté. Alternative attendue si trop lourd : bibliothèque minimale sans style, en-têtes distingués autrement (préfixe, ligne de titre), à justifier.
3. **EVO-029-021, ordre de parcours** : préciser la règle avec branches, boucles et Renvoi (cible : profondeur d'abord depuis le départ, dans l'ordre des arêtes sortantes, chaque question une seule fois), et la place des questions non atteignables (cible : à la fin, dans l'ordre du graphe).
4. Matrice de couverture : `| ID | Test(s) |`.

Faisable sans ambiguïté bloquante → choix notés dans l'analyse et `docs/DECISIONS.md`, puis réalisation. Sinon → statut « à arbitrer », exigences concernées citées, options et conséquences, arrêt sans coder.

## Exigences abrogées

Aucune.

## Historique

| Version | Date | Ajoutées | Abrogées | Motif |
| --- | --- | --- | --- | --- |
| 1.0 | 2026-10-19 | 001 à 026, 028 à 051 | — | Création (027, colonne Origine, abandonnée en relecture) |

## Analyse

### 1. Faisabilité et modules impactés

Faisable sans ambiguïté bloquante, sans changement du format JSON (`formatVersion` 15, aucune migration). Modules (d'après `docs/MAP.md`) :

- `core/model` : `inventory.ts` (nouveau, pur) — `inventoryRows(ws, questionnaire)`, `traversalOrder(graphe, départ)`, `PERSONAL_TYPES` ; réutilise `instanceQuestion` (intitulé surchargé, champs masqués), `resolveRequired` (surcharges EVO-012 du nœud et des appels de fragment), `graphStart` (départ, entrée de fragment).
- `app/commands` : `inventory-file.ts` (nom du fichier par `questionnaireFileName` de `format`, contenu des onglets, textes fixes en français), `inventory-commands.ts` (commande `questionnaire.exportInventory`, sans raccourci par défaut ; nom du type par `registry`), `download` existant.
- `app/i18n` : libellés `inventory.export` (palette) et `inventory.short` (bouton), multilingues.
- `ui/shell` : bouton « Inventaire RGPD » de la barre de la vue Logigramme (`QuestionnaireView`), juste après « Image ».
- Aucun impact sur `format`, `app/store`, `app/persistence` : l'export lit l'état sans rien écrire (EVO-029-036, 039, 041).

### 2. Production du xlsx

Retenu : **write-excel-file** (4.1.1, export `write-excel-file/browser`, dépendance `fflate`), bibliothèque embarquée par le build, sans réseau, qui produit un vrai xlsx avec styles de cellule (gras, couleur de fond), ligne d'en-tête figée et largeurs de colonnes. Poids mesuré : `dist/index.html` passe de 3 132 ko à 3 208 ko (+76 ko, +22 ko compressé, ≈ 2,4 %), jugé acceptable : pas besoin de l'alternative sans style. Écartés : ExcelJS (plusieurs centaines de ko), SheetJS communautaire (pas de style à l'écriture), écrire le zip à la main (contraire à §7 « une librairie existante est préférée »).
En-têtes (EVO-029-047) : gras sur fond bleu clair (`#D9E1F2`) pour les colonnes pré-remplies, gras sur fond jaune clair (`#FFF2CC`) pour les colonnes à compléter. Aucune validation de données (liste déroulante) : texte libre (EVO-029-046).

### 3. Ordre de parcours (EVO-029-021, 045)

- Graphe du questionnaire parcouru en profondeur d'abord depuis le départ ; les arêtes sortantes d'un nœud sont suivies dans leur ordre (rang du tableau `edges`) ; chaque nœud n'est visité qu'une fois (une boucle ne repasse pas sur une question déjà écrite).
- Les nœuds non atteignables depuis le départ suivent, dans l'ordre du graphe (ordre du tableau `nodes`), sans parcours depuis eux et sans signalement (EVO-029-019).
- Un nœud fragment est remplacé, à sa place, par les lignes de son fragment, calculées par la même règle à partir de son entrée (`graphStart`), récursivement pour les fragments imbriqués ; un cycle d'appels est coupé (fragment déjà en cours ignoré).
- Les nœuds information, synthèse, fin, sortie nommée et Renvoi ne produisent aucune ligne mais sont traversés (leurs arêtes sortantes sont suivies) ; les cibles des boutons d'un Renvoi ne sont pas des arêtes et ne sont pas suivies.
- Une question produit ses lignes à sa place : la question, puis sa ligne `_other` ; une structure, ses champs dans l'ordre (champs masqués exclus), chacun suivi de sa ligne `_other` le cas échéant.

### 4. Choix de détail (notés dans `docs/DECISIONS.md`)

- Intitulé à variantes : texte « sinon » (`otherwise`) en français. Ligne `_other` d'une question sans intitulé français : cellule vide.
- Champ de structure : Obligatoire = caractère obligatoire du champ lui-même ; Description = celle du champ ; un champ « Autre (préciser) » donne `cle.champ_other` (chemin des expressions). Ligne `_other` : Description et Répétable de sa question ou de son champ.
- Onglet « À propos » : titre en français, sinon dans la langue par défaut du projet ; statut écrit « final » ou « provisoire » (mots du nom de fichier) ; date d'export `AAAA-MM-JJ` (date locale).
- Commande `questionnaire.exportInventory`, portée globale, disponible dans les deux vues (Logigramme et Prévisualisation) d'un onglet de questionnaire ; le bouton n'est affiché que dans la vue Logigramme, toujours actif (un questionnaire vide donne un inventaire réduit aux en-têtes).

### 5. Matrice de couverture

Tests unitaires : `src/core/model/inventory.test.ts` (noyau), `src/app/commands/inventory-file.test.ts` (fichier, commande) ; test de fumée : `tests/smoke/evo-029.spec.ts`.

| ID | Test(s) |
| --- | --- |
| EVO-029-001 | `inventory-file.test.ts` « EVO-029-001 » ; `evo-029.spec.ts` « EVO-029-001 / EVO-029-004 / EVO-029-008 » |
| EVO-029-002 | `evo-029.spec.ts` « EVO-029-002 / EVO-029-040 / EVO-029-036 » |
| EVO-029-003 | `inventory-file.test.ts` « EVO-029-003 » |
| EVO-029-004 | `inventory-file.test.ts` « EVO-029-004 » ; `evo-029.spec.ts` « EVO-029-001 / EVO-029-004 / EVO-029-008 » |
| EVO-029-005 | `inventory-file.test.ts` « EVO-029-005 » |
| EVO-029-006 | `evo-029.spec.ts` « EVO-029-006 » |
| EVO-029-007 | `inventory-file.test.ts` « EVO-029-007 » ; `evo-029.spec.ts` « EVO-029-002 … » |
| EVO-029-008 | `inventory-file.test.ts` « EVO-029-008 » ; `evo-029.spec.ts` « EVO-029-001 / EVO-029-004 / EVO-029-008 » |
| EVO-029-009 | `inventory-file.test.ts` « EVO-029-009 » |
| EVO-029-010 | `inventory-file.test.ts` « EVO-029-010 » |
| EVO-029-011 | `inventory.test.ts` « EVO-029-011 » |
| EVO-029-012 | `inventory.test.ts` « EVO-029-012 / EVO-029-013 » |
| EVO-029-013 | `inventory.test.ts` « EVO-029-012 / EVO-029-013 » |
| EVO-029-014 | `inventory.test.ts` « EVO-029-014 / EVO-029-042 » |
| EVO-029-015 | `inventory.test.ts` « EVO-029-015 » |
| EVO-029-016 | `inventory.test.ts` « EVO-029-016 / EVO-029-044 / EVO-029-049 » |
| EVO-029-017 | `inventory.test.ts` « EVO-029-017 » |
| EVO-029-018 | `inventory.test.ts` « EVO-029-018 » |
| EVO-029-019 | `inventory.test.ts` « EVO-029-019 / EVO-029-021 » |
| EVO-029-020 | `inventory.test.ts` « EVO-029-020 » |
| EVO-029-021 | `inventory.test.ts` « EVO-029-019 / EVO-029-021 » |
| EVO-029-022 | `inventory-file.test.ts` « EVO-029-022 / EVO-029-023 » |
| EVO-029-023 | `inventory-file.test.ts` « EVO-029-022 / EVO-029-023 » |
| EVO-029-024 | `inventory-file.test.ts` « EVO-029-024 » |
| EVO-029-025 | `inventory.test.ts` « EVO-029-025 / EVO-029-028 » ; `inventory-file.test.ts` « EVO-029-025 / EVO-029-048 » |
| EVO-029-026 | `inventory-file.test.ts` « EVO-029-026 » |
| EVO-029-028 | `inventory.test.ts` « EVO-029-025 / EVO-029-028 » ; `inventory-file.test.ts` « EVO-029-028 » |
| EVO-029-029 | `inventory.test.ts` « EVO-029-029 » ; `inventory-file.test.ts` « EVO-029-029 / EVO-029-030 / EVO-029-031 » |
| EVO-029-030 | `inventory.test.ts` « EVO-029-030 » ; `inventory-file.test.ts` « EVO-029-029 / EVO-029-030 / EVO-029-031 » |
| EVO-029-031 | `inventory.test.ts` « EVO-029-031 / EVO-029-050 » ; `inventory-file.test.ts` « EVO-029-029 / EVO-029-030 / EVO-029-031 » |
| EVO-029-032 | `inventory-file.test.ts` « EVO-029-032 » ; `evo-029.spec.ts` « EVO-029-002 … » (fichier réel) |
| EVO-029-033 | `inventory-file.test.ts` « EVO-029-033 » |
| EVO-029-034 | `inventory.test.ts` « EVO-029-034 / EVO-029-035 » |
| EVO-029-035 | `inventory.test.ts` « EVO-029-034 / EVO-029-035 » |
| EVO-029-036 | `inventory-file.test.ts` « EVO-029-036 » ; `evo-029.spec.ts` « EVO-029-002 / EVO-029-040 / EVO-029-036 » |
| EVO-029-037 | `inventory-file.test.ts` « EVO-029-037 » ; tests de référence (`tests/reference`) et `evo-004.spec.ts` inchangés |
| EVO-029-038 | `inventory-file.test.ts` « EVO-029-038 » |
| EVO-029-039 | `inventory-file.test.ts` « EVO-029-039 » |
| EVO-029-040 | `evo-029.spec.ts` « EVO-029-002 / EVO-029-040 / EVO-029-036 » |
| EVO-029-041 | `inventory-file.test.ts` « EVO-029-041 » |
| EVO-029-042 | `inventory.test.ts` « EVO-029-014 / EVO-029-042 » |
| EVO-029-043 | `inventory-file.test.ts` « EVO-029-043 / EVO-029-044 / EVO-029-049 » |
| EVO-029-044 | `inventory.test.ts` « EVO-029-016 / EVO-029-044 / EVO-029-049 » ; `inventory-file.test.ts` « EVO-029-043 / EVO-029-044 / EVO-029-049 » |
| EVO-029-045 | `inventory.test.ts` « EVO-029-045 » |
| EVO-029-046 | `inventory-file.test.ts` « EVO-029-046 » |
| EVO-029-047 | `inventory-file.test.ts` « EVO-029-047 » ; `evo-029.spec.ts` « EVO-029-002 … » (styles du fichier réel) |
| EVO-029-048 | `inventory-file.test.ts` « EVO-029-025 / EVO-029-048 » |
| EVO-029-049 | `inventory.test.ts` « EVO-029-016 / EVO-029-044 / EVO-029-049 » ; `inventory-file.test.ts` « EVO-029-043 / EVO-029-044 / EVO-029-049 » |
| EVO-029-050 | `inventory.test.ts` « EVO-029-031 / EVO-029-050 » |
| EVO-029-051 | `inventory-file.test.ts` « EVO-029-051 » |
