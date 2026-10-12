import { OTHER_VALUE, UNKNOWN_VALUE, type LocalizedText, type TristateQuestion } from '../../../core/model';
import { dontKnowLabel, tr, previewText, type EditorEnv, type QuestionTypePlugin } from '../../../plugin-api';
import { Checkbox, Field, Input, Select } from '../../../ui-kit';
import { DontKnowEditor, LabelEditor } from '../../../ui/expression-editor';

const T = {
  name: { fr: 'Tri-state', en: 'Tri-state' },
  labelSet: { fr: 'Jeu de libellés', en: 'Label set' },
  defaultSet: { fr: 'Oui / Non / Ne sait pas (par défaut)', en: 'Yes / No / Don’t know (default)' },
  other: { fr: 'Option « Autre (préciser) »', en: '“Other (specify)” option' },
  otherLabel: { fr: "Libellé de l'option", en: 'Option label' },
  detailRequired: { fr: 'Précision obligatoire', en: 'Detail required' },
};
/** Valeur de l'option « Ne sais pas » dans la liste affichée (jamais enregistrée : marqueur `<clé>_nsp`). */
const DONT_KNOW = Symbol('nsp');
/** Libellés par défaut, destinés à l'utilisateur final. */
const DEFAULTS = {
  yes: { fr: 'Oui', en: 'Yes' } as LocalizedText,
  no: { fr: 'Non', en: 'No' } as LocalizedText,
  unknown: { fr: 'Ne sait pas', en: 'Don’t know' } as LocalizedText,
};
const OTHER_LABEL: LocalizedText = { fr: 'Autre (préciser)', en: 'Other (specify)' };

function labels(q: TristateQuestion, ws: EditorEnv['ws']) {
  const set = ws.library.labelSets.find((l) => l.id === q.labelSet);
  return set ? { yes: set.yes, no: set.no, unknown: set.unknown ?? DEFAULTS.unknown } : DEFAULTS;
}

/** Type « tri-state » : `true` / `false` / `"unknown"`, libellés d'un jeu de la bibliothèque ; option « Autre ». */
export const tristateType: QuestionTypePlugin<TristateQuestion> = {
  type: 'tristate',
  name: T.name,
  shortcut: '3',
  create: (base, previous) => ({
    ...base,
    type: 'tristate',
    ...(previous && 'other' in previous && previous.other ? { other: previous.other } : {}),
  }),
  Preview: ({ question, env }) => {
    const l = labels(question, env.ws);
    const parts = [l.yes, l.no, l.unknown].map((t) => previewText(t, env));
    if (question.other) parts.push(previewText(question.other.label ?? OTHER_LABEL, env));
    return (
      <span className="text-slate-500">
        {parts.join(' / ')}
        {question.dontKnow && <span className="italic"> / {previewText(dontKnowLabel(question), env)}</span>}
      </span>
    );
  },
  Properties: ({ question, update, env }) => (
    <div className="space-y-3">
      <Field label={tr(T.labelSet, env.uiLang)}>
        <Select value={question.labelSet ?? ''} onChange={(e) => update({ labelSet: e.target.value || undefined })}>
          <option value="">{tr(T.defaultSet, env.uiLang)}</option>
          {env.ws.library.labelSets.filter((l) => l.kind === 'tristate').map((l) => (
            <option key={l.id} value={l.id}>{[l.yes, l.no, l.unknown].map((t) => previewText(t, env)).join(' / ')}</option>
          ))}
        </Select>
      </Field>
      <Checkbox label={tr(T.other, env.uiLang)} checked={!!question.other} onChange={(e) => update({ other: e.target.checked ? {} : undefined })} />
      {question.other && (
        <div className="space-y-2 border-l-2 border-slate-100 pl-3">
          <Field label={tr(T.otherLabel, env.uiLang)}>
            <LabelEditor value={question.other.label} placeholder={tr(OTHER_LABEL, env.contentLang)}
              onChange={(label) => update({ other: { ...question.other, label: label && Object.keys(label).length ? label : undefined } })} />
          </Field>
          <Checkbox label={tr(T.detailRequired, env.uiLang)} checked={!!question.other.detailRequired}
            onChange={(e) => update({ other: { ...question.other, detailRequired: e.target.checked || undefined } })} />
        </div>
      )}
      <DontKnowEditor value={question.dontKnow} onChange={(dontKnow) => update({ dontKnow })} />
    </div>
  ),
  Field: ({ question, value, other, onChange, env, inputId, dontKnow, onDontKnow }) => {
    const l = labels(question, env.ws);
    const choices: [unknown, string][] = [[true, env.text(l.yes)], [false, env.text(l.no)], [UNKNOWN_VALUE, env.text(l.unknown)]];
    if (question.other) choices.push([OTHER_VALUE, env.label(question.other.label ?? OTHER_LABEL)]);
    // « Ne sais pas » : dernière option, après « Autre » (EVO-006).
    if (question.dontKnow) choices.push([DONT_KNOW, env.label(dontKnowLabel(question))]);
    return (
      <div role="radiogroup" id={inputId} className="space-y-2">
        {choices.map(([v, label]) => (
          <label key={typeof v === 'symbol' ? 'nsp' : String(v)} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 hover:border-indigo-300 has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50/50">
            <input type="radio" name={inputId} className="size-4 accent-indigo-600" checked={v === DONT_KNOW ? !!dontKnow : !dontKnow && value === v}
              onChange={() => (v === DONT_KNOW ? onDontKnow?.(true) : onChange(v, v === OTHER_VALUE ? other : undefined))} />
            <span className="text-slate-800">{label}</span>
          </label>
        ))}
        {value === OTHER_VALUE && <Input autoFocus aria-label={env.label(question.other?.label ?? OTHER_LABEL)} value={other ?? ''} onChange={(e) => onChange(OTHER_VALUE, e.target.value)} />}
      </div>
    );
  },
  formatAnswer: (q, value, env, other) => {
    const l = labels(q, env.ws);
    if (value === true) return env.text(l.yes);
    if (value === false) return env.text(l.no);
    if (value === UNKNOWN_VALUE) return env.text(l.unknown);
    if (value === OTHER_VALUE) return `${env.label(q.other?.label ?? OTHER_LABEL)} : ${other ?? ''}`;
    return '';
  },
  badges: (q) => (q.other ? ['other'] : []),
};
