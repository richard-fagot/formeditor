import { Plus, Trash2 } from 'lucide-react';
import { isValidKey, type LabelSet, type LocalizedText } from '../../core/model';
import { runCommand } from '../../app/commands';
import { useEditorEnv, useStore, useT } from '../../app/store';
import { Badge, Button, Field, Input, LocalizedTextInput } from '../../ui-kit';

/** Modifie un jeu de libellés dans l'historique de la bibliothèque (frappes regroupées par champ). */
function patch(id: string, field: string, p: Partial<LabelSet>) {
  useStore.getState().edit('library', (ws) => {
    const l = ws.library.labelSets.find((x) => x.id === id);
    if (l) Object.assign(l, p);
  }, `${id}:${field}`);
}

/** Jeux de libellés de la bibliothèque : « Oui / Non » et variantes, réutilisés par les questions. */
export function LabelSets() {
  const t = useT();
  const env = useEditorEnv();
  const sets = env.ws.library.labelSets;
  const text = (v: LocalizedText | undefined, set: (v: LocalizedText) => void) => (
    <LocalizedTextInput languages={env.languages} activeLang={env.contentLang} value={v} onChange={set} />
  );
  return (
    <section className="space-y-4" data-testid="label-sets">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-slate-800">{t('library.labelSets')}</h2>
        <Button size="sm" className="ml-auto" onClick={() => runCommand('labelSet.addBoolean')}><Plus className="size-3" />{t('library.kind.boolean')}</Button>
      </div>
      <p className="text-sm text-slate-500">{t('library.labelSetsHint')}</p>
      {!sets.length && <p className="text-sm text-slate-400">{t('library.noLabelSet')}</p>}
      {sets.map((l) => {
        const keyOk = isValidKey(l.key) && sets.filter((x) => x.key === l.key).length === 1;
        return (
          <div key={l.id} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-end gap-2">
              <Field label={t('props.key')} className="w-64">
                <Input className={keyOk ? 'font-mono' : 'border-rose-400 font-mono'} value={l.key}
                  onChange={(e) => patch(l.id, 'key', { key: e.target.value.trim() })} />
              </Field>
              <Badge tone="indigo">{t('library.kind.boolean')}</Badge>
              <Button size="sm" variant="danger" className="ml-auto" onClick={() => runCommand('labelSet.delete', l.id)}>
                <Trash2 className="size-3" />{t('props.delete')}
              </Button>
            </div>
            {!keyOk && <p className="text-xs text-rose-600">{t('props.keyInvalid')}</p>}
            <div className="grid gap-3 md:grid-cols-2">
              <Field label={t('library.yes')}>{text(l.yes, (yes) => patch(l.id, 'yes', { yes }))}</Field>
              <Field label={t('library.no')}>{text(l.no, (no) => patch(l.id, 'no', { no }))}</Field>
            </div>
          </div>
        );
      })}
    </section>
  );
}
