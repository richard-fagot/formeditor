import Ajv2020, { type ErrorObject, type ValidateFunction } from 'ajv/dist/2020';
import common from './schemas/common.schema.json';
import questionnaire from './schemas/questionnaire.schema.json';
import library from './schemas/library.schema.json';
import project from './schemas/project.schema.json';
import layout from './schemas/layout.schema.json';
import bundle from './schemas/bundle.schema.json';

export const SCHEMAS = { common, questionnaire, library, project, layout, bundle };
export type DocumentKind = 'questionnaire' | 'library' | 'project' | 'layout' | 'bundle';

let validators: Record<DocumentKind, ValidateFunction> | undefined;

function getValidators(): Record<DocumentKind, ValidateFunction> {
  if (!validators) {
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    Object.values(SCHEMAS).forEach((s) => ajv.addSchema(s));
    const get = (id: string) => ajv.getSchema(id)!;
    validators = {
      questionnaire: get('questionnaire.schema.json'),
      library: get('library.schema.json'),
      project: get('project.schema.json'),
      layout: get('layout.schema.json'),
      bundle: get('bundle.schema.json'),
    };
  }
  return validators;
}

export function documentKind(doc: unknown): DocumentKind | undefined {
  const kind = (doc as { kind?: unknown } | null)?.kind;
  return typeof kind === 'string' && kind in SCHEMAS && kind !== 'common' ? (kind as DocumentKind) : undefined;
}

const describeError = (e: ErrorObject) =>
  `${e.instancePath || '/'} : ${e.message ?? 'invalide'}${e.params && 'unevaluatedProperty' in e.params ? ` (${String(e.params.unevaluatedProperty)})` : ''}${e.params && 'additionalProperty' in e.params ? ` (${String(e.params.additionalProperty)})` : ''}`;

/** Valide un document par son JSON Schema. Renvoie la liste des erreurs (vide si valide). */
export function validateDocument(doc: unknown): string[] {
  const kind = documentKind(doc);
  if (!kind) return ['Type de document inconnu (propriété "kind").'];
  const validate = getValidators()[kind];
  if (validate(doc)) return [];
  // Les erreurs des branches oneOf non retenues sont bruyantes : on dédoublonne.
  return [...new Set((validate.errors ?? []).map(describeError))];
}
