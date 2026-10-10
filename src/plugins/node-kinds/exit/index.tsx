import type { ExitNode } from '../../../core/model';
import { tr, type NodeKindPlugin } from '../../../plugin-api';

const T = { name: { fr: 'Sortie', en: 'Exit' } };

/** Sortie nommée d'un bloc (uniquement dans un bloc). */
export const exitKind: NodeKindPlugin<ExitNode> = {
  kind: 'exit',
  name: T.name,
  create: (id) => ({ kind: 'exit', id, name: 'sortie' }),
  shapeClass: 'rounded-md border-slate-400 bg-slate-100',
  Shape: ({ node, env }) => (
    <div className="text-center">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{tr(T.name, env.uiLang)}</div>
      <div className="font-mono text-sm text-slate-700">{node.name}</div>
    </div>
  ),
};
