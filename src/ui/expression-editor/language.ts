import { StreamLanguage, HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

const KEYWORDS = /^(and|or|in|true|false|null)\b/;

/** Chaîne littérale JSONata (guillemets doubles ou simples, `\` échappe), éventuellement non fermée. */
export const STRING_LITERAL = String.raw`"(?:[^"\\]|\\.)*"?|'(?:[^'\\]|\\.)*'?`;
const STRING = new RegExp(`^(?:${STRING_LITERAL})`);

/** Coloration minimale de JSONata : chaînes, nombres, mots-clés, fonctions `$…`, chemins. */
export const jsonataLanguage = StreamLanguage.define({
  token(stream) {
    if (stream.eatSpace()) return null;
    if (stream.match(STRING)) return 'string';
    if (stream.match(/^-?\d+(\.\d+)?/)) return 'number';
    if (stream.match(KEYWORDS)) return 'keyword';
    if (stream.match(/^\$\w*/)) return 'variableName.special';
    if (stream.match(/^[a-zA-Z_][\w]*/)) return 'propertyName';
    if (stream.match(/^(!=|<=|>=|[=<>&+\-*/%?:])/)) return 'operator';
    stream.next();
    return null;
  },
});

export const jsonataHighlight = syntaxHighlighting(
  HighlightStyle.define([
    { tag: t.string, color: '#047857' },
    { tag: t.number, color: '#b45309' },
    { tag: t.keyword, color: '#7c3aed', fontWeight: '600' },
    { tag: t.special(t.variableName), color: '#2563eb' },
    { tag: t.propertyName, color: '#0f172a' },
    { tag: t.operator, color: '#64748b' },
  ]),
);
