import { useMemo, useState } from 'react';
import { currentStep, jumpTo, passedQuestions } from '../../core/runtime';
import type { GraphRef } from '../../app/store';
import { useIssues } from '../../app/issues';
import { Diagram } from '../diagram';
import type { usePreview } from './usePreview';

/**
 * Outline (EVO-019) : logigramme du questionnaire en lecture seule à côté du wizard, centré sur le nœud de la page
 * affichée ; un clic sur une question déjà passée du parcours courant l'affiche (réponses conservées).
 */
export function Outline({ questionnaireId, preview }: { questionnaireId: string; preview: ReturnType<typeof usePreview> }) {
  const { input, session, state, update } = preview;
  const [clicks, setClicks] = useState(0);
  const graph: GraphRef = useMemo(() => ({ kind: 'questionnaire', id: questionnaireId }), [questionnaireId]);
  const issues = useIssues({ owner: { kind: 'questionnaire', id: questionnaireId } });
  const visited = state?.visited;
  // Seules les questions du questionnaire sont cliquables ; une page d'un fragment est représentée par son nœud fragment.
  const active = useMemo(
    () => new Set([...passedQuestions(input, session, visited)].filter((id) => !id.includes('/'))),
    [input, session, visited],
  );
  const step = session.history.length ? currentStep(input, session) : undefined;
  const current = step && (step.instances[0]?.id ?? step.node.id);
  const outline = {
    current,
    focusKey: `${session.history.length}:${step?.id}:${clicks}`,
    active,
    onQuestionClick: (id: string) => {
      setClicks((n) => n + 1);
      update({ session: jumpTo(input, session, id, visited), attempted: false });
    },
  };
  return <Diagram graph={graph} issues={issues} outline={outline} />;
}
