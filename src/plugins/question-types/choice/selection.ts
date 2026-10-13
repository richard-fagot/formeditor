import { OTHER_GROUP, OTHER_VALUE, type MultipleChoiceQuestion, type SingleChoiceQuestion } from '../../../core/model';
import type { RenderEnv, ResolvedOption } from '../../../plugin-api';

/** Libellé par défaut de l'option « Autre (préciser) ». */
export const OTHER_LABEL = { fr: 'Autre (préciser)', en: 'Other (specify)' };

export type Choice = SingleChoiceQuestion | MultipleChoiceQuestion;
/** Choix proposé : valeur, groupe (identifiant) et intitulé de section, texte affiché. */
export interface Item {
  value: string;
  group?: string;
  title?: string;
  text: string;
}

export const optionText = (l: ResolvedOption['label'], env: RenderEnv) => (typeof l === 'string' ? l : env.label(l));
export const asList = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
/** Un groupe non renseigné (réponse sans groupe) accepte la première option de même valeur. */
export const fits = (c: Item, v: unknown, g: unknown) => c.value === v && (g === undefined || g === null || (c.group ?? '') === g);

/** Choix proposés : options visibles (intitulé de section = libellé du groupe résolu par `env.label`), puis « Autre ». */
export function itemsOf(q: Choice, env: RenderEnv): Item[] {
  const items: Item[] = env.options(q).map((o) => ({
    value: o.value, text: optionText(o.label, env), ...(o.group ? { group: o.group.id, title: env.label(o.group.label) } : {}),
  }));
  if (q.other) items.push({ value: OTHER_VALUE, group: OTHER_GROUP, text: env.label(q.other.label ?? OTHER_LABEL) });
  return items;
}

/** Indices des choix sélectionnés, dans l'ordre des valeurs de la réponse. */
export function selectedOf(items: Item[], values: unknown[], groups: unknown[]): number[] {
  const out: number[] = [];
  values.forEach((v, k) => {
    const i = items.findIndex((c, j) => !out.includes(j) && fits(c, v, groups[k]));
    if (i >= 0) out.push(i);
  });
  return out;
}

/** Choix en sections : un intitulé par groupe visible (les choix d'un groupe sont consécutifs). */
export function sectionsOf(items: Item[]): { title?: string; indexes: number[] }[] {
  const out: { key?: string; title?: string; indexes: number[] }[] = [];
  items.forEach((c, i) => {
    const key = c.title === undefined ? undefined : c.group;
    const last = out.at(-1);
    if (last && last.key === key) last.indexes.push(i);
    else out.push({ key, title: c.title, indexes: [i] });
  });
  return out;
}

/**
 * Indice de « Autre (préciser) » à afficher à part, séparée des groupes (EVO-017) : seulement si un groupe est affiché ;
 * sinon `undefined` (rendu inchangé, « Autre » à la suite des options).
 */
export function separatedOther(items: Item[]): number | undefined {
  const last = items.length - 1;
  if (last < 0 || items[last]!.value !== OTHER_VALUE || items[last]!.group !== OTHER_GROUP) return undefined;
  return items.some((c) => c.title !== undefined) ? last : undefined;
}

/**
 * Réponse d'un choix multiple pour les choix cochés (dans l'ordre de la sélection) : valeurs, et groupes en liste
 * parallèle (`""` hors groupe, `AUTRE` pour « Autre ») ; rien de coché : `null`.
 */
export function pickedAnswer(items: Item[], indexes: number[]): { values: string[]; groups: string[] } | null {
  const picked = indexes.map((i) => items[i]!);
  return picked.length ? { values: picked.map((x) => x.value), groups: picked.map((x) => x.group ?? '') } : null;
}
