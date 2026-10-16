import { useMemo } from 'react';
import { graphStart, isLibraryQuestion, isLocalQuestion, isValidated, type GraphNode } from '../../core/model';
import { fragmentScope, questionnaireScope } from '../../core/references';
import { nodeKind } from '../../registry';
import { runCommand } from '../../app/commands';
import { getGraph, renameExit, scopeOf, useStore, useT, type GraphRef } from '../../app/store';
import { Button, Section } from '../../ui-kit';
import { ExpressionEnvProvider } from '../expression-editor';
import { EdgeProperties } from './EdgeProperties';
import { QuestionProperties } from './QuestionProperties';
import { QuestionnaireProperties } from './QuestionnaireProperties';
import { FragmentCallProperties, LibraryQuestionProperties } from './ReferenceProperties';
import { useGraphEdit } from './useGraphEdit';
import { usePluginEnv } from './usePluginEnv';

/** Panneau de propriétés de l'objet sélectionné ; le contenu propre à chaque type vient des plugins. */
export function PropertiesPanel({ graph }: { graph: GraphRef }) {
  const t = useT();
  const env = usePluginEnv();
  const selection = useStore((s) => s.selection);
  const g = getGraph(env.ws, graph);
  const scope = useMemo(
    () => (graph.kind === 'questionnaire' ? questionnaireScope(env.ws, graph.id) : fragmentScope(env.ws, graph.id)),
    [env.ws, graph],
  );
  const node = selection.nodes.length === 1 ? g?.nodes.find((n) => n.id === selection.nodes[0]) : undefined;
  const edge = selection.edge ? g?.edges.find((e) => e.id === selection.edge) : undefined;
  const questionnaire = graph.kind === 'questionnaire' ? env.ws.questionnaires.find((q) => q.id === graph.id) : undefined;
  // Formulaire validé (EVO-015) : champs en lecture seule (le store refuse de toute façon la modification) ;
  // `key` remonte les saisies CodeMirror, configurées au montage.
  const locked = isValidated(questionnaire);
  return (
    <ExpressionEnvProvider value={{ scope, uiLang: env.uiLang, languages: env.languages, contentLang: env.contentLang, readOnly: locked }}>
      <div className="h-full overflow-y-auto pb-8" data-testid="properties">
        <fieldset key={String(locked)} disabled={locked} data-testid={locked ? 'properties-locked' : undefined} className="m-0 min-w-0 border-0 p-0">
          {node && <NodeProperties graph={graph} node={node} isStart={!!g && graphStart(g) === node.id} />}
          {!node && edge && g && <EdgeProperties graph={graph} g={g} edge={edge} />}
          {!node && !edge && questionnaire && <QuestionnaireProperties questionnaire={questionnaire} />}
          {!node && !edge && !questionnaire && <p className="p-4 text-sm text-slate-400">{t('props.empty')}</p>}
        </fieldset>
        {/* Hors du fieldset : un formulaire validé se supprime sans dévalidation (EVO-027-015). */}
        {!node && !edge && questionnaire && (
          <Section title={t('questionnaire.delete')}>
            <Button size="sm" data-testid="questionnaire-delete" onClick={() => runCommand('questionnaire.delete', questionnaire.id)}>{t('props.delete')}</Button>
          </Section>
        )}
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
      {isLocalQuestion(node) && (
        <Section title={t('tab.library')}>
          <Button size="sm" data-testid="copy-to-library" onClick={() => runCommand('node.toLibrary')}>{t('node.toLibrary')}</Button>
        </Section>
      )}
      {isLibraryQuestion(node) && <LibraryQuestionProperties graph={graph} node={node} />}
      {node.kind === 'fragment' && <FragmentCallProperties graph={graph} node={node} />}
      {node.kind !== 'question' && node.kind !== 'fragment' && plugin.Properties && (
        <Section title={plugin.name[env.uiLang] ?? plugin.name.fr}>
          <plugin.Properties node={node} env={env} graphId={graph.id} update={(patch) => {
            // Renommer une sortie renomme aussi les arêtes des appels du fragment qui la visent.
            const name = (patch as { name?: string }).name;
            if (node.kind === 'exit' && name !== undefined && graph.kind === 'fragment') {
              useStore.getState().edit(scopeOf(graph), (ws) => renameExit(ws, graph.id, node.id, name), `${node.id}:name`);
            } else patchNode(node.id, patch);
          }} />
        </Section>
      )}
      {graph.kind === 'questionnaire' && !isStart && (
        <Section title={t('node.start')}>
          <Button size="sm" onClick={() => runCommand('node.setStart')}>
            {t('node.setStart')}
          </Button>
        </Section>
      )}
      {graph.kind === 'fragment' && <EntrySection graph={graph} node={node} isEntry={isStart} />}
    </div>
  );
}


/** Entrée d'un fragment : réglée sur ce nœud, ou implicite (EVO-008). */
function EntrySection({ graph, node, isEntry }: { graph: GraphRef; node: GraphNode; isEntry: boolean }) {
  const t = useT();
  const explicit = useStore((s) => s.ws.library.fragments.find((f) => f.id === graph.id)?.entry === node.id);
  if (isEntry && !explicit) return null;
  return (
    <Section title={t('node.entry')}>
      {explicit && <p className="text-xs text-slate-500">{t('props.entryExplicit')}</p>}
      <Button size="sm" data-testid="set-entry" onClick={() => runCommand('node.setEntry')}>
        {t(explicit ? 'props.entryClear' : 'node.setEntry')}
      </Button>
    </Section>
  );
}
