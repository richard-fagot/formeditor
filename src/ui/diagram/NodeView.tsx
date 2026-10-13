import { memo, useEffect, useRef, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { OTHER_TYPES, activeOverrides, graphStart, isLibraryQuestion, isVariantLabel, type GraphNode, type Label } from '../../core/model';
import { questionOfNode } from '../../core/references';
import { previewText } from '../../plugin-api';
import { nodeKind, questionType } from '../../registry';
import { runCommand } from '../../app/commands';
import { commentKey, commentOf, getGraph, scopeOf, setQuestionLabel, useStore, useT } from '../../app/store';
import { MessageSquare } from 'lucide-react';
import { usePluginEnv } from '../properties';
import { Badge, cn } from '../../ui-kit';
import { useDiagram } from './DiagramContext';

export type NodeData = { nodeId: string };

/** Nœud du logigramme : cadre, poignées, contenu délégué au plugin du type de nœud, édition en place. */
export const NodeView = memo(function NodeView({ data, selected }: NodeProps & { data: NodeData }) {
  const { graph, issuesByNode, readOnly } = useDiagram();
  const node = useStore((s) => getGraph(s.ws, graph)?.nodes.find((n) => n.id === data.nodeId));
  // Départ d'un questionnaire, ou entrée (implicite ou réglée) d'un fragment.
  const isStart = useStore((s) => { const g = getGraph(s.ws, graph); return !!g && graphStart(g) === data.nodeId; });
  const env = usePluginEnv();
  const t = useT();
  const focus = useStore((s) => s.focusRequest);
  // Commentaire de révision (EVO-011) : icône sur la question, clic = afficher / masquer.
  const hasComment = useStore((s) => !readOnly && !!commentOf(s.ws, { host: graph, node: data.nodeId }));
  const commentShown = useStore((s) => s.shownComments.includes(commentKey({ host: graph, node: data.nodeId })));
  const editing = !readOnly && focus?.kind === 'label' && focus.id === data.nodeId && node?.kind === 'question';
  if (!node) return null;
  const plugin = nodeKind(node.kind);
  const question = questionOfNode(env.ws, node);
  const issues = issuesByNode.get(node.id) ?? [];
  // Instance de structure avec champs masqués (EVO-009) : « affichés / total ».
  const def = isLibraryQuestion(node) ? env.ws.library.questions.find((q) => q.id === node.ref) : undefined;
  const fieldsCount = def?.type === 'structure' && question?.type === 'structure' && question.fields.length < def.fields.length
    ? t('node.fieldsCount', { shown: question.fields.length, total: def.fields.length }) : undefined;
  const badges = (
    <>
      {isStart && <Badge tone="indigo">{t(graph.kind === 'fragment' ? 'node.entry' : 'node.start')}</Badge>}
      {question?.required && <Badge tone="slate" title={typeof question.required === 'string' ? question.required : undefined}>{typeof question.required === 'string' ? '* ?' : '*'}</Badge>}
      {((isLibraryQuestion(node) && node.required !== undefined) || (node.kind === 'fragment' && activeOverrides(env.ws, node) > 0)) && (
        <span data-testid="required-override"><Badge tone="amber" title={t('required.badgeTitle')}>{t('required.badge')}</Badge></span>
      )}
      {question && OTHER_TYPES.includes(question.type) && 'other' in question && question.other && <Badge>{t('node.badgeOther')}</Badge>}
      {(isLibraryQuestion(node) || node.kind === 'fragment') && (
        // EVO-013 : double-clic = ouvrir l'objet lié ; `nopan` écarte le zoom du fond, stopPropagation l'édition du nœud.
        <span data-testid="library-badge" className="nopan" title={t('node.libraryBadge')}
          onDoubleClick={(e) => { e.stopPropagation(); runCommand('library.openRef', { kind: node.kind, id: node.ref }); }}>
          <Badge tone="amber">bib.</Badge>
        </span>
      )}
      {fieldsCount && <Badge tone="amber">{fieldsCount}</Badge>}
      {hasComment && (
        <button type="button" data-testid="comment-icon" aria-pressed={commentShown} title={t('comment.toggle')} aria-label={t('comment.toggle')}
          className={cn('nodrag rounded border px-1 text-amber-700', commentShown ? 'border-amber-400 bg-amber-100' : 'border-amber-300 hover:bg-amber-100')}
          onClick={(e) => { e.stopPropagation(); runCommand('comment.toggle', { host: graph, node: node.id }); }}>
          <MessageSquare className="size-3" />
        </button>
      )}
      {node.kind === 'fragment' && !readOnly && (
        <button type="button" data-testid="fragment-open" title={t('node.openFragment')}
          className="nodrag rounded border border-amber-300 px-1 text-[10px] text-amber-800 hover:bg-amber-100"
          onClick={(e) => { e.stopPropagation(); runCommand('library.show', { kind: 'fragment', id: node.ref }); }}>
          {t('node.openFragment')} ↗
        </button>
      )}
      {issues.some((i) => i.code === 'missingTranslation') && <Badge tone="amber">trad.</Badge>}
      {issues.some((i) => i.code !== 'missingTranslation') && (
        <Badge tone={issues.some((i) => i.severity === 'error') ? 'rose' : 'amber'} title={issues.map((i) => i.code).join(', ')}>
          ⚠ {issues.length}
        </Badge>
      )}
    </>
  );
  const Shape = plugin.Shape;
  const fragment = node.kind === 'fragment' ? env.ws.library.fragments.find((f) => f.id === node.ref) : undefined;
  const exits = fragment?.nodes.flatMap((n) => (n.kind === 'exit' ? [n.name] : [])) ?? [];
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
      {node.kind === 'question' && (
        <>
          {/* Départs des branches vers le commentaire (EVO-011), invisibles et non reliables ; après la poignée par défaut (première = arêtes sans poignée). */}
          <Handle id="comment-left" type="source" position={Position.Left} isConnectable={false} className="!size-1 !min-h-0 !min-w-0 !border-0 !bg-transparent" />
          <Handle id="comment-right" type="source" position={Position.Right} isConnectable={false} className="!size-1 !min-h-0 !min-w-0 !border-0 !bg-transparent" />
        </>
      )}
    </div>
  );
});

/** Une poignée par sortie nommée d'un fragment : la liaison tirée depuis une poignée porte le nom de la sortie. */
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
