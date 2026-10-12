import {
  isChoiceGroup, isDynamicEntry, isVariantLabel, type ChoiceEntry, type Edge, type Graph, type GraphNode, type Label, type LocalizedText,
  type Question, type StructureField, type Workspace,
} from '../model';

/** Propriétaire d'une expression : questionnaire, bloc ou question de bibliothèque. */
export type Owner =
  | { kind: 'questionnaire'; id: string }
  | { kind: 'block'; id: string }
  | { kind: 'libraryQuestion'; id: string }
  /** Variable du dictionnaire de l'état du système (problèmes du dictionnaire seulement). */
  | { kind: 'system'; id: string };

export interface ExprLocation {
  owner: Owner;
  nodeId?: string;
  edgeId?: string;
  /** Propriété concernée (`when`, `label`, `constraints[0].rule`…). */
  property: string;
  /** Clé de la structure si l'expression est dans un champ de structure (clés sœurs sans préfixe). */
  structure?: string;
  /** Expression évaluée sur chaque élément d'une liste (entrée dynamique) : noms relatifs. */
  relative?: boolean;
  /** Pour une expression relative : expression de la liste source (`from` de l'entrée). */
  source?: string;
  /** Texte d'une variante : affiché seulement si cette condition est vraie. */
  guard?: string;
  /** Langues renseignées (non vides) du texte multilingue d'où vient ce gabarit. */
  langs?: string[];
}

/** `expr` : expression ; `template` : texte interpolable `{…}`. Renvoie le texte (éventuellement modifié). */
export type ExprMapper = (text: string, kind: 'expr' | 'template', loc: ExprLocation) => string;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function mapText(t: LocalizedText, f: ExprMapper, loc: ExprLocation): LocalizedText {
  const langs = Object.keys(t).filter((l) => t[l]?.trim());
  return Object.fromEntries(Object.entries(t).map(([lang, s]) => [lang, f(s, 'template', { ...loc, langs })]));
}

function mapLabel<L extends Label | undefined>(label: L, f: ExprMapper, loc: ExprLocation): L {
  if (!label) return label;
  if (!isVariantLabel(label)) return mapText(label, f, loc) as L;
  return {
    variants: label.variants.map((v, i) => ({
      when: f(v.when, 'expr', { ...loc, property: `${loc.property}.variants[${i}].when` }),
      text: mapText(v.text, f, { ...loc, property: `${loc.property}.variants[${i}].text`, guard: v.when }),
    })),
    otherwise: mapText(label.otherwise, f, loc),
  } as L;
}

/** Applique `f` à toutes les expressions et libellés d'une question (champs de structure compris). */
export function mapQuestion<Q extends Question | StructureField>(q: Q, f: ExprMapper, base: ExprLocation): Q {
  const at = (property: string): ExprLocation => ({ ...base, property: base.property ? `${base.property}.${property}` : property });
  const out: Record<string, unknown> = { ...q };
  out.label = mapLabel(q.label, f, at('label'));
  if (q.help) out.help = mapLabel(q.help, f, at('help'));
  if (q.placeholder) out.placeholder = mapLabel(q.placeholder, f, at('placeholder'));
  if (typeof q.required === 'string') out.required = f(q.required, 'expr', at('required'));
  if (q.defaultExpr) out.defaultExpr = f(q.defaultExpr, 'expr', at('defaultExpr'));
  if (q.messages) out.messages = Object.fromEntries(Object.entries(q.messages).map(([k, m]) => [k, mapText(m, f, at(`messages.${k}`))]));
  if (q.constraints) {
    out.constraints = q.constraints.map((c, i) => ({
      ...c,
      rule: f(c.rule, 'expr', at(`constraints[${i}].rule`)),
      ...(c.message ? { message: mapText(c.message, f, at(`constraints[${i}].message`)) } : {}),
    }));
  }
  if ('when' in q && q.when) out.when = f(q.when, 'expr', at('when'));
  switch (q.type) {
    case 'date':
      for (const b of ['min', 'max'] as const) if (q[b] && !ISO_DATE.test(q[b])) out[b] = f(q[b], 'expr', at(b));
      break;
    case 'number':
      for (const b of ['min', 'max'] as const) if (typeof q[b] === 'string') out[b] = f(q[b], 'expr', at(b));
      if (q.unit) out.unit = mapText(q.unit, f, at('unit'));
      break;
    case 'single':
    case 'multiple':
      out.options = q.options.map((o, i) => mapEntry(o, f, at, `options[${i}]`));
      break;
    case 'structure':
      out.fields = q.fields.map((fd) => mapQuestion(fd, f, { ...base, structure: q.key, property: `fields.${fd.key}` }));
      if (q.repeat?.addLabel) out.repeat = { ...q.repeat, addLabel: mapText(q.repeat.addLabel, f, at('repeat.addLabel')) };
      break;
  }
  if ('other' in q && q.other?.label) out.other = { ...q.other, label: mapLabel(q.other.label, f, at('other.label')) };
  return out as Q;
}

/** Entrée d'un choix : option, entrée dynamique (noms relatifs) ou groupe (libellé, condition, ses entrées). */
function mapEntry(o: ChoiceEntry, f: ExprMapper, at: (p: string) => ExprLocation, path: string): ChoiceEntry {
  const when = o.when ? { when: f(o.when, 'expr', at(`${path}.when`)) } : {};
  if (isChoiceGroup(o)) {
    const options = o.options.map((x, j) => mapEntry(x, f, at, `${path}.options[${j}]`) as typeof x);
    return { ...o, group: mapLabel(o.group, f, at(`${path}.group`)), ...when, options };
  }
  if (!isDynamicEntry(o)) return { ...o, label: mapLabel(o.label, f, at(`${path}.label`)), ...when };
  const rel = (p: string): ExprLocation => ({ ...at(`${path}.${p}`), relative: true, source: o.from });
  return {
    ...o,
    from: f(o.from, 'expr', at(`${path}.from`)),
    ...(o.label ? { label: f(o.label, 'expr', rel('label')) } : {}),
    ...(o.value ? { value: f(o.value, 'expr', rel('value')) } : {}),
    ...when,
  };
}

function mapNode(n: GraphNode, f: ExprMapper, owner: Owner): GraphNode {
  const loc = (property: string): ExprLocation => ({ owner, nodeId: n.id, property });
  switch (n.kind) {
    case 'question':
      if ('ref' in n) return n.label ? { ...n, label: mapLabel(n.label, f, loc('label')) } : n;
      return mapQuestion(n, f, loc(''));
    case 'info':
      return { ...n, title: mapLabel(n.title, f, loc('title')), text: mapLabel(n.text, f, loc('text')) };
    case 'summary':
      return n.title ? { ...n, title: mapLabel(n.title, f, loc('title')) } : n;
    case 'end':
      return { ...n, title: mapLabel(n.title, f, loc('title')), message: mapLabel(n.message, f, loc('message')) };
    default:
      return n;
  }
}

const clean = <T extends object>(o: T): T =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

export function mapGraph<G extends Graph>(g: G, f: ExprMapper, owner: Owner): G {
  return {
    ...g,
    nodes: g.nodes.map((n) => clean(mapNode(n, f, owner))),
    edges: g.edges.map((e): Edge => (e.when ? { ...e, when: f(e.when, 'expr', { owner, edgeId: e.id, property: 'when' }) } : e)),
  };
}

/** Applique `f` à toutes les expressions du projet (questionnaires, blocs, questions de bibliothèque). */
export function mapWorkspace(ws: Workspace, f: ExprMapper): Workspace {
  return {
    ...ws,
    questionnaires: ws.questionnaires.map((q) => mapGraph(q, f, { kind: 'questionnaire', id: q.id })),
    library: {
      ...ws.library,
      questions: ws.library.questions.map((q) => mapQuestion(q, f, { owner: { kind: 'libraryQuestion', id: q.id }, property: '' })),
      blocks: ws.library.blocks.map((b) => mapGraph(b, f, { kind: 'block', id: b.id })),
    },
  };
}

export interface FoundExpression {
  text: string;
  kind: 'expr' | 'template';
  loc: ExprLocation;
}

/** Liste toutes les expressions et libellés du projet. */
export function collectExpressions(ws: Workspace): FoundExpression[] {
  const found: FoundExpression[] = [];
  mapWorkspace(ws, (text, kind, loc) => {
    found.push({ text, kind, loc });
    return text;
  });
  return found;
}
