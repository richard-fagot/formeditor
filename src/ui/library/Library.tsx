import { useT } from '../../app/store';
import { LabelSets } from './LabelSets';

/** Onglet Bibliothèque : jeux de libellés (questions et blocs en phase 7). */
export function Library() {
  const t = useT();
  return (
    <div className="h-full overflow-y-auto px-6 py-6" data-testid="library">
      <div className="mx-auto max-w-4xl space-y-8">
        <LabelSets />
        <p className="text-sm text-slate-400">{t('library.todo')}</p>
      </div>
    </div>
  );
}
