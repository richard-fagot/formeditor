import { useT } from '../../app/store';
import { LanguagesSection } from './LanguagesSection';
import { ShortcutsSection } from './ShortcutsSection';
import { TranslationsSection } from './TranslationsSection';

/** Onglet « Paramètres » : langues des contenus, traductions manquantes, raccourcis clavier. */
export function Settings() {
  const t = useT();
  return (
    <div className="h-full overflow-y-auto bg-slate-50" data-testid="settings">
      <div className="mx-auto grid max-w-6xl gap-8 p-6 xl:grid-cols-2">
        <div className="space-y-8">
          <h2 className="sr-only">{t('tab.settings')}</h2>
          <LanguagesSection />
          <TranslationsSection />
        </div>
        <ShortcutsSection />
      </div>
    </div>
  );
}
