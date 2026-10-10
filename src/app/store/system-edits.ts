import { isValidKey, newId, uniqueKey, type SystemVariable, type VariableType, type Workspace } from '../../core/model';
import { renameKey } from '../../core/references';
import type { PreviewState } from './store';

/** Dictionnaire de l'état du système et scénarios : éditions pures (sur brouillon immer ou copie). */

const vars = (ws: Workspace) => ws.project.systemState;

/** Ajoute une variable texte au nom unique ; renvoie son nom. */
export function addVariable(ws: Workspace, base = 'variable'): string {
  const name = uniqueKey(base, vars(ws).map((v) => v.name));
  vars(ws).push({ name, type: 'text' });
  return name;
}

/** Supprime une variable du dictionnaire et des scénarios. */
export function deleteVariable(ws: Workspace, name: string) {
  ws.project.systemState = vars(ws).filter((v) => v.name !== name);
  for (const s of ws.project.scenarios) delete s.values[name];
}

/** Renomme une variable (expressions `sys.…` et scénarios) ; nom invalide ou pris : projet inchangé. */
export function renameVariable(ws: Workspace, name: string, next: string): Workspace {
  if (!isValidKey(next) || vars(ws).some((v) => v.name === next)) return ws;
  return renameKey(ws, { kind: 'system', name }, next);
}

/** Renomme un champ d'une liste d'objets (expressions, sources, exemple, scénarios) ; nom invalide ou pris : inchangé. */
export function renameListField(ws: Workspace, variable: string, field: string, next: string): Workspace {
  return renameKey(ws, { kind: 'systemField', variable, field }, next);
}

/** Change le type d'une variable : `values` pour une énumération, `fields` pour une liste ; exemple remis à zéro. */
export function setVariableType(ws: Workspace, name: string, type: VariableType) {
  const v = vars(ws).find((x) => x.name === name);
  if (!v || v.type === type) return;
  v.type = type;
  delete v.values;
  delete v.fields;
  delete v.example;
  if (type === 'enum') v.values = [];
  if (type === 'list') Object.assign(v, { fields: [], example: [] });
}

/** Ajoute un scénario (nom rendu unique : « Nom (2) ») ; renvoie son id. */
export function addScenario(ws: Workspace, name: string, values: Record<string, unknown>): string {
  const names = new Set(ws.project.scenarios.map((s) => s.name));
  let unique = name;
  for (let i = 2; names.has(unique); i++) unique = `${name} (${i})`;
  const id = newId('sc');
  ws.project.scenarios.push({ id, name: unique, values: JSON.parse(JSON.stringify(values)) });
  return id;
}

export function deleteScenario(ws: Workspace, id: string) {
  ws.project.scenarios = ws.project.scenarios.filter((s) => s.id !== id);
}

const ISO_DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/** Écart entre une valeur et le type déclaré (`undefined` si conforme ou absente) : nom du type attendu, préfixé du champ. */
export function valueError(v: SystemVariable, value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  switch (v.type) {
    case 'text': return typeof value === 'string' ? undefined : 'text';
    case 'number': return typeof value === 'number' && Number.isFinite(value) ? undefined : 'number';
    case 'boolean': return typeof value === 'boolean' ? undefined : 'boolean';
    case 'date': return typeof value === 'string' && ISO_DATE.test(value) ? undefined : 'date';
    case 'enum': return typeof value === 'string' && (!v.values?.length || v.values.includes(value)) ? undefined : 'enum';
    case 'list': {
      if (!Array.isArray(value)) return 'list';
      for (const item of value) {
        if (typeof item !== 'object' || item === null || Array.isArray(item)) return 'list';
        for (const f of v.fields ?? []) {
          const e = valueError(f, (item as Record<string, unknown>)[f.name]);
          if (e) return `${f.name}: ${e}`;
        }
      }
      return undefined;
    }
  }
}

/** Valeurs d'exemple du dictionnaire de l'état du système. */
export function exampleSystemState(ws: Workspace): Record<string, unknown> {
  return Object.fromEntries(vars(ws).filter((v) => v.example !== undefined).map((v) => [v.name, v.example]));
}

/** Scénario choisi dans une prévisualisation (le premier par défaut ; `''` : valeurs d'exemple). */
export function scenarioOf(ws: Workspace, p: PreviewState | undefined) {
  return ws.project.scenarios.find((s) => s.id === p?.scenarioId) ?? (p?.scenarioId === undefined ? ws.project.scenarios[0] : undefined);
}

/** État du système d'une prévisualisation : valeurs éditées, sinon celles du scénario, sinon les exemples. */
export function systemStateOf(ws: Workspace, p: PreviewState | undefined): Record<string, unknown> {
  return p?.sys ?? scenarioOf(ws, p)?.values ?? exampleSystemState(ws);
}
