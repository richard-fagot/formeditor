import type { LocalQuestionNode, Question } from '../../core/model';
import { renameKey } from '../../core/references';
import { commonQuestionFields } from '../../plugin-api';
import { QUESTION_TYPE_PLUGINS, questionType } from '../../registry';
import { getGraph, setQuestionLabel, updateNode, useT, usedKeys, type GraphRef } from '../../app/store';
import { Checkbox, Field, Section, Select, Textarea } from '../../ui-kit';
import { ConstraintsEditor, ExpressionInput, LabelEditor } from '../expression-editor';
import { messageParams } from '../../core/validation';
import { useGraphEdit } from './useGraphEdit';
import { usePluginEnv } from './usePluginEnv';
import { KeyInput } from './KeyInput';
import { DefaultValueInput } from './DefaultValueInput';

/** Propriétés d'une question locale : communes, puis propres au type (plugin), contraintes et messages. */
export function QuestionProperties({ graph, node }: { graph: GraphRef; node: LocalQuestionNode }) {
  const t = useT();
  const env = usePluginEnv();
  const { edit } = useGraphEdit(graph);
  const q = node as unknown as Question;
  const plugin = questionType(q.type);
  const update = (patch: Partial<Question>, field = Object.keys(patch).join()) =>
    edit(`${node.id}:${field}`, (ws) => updateNode(ws, graph, node.id, (n) => ({ ...n, ...patch }) as typeof n));
  const taken = usedKeys(env.ws, getGraph(env.ws, graph)!).filter((k) => k !== q.key);
  const owner = { kind: graph.kind, id: graph.id } as const;

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
        {(q.type === 'text' || q.type === 'number') && (
          <Field label={t('props.placeholder')}>
            <LabelEditor value={q.placeholder} onChange={(placeholder) => update({ placeholder })} />
          </Field>
        )}
      </Section>
      {plugin && (
        <Section title={plugin.name[env.uiLang] ?? plugin.name.fr}>
          <plugin.Properties question={q} update={(patch) => update(patch)} env={env}
            renameField={(fieldId, k) => edit(`${node.id}:${fieldId}:key`, (ws) => renameKey(ws, { kind: 'question', owner, nodeId: node.id, fieldId }, k))} />
        </Section>
      )}
      <Section title={t('props.constraints')}>
        <ConstraintsEditor value={q} params={messageParams(q)} onChange={(patch, field) => update(patch, field)} />
      </Section>
      <Section title={t('props.description')}>
        <Textarea value={q.description ?? ''} onChange={(e) => update({ description: e.target.value || undefined })} />
      </Section>
    </>
  );
}
