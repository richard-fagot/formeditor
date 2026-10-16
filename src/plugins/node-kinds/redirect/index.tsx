import { ClipboardPaste, Filter, Replace } from 'lucide-react';
import { targetName, type RedirectButton, type RedirectNode } from '../../../core/model';
import { previewText, tr, type EditorEnv, type NodeKindPlugin } from '../../../plugin-api';
import { RedirectProperties } from './properties';
import { T } from './texts';

/** Icônes des toggles activés d'un bouton (mêmes icônes dans la prévisualisation, EVO-024-039, 042). */
function ToggleIcons({ b, env }: { b: RedirectButton; env: EditorEnv }) {
  if (!b.target || !('questionnaire' in b.target)) return null;
  return (
    <>
      {b.target.prefill && <span data-testid="toggle-prefill" title={tr(T.prefill, env.uiLang)}><ClipboardPaste className="size-3 shrink-0 text-rose-600" /></span>}
      {b.target.replace && <span data-testid="toggle-replace" title={tr(T.replace, env.uiLang)}><Replace className="size-3 shrink-0 text-rose-600" /></span>}
    </>
  );
}

/** Aperçu d'un bouton : libellé, nom de la cible, icônes des toggles, condition d'affichage (EVO-024-038, 039, 073). */
function ButtonPreview({ b, env, graphId }: { b: RedirectButton; env: EditorEnv; graphId?: string }) {
  const name = b.target ? (graphId && targetName(env.ws, graphId, b.target, env.contentLang)) ?? '?' : '—';
  return (
    <li className="flex items-center gap-1 rounded border border-rose-200 bg-white px-1.5 py-0.5 text-xs" data-testid="redirect-button">
      <span className="truncate font-medium text-slate-800">{previewText(b.label, env) || '…'}</span>
      <span className="truncate text-slate-500" data-testid="redirect-target">→ {name}</span>
      <ToggleIcons b={b} env={env} />
      {b.when && (
        <span data-testid="redirect-button-when" title={`${tr(T.when, env.uiLang)} : ${b.when}`}><Filter className="size-3 shrink-0 text-amber-600" /></span>
      )}
    </li>
  );
}

/** Nœud Renvoi (EVO-024) : texte et boutons de renvoi vers un autre questionnaire ou un nœud en amont. */
export const redirectKind: NodeKindPlugin<RedirectNode> = {
  kind: 'redirect',
  name: T.name,
  create: (id) => ({ kind: 'redirect', id, text: { ...T.newText }, buttons: [] }),
  // Forme propre (EVO-024-037) : bordure rose épaisse, coin coupé à gauche.
  shapeClass: 'rounded-r-xl rounded-l-sm border-l-4 border-rose-400 bg-rose-50',
  Shape: ({ node, env, badges, graphId }) => (
    <div className="space-y-1" data-testid="redirect-shape">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-rose-600">{tr(T.name, env.uiLang)}</div>
      {node.title && <div className="font-semibold text-slate-800">{previewText(node.title, env)}</div>}
      <div className="line-clamp-2 text-xs text-slate-600">{previewText(node.text, env)}</div>
      {node.buttons.length > 0 && (
        <ul className="space-y-0.5">{node.buttons.map((b, i) => <ButtonPreview key={i} b={b} env={env} graphId={graphId} />)}</ul>
      )}
      <div className="flex flex-wrap gap-1 empty:hidden">{badges}</div>
    </div>
  ),
  Properties: RedirectProperties,
};
