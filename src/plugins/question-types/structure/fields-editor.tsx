import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { deriveKey, isValidKey, newId, QUESTION_TYPES, uniqueKey, type QuestionType, type StructureField, type StructureQuestion } from '../../../core/model';
import { structureScope } from '../../../core/references';
import { commonQuestionFields, previewText, tr, type QuestionPropertiesProps } from '../../../plugin-api';
import { Button, Checkbox, Field, Input, Select } from '../../../ui-kit';
import { ExpressionEnvProvider, ExpressionInput, LabelEditor, useExpressionEnv } from '../../../ui/expression-editor';

const T = {
  fields: { fr: 'Champs', en: 'Fields' },
  add: { fr: 'Ajouter un champ', en: 'Add a field' },
  newField: { fr: 'Champ', en: 'Field' },
  label: { fr: 'Intitulé', en: 'Label' },
  key: { fr: 'Clé', en: 'Key' },
  type: { fr: 'Type', en: 'Type' },
  required: { fr: 'Obligatoire', en: 'Required' },
  when: { fr: "Condition d'affichage (clés sœurs sans préfixe)", en: 'Display condition (sibling keys without prefix)' },
  remove: { fr: 'Supprimer le champ', en: 'Remove field' },
  up: { fr: 'Monter', en: 'Move up' },
  down: { fr: 'Descendre', en: 'Move down' },
  repeat: { fr: 'Répétable (plusieurs occurrences)', en: 'Repeatable (several occurrences)' },
  min: { fr: 'Occurrences min.', en: 'Min. occurrences' },
  max: { fr: 'Occurrences max.', en: 'Max. occurrences' },
  addLabel: { fr: 'Libellé du bouton « Ajouter »', en: '“Add” button label' },
};

const clean = <T extends object>(o: T): T => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
const count = (v: string, min: number) => (v === '' ? undefined : Math.max(min, Math.trunc(Number(v))));

/** Paramètres d'une structure : répétition (min, max, libellé « Ajouter ») et champs. */
export function StructureProperties({ question, update, env, renameField }: QuestionPropertiesProps<StructureQuestion>) {
  const outer = useExpressionEnv();
  const fields = question.fields;
  const setFields = (f: StructureField[]) => update({ fields: f });
  const setField = (i: number, f: StructureField) => setFields(fields.map((x, j) => (j === i ? clean(f) : x)));
  const move = (i: number, d: number) => {
    const next = [...fields];
    [next[i], next[i + d]] = [next[i + d]!, next[i]!];
    setFields(next);
  };
  const add = () => {
    const label = `${tr(T.newField, env.contentLang)} ${fields.length + 1}`;
    setFields([...fields, { id: newId('f'), key: uniqueKey(deriveKey(label), fields.map((f) => f.key)), label: { [env.contentLang]: label }, type: 'text' }]);
  };
  const repeat = question.repeat;
  return (
    <div className="space-y-3">
      <Checkbox label={tr(T.repeat, env.uiLang)} checked={!!repeat} onChange={(e) => update({ repeat: e.target.checked ? {} : undefined })} />
      {repeat && (
        <div className="space-y-2 border-l-2 border-slate-100 pl-3">
          <div className="grid grid-cols-2 gap-2">
            <Field label={tr(T.min, env.uiLang)}>
              <Input type="number" min={0} value={repeat.min ?? ''} onChange={(e) => update({ repeat: clean({ ...repeat, min: count(e.target.value, 0) }) })} />
            </Field>
            <Field label={tr(T.max, env.uiLang)}>
              <Input type="number" min={1} value={repeat.max ?? ''} onChange={(e) => update({ repeat: clean({ ...repeat, max: count(e.target.value, 1) }) })} />
            </Field>
          </div>
          <Field label={tr(T.addLabel, env.uiLang)}>
            <LabelEditor value={repeat.addLabel} onChange={(l) => update({ repeat: clean({ ...repeat, addLabel: l && Object.keys(l).length ? (l as Record<string, string>) : undefined }) })} />
          </Field>
        </div>
      )}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">{tr(T.fields, env.uiLang)}</span>
        <Button size="sm" variant="ghost" onClick={add} data-testid="structure-add-field"><Plus className="size-3" />{tr(T.add, env.uiLang)}</Button>
      </div>
      <ExpressionEnvProvider value={{ ...outer, scope: structureScope(outer.scope, question) }}>
        {fields.map((f, i) => (
          <details key={f.id} className="rounded-md border border-slate-200 px-2 py-1" open={fields.length === 1}>
            <summary className="flex cursor-pointer items-center gap-1 text-xs text-slate-700">
              <span className="flex-1 truncate">{previewText(f.label, env) || '…'} <span className="font-mono text-slate-400">{f.key} · {f.type}</span></span>
              <Button size="sm" variant="ghost" aria-label={tr(T.up, env.uiLang)} disabled={i === 0} onClick={(e) => (e.preventDefault(), move(i, -1))}><ArrowUp className="size-3" /></Button>
              <Button size="sm" variant="ghost" aria-label={tr(T.down, env.uiLang)} disabled={i === fields.length - 1} onClick={(e) => (e.preventDefault(), move(i, 1))}><ArrowDown className="size-3" /></Button>
              <Button size="sm" variant="ghost" aria-label={tr(T.remove, env.uiLang)} onClick={(e) => (e.preventDefault(), setFields(fields.filter((_, j) => j !== i)))}><X className="size-3" /></Button>
            </summary>
            <FieldEditor field={f} taken={fields.filter((x) => x.id !== f.id).map((x) => x.key)} env={env}
              onChange={(nf) => setField(i, nf)}
              onRename={(k) => (renameField ? renameField(f.id, k) : setField(i, { ...f, key: k }))} />
          </details>
        ))}
      </ExpressionEnvProvider>
    </div>
  );
}

const FIELD_TYPES = QUESTION_TYPES.filter((t) => t !== 'structure');

function FieldEditor({ field, taken, env, onChange, onRename }: {
  field: StructureField; taken: string[]; env: QuestionPropertiesProps['env'];
  onChange(f: StructureField): void; onRename(key: string): void;
}) {
  const [key, setKey] = useState(field.key);
  useEffect(() => setKey(field.key), [field.key]);
  const keyOk = isValidKey(key) && !taken.includes(key);
  const plugin = env.questionType(field.type);
  const changeType = (type: QuestionType) => {
    const p = env.questionType(type);
    if (p) onChange({ ...p.create(commonQuestionFields(field), field), ...(field.when ? { when: field.when } : {}) } as StructureField);
  };
  return (
    <div className="space-y-2 py-2">
      <Field label={tr(T.label, env.uiLang)}>
        <LabelEditor value={field.label} onChange={(label) => onChange({ ...field, label: label ?? {} })} />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label={tr(T.key, env.uiLang)}>
          <Input className={keyOk ? 'font-mono' : 'border-rose-400 font-mono'} value={key} onChange={(e) => setKey(e.target.value)}
            onBlur={() => (keyOk && key !== field.key ? onRename(key) : setKey(field.key))}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
        </Field>
        <Field label={tr(T.type, env.uiLang)}>
          <Select value={field.type} onChange={(e) => changeType(e.target.value as QuestionType)}>
            {FIELD_TYPES.map((t) => <option key={t} value={t}>{tr(env.questionType(t)?.name ?? { fr: t }, env.uiLang)}</option>)}
          </Select>
        </Field>
      </div>
      <Checkbox label={tr(T.required, env.uiLang)} checked={field.required === true} onChange={(e) => onChange({ ...field, required: e.target.checked || undefined })} />
      <Field label={tr(T.when, env.uiLang)}>
        <ExpressionInput value={field.when ?? ''} onChange={(v) => onChange({ ...field, when: v.trim() || undefined })} />
      </Field>
      {plugin && <plugin.Properties question={field} env={env} update={(patch) => onChange({ ...field, ...patch } as StructureField)} />}
    </div>
  );
}
