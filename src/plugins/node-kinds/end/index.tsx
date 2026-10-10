import type { EndNode } from '../../../core/model';
import { previewText, tr, type NodeKindPlugin } from '../../../plugin-api';
import { Field, Input } from '../../../ui-kit';
import { LabelEditor } from '../../../ui/expression-editor';

const T = {
  name: { fr: 'Fin', en: 'End' },
  title: { fr: 'Titre', en: 'Title' },
  message: { fr: 'Message', en: 'Message' },
  outcome: { fr: 'Issue (code libre : submitted, ineligible…)', en: 'Outcome (free code: submitted, ineligible…)' },
  defaultMessage: { fr: 'Merci, votre réponse est enregistrée.', en: 'Thank you, your answer has been recorded.' },
};

/** Fin de parcours : message conditionnable, issue métier. */
export const endKind: NodeKindPlugin<EndNode> = {
  kind: 'end',
  name: T.name,
  create: (id) => ({ kind: 'end', id, message: { ...T.defaultMessage } }),
  shapeClass: 'rounded-full border-emerald-400 bg-emerald-50 px-5',
  Shape: ({ node, env, badges }) => (
    <div className="space-y-1 text-center">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
        {tr(T.name, env.uiLang)}
        {node.outcome && <span className="ml-1 font-mono normal-case text-emerald-600">· {node.outcome}</span>}
      </div>
      <div className="line-clamp-2 text-xs text-slate-700">{previewText(node.title ?? node.message, env)}</div>
      <div className="flex flex-wrap justify-center gap-1 empty:hidden">{badges}</div>
    </div>
  ),
  Properties: ({ node, update, env }) => (
    <div className="space-y-3">
      <Field label={tr(T.title, env.uiLang)}>
        <LabelEditor value={node.title} onChange={(title) => update({ title })} />
      </Field>
      <Field label={tr(T.message, env.uiLang)}>
        <LabelEditor multiline value={node.message} onChange={(message) => update({ message: message ?? {} })} />
      </Field>
      <Field label={tr(T.outcome, env.uiLang)}>
        <Input className="font-mono" value={node.outcome ?? ''} onChange={(e) => update({ outcome: e.target.value || undefined })} />
      </Field>
    </div>
  ),
  Page: ({ node, env }) => (
    <div className="space-y-3 text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">✓</div>
      {node.title && <h2 className="text-2xl font-semibold text-slate-900">{env.label(node.title)}</h2>}
      <p className="whitespace-pre-line text-lg text-slate-700">{env.label(node.message)}</p>
    </div>
  ),
};
