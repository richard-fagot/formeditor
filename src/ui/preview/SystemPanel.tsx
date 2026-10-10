import { useState } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import { runCommand } from '../../app/commands';
import { scenarioOf, systemStateOf, useStore, useT, type PreviewState } from '../../app/store';
import { Badge, Button, Input, Select } from '../../ui-kit';
import { SystemValuesEditor } from '../system-state';

/**
 * Panneau d'état du système : scénario nommé, édition libre des valeurs (réévaluation immédiate,
 * le parcours en cours est conservé), enregistrement comme nouveau scénario.
 */
export function SystemPanel({ questionnaireId, state, update }: { questionnaireId: string; state?: PreviewState; update(p: Partial<PreviewState>): void }) {
  const t = useT();
  const ws = useStore((s) => s.ws);
  const [name, setName] = useState('');
  const values = systemStateOf(ws, state);
  const base = scenarioOf(ws, state);
  const set = (key: string, v: unknown) => {
    const next = { ...values };
    if (v === undefined) delete next[key];
    else next[key] = v;
    update({ sys: next });
  };
  return (
    <div className="space-y-3" data-testid="system-panel">
      <Select aria-label={t('preview.scenario')} data-testid="scenario-select" value={state?.scenarioId ?? base?.id ?? ''}
        onChange={(e) => update({ scenarioId: e.target.value, sys: undefined })}>
        {ws.project.scenarios.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        <option value="">{t('preview.noScenario')}</option>
      </Select>
      {state?.sys && (
        <div className="flex items-center gap-2">
          <Badge tone="amber">{t('preview.modified')}</Badge>
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => update({ sys: undefined })}>
            <RotateCcw className="size-3" />{t('preview.reset')}
          </Button>
        </div>
      )}
      <SystemValuesEditor idPrefix={`pv-${questionnaireId}`} variables={ws.project.systemState} values={values} onChange={set} />
      <form className="space-y-2 border-t border-slate-100 pt-3" onSubmit={(e) => {
        e.preventDefault();
        runCommand('preview.saveScenario', name);
        setName('');
      }}>
        <Input value={name} placeholder={t('scenario.name')} aria-label={t('scenario.name')} onChange={(e) => setName(e.target.value)} />
        <Button type="submit" size="sm" data-testid="save-scenario"><Save className="size-3" />{t('preview.saveAs')}</Button>
      </form>
    </div>
  );
}
