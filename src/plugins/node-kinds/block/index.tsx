import type { BlockNode } from '../../../core/model';
import { tr, type NodeKindPlugin } from '../../../plugin-api';

const T = { name: { fr: 'Bloc', en: 'Block' }, missing: { fr: 'Bloc introuvable', en: 'Block not found' } };

/** Instance de bloc de la bibliothèque, avec son alias. */
export const blockKind: NodeKindPlugin<BlockNode> = {
  kind: 'block',
  name: T.name,
  shapeClass: 'rounded-lg border-amber-400 bg-amber-50 border-dashed border-2',
  Shape: ({ node, env, badges }) => {
    const block = env.ws.library.blocks.find((b) => b.id === node.ref);
    const title = block ? (block.title[env.contentLang] ?? block.title[env.defaultLang] ?? block.key) : tr(T.missing, env.uiLang);
    return (
      <div className="space-y-1">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">{tr(T.name, env.uiLang)}</div>
        <div className="font-semibold text-slate-800">{title}</div>
        <div className="font-mono text-[10px] text-slate-500">{node.alias}</div>
        <div className="flex flex-wrap gap-1 empty:hidden">{badges}</div>
      </div>
    );
  },
};
