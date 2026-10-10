import { useMemo } from 'react';
import { isLibraryQuestion, isLocalQuestion, type GraphNode } from '../../core/model';
import { blockScope, questionnaireScope } from '../../core/references';
import { nodeKind } from '../../registry';
import { runCommand } from '../../app/commands';
import { getGraph, renameExit, scopeOf, useStore, useT, type GraphRef } from '../../app/store';
import { Button, Section } from '../../ui-kit';
import { ExpressionEnvProvider } from '../expression-editor';
import { EdgeProperties } from './EdgeProperties';
import { QuestionProperties } from './QuestionProperties';
import { QuestionnaireProperties } from './QuestionnaireProperties';
import { BlockInstanceProperties, LibraryQuestionProperties } from './ReferenceProperties';
import { useGraphEdit } from './useGraphEdit';
import { usePluginEnv } from './usePluginEnv';

/** Panneau de propriétés de l'objet sélectionné ; le contenu propre à chaque type vient des plugins. */
export function PropertiesPanel({ graph }: { graph: GraphRef }) {
  const t = useT();
  const env = usePluginEnv();
  const selection = useStore((s) => s.selection);
  const g = getGraph(env.ws, graph);
  const scope = useMemo(
    () => (graph.kind === 'questionnaire' ? questionnaireScope(env.ws, graph.id) : blockScope(env.ws, graph.id)),
    [env.ws, graph],
  );
  const node = selection.nodes.length === 1 ? g?.nodes.find((n) => n.id === selection.nodes[0]) : undefined;
  const edge = selection.edge ? g?.edges.find((e) => e.id === selection.edge) : undefined;
  const questionnaire = graph.kind === 'questionnaire' ? env.ws.questionnaires.find((q) => q.id === graph.id) : undefined;
  return (
    <ExpressionEnvProvider value={{ scope, uiLang: env.uiLang, languages: env.languages, contentLang: env.contentLang }}>
      <div className="h-full overflow-y-auto pb-8" data-testid="properties">
        {node && <NodeProperties graph={graph} node={node} isStart={g?.start === node.id} />}
        {!node && edge && g && <EdgeProperties graph={graph} g={g} edge={edge} />}
        {!node && !edge && questionnaire && <QuestionnaireProperties questionnaire={questionnaire} />}
        {!node && !edge && !questionnaire && <p className="p-4 text-sm text-slate-400">{t('props.empty')}</p>}
      </div>
    </ExpressionEnvProvider>
  );
}

function NodeProperties({ graph, node, isStart }: { graph: GraphRef; node: GraphNode; isStart: boolean }) {
  const t = useT();
  const env = usePluginEnv();
  const { patchNode } = useGraphEdit(graph);
  const plugin = nodeKind(node.kind);
  return (
    <div key={node.id}>
      {isLocalQuestion(node) && <QuestionProperties graph={graph} node={node} />}
      {isLibraryQuestion(node) && <LibraryQuestionProperties graph={graph} node={node} />}
      {node.kind === 'block' && <BlockInstanceProperties graph={graph} node={node} />}
      {node.kind !== 'question' && node.kind !== 'block' && plugin.Properties && (
        <Section title={plugin.name[env.uiLang] ?? plugin.name.fr}>
          <plugin.Properties node={node} env={env} update={(patch) => {
            // Renommer une sortie renomme aussi les arêtes des instances du bloc qui la visent.
            const name = (patch as { name?: string }).name;
            if (node.kind === 'exit' && name !== undefined && graph.kind === 'block') {
              useStore.getState().edit(scopeOf(graph), (ws) => renameExit(ws, graph.id, node.id, name), `${node.id}:name`);
            } else patchNode(node.id, patch);
          }} />
        </Section>
      )}
      {!isStart && (
        <Section title={t('node.start')}>
          <Button size="sm" onClick={() => runCommand('node.setStart')}>
            {t('node.setStart')}
          </Button>
        </Section>
      )}
    </div>
  );
}

