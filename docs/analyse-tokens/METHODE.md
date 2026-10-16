# Analyse de la consommation de tokens — mode d'emploi

À relire avant de refaire l'analyse. Objectif : une analyse **bornée** (un sous-agent, environ
25 appels d'outils), pas une exploration ouverte. Rapports précédents : `RAPPORT-AAAA-MM-JJ.md`
dans ce dossier (le dernier sert de référence de comparaison).

## Fonctionnement actuel (ce qui consomme)

Orchestration (CLAUDE.md, « Orchestration par sous-agents » et « Évolutions ») :

| Rôle | Fichier | Modèle | Outils | Fait |
| --- | --- | --- | --- | --- |
| orchestrateur | session principale | celui de la session | tous | crée la branche, délègue, fusionne, corrige les écarts de documentation |
| `realisateur` | `.claude/agents/realisateur.md` | hérité | Read, Edit, Write, Grep, Glob, Bash | analyse, spec, code, tests, guide, `npm run check` une fois |
| `relecteur` | `.claude/agents/relecteur.md` | hérité | Read, Grep, Glob, Bash | relit la branche, verdict CONFORME / ÉCARTS |
| `inventoriste` | `.claude/agents/inventoriste.md` | sonnet | Read, Edit, Grep, Glob, Bash | met à jour `docs/EXISTANT.md` (index) et `docs/existant/` depuis le diff |

Par évolution : realisateur → relecteur → (realisateur + relecteur si écart bloquant/majeur, 3 fois au plus)
→ inventoriste (sauf diff sans `src/` ni format) → fusion. Le tableau d'écarts du relecteur est
transmis à l'inventoriste.

Ordres de grandeur mesurés le 2026-10-16 (avant les réglages du rapport) : réalisateur ≈ 63 %,
inventoriste ≈ 19 %, orchestrateur ≈ 11 %, relecteur ≈ 8 %. Le coût est dominé par le contexte
relu à chaque appel (cache), pas par les sorties de tests (< 1 %).

## Où sont les données

- Session principale : `/root/.claude/projects/-home-user-formeditor/<session>.jsonl`
  (`<session>` : le plus gros `.jsonl` récent du dossier, ou le nom du dossier du scratchpad).
- Sous-agents : `/root/.claude/projects/-home-user-formeditor/<session>/subagents/agent-<id>.jsonl`,
  avec `agent-<id>.meta.json` (type d'agent et description de la tâche).
- Ces fichiers sont dans le conteneur de la session : l'analyse se fait **dans la session à analyser**,
  avant qu'elle ne se termine.

## Procédure (à suivre telle quelle)

1. Lancer un seul sous-agent `general-purpose`. Lui donner ce fichier, le dernier rapport et le chemin
   du `.jsonl` de session ; lui interdire de lire les transcripts autrement que par les scripts.
2. Mesurer avec les scripts (sorties dans le scratchpad, jamais dans le dépôt) :
   ```bash
   OUT=<scratchpad>/tokens && mkdir -p "$OUT"
   python3 -I scripts/analyse-tokens/analyse.py <session>.jsonl "$OUT" [id-agent-analyse] > "$OUT/tableau.txt"
   python3 -I scripts/analyse-tokens/couts.py  "$OUT" > "$OUT/couts.txt"    # coût par rôle / évolution
   python3 -I scripts/analyse-tokens/outils.py "$OUT" > "$OUT/outils.txt"   # résultats d'outils coûteux
   python3 -I scripts/analyse-tokens/ctx.py    "$OUT" > "$OUT/ctx.txt"      # croissance du contexte
   ```
   `analyse.py` produit `agents.pkl`, lu par les trois autres. Lire les `.txt` avec `head`/`grep`.
3. Comparer au dernier rapport : les recommandations appliquées ont-elles eu l'effet annoncé ?
   Y a-t-il un nouveau poste dominant ?
4. Écrire `docs/analyse-tokens/RAPPORT-AAAA-MM-JJ.md` (même plan : méthode, tableau par agent,
   où partent les tokens, recommandations chiffrées avec risque, ce qu'il ne faut pas changer).
5. L'orchestrateur résume à l'utilisateur et n'applique rien sans son accord.

## Limites connues (ne pas les re-découvrir)

- `output_tokens` des sous-agents est inutilisable (instantané de début de flux) : estimation par le
  contenu visible à 3,6 caractères par token, × 2 pour la réflexion masquée (facteur calé sur l'orchestrateur).
- Coûts aux tarifs API d'Opus 5.5 (entrée 4 $, écriture cache 5 $, lecture cache 0,20 $, sortie 20 $ par Mt) :
  unité de comparaison, pas la facture.
- Appels dédoublonnés par `message.id` (un appel s'étale sur plusieurs lignes JSONL).
- « Relu en cache » d'un résultat d'outil = sa taille × nombre d'appels qui suivent dans le même agent.

## Garde-fous contre l'analyse sans fin

- Ne pas réécrire les scripts : les corriger seulement s'ils échouent sur le nouveau format de transcript.
- Ne pas lire de `.jsonl` avec `cat`, `Read` ou `head` sans filtre : uniquement via les scripts ou `jq` ciblé.
- Une seule passe : pas de second sous-agent pour « approfondir ». Une question restée ouverte
  va dans le rapport, section limites.
- Pistes déjà traitées (ne pas les re-proposer sans fait nouveau) : fusionner l'inventoriste dans le
  réalisateur (déconseillé) ; Sonnet pour le réalisateur (différé, R9) ; découpage d'EXISTANT.md (fait le
  2026-10-16, règle générale « Documents volumineux » de CLAUDE.md).
- Une recommandation ne doit jamais réduire l'information conservée : seulement la façon de la lire.
