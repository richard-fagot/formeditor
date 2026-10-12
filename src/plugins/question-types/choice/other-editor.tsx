import type { OtherOption } from '../../../core/model';
import { tr, type EditorEnv } from '../../../plugin-api';
import { Checkbox, Field } from '../../../ui-kit';
import { LabelEditor } from '../../../ui/expression-editor';
import { OTHER_LABEL } from './selection';
const T = {
  other: { fr: 'Option « Autre (préciser) »', en: '“Other (specify)” option' },
  label: { fr: "Libellé de l'option", en: 'Option label' },
  detailRequired: { fr: 'Précision obligatoire', en: 'Detail required' },
};

/** Option « Autre (préciser) » : activation, libellé éditable, précision obligatoire ou facultative. */
export function OtherEditor({ other, onChange, env }: { other: OtherOption | undefined; onChange(o: OtherOption | undefined): void; env: EditorEnv }) {
  return (
    <div className="space-y-2">
      <Checkbox label={tr(T.other, env.uiLang)} checked={!!other} onChange={(e) => onChange(e.target.checked ? {} : undefined)} />
      {other && (
        <div className="space-y-2 border-l-2 border-slate-100 pl-3">
          <Field label={tr(T.label, env.uiLang)}>
            <LabelEditor value={other.label} placeholder={tr(OTHER_LABEL, env.contentLang)} onChange={(label) => onChange({ ...other, label: label && Object.keys(label).length ? label : undefined })} />
          </Field>
          <Checkbox label={tr(T.detailRequired, env.uiLang)} checked={!!other.detailRequired}
            onChange={(e) => onChange({ ...other, detailRequired: e.target.checked || undefined })} />
        </div>
      )}
    </div>
  );
}
