import { useState } from 'react';
import { Boxes, FileQuestion } from 'lucide-react';
import { runCommand } from '../../app/commands';
import { insertionCycle, useT, type GraphRef, type LibraryItem } from '../../app/store';
import { Input } from '../../ui-kit';
import { LIBRARY_MIME } from '../diagram';
import { usePluginEnv } from '../properties';
import { itemTitle } from './items';

/**
 * Panneau latéral filtrable de la bibliothèque, à côté du logigramme : glisser un élément sur le graphe
 * l'insère à cet endroit ; double-clic (ou Entrée) l'insère à la suite du nœud sélectionné. Dans un fragment,
 * les fragments dont l'insertion créerait un cycle d'appels (lui-même compris) ne sont pas proposés.
 */
export function LibraryPanel({ graph }: { graph: GraphRef }) {
  const t = useT();
  const env = usePluginEnv();
  const [filter, setFilter] = useState('');
  const lib = env.ws.library;
  const items: (LibraryItem & { title: string; key: string })[] = [
    ...lib.questions.map((q) => ({ kind: 'question' as const, id: q.id, key: q.key })),
    ...lib.fragments.map((f) => ({ kind: 'fragment' as const, id: f.id, key: f.key })),
  ].filter((x) => !insertionCycle(env.ws, graph, x)).map((x) => ({ ...x, title: itemTitle(env, x) }));
  const f = filter.trim().toLowerCase();
  const shown = f ? items.filter((x) => `${x.title} ${x.key}`.toLowerCase().includes(f)) : items;
  const insert = (x: LibraryItem) => runCommand('library.insertItem', { kind: x.kind, id: x.id, graph });
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-white" data-testid="library-panel">
      <div className="space-y-1 border-b border-slate-100 p-2">
        <Input value={filter} placeholder={t('library.filter')} aria-label={t('library.filter')} onChange={(e) => setFilter(e.target.value)} />
        <p className="text-[10px] leading-tight text-slate-400">{t('library.dragHint')}</p>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto p-1">
        {!items.length && <li className="p-2 text-xs text-slate-400">{t('library.empty')}</li>}
        {shown.map((x) => (
          <li key={x.id}>
            <button type="button" draggable data-testid="library-item"
              className="flex w-full cursor-grab items-start gap-1.5 rounded px-2 py-1 text-left text-xs hover:bg-amber-50"
              onDragStart={(e) => {
                e.dataTransfer.setData(LIBRARY_MIME, JSON.stringify({ kind: x.kind, id: x.id }));
                e.dataTransfer.effectAllowed = 'copy';
              }}
              onDoubleClick={() => insert(x)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), insert(x))}>
              {x.kind === 'fragment' ? <Boxes className="mt-0.5 size-3 shrink-0 text-amber-600" /> : <FileQuestion className="mt-0.5 size-3 shrink-0 text-slate-400" />}
              <span className="min-w-0">
                <span className="block truncate text-slate-700">{x.title}</span>
                <span className="block font-mono text-[10px] text-slate-400">{x.key}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
