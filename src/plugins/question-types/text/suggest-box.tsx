import { useState, type KeyboardEvent, type ReactElement } from 'react';
import { filterSuggestions } from '../../../core/runtime';

/** Propriétés de combobox à poser sur la saisie (`input` ou `textarea`). */
export interface ComboProps {
  role: 'combobox';
  'aria-expanded': boolean;
  'aria-controls': string;
  'aria-autocomplete': 'list';
  'aria-activedescendant'?: string;
  onFocus(): void;
  onBlur(): void;
  onKeyDown(e: KeyboardEvent<HTMLElement>): void;
  onChange(e: { target: { value: string } }): void;
}

interface Props {
  /** Suggestions déjà calculées (liste de textes sans doublon). */
  list: string[];
  /** Texte saisi. */
  value: string;
  id: string;
  /** Nouveau texte (frappe ou suggestion choisie). */
  onChange(text: string): void;
  /** Rendu de la saisie avec les propriétés de combobox. */
  children(combo: ComboProps): ReactElement;
}

/**
 * Liste déroulante de suggestions (EVO-016) : ouverte à la prise de focus, filtrée à la frappe (contient, casse ignorée),
 * choix à la souris ou au clavier (flèches, Entrée ; Échap ferme). La saisie libre reste possible.
 */
export function SuggestBox({ list, value, id, onChange, children }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const shown = filterSuggestions(list, value);
  const visible = open && shown.length > 0;
  const listId = `${id}-suggestions`;
  const optionId = (i: number) => `${listId}-${i}`;

  const pick = (s: string) => {
    onChange(s);
    setOpen(false);
    setActive(-1);
  };
  const move = (step: number) => {
    setOpen(true);
    if (shown.length) setActive((a) => (a + step + shown.length + (a < 0 && step < 0 ? 1 : 0)) % shown.length);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      move(e.key === 'ArrowDown' ? 1 : -1);
    } else if (e.key === 'Enter' && visible && shown[active] !== undefined) {
      e.preventDefault();
      pick(shown[active]);
    } else if (e.key === 'Escape' && visible) {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      setActive(-1);
    }
  };

  const combo: ComboProps = {
    role: 'combobox',
    'aria-expanded': visible,
    'aria-controls': listId,
    'aria-autocomplete': 'list',
    ...(visible && shown[active] !== undefined ? { 'aria-activedescendant': optionId(active) } : {}),
    onFocus: () => setOpen(true),
    onBlur: () => {
      setOpen(false);
      setActive(-1);
    },
    onKeyDown,
    onChange: (e) => {
      setOpen(true);
      setActive(-1);
      onChange(e.target.value);
    },
  };

  return (
    <div className="relative">
      {children(combo)}
      {visible && (
        <ul id={listId} role="listbox" data-testid="suggestions"
          className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 text-sm shadow-lg">
          {shown.map((s, i) => (
            <li key={s} id={optionId(i)} role="option" aria-selected={i === active}
              className={`cursor-pointer px-2 py-1 ${i === active ? 'bg-sky-100' : 'hover:bg-slate-100'}`}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(s);
              }}>
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
