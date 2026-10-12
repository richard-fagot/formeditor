import { useState } from 'react';
import type { FragmentNode, Workspace } from '../../../core/model';
import { questionOfNode } from '../../../core/references';
import { previewText, tr, type NodeKindPlugin, type ShapeProps } from '../../../plugin-api';

const T = {
  name: { fr: 'Fragment', en: 'Fragment' },
  missing: { fr: 'Fragment introuvable', en: 'Fragment not found' },
  expand: { fr: 'Déplier', en: 'Expand' },
  collapse: { fr: 'Replier', en: 'Collapse' },
  exit: { fr: 'sortie', en: 'exit' },
  questions: { fr: '{n} question(s)', en: '{n} question(s)' },
};

/** Nom affiché des autres nœuds d'un fragment (page d'information, synthèse, fin). */
const KINDS: Record<string, { fr: string; en: string }> = {
  info: { fr: 'Information', en: 'Information' },
  summary: { fr: 'Synthèse', en: 'Summary' },
  end: { fr: 'Fin', en: 'End' },
};

/** Nombre de questions d'un fragment, fragments appelés compris (garde contre un cycle d'appels). */
function questionCount(ws: Workspace, id: string, seen = new Set<string>()): number {
  const f = seen.has(id) ? undefined : ws.library.fragments.find((x) => x.id === id);
  if (!f) return 0;
  const inner = new Set([...seen, id]);
  return f.nodes.reduce((sum, n) => sum + (n.kind === 'fragment' ? questionCount(ws, n.ref, inner) : questionOfNode(ws, n) ? 1 : 0), 0);
}

/** Forme d'un appel : nom du fragment, alias, nombre de questions ; dépliable en lecture seule. */
function FragmentShape({ node, env, badges }: ShapeProps<FragmentNode>) {
  const [open, setOpen] = useState(false);
  const fragment = env.ws.library.fragments.find((f) => f.id === node.ref);
  const title = fragment ? (fragment.title[env.contentLang] ?? fragment.title[env.defaultLang] ?? fragment.key) : tr(T.missing, env.uiLang);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-amber-700">
        <span>{tr(T.name, env.uiLang)}</span>
        {fragment && (
          <button type="button" data-testid="fragment-expand" className="nodrag rounded px-1 normal-case text-amber-700 hover:bg-amber-100"
            onClick={(e) => { e.stopPropagation(); setOpen(!open); }}>
            {open ? '▾' : '▸'} {tr(open ? T.collapse : T.expand, env.uiLang)}
          </button>
        )}
      </div>
      <div className="font-semibold text-slate-800">{title}</div>
      <div className="flex items-baseline justify-between gap-2 text-[10px]">
        <span className="font-mono text-slate-500" data-testid="fragment-alias">{node.alias}</span>
        {fragment && <span className="text-slate-400" data-testid="fragment-count">{tr(T.questions, env.uiLang).replace('{n}', String(questionCount(env.ws, fragment.id)))}</span>}
      </div>
      {open && fragment && (
        <ol className="space-y-0.5 border-l-2 border-amber-200 pl-2 text-xs text-slate-600" data-testid="fragment-content">
          {fragment.nodes.map((n) => {
            const q = questionOfNode(env.ws, n);
            if (q) return <li key={n.id} className="truncate">{previewText(q.label, env) || '…'} <span className="font-mono text-[10px] text-slate-400">{node.alias}.{q.key}</span></li>;
            if (n.kind === 'exit') return <li key={n.id} className="font-mono text-amber-700">→ {tr(T.exit, env.uiLang)} {n.name}</li>;
            if (n.kind === 'fragment') return <li key={n.id} className="font-mono text-amber-700">▣ {node.alias}.{n.alias}</li>;
            return <li key={n.id} className="italic text-slate-400">{KINDS[n.kind] ? tr(KINDS[n.kind]!, env.uiLang) : n.kind}</li>;
          })}
        </ol>
      )}
      <div className="flex flex-wrap gap-1 empty:hidden">{badges}</div>
    </div>
  );
}

/** Appel d'un fragment de la bibliothèque (par référence), avec son alias. */
export const fragmentKind: NodeKindPlugin<FragmentNode> = {
  kind: 'fragment',
  name: T.name,
  shapeClass: 'rounded-lg border-amber-400 bg-amber-50 border-dashed border-2',
  Shape: FragmentShape,
};
