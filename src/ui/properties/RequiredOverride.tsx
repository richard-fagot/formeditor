import { RotateCcw } from 'lucide-react';
import {
  fragmentQuestions, inheritedRequired, resolveRequired, type FragmentNode, type LibraryQuestionNode, type QuestionNode,
  type RequiredResolution, type Workspace,
} from '../../core/model';
import { questionOfNode } from '../../core/references';
import { previewText } from '../../plugin-api';
import { runCommand } from '../../app/commands';
import { scopeOf, setRequiredOverride, useStore, useT, type GraphRef } from '../../app/store';
import { Badge, Button, Field, Select } from '../../ui-kit';
import { usePluginEnv } from './usePluginEnv';

type T = ReturnType<typeof useT>;

const valueText = (t: T, v: RequiredResolution['value']) =>
  t(typeof v === 'string' ? 'required.when' : v ? 'required.yes' : 'required.no');

/** Provenance : bibliothèque, surcharge locale (niveau 0) ou fragment du niveau `holder` (appelé par `instances[holder-1]`). */
function originText(t: T, ws: Workspace, r: RequiredResolution, instances: readonly FragmentNode[]) {
  if (r.holder === 'library') return t('required.fromLibrary');
  if (r.holder === 0) return t('required.local');
  const f = ws.library.fragments.find((x) => x.id === instances[r.holder as number - 1]?.ref);
  return t('required.fromFragment', { name: f ? f.key : '?' });
}

/**
 * Sélecteur « Caractère obligatoire » d'une question utilisée (EVO-012) : « Hérité (valeur, provenance) », « Obligatoire »,
 * « Facultatif ». `instances` : appels depuis le graphe courant (l'appel sélectionné en tête) ; `path` : chemin dans cet appel.
 */
function RequiredSelect({ graph, nodeId, question, instances, path, label }: {
  graph: GraphRef; nodeId: string; question: QuestionNode; instances: FragmentNode[]; path?: string; label: string;
}) {
  const t = useT();
  const env = usePluginEnv();
  const own = path === undefined ? (question as LibraryQuestionNode).required : instances[0]?.requiredOverrides?.[path];
  const inherited = inheritedRequired(env.ws, question, instances);
  const effective = resolveRequired(env.ws, question, instances);
  const set = (v: string) => useStore.getState().edit(scopeOf(graph),
    (ws) => void setRequiredOverride(ws, graph, nodeId, v === '' ? undefined : v === 'true', path));
  return (
    <div className="space-y-0.5">
      <Select aria-label={label} data-testid="required-select" value={own === undefined ? '' : String(own)} onChange={(e) => set(e.target.value)}>
        <option value="">{t('required.inherited', { value: valueText(t, inherited.value), from: originText(t, env.ws, inherited, instances) })}</option>
        <option value="true">{t('required.yes')}</option>
        <option value="false">{t('required.no')}</option>
      </Select>
      <p className="text-xs text-slate-500" data-testid="required-effective">
        {t('required.effective', { value: valueText(t, effective.value), origin: originText(t, env.ws, effective, instances) })}
      </p>
    </div>
  );
}

const reset = () => runCommand('node.resetRequired');

/** Référence de bibliothèque (questionnaire ou fragment) : surcharge de son caractère obligatoire. */
export function LibraryRequired({ graph, node }: { graph: GraphRef; node: LibraryQuestionNode }) {
  const t = useT();
  return (
    <Field label={t('required.label')}>
      <RequiredSelect graph={graph} nodeId={node.id} question={node} instances={[]} label={t('required.label')} />
      {node.required !== undefined && (
        <Button size="sm" className="mt-1" onClick={reset}><RotateCcw className="size-3" />{t('node.resetRequired')}</Button>
      )}
    </Field>
  );
}

/** Appel de fragment : chaque question du fragment (fragments appelés compris) avec son sélecteur ; surchargées repérées. */
export function FragmentRequired({ graph, node }: { graph: GraphRef; node: FragmentNode }) {
  const t = useT();
  const env = usePluginEnv();
  const list = fragmentQuestions(env.ws, node.ref);
  return (
    <Field label={t('required.fragmentQuestions')}>
      <ul className="space-y-2" data-testid="fragment-required">
        {!list.length && <li className="text-xs text-slate-400">{t('required.none')}</li>}
        {list.map((fq) => {
          const q = questionOfNode(env.ws, fq.node);
          const keyPath = [node.alias, ...fq.instances.map((i) => i.alias), q?.key ?? '?'].join('.');
          const overridden = node.requiredOverrides?.[fq.path] !== undefined;
          return (
            <li key={fq.path} data-testid="fragment-required-item" data-path={fq.path} className="space-y-0.5">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate text-slate-700">{q ? previewText(q.label, env) || q.key : '?'} <span className="font-mono text-xs text-slate-400">{keyPath}</span></span>
                {overridden && <Badge tone="amber" title={t('required.badgeTitle')}>{t('required.overridden')}</Badge>}
              </div>
              <RequiredSelect graph={graph} nodeId={node.id} question={fq.node} instances={[node, ...fq.instances]} path={fq.path} label={`${keyPath} : ${t('required.label')}`} />
            </li>
          );
        })}
      </ul>
      {node.requiredOverrides && (
        <Button size="sm" className="mt-1" onClick={reset}><RotateCcw className="size-3" />{t('node.resetRequired')}</Button>
      )}
    </Field>
  );
}
