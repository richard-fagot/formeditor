import type { QuestionNode } from '../../../core/model';
import { previewText, type NodeKindPlugin } from '../../../plugin-api';

/** Nœud question : intitulé en gras, clé discrète, aperçu du type (fourni par le plugin du type), badges. */
export const questionKind: NodeKindPlugin<QuestionNode> = {
  kind: 'question',
  name: { fr: 'Question', en: 'Question' },
  shapeClass: 'rounded-lg border-slate-300 bg-white',
  Shape: ({ question, typePlugin, env, badges }) => {
    if (!question) return <div className="text-rose-600">?</div>;
    const Preview = typePlugin?.Preview;
    return (
      <div className="space-y-1">
        <div className="font-semibold leading-snug text-slate-800">{previewText(question.label, env) || '…'}</div>
        <div className="font-mono text-[10px] text-slate-400">{question.key}</div>
        <div className="truncate text-xs">{Preview && <Preview question={question} env={env} />}</div>
        <div className="flex flex-wrap gap-1 empty:hidden">{badges}</div>
      </div>
    );
  },
};
