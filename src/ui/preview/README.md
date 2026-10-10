# ui/preview

Prévisualisation en wizard, exécutée par le moteur de parcours (`core/runtime`) : une page par question,
pages d'information, de synthèse (retour à une question par clic) et de fin. Dépend de `core`, `registry`,
`app/store`, `ui-kit`.

## Fichiers
- `usePreview.ts` : état par questionnaire dans `store.preview[id]` (session, scénario, état du système,
  langue) ; `makeRenderEnv` construit l'environnement de rendu des plugins (libellés résolus dans le contexte,
  `options` via `choiceOptions`, `scoped` pour les occurrences de structure).
- `Preview.tsx` : barre (scénario, langue, recommencer), progression, page, précédent/suivant.
  « Suivant » valide la réponse (`core/validation`) ; les erreurs s'affichent après une tentative.
  Un clic sur la page sélectionne le nœud dans le logigramme.

## À venir (phase 8)
Panneau d'état du système (édition libre, scénarios), débogage.
