import { useMemo } from 'react';
import type { Workspace } from '../../core/model';
import { checkWorkspace, type Issue } from '../../core/validation';
import { useStore } from '../store';

/** Filtre de problèmes : tous les critères donnés doivent être vérifiés. */
export interface IssueFilter {
  /** Propriétaire : genre, et identifiant s'il est donné. */
  owner?: { kind: Issue['owner']['kind']; id?: string };
  /** Identifiants de propriétaire acceptés (quel que soit le genre). */
  ownerIds?: readonly string[];
  code?: Issue['code'];
  /** Langue citée dans `params.lang` (liste « fr, en » des traductions manquantes). */
  lang?: string;
}

const cache = new WeakMap<Workspace, Issue[]>();

/** Problèmes du projet (`checkWorkspace`), mémorisés sur la référence de `ws` : même `ws` → même tableau. */
export function issuesOf(ws: Workspace): Issue[] {
  let issues = cache.get(ws);
  if (!issues) cache.set(ws, (issues = checkWorkspace(ws)));
  return issues;
}

/** Problèmes retenus par `filter`, dans l'ordre d'origine (pure). */
export function selectIssues(issues: Issue[], filter: IssueFilter): Issue[] {
  const { owner, ownerIds, code, lang } = filter;
  return issues.filter((i) =>
    (!owner || (i.owner.kind === owner.kind && (owner.id === undefined || i.owner.id === owner.id)))
    && (!ownerIds || ownerIds.includes(i.owner.id))
    && (!code || i.code === code)
    && (!lang || !!i.params.lang?.split(', ').includes(lang)));
}

/** Problèmes du projet courant retenus par `filter` (recalculés quand le projet ou le filtre change ; filtre comparé par valeur). */
export function useIssues(filter: IssueFilter): Issue[] {
  const ws = useStore((s) => s.ws);
  const key = JSON.stringify(filter);
  return useMemo(() => selectIssues(issuesOf(ws), filter), [ws, key]);
}
