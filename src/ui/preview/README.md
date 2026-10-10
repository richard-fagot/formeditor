# ui/preview

Prévisualisation en wizard, exécutée par le moteur de parcours (`core/runtime`) : une page par question,
pages d'information, de synthèse et de fin ; panneaux d'état du système et de débogage.
Dépend de `core`, `registry`, `app/store`, `app/commands`, `ui-kit`, `ui/system-state`.

## Fichiers
- `usePreview.ts` : état par questionnaire dans `store.preview[id]` (session, scénario, état du système édité,
  langue, `returnTo`) ; l'état du système vient de `systemStateOf` (`app/store`). `makeRenderEnv` construit
  l'environnement de rendu des plugins (libellés résolus, `options` via `choiceOptions`, `scoped`).
- `Preview.tsx` : barre (langue : commande `preview.lang` ; nombre de textes non traduits dans la langue affichée, montrés
  dans la langue par défaut ; recommencer, bascule des panneaux : commandes `preview.toggleSystem`,
  `preview.toggleDebug`), `Wizard` (progression, page, précédent / suivant, « Revenir à la synthèse »), panneau latéral.
  « Suivant » valide la réponse (`core/validation`) ; les erreurs s'affichent après une tentative.
  Un clic sur la page sélectionne le nœud dans le logigramme.
- `Summary.tsx` : récapitulatif (`summaryEntries`) ; un clic sur une réponse ramène à la question (`goTo`)
  et mémorise la synthèse (`returnTo`) ; « Revenir à la synthèse » appelle `resume` après validation, en revalidant chaque page repassée.
- `SystemPanel.tsx` : scénario nommé, édition libre (`PreviewState.sys`, la session est conservée :
  réévaluation immédiate), rétablir les valeurs du scénario, enregistrer comme scénario (`preview.saveScenario`).
- `DebugPanel.tsx` : chemin parcouru, conditions des arêtes sortantes de la page courante (`edgeTrace`), valeurs courantes.

## Pièges
- `data-testid="preview"` couvre la colonne du wizard seulement (pas le panneau latéral) : les tests de fumée
  y cherchent les champs par rôle.
