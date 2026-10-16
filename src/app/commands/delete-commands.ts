import { deletionImpact, useStore } from '../store';
import { confirm, type Message } from '../feedback';
import { questionnaireTarget } from './clipboard-commands';
import type { Command } from './types';

const st = () => useStore.getState();

/** Lignes de la confirmation (EVO-027-005 à 008) : titre, puis validé, commentaires, boutons de renvoi, chacune absente si nulle. */
export function deletionQuestion(id: string): Message[] {
  const { ws, contentLang } = st();
  const q = ws.questionnaires.find((x) => x.id === id)!;
  const name = q.title[contentLang] ?? q.title[ws.project.defaultLanguage] ?? q.key;
  const { validated, comments, redirects } = deletionImpact(ws, id);
  const lines: Message[] = [{ key: 'questionnaire.confirmDelete', params: { name } }];
  if (validated) lines.push('questionnaire.deleteValidated');
  if (comments) lines.push({ key: comments === 1 ? 'questionnaire.deleteComment' : 'questionnaire.deleteComments', params: { n: comments } });
  if (redirects) lines.push({ key: redirects === 1 ? 'questionnaire.deleteRedirect' : 'questionnaire.deleteRedirects', params: { n: redirects } });
  return lines;
}

/** Suppression d'un questionnaire (EVO-027) : `arg` = id, sinon celui de l'onglet actif ; après confirmation. */
export function deleteCommands(): Command[] {
  return [
    {
      id: 'questionnaire.delete', label: 'questionnaire.delete', keys: [], scope: 'global',
      enabled: (arg) => !!questionnaireTarget(arg),
      run: (arg) => {
        const id = questionnaireTarget(arg);
        if (!id) return;
        const [question, ...lines] = deletionQuestion(id);
        if (!confirm(question!, ...lines)) return;
        st().deleteQuestionnaire(id);
      },
    },
  ];
}
