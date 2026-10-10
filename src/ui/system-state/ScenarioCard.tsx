import { Copy, Trash2 } from 'lucide-react';
import type { Scenario } from '../../core/model';
import { runCommand } from '../../app/commands';
import { useStore, useT } from '../../app/store';
import { Button, Field, Input } from '../../ui-kit';
import { SystemValuesEditor } from './ValueInput';

function patch(id: string, field: string, recipe: (s: Scenario) => void) {
  useStore.getState().edit('project', (ws) => {
    const s = ws.project.scenarios.find((x) => x.id === id);
    if (s) recipe(s);
  }, `scenario:${id}:${field}`);
}

/** Un scénario : nom, description, valeur de chaque variable. */
export function ScenarioCard({ scenario: s }: { scenario: Scenario }) {
  const t = useT();
  const variables = useStore((st) => st.ws.project.systemState);
  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-xs" data-testid={`scenario-${s.id}`}>
      <div className="flex items-end gap-2">
        <Field label={t('scenario.name')} className="flex-1">
          <Input value={s.name} onChange={(e) => patch(s.id, 'name', (x) => void (x.name = e.target.value))} />
        </Field>
        <Button size="sm" onClick={() => runCommand('scenario.add', s.id)}><Copy className="size-3" />{t('scenario.duplicate')}</Button>
        <Button size="sm" variant="danger" onClick={() => runCommand('scenario.delete', s.id)}><Trash2 className="size-3" />{t('props.delete')}</Button>
      </div>
      <Field label={t('system.description')}>
        <Input value={s.description ?? ''} onChange={(e) => patch(s.id, 'description', (x) => {
          if (e.target.value) x.description = e.target.value;
          else delete x.description;
        })} />
      </Field>
      <SystemValuesEditor idPrefix={`sc-${s.id}`} variables={variables} values={s.values}
        onChange={(name, value) => patch(s.id, `v:${name}`, (x) => {
          if (value === undefined) delete x.values[name];
          else x.values[name] = value;
        })} />
    </div>
  );
}
