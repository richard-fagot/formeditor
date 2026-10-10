import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import type { SystemVariable, VariableType, Workspace } from '../../core/model';
import { findUsages } from '../../core/references';
import { runCommand } from '../../app/commands';
import { setVariableType, useStore, useT } from '../../app/store';
import { Badge, Button, Field, Input, Select, Textarea } from '../../ui-kit';
import { KeyInput } from '../properties';
import { ValueInput } from './ValueInput';

export const VAR_TYPES: VariableType[] = ['text', 'number', 'date', 'boolean', 'enum', 'list'];

/** Modifie une variable dans l'historique du projet (frappes regroupées par champ). */
export function patchVariable(name: string, field: string, recipe: (v: SystemVariable, ws: Workspace) => void) {
  useStore.getState().edit('project', (ws) => {
    const v = ws.project.systemState.find((x) => x.name === name);
    if (v) recipe(v, ws);
  }, `sys:${name}:${field}`);
}

/** Une variable du dictionnaire : nom, type, description, valeurs (énumération), schéma (liste), exemple. */
export function VariableCard({ variable: v, names }: { variable: SystemVariable; names: string[] }) {
  const t = useT();
  const ws = useStore((s) => s.ws);
  const focus = useStore((s) => s.focusRequest);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focus?.kind !== 'variable' || focus.id !== v.name) return;
    const input = box.current?.querySelector('input');
    input?.focus();
    input?.select();
    useStore.getState().set((s) => void (s.focusRequest = undefined));
  }, [focus, v.name]);
  const uses = findUsages(ws, ['sys', v.name]).length;
  const typeLabel = (x: VariableType) => t(`vartype.${x}`);
  return (
    <div ref={box} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-xs" data-testid={`variable-${v.name}`}>
      <div className="flex flex-wrap items-start gap-3">
        <Field label={t('system.name')} hint={t('system.nameHint')} className="w-64">
          <KeyInput value={v.name} taken={names.filter((n) => n !== v.name)} invalidText={t('system.nameInvalid')}
            onCommit={(next) => runCommand('system.renameVariable', { name: v.name, next })} />
        </Field>
        <Field label={t('system.type')} className="w-44">
          <Select value={v.type} onChange={(e) => useStore.getState().edit('project', (draft) => setVariableType(draft, v.name, e.target.value as VariableType))}>
            {VAR_TYPES.map((x) => <option key={x} value={x}>{typeLabel(x)}</option>)}
          </Select>
        </Field>
        <div className="ml-auto flex items-center gap-2 pt-5">
          <Badge tone={uses ? 'indigo' : 'slate'}>{uses ? t('system.usedBy', { n: uses }) : t('system.unused')}</Badge>
          <Button size="sm" variant="danger" onClick={() => runCommand('system.deleteVariable', v.name)}>
            <Trash2 className="size-3" />{t('props.delete')}
          </Button>
        </div>
      </div>
      <Field label={t('system.description')}>
        <Input value={v.description ?? ''} onChange={(e) => patchVariable(v.name, 'description', (x) => {
          if (e.target.value) x.description = e.target.value;
          else delete x.description;
        })} />
      </Field>
      {v.type === 'enum' && (
        <Field label={t('system.values')}>
          <LinesInput value={v.values ?? []} onChange={(values) => patchVariable(v.name, 'values', (x) => void (x.values = values))} />
        </Field>
      )}
      {v.type === 'list' && <FieldsEditor variable={v} />}
      <Field label={t('system.example')}>
        <ValueInput variable={v} value={v.example} onChange={(example) => patchVariable(v.name, 'example', (x) => {
          if (example === undefined) delete x.example;
          else x.example = example;
        })} />
      </Field>
    </div>
  );
}

/** Schéma des objets d'une liste : un champ par ligne (nom, type simple, description). */
function FieldsEditor({ variable: v }: { variable: SystemVariable }) {
  const t = useT();
  const fields = v.fields ?? [];
  const patch = (i: number, p: Partial<SystemVariable>) => patchVariable(v.name, `field${i}`, (x) => {
    const f = x.fields?.[i];
    if (!f) return;
    Object.assign(f, p);
    if (f.type !== 'enum') delete f.values;
    if (!f.description) delete f.description;
  });
  return (
    <Field label={t('system.fields')}>
      <div className="space-y-1.5">
        {!fields.length && <p className="text-xs text-slate-400">{t('system.noField')}</p>}
        {fields.map((f, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input className="w-40 font-mono" value={f.name} onChange={(e) => patch(i, { name: e.target.value.trim() })} aria-label={t('system.name')} />
            <Select className="w-36" value={f.type} onChange={(e) => patch(i, { type: e.target.value as VariableType })} aria-label={t('system.type')}>
              {VAR_TYPES.filter((x) => x !== 'list' && x !== 'enum').map((x) => <option key={x} value={x}>{t(`vartype.${x}`)}</option>)}
            </Select>
            <Input value={f.description ?? ''} placeholder={t('system.description')} onChange={(e) => patch(i, { description: e.target.value })} />
            <Button size="sm" variant="ghost" aria-label={t('props.delete')}
              onClick={() => patchVariable(v.name, 'fields', (x) => void x.fields?.splice(i, 1))}>
              <X className="size-3" />
            </Button>
          </div>
        ))}
        <Button size="sm" variant="ghost" onClick={() => patchVariable(v.name, 'fields', (x) => {
          const names = (x.fields ?? []).map((f) => f.name);
          let n = 1;
          while (names.includes(`champ_${n}`)) n++;
          (x.fields ??= []).push({ name: `champ_${n}`, type: 'text' });
        })}>
          <Plus className="size-3" />{t('system.addField')}
        </Button>
      </div>
    </Field>
  );
}

/** Une valeur par ligne ; les lignes vides sont ignorées (le texte saisi est gardé localement). */
function LinesInput({ value, onChange }: { value: string[]; onChange(v: string[]): void }) {
  const [text, setText] = useState(value.join('\n'));
  const parse = (s: string) => [...new Set(s.split('\n').map((x) => x.trim()).filter(Boolean))];
  useEffect(() => setText((cur) => (JSON.stringify(parse(cur)) === JSON.stringify(value) ? cur : value.join('\n'))), [value]);
  return (
    <Textarea className="font-mono text-xs" value={text} onChange={(e) => {
      setText(e.target.value);
      onChange(parse(e.target.value));
    }} />
  );
}
