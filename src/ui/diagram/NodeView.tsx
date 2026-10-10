import { memo, useEffect, useRef, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { OTHER_TYPES, isLibraryQuestion, isVariantLabel, type GraphNode, type Label } from '../../core/model';
import { questionOfNode } from '../../core/references';
import { previewText } from '../../plugin-api';
import { nodeKind, questionType } from '../../registry';
import { getGraph, scopeOf, setQuestionLabel, useStore, useT } from '../../app/store';
import { usePluginEnv } from '../properties';
import { Badge, cn } from '../../ui-kit';
import { useDiagram } from './DiagramContext';

export type NodeData = { nodeId: string };

/** Nœud du logigramme : cadre, poignées, contenu délégué au plugin du type de nœud, édition en place. */
export const NodeView = memo(function NodeView({ data, selected }: NodeProps & { data: NodeData }) {
  const { graph, issuesByNode, readOnly } = useDiagram();
  const node = useStore((s) => getGraph(s.ws, graph)?.nodes.find((n) => n.id === data.nodeId));
  const isStart = useStore((s) => getGraph(s.ws, graph)?.start === data.nodeId);
  const env = usePluginEnv();
  const t = useT();
  const focus = useStore((s) => s.focusRequest);
  const editing = !readOnly && focus?.kind === 'label' && focus.id === data.nodeId && node?.kind === 'question';
  if (!node) return null;
  const plugin = nodeKind(node.kind);
  const question = questionOfNode(env.ws, node);
  const issues = issuesByNode.get(node.id) ?? [];
  const badges = (
    <>
      {isStart && <Badge tone="indigo">{t('node.start')}</Badge>}
      {question?.required && <Badge tone="slate" title={typeof question.required === 'string' ? question.required : undefined}>{typeof question.required === 'string' ? '* ?' : '*'}</Badge>}
      {question && OTHER_TYPES.includes(question.type) && 'other' in question && question.other && <Badge>{t('node.badgeOther')}</Badge>}
      {(isLibraryQuestion(node) || node.kind === 'block') && <Badge tone="amber" title={t('node.libraryBadge')}>bib.</Badge>}
      {issues.some((i) => i.code === 'missingTranslation') && <Badge tone="amber">trad.</Badge>}
      {issues.some((i) => i.code !== 'missingTranslation') && (
        <Badge tone={issues.some((i) => i.severity === 'error') ? 'rose' : 'amber'} title={issues.map((i) => i.code).join(', ')}>
          ⚠ {issues.length}
        </Badge>
      )}
    </>
  );
  const Shape = plugin.Shape;
  const block = node.kind === 'block' ? env.ws.library.blocks.find((b) => b.id === node.ref) : undefined;
  const exits = block?.nodes.flatMap((n) => (n.kind === 'exit' ? [n.name] : [])) ?? [];
  return (
    <div
      className={cn(
        'w-60 border px-3 py-2 text-sm shadow-sm transition-shadow',
        plugin.shapeClass,
        selected && 'ring-2 ring-indigo-500 ring-offset-1 shadow-md',
      )}
    >
      <Handle type="target" position={Position.Top} className="!size-2 !border-slate-400 !bg-white" />
      {editing && question ? (
        <InlineLabel node={node} label={question.label} lang={env.contentLang} />
      ) : (
        <Shape node={node} env={env} question={question} typePlugin={question ? questionType(question.type) : undefined} badges={badges} />
      )}
      {exits.length ? <ExitHandles exits={exits} /> : <Handle type="source" position={Position.Bottom} className="!size-2 !border-slate-400 !bg-white" />}
    </div>
  );
});

/** Une poignée par sortie nommée d'un bloc : la liaison tirée depuis une poignée porte le nom de la sortie. */
function ExitHandles({ exits }: { exits: string[] }) {
  return (
    <>
      <div className="mt-1 flex justify-around gap-1 font-mono text-[9px] text-amber-700">
        {exits.map((x) => <span key={x} className="truncate">{x}</span>)}
      </div>
      {exits.map((x, i) => (
        <Handle key={x} id={x} type="source" position={Position.Bottom} title={x}
          style={{ left: `${((i + 0.5) / exits.length) * 100}%` }} className="!size-2.5 !border-amber-500 !bg-amber-100" />
      ))}
    </>
  );
}

/** Édition en place de l'intitulé : Entrée valide, Échap annule ; la clé est dérivée automatiquement. */
function InlineLabel({ node, label, lang }: { node: GraphNode; label: Label; lang: string }) {
  const { graph } = useDiagram();
  const [text, setText] = useState(previewText(label, { contentLang: lang, defaultLang: lang }));
  const [initial] = useState(text);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    // React Flow peut reprendre le focus juste après le montage : on le redonne au champ.
    const id = setTimeout(() => ref.current?.focus(), 30);
    ref.current?.focus();
    return () => clearTimeout(id);
  }, []);
  const close = () => {
    useStore.getState().set((s) => void (s.focusRequest = undefined));
    (document.querySelector('[data-graph-focus]') as HTMLElement | null)?.focus();
  };
  const commit = () => {
    if (text !== initial && text.trim()) {
      const s = useStore.getState();
      const next: Label = isVariantLabel(label) ? { ...label, otherwise: { ...label.otherwise, [lang]: text } } : { ...label, [lang]: text };
      s.edit(scopeOf(graph), (ws) => setQuestionLabel(ws, graph, node.id, next, lang));
    }
    close();
  };
  return (
    <textarea
      ref={ref}
      rows={2}
      aria-label="intitulé"
      className="nodrag w-full resize-none rounded border border-indigo-300 px-1.5 py-1 font-semibold text-slate-800 outline-none"
      value={text}
      onFocus={(e) => e.target.select()}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          commit();
        }
        if (e.key === 'Escape') close();
      }}
    />
  );
}
