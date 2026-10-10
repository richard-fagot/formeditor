import { Plus, X } from 'lucide-react';
import type { LocalQuestionNode, Question } from '../../core/model';
import { renameKey } from '../../core/references';
import { commonQuestionFields } from '../../plugin-api';
import { QUESTION_TYPE_PLUGINS, questionType } from '../../registry';
import { getGraph, setQuestionLabel, updateNode, useEditorEnv, useT, usedKeys, type GraphRef } from '../../app/store';
import { Button, Checkbox, Field, LocalizedTextInput, Section, Select, Textarea } from '../../ui-kit';
import { ExpressionInput, LabelEditor } from '../expression-editor';
import { useGraphEdit } from './useGraphEdit';
import { KeyInput } from './KeyInput';
import { DefaultValueInput } from './DefaultValueInput';

const CONSTRAINT_PARAMS = ['minLength', 'maxLength', 'pattern', 'min', 'max', 'numberKind', 'decimals', 'minSelected', 'maxSelected'];

/** Propriétés d'une question locale : communes, puis propres au type (plugin), contraintes et messages. */
export function QuestionProperties({ graph, node }: { graph: GraphRef; node: LocalQuestionNode }) {
  const t = useT();
  const env = useEditorEnv();
  const { edit } = useGraphEdit(graph);
  const q = node as unknown as Question;
  const plugin = questionType(q.type);
  const update = (patch: Partial<Question>, field = Object.keys(patch).join()) =>
    edit(`${node.id}:${field}`, (ws) => updateNode(ws, graph, node.id, (n) => ({ ...n, ...patch }) as typeof n));
  const taken = usedKeys(env.ws, getGraph(env.ws, graph)!).filter((k) => k !== q.key);
  const owner = { kind: graph.kind, id: graph.id } as const;
  const messageParams = ['required', ...CONSTRAINT_PARAMS.filter((p) => (q as unknown as Record<string, unknown>)[p] !== undefined)];

  return (
    <>
      <Section title={t('props.question')}>
        <Field label={t('props.label')} htmlFor="prop-label">
          <LabelEditor
            id="prop-label"
            value={q.label}
            onChange={(label) => edit(`${node.id}:label`, (ws) => setQuestionLabel(ws, graph, node.id, label, env.contentLang))}
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label={t('props.key')} hint={t('props.keyHint')} htmlFor="prop-key">
            <KeyInput id="prop-key" value={q.key} taken={taken} invalidText={t('props.keyInvalid')}
              onCommit={(k) => edit(`${node.id}:key`, (ws) => renameKey(ws, { kind: 'question', owner, nodeId: node.id }, k))} />
          </Field>
          <Field label={t('props.type')}>
            <Select value={q.type} onChange={(e) => {
              const p = questionType(e.target.value as Question['type'])!;
              edit(`${node.id}:type`, (ws) => updateNode(ws, graph, node.id, () => ({ kind: 'question', ...p.create(commonQuestionFields(q), q) }) as LocalQuestionNode));
            }}>
              {QUESTION_TYPE_PLUGINS.map((p) => <option key={p.type} value={p.type}>{p.name[env.uiLang] ?? p.name.fr}</option>)}
            </Select>
          </Field>
        </div>
        <Checkbox label={t('props.required')} checked={q.required === true} onChange={(e) => update({ required: e.target.checked || undefined })} />
        {q.required !== true && (
          <Field label={t('props.requiredWhen')}>
            <ExpressionInput value={typeof q.required === 'string' ? q.required : ''} onChange={(v) => update({ required: v || undefined }, 'requiredWhen')} />
          </Field>
        )}
        <Field label={t('props.default')} hint={t('props.defaultHint')}>
          <DefaultValueInput type={q.type} value={q.default} invalidText={t('props.defaultInvalid')} onChange={(v) => update({ default: v })} />
        </Field>
        <Field label={t('props.defaultExpr')} hint={t('props.defaultExprHint')}>
          <ExpressionInput value={q.defaultExpr ?? ''} onChange={(v) => update({ defaultExpr: v || undefined })} />
        </Field>
        <Field label={t('props.help')}>
          <LabelEditor value={q.help} onChange={(help) => update({ help })} />
        </Field>
        {q.type !== 'boolean' && q.type !== 'tristate' && (
          <Field label={t('props.placeholder')}>
            <LabelEditor value={q.placeholder} onChange={(placeholder) => update({ placeholder })} />
          </Field>
        )}
      </Section>
      {plugin && (
        <Section title={plugin.name[env.uiLang] ?? plugin.name.fr}>
          <plugin.Properties question={q} update={(patch) => update(patch)} env={env} />
        </Section>
      )}
      <Section title={t('props.constraints')} actions={
        <Button size="sm" variant="ghost" onClick={() => update({ constraints: [...(q.constraints ?? []), { rule: '' }] })}><Plus className="size-3" />{t('props.addConstraint')}</Button>
      }>
        {(q.constraints ?? []).map((c, i) => (
          <div key={i} className="space-y-1 rounded-md border border-slate-100 p-2">
            <div className="flex items-center gap-1">
              <ExpressionInput className="flex-1" placeholder={t('props.rule')} value={c.rule}
                onChange={(rule) => update({ constraints: q.constraints!.map((x, j) => (j === i ? { ...x, rule } : x)) }, `constraint${i}`)} />
              <Button size="sm" variant="ghost" aria-label={t('props.delete')} onClick={() => update({ constraints: q.constraints!.filter((_, j) => j !== i) })}><X className="size-3" /></Button>
            </div>
            <LocalizedTextInput languages={env.languages} activeLang={env.contentLang} placeholder={t('props.message')} value={c.message}
              onChange={(m) => update({ constraints: q.constraints!.map((x, j) => (j === i ? { ...x, message: Object.keys(m).length ? m : undefined } : x)) }, `constraintMsg${i}`)} />
          </div>
        ))}
        {messageParams.map((p) => (
          <Field key={p} label={`${t('props.message')} — ${p}`}>
            <LocalizedTextInput languages={env.languages} activeLang={env.contentLang} value={q.messages?.[p]}
              onChange={(m) => {
                const messages = { ...(q.messages ?? {}) };
                if (Object.keys(m).length) messages[p] = m;
                else delete messages[p];
                update({ messages: Object.keys(messages).length ? messages : undefined }, `msg-${p}`);
              }} />
          </Field>
        ))}
      </Section>
      <Section title={t('props.description')}>
        <Textarea value={q.description ?? ''} onChange={(e) => update({ description: e.target.value || undefined })} />
      </Section>
    </>
  );
}
