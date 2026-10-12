import { civilityLabel, type CivilityCode, type LocalizedText, type Question, type StructureField, type Workspace } from '../model';
import { formatPhone } from './phone';

/** Mise en forme d'une valeur interpolée : texte, ou texte multilingue choisi dans la langue affichée. */
export type DisplayFormatter = (value: unknown) => string | LocalizedText | undefined;

function formatter(q: Question | StructureField): DisplayFormatter | undefined {
  if (q.type === 'civility') return (v) => (typeof v === 'string' && ['MME', 'M', 'NP'].includes(v) ? civilityLabel(q, v as CivilityCode) : undefined);
  if (q.type === 'phone') return (v) => (typeof v === 'string' ? formatPhone(v) : undefined);
  return undefined;
}

/**
 * Mises en forme de l'interpolation, par clé de question ou de champ (EVO-007) : civilité → son libellé,
 * téléphone → format international lisible. Première question trouvée pour une clé donnée.
 */
export function displayFormatters(ws: Workspace): Record<string, DisplayFormatter> {
  const out: Record<string, DisplayFormatter> = {};
  const add = (q: Question | StructureField) => {
    const f = formatter(q);
    if (f && !(q.key in out)) out[q.key] = f;
    if (q.type === 'structure') q.fields.forEach(add);
  };
  const graphs = [...ws.questionnaires, ...ws.library.blocks];
  for (const g of graphs) for (const n of g.nodes) if (n.kind === 'question' && !('ref' in n)) add(n);
  ws.library.questions.forEach(add);
  return out;
}
