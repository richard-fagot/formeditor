import { useMemo, useState } from 'react';
import { checkWorkspace, describeIssue, type Issue } from '../../core/validation';
import { questionOfNode } from '../../core/references';
import { runCommand } from '../../app/commands';
import { getGraph, useStore, useT, type GraphRef } from '../../app/store';
import { Select } from '../../ui-kit';

/** Va à l'objet concerné : onglet du questionnaire (logigramme), du fragment ou de la bibliothèque, nœud sélectionné. */
function goTo(i: Issue) {
  const st = useStore.getState();
  const o = i.owner;
  let graph: GraphRef | undefined;
  if (o.kind === 'questionnaire') {
    runCommand('tab.show', `q:${o.id}`);
    if (useStore.getState().view[o.id] === 'preview') runCommand('view.toggle');
    graph = { kind: 'questionnaire', id: o.id };
  } else if (o.kind === 'fragment') {
    runCommand('library.show', { kind: 'fragment', id: o.id });
    graph = { kind: 'fragment', id: o.id };
  } else if (o.kind === 'libraryQuestion') {
    const isQuestion = st.ws.library.questions.some((q) => q.id === o.id);
    runCommand('library.show', isQuestion ? { kind: 'question', id: o.id } : undefined);
  }
  if (graph) useStore.getState().select({ graph, nodes: i.nodeId ? [i.nodeId] : [] });
}

/** Liste des textes non traduits dans toutes les langues du projet ; un clic mène à l'objet. */
export function TranslationsSection() {
  const t = useT();
  const ws = useStore((s) => s.ws);
  const uiLang = useStore((s) => s.uiLang);
  const lang = useStore((s) => s.contentLang);
  const [only, setOnly] = useState('');
  const issues = useMemo(() => checkWorkspace(ws).filter((i) => i.code === 'missingTranslation'), [ws]);
  const shown = only ? issues.filter((i) => i.params.lang?.split(', ').includes(only)) : issues;
  const ownerName = (i: Issue) => {
    const o = i.owner;
    const g = o.kind === 'questionnaire' || o.kind === 'fragment' ? getGraph(ws, { kind: o.kind, id: o.id }) : undefined;
    const title = g && 'title' in g ? (g.title as Record<string, string>) : undefined;
    const lib = o.kind === 'libraryQuestion' ? ws.library.questions.find((q) => q.id === o.id)?.key ?? ws.library.labelSets.find((l) => l.id === o.id)?.key : undefined;
    return `${t(`settings.owner.${o.kind}` as 'settings.owner.fragment')} · ${title?.[lang] ?? title?.[ws.project.defaultLanguage] ?? lib ?? o.id}`;
  };
  const nodeName = (i: Issue) => {
    const o = i.owner;
    if (!i.nodeId || (o.kind !== 'questionnaire' && o.kind !== 'fragment')) return '';
    const n = getGraph(ws, { kind: o.kind, id: o.id })?.nodes.find((x) => x.id === i.nodeId);
    return n ? questionOfNode(ws, n)?.key ?? n.kind : i.nodeId;
  };
  return (
    <section className="space-y-3" data-testid="settings-translations">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold text-slate-800">{t('settings.translations')}</h3>
        <span className="rounded-full bg-amber-100 px-2 text-xs text-amber-800">{shown.length}</span>
        <label className="ml-auto flex items-center gap-2 text-xs text-slate-500">
          {t('settings.missingFilter')}
          <Select className="h-7 w-24 py-0 text-xs" value={only} onChange={(e) => setOnly(e.target.value)}>
            <option value="">{t('settings.allLanguages')}</option>
            {ws.project.languages.map((l) => <option key={l}>{l}</option>)}
          </Select>
        </label>
      </div>
      {!shown.length && <p className="text-sm text-slate-400">{t('settings.noMissing')}</p>}
      {shown.length > 0 && (
        <ul className="max-h-[28rem] divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200 bg-white text-sm">
          {shown.map((i, k) => (
            <li key={k}>
              <button type="button" className="block w-full px-3 py-1.5 text-left hover:bg-slate-50" onClick={() => goTo(i)}>
                <span className="block truncate text-slate-700">{describeIssue(i, uiLang)}</span>
                <span className="block truncate text-xs text-slate-400">
                  {ownerName(i)}{nodeName(i) && <span className="font-mono"> · {nodeName(i)}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
