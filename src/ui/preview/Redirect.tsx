import { ClipboardPaste, Replace } from 'lucide-react';
import { redirectButtonError, targetName, type RedirectButton, type RedirectNode } from '../../core/model';
import { goTo, type RuntimeInput, type Session } from '../../core/runtime';
import type { RenderEnv } from '../../plugin-api';
import { inform, type Message } from '../../app/feedback';
import { useT, type PreviewState } from '../../app/store';

interface Props {
  node: RedirectNode;
  stepId: string;
  input: RuntimeInput;
  session: Session;
  env: RenderEnv;
  update(patch: Partial<PreviewState>): void;
}

/**
 * Clic sur un bouton (EVO-024) : en erreur, rien ; cible questionnaire, message (cible, options) et la page reste ;
 * cible nœud parcourue, retour comme depuis une synthèse ; sinon message, la page reste.
 */
function click(p: Props, b: RedirectButton, t: ReturnType<typeof useT>) {
  const { input, session, update, stepId } = p;
  if (redirectButtonError(input.ws, input.questionnaireId, b) || !b.target) return;
  const name = targetName(input.ws, input.questionnaireId, b.target, p.env.contentLang) ?? '';
  if ('questionnaire' in b.target) {
    const options = [b.target.prefill && 'redirect.prefill', b.target.replace && 'redirect.replace'].filter(Boolean) as ('redirect.prefill' | 'redirect.replace')[];
    const optionLine: Message = options.length ? { key: 'redirect.options', params: { options: options.map((k) => t(k)).join(', ') } } : 'redirect.noOption';
    inform('redirect.title', { key: 'redirect.declaration', params: { target: name } }, optionLine, 'redirect.notSimulated');
    return;
  }
  if (!session.history.slice(0, -1).includes(b.target.node)) {
    inform('redirect.title', { key: 'redirect.notVisited', params: { target: name } });
    return;
  }
  update({ session: goTo(session, b.target.node), returnTo: stepId, attempted: false });
}

/** Page d'un nœud Renvoi : titre, texte, boutons visibles dans l'ordre, avec les icônes des toggles (EVO-024-041, 042, 018, 064). */
export function Redirect(p: Props) {
  const t = useT();
  const { node, env } = p;
  const visible = node.buttons.filter((b) => !b.when || env.condition(b.when));
  return (
    <div className="space-y-4" data-testid="redirect-page">
      {node.title && <h2 className="text-2xl font-semibold text-slate-900">{env.label(node.title)}</h2>}
      <p className="whitespace-pre-line text-lg leading-relaxed text-slate-700">{env.label(node.text)}</p>
      <div className="flex flex-col gap-2">
        {visible.map((b, i) => (
          <button key={i} type="button" data-testid="redirect-page-button"
            className="flex items-center justify-between gap-2 rounded-lg border border-rose-300 bg-rose-50 px-4 py-2 text-left font-medium text-rose-900 hover:bg-rose-100"
            onClick={(e) => { e.stopPropagation(); click(p, b, t); }}>
            <span>{env.label(b.label)}</span>
            {b.target && 'questionnaire' in b.target && (
              <span className="flex gap-1">
                {b.target.prefill && <span data-testid="toggle-prefill" title={t('redirect.prefill')}><ClipboardPaste className="size-4 text-rose-600" /></span>}
                {b.target.replace && <span data-testid="toggle-replace" title={t('redirect.replace')}><Replace className="size-4 text-rose-600" /></span>}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
