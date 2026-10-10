import type { Questionnaire } from '../../core/model';
import { runCommand } from '../../app/commands';
import { questionnaireKeys, useEditorEnv, useT } from '../../app/store';
import { Field, LocalizedTextInput, Section, Textarea } from '../../ui-kit';
import { KeyInput } from './KeyInput';

/** Propriétés du questionnaire (rien n'est sélectionné) : titre multilingue, clé (nom du fichier), description. */
export function QuestionnaireProperties({ questionnaire: q }: { questionnaire: Questionnaire }) {
  const t = useT();
  const env = useEditorEnv();
  const file = env.ws.project.questionnaires.find((e) => e.id === q.id)?.file ?? `${q.key}.json`;
  return (
    <Section title={t('questionnaire.properties')}>
      <Field label={t('questionnaire.title')}>
        <LocalizedTextInput languages={env.languages} activeLang={env.contentLang} value={q.title}
          onChange={(title) => runCommand('questionnaire.setTitle', title)} />
      </Field>
      <Field label={t('questionnaire.key')} hint={t('questionnaire.keyHint', { file })} htmlFor="prop-questionnaire-key">
        <KeyInput id="prop-questionnaire-key" value={q.key} taken={questionnaireKeys(env.ws, q.id)} invalidText={t('questionnaire.keyInvalid')}
          onCommit={(key) => runCommand('questionnaire.rename', key)} />
      </Field>
      <Field label={t('props.description')}>
        <Textarea value={q.description ?? ''} onChange={(e) => runCommand('questionnaire.setDescription', e.target.value)} />
      </Field>
      <p className="text-xs text-slate-400">{t('props.empty')}</p>
    </Section>
  );
}
