import type { Label, LocalQuestionNode, Question, Workspace } from '../../core/model';
import { renameKey, type Owner } from '../../core/references';
import { commonQuestionFields } from '../../plugin-api';
import { QUESTION_TYPE_PLUGINS, questionType } from '../../registry';
import { getGraph, scopeOf, setQuestionLabel, updateNode, useStore, useT, usedKeys, type GraphRef, type Scope } from '../../app/store';
import { Checkbox, Field, Section, Select, Textarea } from '../../ui-kit';
import { ConstraintsEditor, ExpressionInput, LabelEditor } from '../expression-editor';
import { messageParams } from '../../core/validation';
import { usePluginEnv } from './usePluginEnv';
import { KeyInput } from './KeyInput';
import { DefaultValueInput } from './DefaultValueInput';

/** Question éditée : nœud d'un graphe ou question de la bibliothèque. */
export interface QuestionTarget {
  /** Historique où enregistrer les modifications. */
  scope: Scope;
  /** Propriétaire pour le renommage propagé, et id du nœud (ou de la question de bibliothèque). */
  owner: Owner;
  nodeId: string;
  /** Clés déjà prises (hors la question elle-même). */
  taken: string[];
  replace(ws: Workspace, f: (q: Question) => Question): void;
  setLabel(ws: Workspace, label: Label | undefined, lang: string): Workspace | void;
}

/** Propriétés d'une question locale d'un graphe. */
export function QuestionProperties({ graph, node }: { graph: GraphRef; node: LocalQuestionNode }) {
  const ws = useStore((s) => s.ws);
  const target: QuestionTarget = {
    scope: scopeOf(graph),
    owner: { kind: graph.kind, id: graph.id },
    nodeId: node.id,
    taken: usedKeys(ws, getGraph(ws, graph)!).filter((k) => k !== node.key),
    replace: (w, f) => updateNode(w, graph, node.id, (n) => ({ kind: 'question', ...f(n as unknown as Question) }) as LocalQuestionNode),
    setLabel: (w, label, lang) => setQuestionLabel(w, graph, node.id, label, lang),
  };
  return <QuestionEditor question={node as unknown as Question} target={target} />;
}

/** Propriétés d'une question : communes, puis propres au type (plugin), contraintes et messages. */
export function QuestionEditor({ question: q, target }: { question: Question; target: QuestionTarget }) {
  const t = useT();
  const env = usePluginEnv();
  const id = target.nodeId;
  const edit = (key: string, recipe: (ws: Workspace) => Workspace | void) => useStore.getState().edit(target.scope, recipe, key);
  const update = (patch: Partial<Question>, field = Object.keys(patch).join()) =>
    edit(`${id}:${field}`, (ws) => target.replace(ws, (x) => ({ ...x, ...patch }) as Question));
  const rename = (k: string, fieldId?: string) =>
    edit(`${id}:${fieldId ?? ''}:key`, (ws) => renameKey(ws, { kind: 'question', owner: target.owner, nodeId: id, fieldId }, k));

  return (
    <>
      <Section title={t('props.question')}>
        <Field label={t('props.label')} htmlFor="prop-label">
          <LabelEditor id="prop-label" value={q.label} onChange={(label) => edit(`${id}:label`, (ws) => target.setLabel(ws, label, env.contentLang))} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label={t('props.key')} hint={t('props.keyHint')} htmlFor="prop-key">
            <KeyInput id="prop-key" value={q.key} taken={target.taken} invalidText={t('props.keyInvalid')} onCommit={(k) => rename(k)} />
          </Field>
          <Field label={t('props.type')}>
            <Select value={q.type} onChange={(e) => {
              const p = questionType(e.target.value as Question['type'])!;
              edit(`${id}:type`, (ws) => target.replace(ws, (x) => p.create(commonQuestionFields(x), x)));
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
      <TypeSection question={q} update={update} rename={rename} />
      <Section title={t('props.constraints')}>
        <ConstraintsEditor value={q} params={messageParams(q)} onChange={(patch, field) => update(patch, field)} />
      </Section>
      <Section title={t('props.description')}>
        <Textarea value={q.description ?? ''} onChange={(e) => update({ description: e.target.value || undefined })} />
      </Section>
    </>
  );
}

function TypeSection({ question, update, rename }: {
  question: Question; update(patch: Partial<Question>): void; rename(key: string, fieldId: string): void;
}) {
  const env = usePluginEnv();
  const plugin = questionType(question.type);
  if (!plugin) return null;
  return (
    <Section title={plugin.name[env.uiLang] ?? plugin.name.fr}>
      <plugin.Properties question={question} update={(patch) => update(patch)} env={env} renameField={(fieldId, k) => rename(k, fieldId)} />
    </Section>
  );
}
