import { DONT_KNOW_LABEL, type DontKnowOption, type LocalizedText } from '../../core/model';
import { Checkbox, Field } from '../../ui-kit';
import { useExpressionEnv } from './context';
import { LabelEditor } from './LabelEditor';

const T = {
  dontKnow: { fr: 'Option « Ne sais pas »', en: '“Don’t know” option' },
  label: { fr: "Libellé de l'option", en: 'Option label' },
};

/**
 * Option « Ne sais pas » (EVO-006) : activation et libellé (multilingue, interpolable, à variantes, comme celui d'une
 * option). Partagé par les plugins de types de questions (sauf structure).
 */
export function DontKnowEditor({ value, onChange }: { value: DontKnowOption | undefined; onChange(v: DontKnowOption | undefined): void }) {
  const env = useExpressionEnv();
  const tr = (t: LocalizedText, lang = env.uiLang) => t[lang] ?? t.fr!;
  return (
    <div className="space-y-2" data-testid="dont-know-editor">
      <Checkbox label={tr(T.dontKnow)} checked={!!value} onChange={(e) => onChange(e.target.checked ? {} : undefined)} />
      {value && (
        <div className="border-l-2 border-slate-100 pl-3">
          <Field label={tr(T.label)}>
            <LabelEditor value={value.label} placeholder={tr(DONT_KNOW_LABEL, env.contentLang)}
              onChange={(label) => onChange({ ...value, label: label && Object.keys(label).length ? label : undefined })} />
          </Field>
        </div>
      )}
    </div>
  );
}
