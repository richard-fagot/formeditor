import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Boxes, FileQuestion, Plus, Tags } from 'lucide-react';
import { runCommand } from '../../app/commands';
import { useStore, useT, type LibraryItem } from '../../app/store';
import { Button, cn, ContextMenu } from '../../ui-kit';
import { usePluginEnv } from '../properties';
import { LabelSets } from './LabelSets';
import { LibraryQuestionView } from './LibraryQuestionView';
import { itemTitle } from './items';
import { UnusedCount, UnusedMark, useUnused } from './Unused';

/** Onglet Bibliothèque : liste des éléments à gauche, question affichée à droite (sans élément : jeux de libellés) ; un fragment s'ouvre dans son onglet. */
export function Library() {
  const t = useT();
  const env = usePluginEnv();
  const item = useStore((s) => s.libraryItem);
  const lib = env.ws.library;
  const exists = item?.kind === 'question' && lib.questions.some((x) => x.id === item.id);
  // Éléments inutilisés (EVO-028) : indicateur à côté de l'élément, nombre à côté du titre de la rubrique.
  const unused = useUnused();
  // Menu contextuel d'un élément (EVO-010) : « Dupliquer ».
  const [menu, setMenu] = useState<{ x: number; y: number; item: LibraryItem }>();
  // Élément affiché gardé visible dans la liste (ouverture depuis le badge « bib. », EVO-013).
  const nav = useRef<HTMLElement>(null);
  useEffect(() => { nav.current?.querySelector('[aria-current="true"]')?.scrollIntoView?.({ block: 'nearest' }); }, [item?.id]);
  const entry = (it: LibraryItem | undefined, label: string, sub?: string, mark?: string) => (
    <li key={it?.id ?? 'labelSets'}>
      <button type="button" data-testid="library-entry" aria-current={(it?.id ?? '') === (exists ? item!.id : '')}
        className={cn('flex w-full items-baseline gap-2 rounded px-2 py-1 text-left text-sm hover:bg-slate-100',
          (it?.id ?? '') === (exists ? item!.id : '') && 'bg-indigo-50 text-indigo-800')}
        onClick={() => runCommand('library.show', it)}
        onContextMenu={(e) => {
          if (!it) return;
          e.preventDefault();
          setMenu({ x: e.clientX, y: e.clientY, item: it });
        }}>
        <span className="truncate">{label}</span>
        {mark && <UnusedMark title={mark} />}
        {sub && <span className="ml-auto shrink-0 font-mono text-[10px] text-slate-400">{sub}</span>}
      </button>
    </li>
  );
  const heading = (icon: ReactNode, label: string, count: ReactNode, cmd?: 'library.newQuestion' | 'library.newFragment') => (
    <div data-testid="library-heading" className="mt-4 flex items-center gap-1 px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
      {icon}{label}{count}
      {cmd && <Button size="sm" variant="ghost" className="ml-auto" aria-label={t(cmd)} title={t(cmd)}
        onClick={() => runCommand(cmd)}><Plus className="size-3" /></Button>}
    </div>
  );
  return (
    <div className="flex h-full" data-testid="library">
      <nav ref={nav} className="w-64 shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-2">
        {heading(<Tags className="size-3" />, t('library.labelSets'), <UnusedCount n={unused.labelSets.length} />)}
        <ul>{entry(undefined, t('library.labelSets'), String(lib.labelSets.length))}</ul>
        {heading(<FileQuestion className="size-3" />, t('library.questions'), <UnusedCount n={unused.questions.length} feminine />, 'library.newQuestion')}
        <ul>{lib.questions.map((q) => entry({ kind: 'question', id: q.id }, itemTitle(env, { kind: 'question', id: q.id }), q.key,
          unused.questions.includes(q.id) ? t('unused.question') : undefined))}</ul>
        {heading(<Boxes className="size-3" />, t('library.fragments'), <UnusedCount n={unused.fragments.length} />, 'library.newFragment')}
        <ul>{lib.fragments.map((f) => entry({ kind: 'fragment', id: f.id }, itemTitle(env, { kind: 'fragment', id: f.id }), f.key,
          unused.fragments.includes(f.id) ? t('unused.fragment') : undefined))}</ul>
      </nav>
      <div className="min-w-0 flex-1">
        {exists && <LibraryQuestionView key={item.id} id={item.id} />}
        {!exists && (
          <div className="h-full overflow-y-auto px-6 py-6">
            <div className="mx-auto max-w-4xl"><LabelSets /></div>
          </div>
        )}
      </div>
      <ContextMenu at={menu} onClose={() => setMenu(undefined)}
        items={[
          { label: t('node.duplicate'), onSelect: () => runCommand('library.duplicate', menu!.item) },
          // Question réutilisable : commentaire de révision (EVO-011).
          ...(menu?.item.kind === 'question' ? [{ label: t('comment.add'), onSelect: () => runCommand('comment.add', { host: menu.item, node: menu.item.id }) }] : []),
        ]} />
    </div>
  );
}
