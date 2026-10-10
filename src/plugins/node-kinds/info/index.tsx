import type { InfoNode } from '../../../core/model';
import { previewText, tr, type NodeKindPlugin } from '../../../plugin-api';
import { Field } from '../../../ui-kit';
import { LabelEditor } from '../../../ui/expression-editor';

const T = {
  name: { fr: 'Information', en: 'Information' },
  title: { fr: 'Titre', en: 'Title' },
  text: { fr: 'Texte', en: 'Text' },
  newText: { fr: 'Texte d’information', en: 'Information text' },
};

/** Page d'information : texte sans saisie, conditionnable et interpolable. */
export const infoKind: NodeKindPlugin<InfoNode> = {
  kind: 'info',
  name: T.name,
  create: (id) => ({ kind: 'info', id, text: { ...T.newText } }),
  shapeClass: 'rounded-xl border-sky-300 bg-sky-50',
  Shape: ({ node, env, badges }) => (
    <div className="space-y-1">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-sky-600">{tr(T.name, env.uiLang)}</div>
      {node.title && <div className="font-semibold text-slate-800">{previewText(node.title, env)}</div>}
      <div className="line-clamp-2 text-xs text-slate-600">{previewText(node.text, env)}</div>
      <div className="flex flex-wrap gap-1 empty:hidden">{badges}</div>
    </div>
  ),
  Properties: ({ node, update, env }) => (
    <div className="space-y-3">
      <Field label={tr(T.title, env.uiLang)}>
        <LabelEditor value={node.title} onChange={(title) => update({ title })} />
      </Field>
      <Field label={tr(T.text, env.uiLang)}>
        <LabelEditor multiline value={node.text} onChange={(text) => update({ text: text ?? {} })} />
      </Field>
    </div>
  ),
  Page: ({ node, env }) => (
    <div className="space-y-3">
      {node.title && <h2 className="text-2xl font-semibold text-slate-900">{env.label(node.title)}</h2>}
      <p className="whitespace-pre-line text-lg leading-relaxed text-slate-700">{env.label(node.text)}</p>
    </div>
  ),
};
