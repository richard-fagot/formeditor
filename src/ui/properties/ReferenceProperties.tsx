import { ExternalLink, RotateCcw } from 'lucide-react';
import type { BlockNode, LibraryQuestionNode } from '../../core/model';
import { renameKey } from '../../core/references';
import { previewText } from '../../plugin-api';
import { runCommand } from '../../app/commands';
import { getGraph, scopeOf, useStore, useT, usedKeys, type GraphRef } from '../../app/store';
import { Button, Field, Section } from '../../ui-kit';
import { LabelEditor } from '../expression-editor';
import { KeyInput } from './KeyInput';
import { useGraphEdit } from './useGraphEdit';
import { usePluginEnv } from './usePluginEnv';

const open = () => runCommand('node.openInLibrary');

/** Question de bibliothèque référencée : seul l'intitulé est surchargeable localement (spec §3.8). */
export function LibraryQuestionProperties({ graph, node }: { graph: GraphRef; node: LibraryQuestionNode }) {
  const t = useT();
  const env = usePluginEnv();
  const { patchNode } = useGraphEdit(graph);
  const q = env.ws.library.questions.find((x) => x.id === node.ref);
  return (
    <Section title={t('props.question')}>
      <p className="text-xs text-amber-700">{t('props.library')}</p>
      {q && <div className="text-xs text-slate-500">{previewText(q.label, env)} · <span className="font-mono">{q.key}</span></div>}
      <Field label={t('props.label')} hint={node.label ? t('props.overridden') : undefined}>
        <LabelEditor value={node.label ?? q?.label} onChange={(label) => patchNode(node.id, { label })} />
      </Field>
      <div className="flex flex-wrap gap-1">
        {node.label && (
          <Button size="sm" onClick={() => patchNode(node.id, { label: undefined })}><RotateCcw className="size-3" />{t('props.resetLabel')}</Button>
        )}
        <Button size="sm" onClick={open}><ExternalLink className="size-3" />{t('node.openInLibrary')}</Button>
      </div>
    </Section>
  );
}

/** Instance de bloc : alias (renommage propagé dans le questionnaire), sorties, ouverture du bloc. */
export function BlockInstanceProperties({ graph, node }: { graph: GraphRef; node: BlockNode }) {
  const t = useT();
  const env = usePluginEnv();
  const block = env.ws.library.blocks.find((b) => b.id === node.ref);
  const g = getGraph(env.ws, graph);
  const taken = g ? usedKeys(env.ws, g).filter((k) => k !== node.alias) : [];
  const exits = block?.nodes.flatMap((n) => (n.kind === 'exit' ? [n.name] : [])) ?? [];
  const rename = (alias: string) =>
    useStore.getState().edit(scopeOf(graph), (ws) => renameKey(ws, { kind: 'alias', questionnaireId: graph.id, nodeId: node.id }, alias), `${node.id}:alias`);
  return (
    <Section title={t('props.block')}>
      <div className="text-sm font-medium text-slate-700">{block ? (block.title[env.contentLang] ?? block.title[env.defaultLang] ?? block.key) : '?'}</div>
      <Field label={t('props.alias')} hint={t('props.aliasHint')} htmlFor="prop-alias">
        <KeyInput id="prop-alias" value={node.alias} taken={taken} invalidText={t('props.keyInvalid')} onCommit={rename} />
      </Field>
      <Field label={t('props.exits')} hint={t('props.exitsHint')}>
        <div className="flex flex-wrap gap-1 font-mono text-xs">{exits.map((x) => <span key={x} className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-800">{x}</span>)}</div>
      </Field>
      <Button size="sm" onClick={open}><ExternalLink className="size-3" />{t('node.openInLibrary')}</Button>
    </Section>
  );
}
