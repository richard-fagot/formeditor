import { describe, expect, it } from 'vitest';
import { comboOf, formatKey, normalizeKey } from './index';

const ev = (key: string, mods: Partial<{ ctrlKey: boolean; metaKey: boolean; altKey: boolean; shiftKey: boolean }> = {}, code = '') =>
  ({ key, code, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...mods });

describe('raccourcis : saisie et affichage', () => {
  it('traduit une frappe en combinaison tinykeys', () => {
    expect(comboOf(ev('n'))).toBe('n');
    expect(comboOf(ev('N', { shiftKey: true }))).toBe('Shift+n');
    expect(comboOf(ev('z', { ctrlKey: true, shiftKey: true }))).toBe('$mod+Shift+z');
    expect(comboOf(ev('ˆ', { altKey: true }, 'KeyI'))).toBe('Alt+KeyI');
    expect(comboOf(ev(' '))).toBe('Space');
    expect(comboOf(ev('ArrowDown'))).toBe('ArrowDown');
    expect(comboOf(ev('Shift', { shiftKey: true }))).toBeUndefined();
  });
  it('affiche et compare les combinaisons', () => {
    expect(formatKey('Alt+KeyI')).toBe('Alt+I');
    expect(normalizeKey('Shift+N')).toBe(normalizeKey('shift+n'));
    expect(normalizeKey('Alt+KeyI')).toBe(normalizeKey('Alt+i'));
  });
});
