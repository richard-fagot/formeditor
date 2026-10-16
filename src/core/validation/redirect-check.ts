import {
  alwaysBefore, buttonLabel, isJustBeforeEnd, redirectButtonError, targetName, targetValue, type Questionnaire, type RedirectNode, type Workspace,
} from '../model';
import type { Owner } from '../references';
import { issue, type Issue } from './issue';

const ERROR_CODES = { noLabel: 'buttonNoLabel', noTarget: 'buttonNoTarget', targetMissing: 'buttonTargetMissing' } as const;

/** Vérifications d'un nœud Renvoi (EVO-024-068, 031 à 033, 017, 035, 036), un problème par bouton concerné. */
function checkRedirect(ws: Workspace, q: Questionnaire, n: RedirectNode, owner: Owner, out: Issue[]) {
  const lang = ws.project.defaultLanguage;
  if (!n.buttons.length) out.push(issue('redirectNoButton', owner, { nodeId: n.id }));
  const beforeEnd = isJustBeforeEnd(q, n.id);
  const seen = new Set<string>();
  n.buttons.forEach((b, i) => {
    const where = { nodeId: n.id, property: `buttons[${i}]` };
    const label = buttonLabel(b, lang);
    const error = redirectButtonError(ws, q.id, b);
    if (error) out.push(issue(ERROR_CODES[error], owner, where, { label }));
    if (!b.target) return;
    const value = targetValue(b.target);
    const name = targetName(ws, q.id, b.target, lang) ?? value.slice(2);
    if (seen.has(value)) out.push(issue('duplicateButtonTarget', owner, where, { target: name }));
    seen.add(value);
    if ('questionnaire' in b.target && !b.target.replace && !beforeEnd) out.push(issue('linkedNotBeforeEnd', owner, where, { label }));
    if ('node' in b.target && error !== 'targetMissing' && !alwaysBefore(ws, q, n.id, b.target.node)) {
      out.push(issue('buttonTargetNotGuaranteed', owner, where, { label }));
    }
  });
}

/** Nœuds Renvoi des questionnaires (un nœud Renvoi n'a pas de sens dans un fragment : il n'y est pas vérifié). */
export function checkRedirects(ws: Workspace, q: Questionnaire, owner: Owner, out: Issue[]) {
  for (const n of q.nodes) if (n.kind === 'redirect') checkRedirect(ws, q, n, owner, out);
}
