import { civilityLabel, isLibraryQuestion, type CivilityCode, type Graph, type LocalizedText, type Question, type StructureField, type Workspace } from '../model';
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
 * téléphone → format international lisible. Une clé est cherchée d'abord dans `graph` (questionnaire ou fragment
 * courant, références de bibliothèque comprises), puis dans la bibliothèque (questions, puis fragments) : la première
 * question trouvée l'emporte, même sans mise en forme (une question texte homonyme n'est pas reformatée).
 */
export function displayFormatters(ws: Workspace, graph?: Graph): Record<string, DisplayFormatter> {
  const out: Record<string, DisplayFormatter> = {};
  const seen = new Set<string>();
  const add = (q: Question | StructureField) => {
    if (!seen.has(q.key)) {
      seen.add(q.key);
      const f = formatter(q);
      if (f) out[q.key] = f;
    }
    if (q.type === 'structure') q.fields.forEach(add);
  };
  const addGraph = (g: Graph) => {
    for (const n of g.nodes) {
      if (n.kind !== 'question') continue;
      const q = isLibraryQuestion(n) ? ws.library.questions.find((x) => x.id === n.ref) : (n as Question);
      if (q) add(q);
    }
  };
  if (graph) addGraph(graph);
  ws.library.questions.forEach(add);
  ws.library.fragments.forEach(addGraph);
  return out;
}
