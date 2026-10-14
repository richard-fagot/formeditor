import type { LibraryQuestionNode } from '../../core/model';
import { previewText } from '../../plugin-api';
import { hiddenFieldUsages, hiddenUsageCaller, scopeOf, setFieldHidden, useStore, useT, type GraphRef } from '../../app/store';
import { Checkbox, Field } from '../../ui-kit';
import { usePluginEnv } from './usePluginEnv';

/**
 * Champs d'une instance de structure de bibliothèque (EVO-009) : case « affiché » par champ, dans l'ordre de la
 * bibliothèque ; le dernier champ affiché ne peut pas être décoché. Masquer un champ référencé avertit en listant
 * les expressions concernées (celles d'un appelant de fragment précédées du nom de cet appelant).
 */
export function HiddenFields({ graph, node }: { graph: GraphRef; node: LibraryQuestionNode }) {
  const t = useT();
  const env = usePluginEnv();
  const q = env.ws.library.questions.find((x) => x.id === node.ref);
  if (q?.type !== 'structure') return null;
  const hidden = new Set(node.hiddenFields ?? []);
  const shown = q.fields.filter((f) => !hidden.has(f.key)).length;
  const toggle = (key: string, show: boolean) => {
    const st = useStore.getState();
    const usages = show ? [] : hiddenFieldUsages(st.ws, graph, node.id, key);
    st.edit(scopeOf(graph), (ws) => void setFieldHidden(ws, graph, node.id, key, !show));
    if (usages.length) {
      const lines = usages.map((u) => {
        const caller = hiddenUsageCaller(st.ws, graph, u, env);
        const where = `${u.loc.nodeId ?? u.loc.edgeId ?? ''} · ${u.loc.property} : ${u.text}`;
        return caller ? `${t('hidden.caller', { name: caller })} · ${where}` : where;
      });
      st.set((s) => void (s.notice = { title: `${t('hidden.warning')} : ${q.key}.${key}`, lines }));
    }
  };
  return (
    <Field label={t('props.fields')} hint={t('props.fieldsHint')}>
      <ul className="space-y-1" data-testid="hidden-fields">
        {q.fields.map((f) => {
          const isShown = !hidden.has(f.key);
          return (
            <li key={f.id} className="flex items-center justify-between gap-2 text-sm">
              <span className={isShown ? 'text-slate-700' : 'text-slate-400 line-through'}>
                {previewText(f.label, env) || f.key} <span className="font-mono text-xs text-slate-400">{f.key}</span>
              </span>
              <Checkbox label={t('props.fieldShown')} aria-label={`${f.key} : ${t('props.fieldShown')}`} checked={isShown}
                disabled={isShown && shown <= 1} onChange={(e) => toggle(f.key, e.target.checked)} />
            </li>
          );
        })}
      </ul>
    </Field>
  );
}
