import { useMemo } from 'react';
import { ExternalLink, RotateCcw } from 'lucide-react';
import { fragmentExits, type FragmentNode, type GraphNode, type LibraryQuestionNode } from '../../core/model';
import { fragmentScope, questionOfNode, renameKey, resolvePath } from '../../core/references';
import { expectedKeys } from '../../core/validation';
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

/** Appel de fragment : fragment référencé, alias (renommage propagé), sorties, clés attendues de l'appelant, ouverture. */
export function FragmentCallProperties({ graph, node }: { graph: GraphRef; node: FragmentNode }) {
  const t = useT();
  const env = usePluginEnv();
  const fragment = env.ws.library.fragments.find((f) => f.id === node.ref);
  const g = getGraph(env.ws, graph);
  const taken = g ? usedKeys(env.ws, g).filter((k) => k !== node.alias) : [];
  const exits = fragment ? fragmentExits(fragment) : [];
  const owner = graph.kind === 'questionnaire' ? { kind: 'questionnaire' as const, id: graph.id } : { kind: 'fragment' as const, id: graph.id };
  const expected = useMemo(() => {
    if (!fragment) return [];
    const scope = fragmentScope(env.ws, fragment.id, [graph]);
    return expectedKeys(env.ws, fragment.id).map((k) => ({ key: k, missing: !resolvePath(scope, k.split('.')) }));
  }, [env.ws, fragment, graph]);
  const rename = (alias: string) =>
    useStore.getState().edit(scopeOf(graph), (ws) => renameKey(ws, { kind: 'alias', owner, nodeId: node.id }, alias), `${node.id}:alias`);
  const exitName = (n: GraphNode) => {
    if (n.kind === 'exit') return `→ ${n.name}`;
    const q = questionOfNode(env.ws, n);
    return q ? q.key : n.kind === 'fragment' ? n.alias : n.kind;
  };
  return (
    <Section title={t('props.fragment')}>
      <div className="text-sm font-medium text-slate-700" data-testid="fragment-ref">
        {fragment ? (fragment.title[env.contentLang] ?? fragment.title[env.defaultLang] ?? fragment.key) : '?'}
        {fragment && <span className="ml-2 font-mono text-xs text-slate-400">{fragment.key}</span>}
      </div>
      <p className="text-xs text-amber-700">{t('props.fragmentLibrary')}</p>
      <Field label={t('props.alias')} hint={t('props.aliasHint')} htmlFor="prop-alias">
        <KeyInput id="prop-alias" value={node.alias} taken={taken} invalidText={t('props.keyInvalid')} onCommit={rename} />
      </Field>
      <Field label={t('props.fragmentExits')} hint={t('props.fragmentExitsHint')}>
        <div className="flex flex-wrap gap-1 font-mono text-xs" data-testid="fragment-exits">
          {exits.map((x) => <span key={x.id} className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-800">{exitName(x)}</span>)}
        </div>
      </Field>
      <Field label={t('props.expectedKeys')}>
        <ul className="space-y-0.5 font-mono text-xs" data-testid="fragment-expected">
          {!expected.length && <li className="font-sans text-slate-400">{t('props.expectedNone')}</li>}
          {expected.map((x) => (
            <li key={x.key} className={x.missing ? 'text-rose-700' : 'text-slate-600'}>
              {x.key}{x.missing && <span className="ml-1 font-sans">({t('props.expectedMissing')})</span>}
            </li>
          ))}
        </ul>
      </Field>
      <Button size="sm" onClick={() => runCommand('node.openFragment')}><ExternalLink className="size-3" />{t('node.openFragment')}</Button>
    </Section>
  );
}
