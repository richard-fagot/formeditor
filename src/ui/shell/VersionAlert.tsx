import { TriangleAlert } from 'lucide-react';
import { isVariantLabel, libraryItemOf, versionAlerts } from '../../core/model';
import { useStore, useT } from '../../app/store';

/**
 * Alerte de dépendance d'un questionnaire validé (EVO-022) : éléments de bibliothèque utilisés dont la version a changé
 * depuis sa validation (« Identité assuré : 2.1.0 → 2.2.0 »). Non bloquante ; disparaît à la revalidation.
 */
export function VersionAlert({ id }: { id: string }) {
  const t = useT();
  const ws = useStore((s) => s.ws);
  const lang = useStore((s) => s.contentLang);
  const q = ws.questionnaires.find((x) => x.id === id);
  const alerts = q ? versionAlerts(ws.library, q) : [];
  if (!alerts.length) return null;
  const name = (a: (typeof alerts)[number]) => {
    const x = libraryItemOf(ws.library, a);
    const text = x && ('label' in x ? (isVariantLabel(x.label) ? x.label.otherwise : x.label) : x.title);
    return text?.[lang] || text?.[ws.project.defaultLanguage] || a.key;
  };
  const version = (v: string) => v || t('version.empty');
  return (
    <div data-testid="version-alert" role="status"
      className="absolute left-3 top-11 z-10 max-w-md rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 shadow-sm">
      <p className="flex items-center gap-1 font-medium"><TriangleAlert className="size-3.5" />{t('version.alertTitle')}</p>
      <ul className="mt-1 list-disc pl-5">
        {alerts.map((a) => <li key={a.id}>{t('version.alertLine', { name: name(a), from: version(a.from), to: version(a.to) })}</li>)}
      </ul>
    </div>
  );
}
