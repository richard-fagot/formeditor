import { evaluate, type EvalContext, type EvalEnv } from './evaluate';
import { extractReferences, renameReference, type RefPath } from './references';

type Segment = { text: string } | { expr: string };

/** Découpe un gabarit `Bonjour {sys.nom}` ; `{{` et `}}` sont des accolades littérales. */
export function parseTemplate(template: string): Segment[] {
  const out: Segment[] = [];
  let text = '';
  let i = 0;
  while (i < template.length) {
    const c = template[i]!;
    if ((c === '{' || c === '}') && template[i + 1] === c) {
      text += c;
      i += 2;
    } else if (c === '{') {
      const end = closingBrace(template, i);
      if (end < 0) {
        text += template.slice(i);
        break;
      }
      if (text) out.push({ text });
      text = '';
      out.push({ expr: template.slice(i + 1, end) });
      i = end + 1;
    } else {
      text += c;
      i++;
    }
  }
  if (text) out.push({ text });
  return out;
}

function closingBrace(s: string, open: number): number {
  let depth = 0;
  let quote = '';
  for (let i = open; i < s.length; i++) {
    const c = s[i]!;
    if (quote) {
      if (c === quote) quote = '';
    } else if (c === '"' || c === "'") quote = c;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return i;
  }
  return -1;
}

const escape = (t: string) => t.replace(/[{}]/g, (c) => c + c);
const join = (segs: Segment[]) => segs.map((s) => ('expr' in s ? `{${s.expr}}` : escape(s.text))).join('');

/** Valeur affichable : vide si absente, liste jointe par des virgules. */
export function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (Array.isArray(v)) return v.map(formatValue).join(', ');
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

/** Référence simple (`a`, `a.b`, `a[0].b`) : dernier nom, sinon `undefined`. */
const REF = /^\s*(?:[A-Za-z_][A-Za-z0-9_]*(?:\[\d+\])?\.)*([A-Za-z_][A-Za-z0-9_]*)(?:\[\d+\])?\s*$/;

/** Valeur interpolée : mise en forme propre au type si l'expression est une simple référence (`env.display`, EVO-007). */
function display(expr: string, value: unknown, env: EvalEnv): string {
  const key = env.display && value !== undefined && value !== null ? REF.exec(expr)?.[1] : undefined;
  const shown = key ? env.display![key]?.(value) : undefined;
  if (shown === undefined) return formatValue(value);
  if (typeof shown === 'string') return shown;
  return shown[env.lang ?? ''] ?? shown[env.defaultLang ?? ''] ?? Object.values(shown)[0] ?? '';
}

export function interpolate(template: string, ctx: EvalContext, env: EvalEnv = {}): string {
  return parseTemplate(template)
    .map((s) => ('expr' in s ? display(s.expr, evaluate(s.expr, ctx, env), env) : s.text))
    .join('');
}

export function templateExpressions(template: string): string[] {
  return parseTemplate(template).flatMap((s) => ('expr' in s ? [s.expr] : []));
}

export function templateReferences(template: string, options: { skipExists?: boolean } = {}): RefPath[] {
  return templateExpressions(template).flatMap((e) => extractReferences(e, options));
}

export function renameInTemplate(template: string, path: RefPath, newName: string): string {
  if (!template.includes('{')) return template;
  return join(parseTemplate(template).map((s) => ('expr' in s ? { expr: renameReference(s.expr, path, newName) } : s)));
}
