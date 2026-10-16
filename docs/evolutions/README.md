# Fiches d'évolution — format et règles

Une fiche = une demande = un fichier `EVO-NNN-titre-en-kebab-case.md`. Les fiches à partir
d'EVO-024 suivent le format ci-dessous ; les fiches antérieures (ligne `Statut :`, critères
d'acceptation en texte) restent valables telles quelles.

## Structure

1. Frontmatter (voir ci-dessous).
2. `# EVO-NNN — Titre`
3. `## Contexte` — non normatif : besoin (aujourd'hui / demain, d'après `docs/EXISTANT.md`),
   cas d'usage, glossaire, exemple, hors périmètre.
4. `## Exigences` — tableaux `| ID | Exigence |` regroupés par thème (`###`). **Seules les
   exigences font foi.**
5. `## Impacts attendus` — format JSON, règles existantes touchées, spec, guide.
6. `## Analyse demandée avant de coder` — points incertains, cités par ID.
7. `## Exigences abrogées` — `| ID | Remplacée par | Version |`.
8. `## Historique` — `| Version | Date | Ajoutées | Abrogées | Motif |`.
9. `## Analyse` — ajoutée par Claude Code, avec la matrice de couverture.

## Frontmatter

```yaml
id: EVO-NNN
titre: Titre court
statut: à faire          # à faire | à arbitrer | en cours | fait AAAA-MM-JJ | abandonnée
version: 1.0             # version de la fiche
qualificatif: provisoire # provisoire (en relecture) | final (validée, commitée)
derniere_exigence: EVO-NNN-000  # dernier numéro attribué : le suivant repart de là
depend_de: []            # EVO dont celle-ci réutilise le résultat
```

## Exigences

- **ID** : `EVO-NNN-XXX`, unique dans toute l'application, jamais réutilisé, même s'il a été
  abandonné en relecture. L'ordre des lignes ne suit pas forcément l'ordre des numéros.
- **Une exigence = un comportement observable = au moins un test.** Atomique, non ambiguë,
  vérifiable, sans redondance avec une autre exigence.
- **Formulation** : « Quand \<situation>, l'éditeur \<résultat observable>. », ou une règle
  invariante (« Un bouton à cible nœud ne porte aucun toggle. »).
- **Fonctionnel uniquement** : pas de technique (noms de fichiers, de fonctions, de propriétés
  JSON) ; précisions UI/UX admises. Les noms de l'outil (commandes, champs, onglets, types)
  sont ceux de `docs/EXISTANT.md`.
- **Modules communs** (vérifications du graphe et panneau des problèmes, `docs/ERREURS.md`,
  conditions d'affichage, garde de fin, copier-coller, duplication) : y renvoyer, ne pas les
  redécrire. Un problème signalé s'écrit « l'éditeur signale l'erreur | l'avertissement « texte » ».
- Toujours au moins une exigence de non-régression sur l'existant voisin.

## Abrogation

- Tant que `qualificatif: provisoire`, une exigence non validée se corrige sur place.
- Une fois la fiche `final`, une exigence ne se modifie plus, même d'une virgule : elle est
  **abrogée** (déplacée dans « Exigences abrogées », texte supprimé — git le conserve) et
  remplacée par une nouvelle exigence au numéro suivant `derniere_exigence`.
- Toute modification d'une fiche `final` : `version` +0.1 (ou +1.0 si le besoin change),
  `qualificatif: provisoire` jusqu'à revalidation, une ligne d'historique.

## Pour Claude Code

- La fiche est normative : ne pas modifier les exigences ; seuls `statut` et la section
  `## Analyse` s'écrivent.
- Chaque test couvrant une exigence cite son ID dans son titre :
  `it('EVO-024-031 — libellé vide : erreur signalée', …)`. Un test peut citer plusieurs ID.
- Matrice de couverture en fin d'analyse : `| ID | Test(s) |`, une ligne par exigence non abrogée.
- Exigence abrogée : supprimer ou réécrire les tests qui la citent.
- Contrôle : `grep -rhoE 'EVO-NNN-[0-9]{3}' src tests scripts | sort -u` doit lister toutes les
  exigences non abrogées.
