import { useEffect, useState } from 'react';
import { isChoiceGroup, type ChoiceEntry, type ChoiceGroup, type ChoiceItem } from '../../../core/model';
import { tr, type EditorEnv } from '../../../plugin-api';
import { Field, Textarea } from '../../../ui-kit';
import { duplicateEntry, linesOf, moveEntry, normalizeQuick, reconcile } from './entries';
import { EntryDetail } from './entry-detail';
import { GroupDetail } from './group-detail';

const T = {
  quick: { fr: 'Options (une par ligne)', en: 'Options (one per line)' },
  quickHint: {
    fr: 'Collage multi-lignes accepté. « # Libellé » : groupe ; « * » ou « - » : puce facultative ; « $référence » : entrée dynamique (ex. $sys.sinistres) ; « \\$ », « \\# », « \\* », « \\- » : option qui commence par ce caractère. Réglages : détail ci-dessous.',
    en: 'Multi-line paste accepted. “# Label”: group; “*” or “-”: optional bullet; “$reference”: dynamic entry (e.g. $sys.claims); “\\$”, “\\#”, “\\*”, “\\-”: option starting with that character. Settings: details below.',
  },
};

/** Une entrée n'échange sa place qu'avec une voisine du même genre (groupe, ou entrée hors groupe). */
const canSwap = (list: ChoiceEntry[], i: number, d: number) => !!list[i + d] && isChoiceGroup(list[i + d]!) === isChoiceGroup(list[i]!);

/**
 * Entrées d'un choix : saisie rapide (une par ligne, `# groupe`, `$référence` pour une entrée dynamique), puis
 * une ligne de paramétrage par entrée ; chaque groupe a la sienne juste avant celles de ses options.
 */
export function OptionsEditor({ options, onChange, env }: { options: ChoiceEntry[]; onChange(o: ChoiceEntry[]): void; env: EditorEnv }) {
  const joined = linesOf(options, env).join('\n');
  const [text, setText] = useState(joined);
  useEffect(() => setText((t) => (normalizeQuick(t) === joined ? t : joined)), [joined]);
  const setAt = (i: number, e: ChoiceEntry) => onChange(options.map((x, j) => (j === i ? e : x)));
  /** Ligne d'un élément de `list` (entrées hors groupe, ou options d'un groupe) ; `set` remplace la liste. */
  const item = <E extends ChoiceEntry>(list: E[], j: number, set: (l: E[]) => void) => (
    <EntryDetail key={j} entry={list[j] as ChoiceItem} env={env} first={!canSwap(list, j, -1)} last={!canSwap(list, j, 1)}
      onChange={(e) => set(list.map((x, k) => (k === j ? (e as E) : x)))}
      onMove={(d) => set(moveEntry(list, j, j + d))}
      onDuplicate={() => set(duplicateEntry(list, j))}
      onRemove={() => set(list.filter((_, k) => k !== j))} />
  );
  return (
    <div className="space-y-2">
      <Field label={tr(T.quick, env.uiLang)} hint={tr(T.quickHint, env.uiLang)}>
        <Textarea rows={Math.max(3, joined.split('\n').length + 1)} value={text} data-testid="options-quick"
          onChange={(e) => {
            setText(e.target.value);
            onChange(reconcile(e.target.value.split('\n'), options, env));
          }} />
      </Field>
      <div data-testid="option-entries" className="space-y-2">
        {options.map((o, i) => {
          if (!isChoiceGroup(o)) return item(options, i, onChange);
          const setGroup = (g: ChoiceGroup) => setAt(i, g);
          return (
            <div key={i} className="space-y-1" data-testid="option-group-block">
              <GroupDetail group={o} env={env} first={!canSwap(options, i, -1)} last={!canSwap(options, i, 1)}
                onChange={setGroup} onMove={(d) => onChange(moveEntry(options, i, i + d))}
                onRemove={() => onChange(options.filter((_, j) => j !== i))} />
              <div className="ml-3 space-y-1 border-l border-indigo-100 pl-2">
                {o.options.map((_, j) => item(o.options, j, (list) => setGroup({ ...o, options: list })))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
