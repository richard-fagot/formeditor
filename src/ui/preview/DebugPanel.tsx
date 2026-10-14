import { edgeTrace, resolveStep, type RuntimeInput, type Session } from '../../core/runtime';
import { tr } from '../../plugin-api';
import { nodeKind } from '../../registry';
import { useT } from '../../app/store';
import { Badge, cn } from '../../ui-kit';

/** Libellé court d'une étape : clé de la question (préfixée par les alias dans un fragment), sinon type de nœud. */
function stepName(input: RuntimeInput, id: string, uiLang: string): string {
  const step = resolveStep(input, id);
  if (!step) return id;
  if (step.answerPath) return step.answerPath.join('.');
  const kind = tr(nodeKind(step.node.kind).name, uiLang);
  return step.instances.length ? `${step.instances.map((i) => i.alias).join('.')} · ${kind}` : kind;
}

/** Débogage : chemin parcouru, conditions des arêtes sortantes de la page courante, valeurs courantes. */
export function DebugPanel({ input, session, uiLang }: { input: RuntimeInput; session: Session; uiLang: string }) {
  const t = useT();
  const current = session.history.at(-1)!;
  const trace = edgeTrace(input, session.answers, current);
  const step = resolveStep(input, current);
  // Arête d'un nœud fragment appelant (sortie du fragment, EVO-008) : cible dans le graphe de l'appelant.
  const target = (from: string, to: string) => stepName(input, from.slice(0, from.lastIndexOf('/') + 1) + to, uiLang);
  // Dans un fragment (EVO-008) : chemin des alias et nom du fragment le plus interne.
  const inFragment = step?.fragment && step.instances.length
    ? `${step.instances.map((i) => i.alias).join('.')} (${step.fragment.title[uiLang] ?? step.fragment.title[input.ws.project.defaultLanguage] ?? step.fragment.key})`
    : undefined;
  const h = 'text-[11px] font-semibold uppercase tracking-wider text-slate-400';
  return (
    <div className="space-y-4 text-xs" data-testid="debug-panel">
      {inFragment && (
        <p className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-amber-800" data-testid="debug-fragment">
          {t('preview.inFragment')} <span className="font-mono">{inFragment}</span>
        </p>
      )}
      <section className="space-y-1">
        <h4 className={h}>{t('preview.path')}</h4>
        <ol className="space-y-0.5 font-mono">
          {session.history.map((id, i) => (
            <li key={i} className={cn('truncate', i === session.history.length - 1 ? 'font-semibold text-indigo-700' : 'text-slate-600')}>
              {i + 1}. {stepName(input, id, uiLang)}
            </li>
          ))}
        </ol>
      </section>
      <section className="space-y-1">
        <h4 className={h}>{t('preview.conditions')}</h4>
        {!trace.length && <p className="text-slate-400">{t('preview.noCondition')}</p>}
        <ul className="space-y-1">
          {trace.map(({ edge, result, chosen, stepId }, i) => (
            <li key={`${stepId}|${edge.id}`} className={cn('rounded border px-2 py-1', chosen ? 'border-indigo-300 bg-indigo-50' : 'border-slate-100')} data-testid="debug-edge">
              {stepId !== trace[i - 1]?.stepId && stepId !== current && (
                <p className="text-slate-500" data-testid="debug-caller-edges">{t('preview.callerEdges')}</p>
              )}
              <div className="flex items-center gap-2">
                <span className="font-mono text-slate-700">→ {target(stepId, edge.to)}{edge.exit ? ` (${edge.exit})` : ''}</span>
                <span className="ml-auto">
                  {result === 'else' ? <Badge>{t('edge.else')}</Badge>
                    : result === 'error' ? <Badge tone="rose">{t('preview.error')}</Badge>
                    : <Badge tone={result ? 'emerald' : 'slate'}>{String(result)}</Badge>}
                </span>
              </div>
              {edge.when && <code className="block break-all text-slate-500">{edge.when}</code>}
            </li>
          ))}
        </ul>
      </section>
      <section className="space-y-1">
        <h4 className={h}>{t('preview.values')}</h4>
        <pre className="max-h-72 overflow-auto rounded bg-slate-50 p-2 font-mono text-[11px] text-slate-700">
          {JSON.stringify({ ...session.answers, sys: input.sys }, null, 2)}
        </pre>
      </section>
    </div>
  );
}
