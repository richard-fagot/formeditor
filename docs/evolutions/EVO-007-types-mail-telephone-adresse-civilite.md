# EVO-007 — Types mail, téléphone, adresse et civilité

Statut : à faire
Dépend de : aucune (s'appuie sur les types texte et choix unique, et sur les contraintes du §3.7)

## Besoin

Aujourd'hui, une adresse mail, un numéro de téléphone, une adresse postale ou une civilité se
saisissent avec un champ texte ou un choix unique générique : aucun contrôle de format, aucune
normalisation, et l'équipe de dev ne sait pas, à la lecture du JSON, quelle donnée est attendue.
Je veux pouvoir utiliser quatre **types dédiés**, comme question et comme champ d'une
**structure** : **mail**, **téléphone**, **adresse** (en une seule ligne) et **civilité**, chacun
avec ses **contrôles de format intégrés**. Le téléphone et l'adresse doivent accepter des
coordonnées **à l'étranger**.

Exemple d'usage : une structure `souscripteur` contenant

```
civilite     Civilité         civilité
nom          Nom              texte
mail         Adresse mail     mail
telephone    Téléphone        téléphone
adresse      Adresse          adresse
```

Puis, dans le paramétrage : téléphone avec pays par défaut France et type de ligne « mobile » ;
adresse avec pays par défaut France.

Affichage attendu, dans l'ordre : boutons « Madame / Monsieur », champ nom, champ mail, sélecteur
d'indicatif pays (🇫🇷 +33) suivi du numéro, sélecteur de pays suivi d'une ligne d'adresse. Une
saisie invalide affiche le message de la contrainte, comme pour les autres types.

## Comportement attendu

- **Commun aux quatre types** :
  - Ils apparaissent dans la palette et dans la liste des types d'un champ de structure.
  - Les contrôles de format sont **intégrés** au type : ce ne sont pas des contraintes à écrire.
    Chacun a un message par défaut, multilingue et surchargeable, comme les contraintes du §3.7.
  - Les contraintes libres, les conditions d'affichage et le caractère obligatoire s'appliquent
    comme pour les autres types.
  - Les espaces en début et en fin de saisie sont supprimés avant contrôle.
- **Mail** :
  - Contrôles : l'adresse respecte la norme, soit la syntaxe `addr-spec` de la **RFC 5322**
    restreinte par la forme `Mailbox` de la **RFC 5321** :
    - partie locale en `dot-atom` (pas de point en début, en fin ni doublé) ou en chaîne entre
      guillemets (`"jean dupont"@exemple.fr`) ;
    - domaine sous forme de nom de domaine (labels de 63 caractères max, lettres, chiffres et
      tirets, sans tiret en début ni en fin de label) ou de littéral d'adresse IP
      (`[192.0.2.1]`, `[IPv6:2001:db8::1]`) ;
    - limites de longueur de la RFC 5321 : 64 octets pour la partie locale, 254 caractères au
      total ;
    - syntaxe obsolète, commentaires et espaces repliables (`CFWS`) refusés, comme le prévoit la
      RFC 5321 pour une adresse transmise.
  - Normalisation : le domaine est enregistré en minuscules, la partie locale telle que saisie.
  - Pas de vérification d'existence de la boîte (hors périmètre).
- **Téléphone** :
  - Saisie : un sélecteur d'indicatif pays (drapeau, nom du pays, indicatif) et le numéro.
    Espaces, points, tirets et parenthèses sont acceptés. Un numéro commençant par `+` ou `00`
    fixe le pays et prime sur le sélecteur.
  - Contrôles : le numéro est valide pour le pays (longueur et préfixes du plan de numérotation) ;
    si un type de ligne est exigé, le numéro est de ce type (mobile ou fixe).
  - Normalisation : valeur enregistrée au format international E.164 (`+33612345678`) ; affichage
    au format national du pays après saisie (`06 12 34 56 78`). Saisie FR `0612345678` →
    `+33612345678`.
  - Paramétrage : pays par défaut (France par défaut) ; pays autorisés (tous par défaut, ou une
    liste) ; type de ligne attendu (indifférent par défaut, mobile, fixe).
- **Adresse** :
  - Saisie : un sélecteur de pays et **une seule ligne** de texte libre (numéro, voie, code
    postal, ville). Le sélecteur peut être masqué si un seul pays est autorisé.
  - Contrôles, tous pays : au moins une lettre ; pas uniquement des chiffres ; longueur entre 5 et
    200 caractères (bornes paramétrables) ; pas de retour à la ligne ni de caractère de contrôle.
    Les lettres accentuées et les autres alphabets sont acceptés.
  - Contrôle complémentaire, France : la ligne contient un code postal à 5 chiffres.
  - Paramétrage : pays par défaut (France par défaut) ; pays autorisés ; indicateur « adresse à
    vérifier par un service de normalisation » (BAN pour la France, ou autre), **exporté pour
    l'équipe de dev** mais non exécuté par l'outil (voir Analyse).
- **Civilité** :
  - Choix unique prédéfini : Madame (code `MME`), Monsieur (code `M`). Option facultative
    « Ne se prononce pas » (code `NP`), désactivée par défaut.
  - Les **codes sont fixes** ; les libellés sont modifiables et multilingues. Libellés fournis
    par défaut en français et en anglais ; les autres langues du projet sont signalées comme
    traductions manquantes.
  - Pas de « Autre (préciser) », pas de source dynamique, pas d'options ajoutées.
  - Affichage : boutons radio sur une ligne ; libellé court (« Mme », « M. ») ou long
    (« Madame », « Monsieur ») au choix dans le paramétrage.
- **Expressions** :
  - `ma_question` renvoie la valeur normalisée : mail normalisé, téléphone E.164, ligne d'adresse
    saisie, code de civilité. Vide si non répondu.
  - `ma_question.pays` (téléphone et adresse) renvoie le code pays ISO 3166-1 alpha-2 (`FR`, `BE`).
  - L'interpolation d'une civilité dans un libellé (`{civilite} {nom}`) affiche son libellé dans
    la langue courante, comme pour un choix unique ; celle d'un téléphone affiche le format
    international lisible (`+33 6 12 34 56 78`).
- **Logigramme** : le nœud affiche le type avec une icône dédiée ; pour le téléphone et l'adresse,
  le pays par défaut s'il n'est pas France, et « mobile » ou « fixe » si un type de ligne est exigé.
- **Prévisualisation** : contrôles appliqués à la sortie du champ et à la validation de la page ;
  reformatage du téléphone à la sortie du champ ; le panneau de débogage montre la valeur
  normalisée et le pays.
- **Panneau de propriétés** : les paramètres propres à chaque type, et les messages des contrôles
  intégrés avec leurs traductions.

## Critères d'acceptation

- Quand je crée la structure de l'exemple, alors chaque champ a le type attendu et la
  prévisualisation affiche les contrôles dans l'ordre décrit.
- Quand je saisis `Jean.Dupont@Exemple.FR`, alors la saisie est acceptée et la valeur vaut
  `Jean.Dupont@exemple.fr`.
- Quand je saisis `jean dupont@exemple.fr`, `jean@@exemple.fr`, `.jean@exemple.fr`,
  `jean..dupont@exemple.fr` ou une partie locale de 65 caractères, alors le message du contrôle
  mail s'affiche et la page ne peut pas être validée.
- Quand je saisis `jean+test@exemple.fr`, `"jean dupont"@exemple.fr` ou `jean@[192.0.2.1]`, alors
  la saisie est acceptée, conformément aux RFC 5321 et 5322.
- Quand je saisis `06 12 34 56 78` avec la France sélectionnée, alors la valeur vaut
  `+33612345678` et le champ affiche `06 12 34 56 78`.
- Quand je saisis `+32 470 12 34 56` alors que la France est sélectionnée, alors le sélecteur
  passe sur la Belgique et `telephone.pays` vaut `BE`.
- Quand je saisis `0044 20 7946 0958`, alors le numéro est reconnu comme britannique.
- Quand je saisis un numéro trop court ou trop long pour le pays choisi, alors le message du
  contrôle téléphone s'affiche.
- Quand le type de ligne exigé est « mobile » et que je saisis un fixe français (`05 61 …`), alors
  le message du contrôle de type de ligne s'affiche.
- Quand la liste des pays autorisés est limitée à la France et à la Belgique, alors le sélecteur
  ne propose que ces deux pays et un numéro `+44…` est refusé.
- Quand je saisis `12 rue des Lilas 31000 Toulouse` avec la France, alors l'adresse est acceptée.
- Quand je saisis `12 rue des Lilas Toulouse` avec la France, alors le message « code postal
  manquant » s'affiche ; avec l'Allemagne, la même saisie est acceptée.
- Quand je saisis `12345` ou une adresse de plus de 200 caractères, alors le message du contrôle
  adresse s'affiche.
- Quand je saisis une adresse en caractères non latins (ex. `東京都千代田区1-1`) avec le Japon,
  alors elle est acceptée.
- Quand je choisis « Madame », alors `civilite` vaut `MME` et `{civilite} {nom}` affiche
  « Madame Dupont » (libellé long) en français.
- Quand j'active « Ne se prononce pas », alors l'option apparaît en dernier et renvoie `NP`.
- Quand je modifie le libellé « Madame » en « Mme », alors le code reste `MME`.
- Quand je surcharge le message d'un contrôle intégré, alors mon message s'affiche à la place du
  message par défaut, dans chaque langue traduite.
- Quand une question de l'un de ces types est facultative et vide, alors aucun contrôle de format
  ne se déclenche.
- Quand je n'utilise pas ces types, alors le comportement est identique à aujourd'hui.
- Quand j'ouvre un projet antérieur, alors il se charge sans erreur.
- Quand j'exporte puis réimporte un projet utilisant les quatre types, alors types, paramètres,
  messages surchargés et traductions sont identiques.
- Le guide utilisateur décrit les quatre types, leurs contrôles, leurs paramètres et les valeurs
  renvoyées dans les expressions.

## Impacts attendus

- **Format JSON** : nouvelle `formatVersion` (ajout de types, sans migration de données) ; JSON
  Schema des quatre types et de leurs paramètres ; `docs/FORMAT.md` (types, valeurs enregistrées,
  codes de civilité, codes pays ISO, indicateur de vérification d'adresse) ; exemple mis à jour
  avec la structure `souscripteur`.
- **Spec** : §3.4 (tableau des types), §3.5 (référence `.pays`), §3.7 (contrôles intégrés et
  messages par défaut), §3.9 (libellés de civilité et noms de pays multilingues).
- **Guide** : sections types de questions, contraintes, expressions.

## Analyse demandée avant de coder

Ajouter une section « Analyse » en bas de ce fichier :

1. Faisabilité et modules impactés (d'après `docs/MAP.md`) : un plugin par type, ou un plugin
   texte spécialisé pour mail, téléphone et adresse et un plugin choix unique spécialisé pour la
   civilité.
2. **Validation du téléphone** : cible, une validation par pays avec distinction mobile / fixe
   (ex. `libphonenumber-js`, métadonnées « max » ou « mobile »). Contrainte : taille embarquée et
   fonctionnement hors ligne. Alternative si la cible est trop lourde : contrôle E.164 générique
   (indicatif connu, 8 à 15 chiffres) plus règles fines pour la France seule, et le type de ligne
   limité à la France.
3. **Noms de pays multilingues** : cible, `Intl.DisplayNames` du navigateur, sans données
   embarquées. Vérifier le rendu sous Firefox, Chrome et Edge ; sinon, une table de noms en
   français et en anglais.
4. **Adresse** : confirmer qu'aucun appel à un service externe n'est fait par l'outil
   (fonctionnement sans serveur) et que la vérification reste un indicateur exporté. Si un appel
   à l'API Adresse en prévisualisation est jugé simple et sans risque, le proposer comme option,
   sans le réaliser.
5. **Mail** : cible, la conformité RFC 5321 / 5322 décrite ci-dessus, couverte par des tests sur
   les cas limites de la norme. Choisir entre une bibliothèque éprouvée et une grammaire écrite et
   testée dans l'outil. Statuer sur les adresses internationalisées (RFC 6531 et 6532 : accents
   dans la partie locale ou le domaine) : acceptées ou refusées.
6. **Format de stockage** : valeur normalisée seule, ou valeur normalisée plus saisie brute pour
   le téléphone et l'adresse ; emplacement du pays dans la réponse enregistrée.

Faisable sans ambiguïté bloquante → choix notés dans l'analyse et `docs/DECISIONS.md`, puis
réalisation. Sinon → statut « à arbitrer », options et conséquences, arrêt sans coder.
