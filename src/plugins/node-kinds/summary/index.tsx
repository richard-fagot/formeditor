import type { SummaryNode } from '../../../core/model';
import { previewText, tr, type NodeKindPlugin } from '../../../plugin-api';
import { Field } from '../../../ui-kit';
import { LabelEditor } from '../../../ui/expression-editor';

const T = {
  name: { fr: 'Synthèse', en: 'Summary' },
  title: { fr: 'Titre', en: 'Title' },
  defaultTitle: { fr: 'Récapitulatif', en: 'Summary' },
};

/** Page de synthèse : récapitulatif automatique (rendu par la prévisualisation, qui connaît le parcours). */
export const summaryKind: NodeKindPlugin<SummaryNode> = {
  kind: 'summary',
  name: T.name,
  create: (id) => ({ kind: 'summary', id, title: { ...T.defaultTitle } }),
  shapeClass: 'rounded-xl border-violet-300 bg-violet-50 border-double border-4',
  Shape: ({ node, env, badges }) => (
    <div className="space-y-1">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-violet-600">{tr(T.name, env.uiLang)}</div>
      <div className="font-semibold text-slate-800">{previewText(node.title, env)}</div>
      <div className="flex flex-wrap gap-1 empty:hidden">{badges}</div>
    </div>
  ),
  Properties: ({ node, update, env }) => (
    <Field label={tr(T.title, env.uiLang)}>
      <LabelEditor value={node.title} onChange={(title) => update({ title })} />
    </Field>
  ),
};
