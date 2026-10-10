import { useMemo } from 'react';
import { isLibraryQuestion, isLocalQuestion, type GraphNode } from '../../core/model';
import { blockScope, questionnaireScope } from '../../core/references';
import { nodeKind } from '../../registry';
import { getGraph, scopeOf, useEditorEnv, useStore, useT, type GraphRef } from '../../app/store';
import { Button, Field, Section } from '../../ui-kit';
import { ExpressionEnvProvider, LabelEditor } from '../expression-editor';
import { EdgeProperties } from './EdgeProperties';
import { QuestionProperties } from './QuestionProperties';
import { useGraphEdit } from './useGraphEdit';

/** Panneau de propriétés de l'objet sélectionné ; le contenu propre à chaque type vient des plugins. */
export function PropertiesPanel({ graph }: { graph: GraphRef }) {
  const t = useT();
  const env = useEditorEnv();
  const selection = useStore((s) => s.selection);
  const g = getGraph(env.ws, graph);
  const scope = useMemo(
    () => (graph.kind === 'questionnaire' ? questionnaireScope(env.ws, graph.id) : blockScope(env.ws, graph.id)),
    [env.ws, graph],
  );
  const node = selection.nodes.length === 1 ? g?.nodes.find((n) => n.id === selection.nodes[0]) : undefined;
  const edge = selection.edge ? g?.edges.find((e) => e.id === selection.edge) : undefined;
  return (
    <ExpressionEnvProvider value={{ scope, uiLang: env.uiLang, languages: env.languages, contentLang: env.contentLang }}>
      <div className="h-full overflow-y-auto pb-8" data-testid="properties">
        {node && <NodeProperties graph={graph} node={node} isStart={g?.start === node.id} />}
        {!node && edge && g && <EdgeProperties graph={graph} g={g} edge={edge} />}
        {!node && !edge && <p className="p-4 text-sm text-slate-400">{t('props.empty')}</p>}
      </div>
    </ExpressionEnvProvider>
  );
}

function NodeProperties({ graph, node, isStart }: { graph: GraphRef; node: GraphNode; isStart: boolean }) {
  const t = useT();
  const env = useEditorEnv();
  const { patchNode } = useGraphEdit(graph);
  const plugin = nodeKind(node.kind);
  return (
    <div key={node.id}>
      {isLocalQuestion(node) && <QuestionProperties graph={graph} node={node} />}
      {isLibraryQuestion(node) && (
        <Section title={t('props.question')}>
          <p className="text-xs text-amber-700">{t('props.library')}</p>
          <Field label={t('props.label')}>
            <LabelEditor value={node.label} onChange={(label) => patchNode(node.id, { label })} />
          </Field>
        </Section>
      )}
      {node.kind !== 'question' && plugin.Properties && (
        <Section title={plugin.name[env.uiLang] ?? plugin.name.fr}>
          <plugin.Properties node={node} env={env} update={(patch) => patchNode(node.id, patch)} />
        </Section>
      )}
      {!isStart && (
        <Section title={t('node.start')}>
          <Button size="sm" onClick={() => useStore.getState().edit(scopeOf(graph), (ws) => void (getGraph(ws, graph)!.start = node.id))}>
            {t('node.setStart')}
          </Button>
        </Section>
      )}
    </div>
  );
}

