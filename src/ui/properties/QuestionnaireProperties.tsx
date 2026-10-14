import { isValidated, type Questionnaire } from '../../core/model';
import { questionnaireFileName } from '../../format';
import { runCommand } from '../../app/commands';
import { questionnaireKeys, useEditorEnv, useT } from '../../app/store';
import { Badge, Field, Input, LocalizedTextInput, Section, Textarea } from '../../ui-kit';
import { KeyInput } from './KeyInput';

/**
 * Propriétés du questionnaire (rien n'est sélectionné) : titre multilingue, clé (nom du fichier exporté), version et
 * statut (EVO-022 ; version grisée tant qu'il est validé, par le `fieldset` du panneau), description.
 */
export function QuestionnaireProperties({ questionnaire: q }: { questionnaire: Questionnaire }) {
  const t = useT();
  const env = useEditorEnv();
  const file = questionnaireFileName(q);
  const validated = isValidated(q);
  return (
    <Section title={t('questionnaire.properties')}>
      <div className="flex items-end gap-3">
        <div className="flex-1" title={validated ? t('version.locked') : undefined} data-testid="version-field">
          <Field label={t('version.label')} htmlFor="prop-questionnaire-version">
            <Input id="prop-questionnaire-version" value={q.version ?? ''} placeholder="1.0.0"
              onChange={(e) => runCommand('questionnaire.setVersion', e.target.value)} />
          </Field>
        </div>
        <span className="pb-1.5" data-testid="version-status">
          <Badge tone={validated ? 'emerald' : 'slate'}>{validated ? t('version.final') : t('version.draft')}</Badge>
        </span>
      </div>
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
