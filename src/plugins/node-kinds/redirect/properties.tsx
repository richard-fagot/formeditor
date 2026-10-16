import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { redirectTargets, targetFromValue, targetName, targetValue, type RedirectButton, type RedirectNode } from '../../../core/model';
import { tr, type EditorEnv, type NodePropertiesProps } from '../../../plugin-api';
import { Button, Checkbox, Field, Select } from '../../../ui-kit';
import { ExpressionInput, LabelEditor } from '../../../ui/expression-editor';
import { T } from './texts';

interface ButtonProps {
  b: RedirectButton;
  i: number;
  count: number;
  env: EditorEnv;
  graphId?: string;
  nodeId: string;
  set(b: RedirectButton): void;
  move(delta: number): void;
  remove(): void;
}

/** Cible : liste fermée des cibles autorisées (EVO-024-029, 030) ; une cible devenue invalide reste affichée. */
function TargetSelect({ b, i, env, graphId, nodeId, set }: Pick<ButtonProps, 'b' | 'i' | 'env' | 'graphId' | 'nodeId' | 'set'>) {
  const choices = graphId ? redirectTargets(env.ws, graphId, nodeId, env.contentLang) : [];
  const value = targetValue(b.target);
  const current = value && !choices.some((c) => c.value === value)
    ? `${(graphId && b.target && targetName(env.ws, graphId, b.target, env.contentLang)) || value.slice(2)} ${tr(T.unknown, env.uiLang)}` : undefined;
  const group = (kind: 'questionnaire' | 'node', label: string) => {
    const list = choices.filter((c) => c.kind === kind);
    return list.length ? <optgroup label={label}>{list.map((c) => <option key={c.value} value={c.value}>{c.name}</option>)}</optgroup> : null;
  };
  return (
    <Select data-testid={`redirect-target-${i}`} value={value}
      onChange={(e) => {
        const { target: _old, ...rest } = b;
        const target = targetFromValue(e.target.value);
        set(target ? { ...rest, target } : rest);
      }}>
      <option value="">{tr(T.noTarget, env.uiLang)}</option>
      {current && <option value={value}>{current}</option>}
      {group('questionnaire', tr(T.questionnaires, env.uiLang))}
      {group('node', tr(T.nodes, env.uiLang))}
    </Select>
  );
}

/** Un bouton : libellé, cible, toggles (cible questionnaire), condition d'affichage, ordre, suppression. */
function ButtonEditor(p: ButtonProps) {
  const { b, i, count, env, set } = p;
  const q = b.target && 'questionnaire' in b.target ? b.target : undefined;
  return (
    <div className="space-y-2 rounded-md border border-rose-200 bg-rose-50/40 p-2" data-testid="redirect-button-editor">
      <div className="flex items-center justify-between text-xs font-semibold text-rose-700">
        {tr(T.button, env.uiLang)} {i + 1}
        <span className="flex gap-1">
          <Button size="sm" variant="ghost" disabled={i === 0} title={tr(T.up, env.uiLang)} aria-label={tr(T.up, env.uiLang)} onClick={() => p.move(-1)}><ArrowUp className="size-3" /></Button>
          <Button size="sm" variant="ghost" disabled={i === count - 1} title={tr(T.down, env.uiLang)} aria-label={tr(T.down, env.uiLang)} onClick={() => p.move(1)}><ArrowDown className="size-3" /></Button>
          <Button size="sm" variant="ghost" title={tr(T.remove, env.uiLang)} aria-label={tr(T.remove, env.uiLang)} data-testid={`redirect-remove-${i}`} onClick={p.remove}><Trash2 className="size-3" /></Button>
        </span>
      </div>
      <Field label={tr(T.label, env.uiLang)}>
        <LabelEditor value={b.label} onChange={(label) => set({ ...b, label: label ?? {} })} />
      </Field>
      <Field label={tr(T.target, env.uiLang)}>
        <TargetSelect {...p} />
      </Field>
      {q && (
        <div className="flex flex-col gap-1">
          <Checkbox label={tr(T.prefill, env.uiLang)} checked={q.prefill} data-testid={`redirect-prefill-${i}`} onChange={(e) => set({ ...b, target: { ...q, prefill: e.target.checked } })} />
          <Checkbox label={tr(T.replace, env.uiLang)} checked={q.replace} data-testid={`redirect-replace-${i}`} onChange={(e) => set({ ...b, target: { ...q, replace: e.target.checked } })} />
        </div>
      )}
      <Field label={tr(T.when, env.uiLang)}>
        <ExpressionInput value={b.when ?? ''} onChange={(v) => {
          const { when: _w, ...rest } = b;
          set(v.trim() ? { ...rest, when: v } : rest);
        }} />
      </Field>
    </div>
  );
}

/** Propriétés d'un nœud Renvoi (EVO-024-022) : titre, texte, boutons, libellé du bouton Terminer. */
export function RedirectProperties({ node, update, env, graphId }: NodePropertiesProps<RedirectNode>) {
  const buttons = node.buttons;
  const setButtons = (next: RedirectButton[]) => update({ buttons: next });
  return (
    <div className="space-y-3">
      <Field label={tr(T.title, env.uiLang)}>
        <LabelEditor value={node.title} onChange={(title) => update({ title })} />
      </Field>
      <Field label={tr(T.text, env.uiLang)}>
        <LabelEditor multiline value={node.text} onChange={(text) => update({ text: text ?? {} })} />
      </Field>
      <div className="space-y-2" data-testid="redirect-buttons">
        <div className="text-xs font-medium text-slate-600">{tr(T.buttons, env.uiLang)}</div>
        {buttons.map((b, i) => (
          <ButtonEditor key={i} b={b} i={i} count={buttons.length} env={env} graphId={graphId} nodeId={node.id}
            set={(x) => setButtons(buttons.map((y, j) => (j === i ? x : y)))}
            move={(d) => {
              const next = [...buttons];
              [next[i], next[i + d]] = [next[i + d]!, next[i]!];
              setButtons(next);
            }}
            remove={() => setButtons(buttons.filter((_, j) => j !== i))} />
        ))}
        <Button size="sm" data-testid="redirect-add" onClick={() => setButtons([...buttons, { label: {} }])}>
          <Plus className="size-3" />{tr(T.add, env.uiLang)}
        </Button>
      </div>
      <Field label={tr(T.finish, env.uiLang)}>
        <LabelEditor value={node.finishLabel} onChange={(finishLabel) => update({ finishLabel })} />
        <p className="mt-1 text-xs text-slate-500">{tr(T.finishHelp, env.uiLang)}</p>
      </Field>
    </div>
  );
}
