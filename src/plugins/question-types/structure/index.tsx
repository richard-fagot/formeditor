import type { StructureQuestion } from '../../../core/model';
import { previewText, tr, type QuestionTypePlugin, type RenderEnv } from '../../../plugin-api';
import { StructureProperties } from './fields-editor';
import { occurrencesOf, StructureInput, visibleFields } from './occurrences';

const T = {
  name: { fr: 'Structure', en: 'Structure' },
  empty: { fr: '<aucun champ>', en: '<no field>' },
};
const MAX_PREVIEW = 4;

function formatAnswer(q: StructureQuestion, value: unknown, env: RenderEnv): string {
  if (value === null || value === undefined) return '';
  const occs = q.repeat ? (Array.isArray(value) ? (value as Record<string, unknown>[]) : []) : occurrencesOf(q, value);
  return occs
    .map((occ) => visibleFields(q, occ, env)
      .map((f) => env.questionType(f.type)?.formatAnswer(f, occ[f.key], env.scoped(occ), occ[`${f.key}_other`] as string | undefined) ?? '')
      .filter(Boolean)
      .join(', '))
    .join(' ; ');
}

/** Type « structure » : groupe de champs (tous types sauf structure), éventuellement répétable. */
export const structureType: QuestionTypePlugin<StructureQuestion> = {
  type: 'structure',
  name: T.name,
  shortcut: 's',
  create: (base, previous) => ({ ...base, type: 'structure', fields: previous?.type === 'structure' ? previous.fields : [] }),
  Preview: ({ question, env }) => (
    <div className="text-slate-500">
      {question.repeat && <span className="float-right font-mono text-indigo-500">× n</span>}
      {!question.fields.length && <span className="font-mono text-slate-400">{tr(T.empty, env.uiLang)}</span>}
      <ul className="space-y-px">
        {question.fields.slice(0, MAX_PREVIEW).map((f) => (
          <li key={f.id} className="truncate">▸ {previewText(f.label, env)} <span className="font-mono text-slate-400">{f.type}</span></li>
        ))}
        {question.fields.length > MAX_PREVIEW && <li>…</li>}
      </ul>
    </div>
  ),
  Properties: StructureProperties,
  Field: StructureInput,
  formatAnswer,
};
