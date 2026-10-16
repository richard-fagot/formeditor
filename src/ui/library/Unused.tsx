import { useMemo } from 'react';
import { TriangleAlert } from 'lucide-react';
import { unusedCount, unusedLibraryItems, type UnusedItems } from '../../core/model';
import { useStore, useT } from '../../app/store';

/** Éléments de bibliothèque inutilisés du projet (EVO-028), recalculés à chaque changement du projet. */
export function useUnused(): UnusedItems {
  const ws = useStore((s) => s.ws);
  return useMemo(() => unusedLibraryItems(ws), [ws]);
}

/** Indicateur d'élément inutilisé, aux couleurs des avertissements ; le survol explique (EVO-028-006 à 008). */
export function UnusedMark({ title }: { title: string }) {
  return (
    <span data-testid="unused-mark" role="img" title={title} aria-label={title} className="inline-flex shrink-0 text-amber-600">
      <TriangleAlert className="size-3.5" />
    </span>
  );
}

/** Nombre d'éléments inutilisés d'une rubrique (EVO-028-009) ; rien s'il est nul (EVO-028-011). */
export function UnusedCount({ n, feminine }: { n: number; feminine?: boolean }) {
  const t = useT();
  if (!n) return null;
  const key = feminine ? (n === 1 ? 'unused.countF1' : 'unused.countF') : (n === 1 ? 'unused.countM1' : 'unused.countM');
  return <span data-testid="unused-count" className="font-normal normal-case tracking-normal text-amber-700">{t(key, { n })}</span>;
}

/** Total des éléments inutilisés, sur l'onglet ou le lien « Bibliothèque » (EVO-028-010) ; rien s'il est nul (EVO-028-011). */
export function UnusedTotal() {
  const t = useT();
  const n = unusedCount(useUnused());
  if (!n) return null;
  const title = n === 1 ? t('unused.total1') : t('unused.total', { n });
  return (
    <span data-testid="unused-total" title={title} aria-hidden="true"
      className="rounded-full bg-amber-100 px-1.5 text-[10px] font-medium text-amber-700">{n}</span>
  );
}
