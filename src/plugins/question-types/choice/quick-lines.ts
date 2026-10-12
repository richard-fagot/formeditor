import { isChoiceGroup, isDynamicEntry, type ChoiceEntry, type ChoiceItem, type Label } from '../../../core/model';
import { previewText, type EditorEnv } from '../../../plugin-api';

export type Env = Pick<EditorEnv, 'contentLang' | 'defaultLang'>;
export type LineKind = 'group' | 'option' | 'dynamic';

/** Ligne de la saisie rapide, analysée : genre, texte (libellé ou référence `from`), appartenance à un groupe. */
export interface QuickLine {
  kind: LineKind;
  text: string;
  inGroup: boolean;
}

const BULLET = /^[*-]\s+/;
/** Une option dont le libellé commence par `$`, `#`, `\` ou une puce s'écrit précédée de `\`. */
const NEEDS_ESCAPE = /^([$#]|[*-]\s)/;
const ESCAPED = /^\\[$#*-]/;

/**
 * Analyse les lignes saisies (EVO-003) : `# Libellé` ouvre un groupe ; `* ` ou `- ` en tête est une puce
 * retirée ; `$<référence>` crée une entrée dynamique ; `\$`, `\#`, `\*`, `\-` écrivent une option qui commence
 * par ce caractère ; lignes vides ignorées.
 */
export function parseLines(lines: string[]): QuickLine[] {
  const out: QuickLine[] = [];
  let inGroup = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('#')) {
      out.push({ kind: 'group', text: line.slice(1).trim(), inGroup: false });
      inGroup = true;
      continue;
    }
    const rest = line.replace(BULLET, '');
    if (ESCAPED.test(rest)) out.push({ kind: 'option', text: rest.slice(1), inGroup });
    else if (rest.startsWith('$')) out.push({ kind: 'dynamic', text: rest.slice(1).trim(), inGroup });
    else out.push({ kind: 'option', text: rest, inGroup });
  }
  return out;
}

/** Texte d'une ligne réaffichée : `# groupe`, puce devant une option d'un groupe, échappement si besoin. */
export function formatLine(l: QuickLine): string {
  if (l.kind === 'group') return `# ${l.text}`;
  const core = l.kind === 'dynamic' ? `$${l.text}` : NEEDS_ESCAPE.test(l.text) ? `\\${l.text}` : l.text;
  return l.inGroup ? `* ${core}` : core;
}

const labelText = (l: Label, env: Env) => previewText(l, env);

/** Ligne d'un élément (option ou entrée dynamique), hors puce. */
export function itemLine(e: ChoiceItem, env: Env, inGroup = false): QuickLine {
  return isDynamicEntry(e) ? { kind: 'dynamic', text: e.from, inGroup } : { kind: 'option', text: labelText(e.label, env), inGroup };
}

/** Entrées à plat, dans l'ordre des lignes : chaque groupe suivi de ses éléments. */
export function flatLines(entries: ChoiceEntry[], env: Env): { line: QuickLine; entry: ChoiceEntry }[] {
  return entries.flatMap((e) =>
    isChoiceGroup(e)
      ? [{ line: { kind: 'group' as const, text: labelText(e.group, env), inGroup: false }, entry: e as ChoiceEntry },
        ...e.options.map((o) => ({ line: itemLine(o, env, true), entry: o as ChoiceEntry }))]
      : [{ line: itemLine(e, env), entry: e }]);
}

/** Lignes de la saisie rapide pour des entrées. */
export const linesOf = (entries: ChoiceEntry[], env: Env): string[] => flatLines(entries, env).map((f) => formatLine(f.line));

/** Forme canonique d'un texte saisi (pour savoir s'il correspond déjà aux entrées). */
export const normalizeQuick = (text: string): string => parseLines(text.split('\n')).map(formatLine).join('\n');
