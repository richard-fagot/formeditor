import type { Owner } from '../references';
import { ISSUE_MESSAGES } from './messages';

export type IssueCode = keyof typeof ISSUE_MESSAGES;

/** Problème signalé par les vérifications (non bloquant). */
export interface Issue {
  code: IssueCode;
  severity: 'error' | 'warning';
  owner: Owner;
  nodeId?: string;
  edgeId?: string;
  property?: string;
  params: Record<string, string>;
}

const ERRORS = new Set<IssueCode>(['invalidExpression', 'unknownReference', 'unknownFilterReference', 'duplicateKey', 'invalidKey', 'libraryMissing', 'missingStart', 'unknownExit', 'duplicateGroup', 'reservedGroupCode',
  'fragmentCycle', 'expectedKeyMissing', 'hiddenField', 'redirectNoButton', 'buttonNoLabel', 'buttonNoTarget', 'buttonTargetMissing']);

export function issue(code: IssueCode, owner: Owner, where: Partial<Issue> = {}, params: Record<string, string> = {}): Issue {
  return { code, severity: ERRORS.has(code) ? 'error' : 'warning', owner, ...where, params };
}

/** Texte du problème dans la langue de l'interface. */
export function describeIssue(i: Issue, lang: string): string {
  const t = ISSUE_MESSAGES[i.code]!;
  const tpl = t[lang] ?? t.fr!;
  return tpl.replace(/\{(\w+)\}/g, (_, k: string) => i.params[k] ?? '');
}
