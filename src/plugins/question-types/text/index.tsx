import { ListFilter } from 'lucide-react';
import type { TextQuestion } from '../../../core/model';
import { referencedChoices, suggestionList } from '../../../core/runtime';
import { dontKnowLabel, previewText, tr, type QuestionTypePlugin, type RenderEnv } from '../../../plugin-api';
import { Checkbox, Field, Input, Textarea } from '../../../ui-kit';
import { DontKnowEditor, ExpressionInput } from '../../../ui/expression-editor';
import { SuggestBox } from './suggest-box';

const T = {
  name: { fr: 'Texte', en: 'Text' },
  short: { fr: '<texte>', en: '<text>' },
  long: { fr: '<texte long>', en: '<long text>' },
  multiline: { fr: 'Texte long (plusieurs lignes)', en: 'Long text (multi-line)' },
  minLength: { fr: 'Longueur min.', en: 'Min. length' },
  maxLength: { fr: 'Longueur max.', en: 'Max. length' },
  pattern: { fr: 'Motif (expression régulière)', en: 'Pattern (regular expression)' },
  suggestions: { fr: 'Suggestions', en: 'Suggestions' },
  suggestionsExpr: { fr: 'Expression des suggestions', en: 'Suggestions expression' },
  suggestionsHint: {
    fr: 'Liste de textes proposés à la saisie (réponse à choix multiple, liste de l’état du système…) ; saisie libre conservée.',
    en: 'List of texts offered while typing (multiple-choice answer, system state list…); free input still allowed.',
  },
  suggestionsBadge: { fr: 'Avec suggestions', en: 'With suggestions' },
};

/**
 * Suggestions (EVO-016) : la valeur d'une option d'un choix référencé est remplacée par son libellé dans la langue courante ;
 * choix cherché d'abord dans le graphe de la page, puis dans la bibliothèque.
 */
function suggestionsOf(expr: string, env: RenderEnv): string[] {
  const labels = new Map<string, string>();
  for (const q of referencedChoices(env.ws, expr, env.graph)) {
    for (const o of env.options(q)) if (!labels.has(o.value)) labels.set(o.value, typeof o.label === 'string' ? o.label : env.label(o.label));
  }
  return suggestionList(env.evaluate(expr), (v) => labels.get(v));
}

const num = (v: string) => (v === '' ? undefined : Math.max(0, Math.trunc(Number(v))));

/** Type « texte » : court ou long, longueur min/max, motif. */
export const textType: QuestionTypePlugin<TextQuestion> = {
  type: 'text',
  name: T.name,
  shortcut: 't',
  create: (base) => ({ ...base, type: 'text' }),
  Preview: ({ question, env }) => (
    <span className="font-mono text-slate-400">
      {tr(question.multiline ? T.long : T.short, env.uiLang)}
      {question.suggestions !== undefined && (
        <span data-testid="suggestions-indicator" role="img" title={tr(T.suggestionsBadge, env.uiLang)} aria-label={tr(T.suggestionsBadge, env.uiLang)}>
          <ListFilter className="ml-1 inline size-3 align-[-1px]" aria-hidden />
        </span>
      )}
      {question.dontKnow && <span className="font-sans italic"> + {previewText(dontKnowLabel(question), env)}</span>}
    </span>
  ),
  Properties: ({ question, update, env }) => (
    <div className="space-y-3">
      <Checkbox label={tr(T.multiline, env.uiLang)} checked={!!question.multiline} onChange={(e) => update({ multiline: e.target.checked || undefined })} />
      <div className="grid grid-cols-2 gap-2">
        <Field label={tr(T.minLength, env.uiLang)}>
          <Input type="number" min={0} value={question.minLength ?? ''} onChange={(e) => update({ minLength: num(e.target.value) })} />
        </Field>
        <Field label={tr(T.maxLength, env.uiLang)}>
          <Input type="number" min={0} value={question.maxLength ?? ''} onChange={(e) => update({ maxLength: num(e.target.value) })} />
        </Field>
      </div>
      <Field label={tr(T.pattern, env.uiLang)}>
        <Input className="font-mono" value={question.pattern ?? ''} onChange={(e) => update({ pattern: e.target.value || undefined })} />
      </Field>
      <Checkbox label={tr(T.suggestions, env.uiLang)} checked={question.suggestions !== undefined}
        onChange={(e) => update({ suggestions: e.target.checked ? '' : undefined })} />
      {question.suggestions !== undefined && (
        <div data-testid="suggestions-editor">
          <Field label={tr(T.suggestionsExpr, env.uiLang)} hint={tr(T.suggestionsHint, env.uiLang)}>
            <ExpressionInput value={question.suggestions} onChange={(v) => update({ suggestions: v })} />
          </Field>
        </div>
      )}
      <DontKnowEditor value={question.dontKnow} onChange={(dontKnow) => update({ dontKnow })} />
    </div>
  ),
  Field: ({ question, value, onChange, env, inputId, dontKnow, onDontKnow }) => {
    const props = {
      id: inputId,
      value: typeof value === 'string' ? value : '',
      placeholder: env.label(question.placeholder),
      maxLength: question.maxLength,
      disabled: !!dontKnow,
      onChange: (e: { target: { value: string } }) => onChange(e.target.value === '' ? null : e.target.value),
    };
    // Suggestions (EVO-016) : recalculées à chaque affichage avec les réponses courantes ; aucune → texte simple.
    const list = question.suggestions ? suggestionsOf(question.suggestions, env) : [];
    const input = (p: typeof props) => (question.multiline ? <Textarea rows={5} {...p} /> : <Input autoComplete="off" {...p} />);
    return (
      <div className="space-y-2">
        {list.length && !dontKnow ? (
          <SuggestBox list={list} value={props.value} id={inputId} onChange={(t) => onChange(t === '' ? null : t)}>
            {(combo) => input({ ...props, ...combo })}
          </SuggestBox>
        ) : (
          input(props)
        )}
        {question.dontKnow && (
          <Checkbox data-testid="dont-know" label={env.label(dontKnowLabel(question))} checked={!!dontKnow} onChange={(e) => onDontKnow?.(e.target.checked)} />
        )}
      </div>
    );
  },
  formatAnswer: (_q, value) => (value === null || value === undefined ? '' : String(value)),
};
