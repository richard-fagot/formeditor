import { Plus } from 'lucide-react';
import { runCommand } from '../../app/commands';
import { useStore, useT } from '../../app/store';
import { Button } from '../../ui-kit';
import { ScenarioCard } from './ScenarioCard';
import { VariableCard } from './VariableCard';

/** Onglet « État du système » : dictionnaire des variables (spec §4.5) et scénarios nommés. */
export function SystemState() {
  const t = useT();
  const project = useStore((s) => s.ws.project);
  const names = project.systemState.map((v) => v.name);
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
          {project.systemState.map((v) => <VariableCard key={v.name} variable={v} names={names} />)}
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
