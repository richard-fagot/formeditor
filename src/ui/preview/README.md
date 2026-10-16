# ui/preview

Prévisualisation en wizard, exécutée par le moteur de parcours (`core/runtime`) : une page par question,
pages d'information, de synthèse et de fin ; panneaux d'état du système et de débogage.
Dépend de `core`, `registry`, `app/store`, `app/commands`, `ui-kit`, `ui/system-state`.

## Fichiers
- `usePreview.ts` : état par questionnaire dans `store.preview[id]` (session, scénario, état du système édité,
  langue, `returnTo`) ; l'état du système vient de `systemStateOf` (`app/store`). `makeRenderEnv` construit
  l'environnement de rendu des plugins (libellés résolus, `options` via `choiceOptions`, `scoped`, `graph` = graphe de la page).
  `RuntimeInput.env.defaultLang` = langue par défaut du projet (identifiant d'un groupe d'options sans code). Le groupe de
  la sélection (`<clé>_group`) est passé au champ (`group`) et enregistré par `setAnswer` ; de même le marqueur « Ne sais pas »
  (`dontKnow`, `onDontKnow` : `dontKnowAnswer` puis `setAnswer(…, true)`, décochée : réponse effacée) et le pays d'un téléphone
  ou d'une adresse (`country`, `<clé>_pays`, EVO-007). `RuntimeInput.env.display` = `displayFormatters(ws, questionnaire)` (`core/contact`) :
  interpolation d'une civilité (libellé) et d'un téléphone (format international) ; sur la page d'un fragment, `makeRenderEnv`
  le remplace par celui du fragment.
- `Preview.tsx` : barre (langue : commande `preview.lang` ; nombre de textes non traduits dans la langue affichée (`useIssues` d'`app/issues`), montrés
  dans la langue par défaut ; recommencer, bascule des panneaux : commandes `preview.toggleSystem`,
  `preview.toggleDebug`), `Wizard` (progression, page, précédent / suivant, « Revenir à la synthèse »), panneau latéral.
  « Suivant » valide la réponse (`core/validation`) ; les erreurs s'affichent après une tentative.
  Contrôles de saisie (EVO-014, bouton `preview.toggleChecks`, `previewChecks` du store, bandeau `preview-checks-off`) : point de
  bascule unique dans `Wizard` ; désactivés, ni `check()` avant d'avancer, ni prédicat de `resume`, ni `guardEnd`, ni erreurs
  affichées, `env.checks = false` pour les plugins (`makeRenderEnv(…, checks)`) ; les pages quittées sont ajoutées à
  `PreviewState.unchecked`, ignorées par `guardEnd` après réactivation. Les conditions (moteur) ne changent pas.
  Un clic sur la page sélectionne le nœud dans le logigramme.
- `Summary.tsx` : récapitulatif (`summaryEntries` ; option d'un groupe affichée « Groupe — Option » par `formatAnswer` ; « Ne sais pas » : son libellé) ; un clic sur une réponse ramène à la question (`goTo`)
  et mémorise la synthèse (`returnTo`) ; « Revenir à la synthèse » appelle `resume` après validation, en revalidant chaque page repassée.
- `Redirect.tsx` (EVO-024) : page d'un nœud Renvoi (`redirect-page`) : titre, texte, boutons visibles (`when` vraie ou absente, `redirect-page-button`)
  avec icônes `toggle-prefill` / `toggle-replace` ; clic : bouton en erreur (`redirectButtonError`) sans effet ; cible questionnaire → `inform`
  (cible, options activées ou « Aucune option activée. ») ; cible nœud présente dans l'historique → `goTo` + `returnTo` (comme la synthèse ; bouton
  « Revenir au renvoi ») ; sinon `inform`. `Preview.tsx` : Renvoi juste avant une fin (`isJustBeforeEnd`) → bouton `preview-finish` (libellé `finishLabel`,
  défaut `FINISH_LABEL`) à la place de `preview-next`, même action.
- `SystemPanel.tsx` : scénario nommé, édition libre (`PreviewState.sys`, la session est conservée :
  réévaluation immédiate), rétablir les valeurs du scénario, enregistrer comme scénario (`preview.saveScenario`).
- `path-check.ts` (testé) : `answerErrors` (validation d'une réponse dans le contexte de sa page, avec son groupe lu sous
  `groupPath(answerPath)` et son marqueur sous `dontKnowPath(answerPath)`), `firstInvalidStep`
  (première réponse invalide du chemin projeté, hors pages `skip`), `requiredAt` (EVO-021 : astérisque d'une page, `isRequired` de
  `core/validation` sur la question de l'étape, surcharges déjà appliquées par `resolveStep`, dans le même contexte que `answerErrors`), `guardEnd` : avant d'afficher une fin (après « Suivant », « Revenir
  à la synthèse » ou un changement de l'état du système), le wizard ramène à la première réponse invalide du chemin
  (`goTo`, erreurs affichées, réponse conservée) ; le parcours ne peut pas se terminer tant qu'elle n'est pas corrigée.
- `DebugPanel.tsx` : bandeau « Dans le fragment : » (chemin des alias et nom du fragment, EVO-008), chemin parcouru (`alias.cle`), conditions des
  arêtes sortantes de la page courante (`edgeTrace`), suivies, en sortie de fragment, de celles de l'appelant
  (« Puis, à la sortie du fragment : », `debug-caller-edges`), valeurs courantes.
- `Outline.tsx` (EVO-019) : panneau latéral (bouton `preview.toggleOutline`, `previewPanels.outline`, `data-testid="outline-panel"`) à droite du wizard ;
  `Diagram` de `ui/diagram` en mode `outline` : nœud courant (`step.instances[0]` pour une page de fragment), questions actives
  (`passedQuestions` avec `PreviewState.visited`, questions du questionnaire seulement), clic = `jumpTo` ; `focusKey` (longueur de l'historique,
  étape, compteur de clics) déclenche le recentrage. `usePreview.update` ajoute l'historique de chaque nouvelle session à `visited` ;
  « Recommencer » passe `visited: []`.
- Page d'un fragment : le clic sélectionne le nœud fragment du questionnaire (`step.instances[0]`).

## Pièges
- `data-testid="preview"` couvre la colonne du wizard seulement (pas le panneau latéral) : les tests de fumée
  y cherchent les champs par rôle.
