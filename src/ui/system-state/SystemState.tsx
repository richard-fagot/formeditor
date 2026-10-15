import { Plus } from 'lucide-react';
import { describeIssue } from '../../core/validation';
import { runCommand } from '../../app/commands';
import { useStore, useT } from '../../app/store';
import { useIssues } from '../../app/issues';
import { Button } from '../../ui-kit';
import { ScenarioCard } from './ScenarioCard';
import { VariableCard } from './VariableCard';

/** Onglet « État du système » : dictionnaire des variables (spec §4.5) et scénarios nommés. */
export function SystemState() {
  const t = useT();
  const project = useStore((s) => s.ws.project);
  const uiLang = useStore((s) => s.uiLang);
  const names = project.systemState.map((v) => v.name);
  // Problèmes du dictionnaire (noms invalides ou en double), affichés sur la variable concernée.
  const issues = useIssues({ owner: { kind: 'system' } });
  const problemsOf = (name: string) => issues.filter((i) => i.owner.id === name).map((i) => describeIssue(i, uiLang));
  return (
    <div className="h-full overflow-y-auto bg-slate-50" data-testid="system-state">
      <div className="mx-auto grid max-w-6xl gap-8 p-6 xl:grid-cols-[3fr_2fr]">
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-800">{t('system.title')}</h2>
            <Button size="sm" className="ml-auto" data-testid="add-variable" onClick={() => runCommand('system.addVariable')}>
              <Plus className="size-3" />{t('system.addVariable')}
            </Button>
          </div>
          <p className="text-sm text-slate-500">{t('system.hint')}</p>
          {!names.length && <p className="text-sm text-slate-400">{t('system.empty')}</p>}
          {project.systemState.map((v, i) => <VariableCard key={`${i}:${v.name}`} variable={v} names={names} problems={problemsOf(v.name)} />)}
        </section>
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-800">{t('scenario.title')}</h2>
            <Button size="sm" className="ml-auto" onClick={() => runCommand('scenario.add')}><Plus className="size-3" />{t('scenario.add')}</Button>
          </div>
          <p className="text-sm text-slate-500">{t('scenario.hint')}</p>
          {!project.scenarios.length && <p className="text-sm text-slate-400">{t('scenario.empty')}</p>}
          {project.scenarios.map((s) => <ScenarioCard key={s.id} scenario={s} />)}
        </section>
      </div>
    </div>
  );
}
