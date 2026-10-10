import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import type { Edge, Graph } from '../../core/model';
import { previewText } from '../../plugin-api';
import { moveEdge, removeEdge, scopeOf, useEditorEnv, useStore, useT, type GraphRef } from '../../app/store';
import { questionOfNode } from '../../core/references';
import { Button, Field, Section, Select } from '../../ui-kit';
import { ExpressionInput } from '../expression-editor';
import { useGraphEdit } from './useGraphEdit';

/** Propriétés d'une arête : condition (vide = « sinon »), rang, sortie de bloc. */
export function EdgeProperties({ graph, g, edge }: { graph: GraphRef; g: Graph; edge: Edge }) {
  const t = useT();
  const env = useEditorEnv();
  const { edit, patchEdge } = useGraphEdit(graph);
  const focus = useStore((s) => s.focusRequest);
  const siblings = g.edges.filter((e) => e.from === edge.from);
  const rank = siblings.indexOf(edge) + 1;
  const name = (id: string) => {
    const n = g.nodes.find((x) => x.id === id);
    if (!n) return id;
    const q = questionOfNode(env.ws, n);
    return q ? `${previewText(q.label, env)} (${q.key})` : n.kind === 'block' ? n.alias : n.kind;
  };
  const from = g.nodes.find((n) => n.id === edge.from);
  const block = from?.kind === 'block' ? env.ws.library.blocks.find((b) => b.id === from.ref) : undefined;
  const exits = block?.nodes.flatMap((n) => (n.kind === 'exit' ? [n.name] : [])) ?? [];
  return (
    <Section title={t('props.edge')}>
      <div className="space-y-1 text-xs text-slate-500">
        <div>{t('props.from')} : <span className="text-slate-700">{name(edge.from)}</span></div>
        <div>{t('props.to')} : <span className="text-slate-700">{name(edge.to)}</span></div>
      </div>
      <Field label={t('props.condition')} hint={t('props.conditionHint', { rank, count: siblings.length })}>
        <ExpressionInput
          key={edge.id}
          autoFocus={focus?.kind === 'condition' && focus.id === edge.id}
          value={edge.when ?? ''}
          placeholder={t('edge.else')}
          onChange={(v) => patchEdge(edge.id, { when: v || undefined })}
          onSubmit={() => (document.querySelector('[data-graph-focus]') as HTMLElement | null)?.focus()}
        />
      </Field>
      {exits.length > 0 && (
        <Field label="exit">
          <Select value={edge.exit ?? ''} onChange={(e) => patchEdge(edge.id, { exit: e.target.value || undefined })}>
            <option value="">*</option>
            {exits.map((x) => <option key={x}>{x}</option>)}
          </Select>
        </Field>
      )}
      <div className="flex gap-1">
        <Button size="sm" disabled={rank === 1} onClick={() => edit(`${edge.id}:rank`, (ws) => moveEdge(ws, graph, edge.id, -1))}><ArrowUp className="size-3" />{t('edge.moveUp')}</Button>
        <Button size="sm" disabled={rank === siblings.length} onClick={() => edit(`${edge.id}:rank`, (ws) => moveEdge(ws, graph, edge.id, 1))}><ArrowDown className="size-3" />{t('edge.moveDown')}</Button>
        <Button size="sm" variant="danger" className="ml-auto" onClick={() => {
          useStore.getState().edit(scopeOf(graph), (ws) => removeEdge(ws, graph, edge.id));
          useStore.getState().select({ graph, nodes: [] });
        }}><Trash2 className="size-3" />{t('props.delete')}</Button>
      </div>
    </Section>
  );
}
