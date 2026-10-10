import { useEffect, useState } from 'react';
import type { ChoiceEntry } from '../../../core/model';
import { tr, type EditorEnv } from '../../../plugin-api';
import { Field, Textarea } from '../../../ui-kit';
import { duplicateEntry, lineOf, moveEntry, reconcile } from './entries';
import { EntryDetail } from './entry-detail';

const T = {
  quick: { fr: 'Options (une par ligne)', en: 'Options (one per line)' },
  quickHint: {
    fr: 'Collage multi-lignes accepté. « $référence » : entrée dynamique (ex. $sys.sinistres) ; « \\$ » : option qui commence par $. Réglages : détail ci-dessous.',
    en: 'Multi-line paste accepted. “$reference”: dynamic entry (e.g. $sys.claims); “\\$”: option starting with $. Settings: details below.',
  },
};

/**
 * Entrées d'un choix : saisie rapide (une par ligne, `$référence` pour une entrée dynamique), puis détail
 * de chaque entrée (réglages, monter / descendre, dupliquer, supprimer).
 */
export function OptionsEditor({ options, onChange, env }: { options: ChoiceEntry[]; onChange(o: ChoiceEntry[]): void; env: EditorEnv }) {
  const joined = options.map((o) => lineOf(o, env)).join('\n');
  const [text, setText] = useState(joined);
  useEffect(() => setText((t) => (t.split('\n').map((l) => l.trim()).filter(Boolean).join('\n') === joined ? t : joined)), [joined]);
  return (
    <div className="space-y-2">
      <Field label={tr(T.quick, env.uiLang)} hint={tr(T.quickHint, env.uiLang)}>
        <Textarea rows={Math.max(3, options.length + 1)} value={text} data-testid="options-quick"
          onChange={(e) => {
            setText(e.target.value);
            onChange(reconcile(e.target.value.split('\n'), options, env));
          }} />
      </Field>
      <div data-testid="option-entries" className="space-y-2">
        {options.map((o, i) => (
          <EntryDetail key={i} entry={o} env={env} first={i === 0} last={i === options.length - 1}
            onChange={(e) => onChange(options.map((x, j) => (j === i ? e : x)))}
            onMove={(d) => onChange(moveEntry(options, i, i + d))}
            onDuplicate={() => onChange(duplicateEntry(options, i))}
            onRemove={() => onChange(options.filter((_, j) => j !== i))} />
        ))}
      </div>
    </div>
  );
}
