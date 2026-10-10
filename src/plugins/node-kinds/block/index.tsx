import { useState } from 'react';
import type { BlockNode } from '../../../core/model';
import { questionOfNode } from '../../../core/references';
import { previewText, tr, type NodeKindPlugin, type ShapeProps } from '../../../plugin-api';

const T = {
  name: { fr: 'Bloc', en: 'Block' },
  missing: { fr: 'Bloc introuvable', en: 'Block not found' },
  expand: { fr: 'Déplier', en: 'Expand' },
  collapse: { fr: 'Replier', en: 'Collapse' },
  exit: { fr: 'sortie', en: 'exit' },
};

/** Forme d'une instance : titre du bloc, alias ; dépliable en lecture seule (questions et sorties du bloc). */
function BlockShape({ node, env, badges }: ShapeProps<BlockNode>) {
  const [open, setOpen] = useState(false);
  const block = env.ws.library.blocks.find((b) => b.id === node.ref);
  const title = block ? (block.title[env.contentLang] ?? block.title[env.defaultLang] ?? block.key) : tr(T.missing, env.uiLang);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-amber-700">
        <span>{tr(T.name, env.uiLang)}</span>
        {block && (
          <button type="button" data-testid="block-expand" className="nodrag rounded px-1 normal-case text-amber-700 hover:bg-amber-100"
            onClick={(e) => { e.stopPropagation(); setOpen(!open); }}>
            {open ? '▾' : '▸'} {tr(open ? T.collapse : T.expand, env.uiLang)}
          </button>
        )}
      </div>
      <div className="font-semibold text-slate-800">{title}</div>
      <div className="font-mono text-[10px] text-slate-500">{node.alias}</div>
      {open && block && (
        <ol className="space-y-0.5 border-l-2 border-amber-200 pl-2 text-xs text-slate-600" data-testid="block-content">
          {block.nodes.map((n) => {
            const q = questionOfNode(env.ws, n);
            if (q) return <li key={n.id} className="truncate">{previewText(q.label, env) || '…'} <span className="font-mono text-[10px] text-slate-400">{node.alias}.{q.key}</span></li>;
            if (n.kind === 'exit') return <li key={n.id} className="font-mono text-amber-700">→ {tr(T.exit, env.uiLang)} {n.name}</li>;
            return <li key={n.id} className="italic text-slate-400">{n.kind}</li>;
          })}
        </ol>
      )}
      <div className="flex flex-wrap gap-1 empty:hidden">{badges}</div>
    </div>
  );
}

/** Instance de bloc de la bibliothèque, avec son alias. */
export const blockKind: NodeKindPlugin<BlockNode> = {
  kind: 'block',
  name: T.name,
  shapeClass: 'rounded-lg border-amber-400 bg-amber-50 border-dashed border-2',
  Shape: BlockShape,
};
