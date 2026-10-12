import { describe, expect, it } from 'vitest';
import { CompletionContext } from '@codemirror/autocomplete';
import { EditorState } from '@codemirror/state';
import type { Scope } from '../../core/references';
import { completeReferences } from './completion';
import { systemRefAt } from './hover';

const scope: Scope = new Map([
  ['nom', { path: 'nom', kind: 'answer', type: 'text' }],
  ['sys', { path: 'sys', kind: 'system' }],
  ['sys.prf', { path: 'sys.prf', kind: 'system', type: 'enum', values: ['UD', 'AD'], caption: 'Profil connecté', description: 'Profil de l’utilisateur.' }],
  ['sys.plafond', { path: 'sys.plafond', kind: 'system', type: 'number' }],
  ['sys.sinistres', { path: 'sys.sinistres', kind: 'system', type: 'list' }],
  ['sys.sinistres.nature', { path: 'sys.sinistres.nature', kind: 'system', type: 'text', caption: 'Nature du sinistre' }],
]);

function complete(doc: string, explicit = false) {
  const ctx = new CompletionContext(EditorState.create({ doc }), doc.length, explicit);
  const result = completeReferences(() => scope)(ctx);
  return result as (NonNullable<typeof result> & { options: { label: string; detail?: string; info?: unknown }[] }) | null;
}
const labels = (doc: string) => complete(doc)?.options.map((o) => o.label) ?? [];

describe('completeReferences (EVO-005 : libellés)', () => {
  it('propose toujours les clés par préfixe', () => {
    expect(labels('sys.p')).toEqual(['sys.prf', 'sys.plafond']);
  });
  it('recherche aussi dans le libellé, sans tenir compte de la casse ni des accents', () => {
    expect(labels('connecté')).toEqual(['sys.prf']);
    expect(labels('CONNECTE')).toEqual(['sys.prf']);
    expect(labels('profil')).toEqual(['sys.prf']);
  });
  it('clés correspondantes d’abord, puis libellés ; filtrage maison (pas de refiltrage par CodeMirror)', () => {
    const r = complete('nature')!;
    expect(r.filter).toBe(false);
    expect(r.options.map((o) => o.label)).toEqual(['sys.sinistres.nature']);
    expect(labels('n')[0]).toBe('nom');
  });
  it('le libellé est affiché dans le détail, à côté du type et des valeurs ; description en info', () => {
    const o = complete('sys.pr')!.options[0]!;
    expect(o.detail).toBe('Profil connecté · enum : UD | AD');
    expect(o.info).toBe('Profil de l’utilisateur.');
    expect(complete('sys.pl')!.options[0]!.detail).toBe('number');
  });
  it('libellé d’un champ de liste d’objets', () => {
    const o = complete('sys.sinistres.')!.options.find((x) => x.label === 'sys.sinistres.nature')!;
    expect(o.detail).toBe('Nature du sinistre · text');
  });
  it('le mot tapé est entièrement remplacé (début du mot accentué)', () => {
    expect(complete('x = connecté')!.from).toBe(4);
  });
});

describe('systemRefAt (survol)', () => {
  const text = 'sys.prf = "UD" and sys.sinistres.nature = nom';
  it('trouve la référence système sous le curseur, chemin complet jusqu’au segment survolé', () => {
    expect(systemRefAt(text, 6)).toEqual({ path: 'sys.prf', from: 0, to: 7 });
    expect(systemRefAt(text, 37)).toEqual({ path: 'sys.sinistres.nature', from: 19, to: 39 });
    expect(systemRefAt(text, 25)).toEqual({ path: 'sys.sinistres', from: 19, to: 32 });
    expect(systemRefAt(text, 1)).toEqual({ path: 'sys.prf', from: 0, to: 7 });
  });
  it('rien hors d’une référence système', () => {
    expect(systemRefAt(text, 11)).toBeUndefined();
    expect(systemRefAt(text, text.length - 1)).toBeUndefined();
  });
  it('rien dans une chaîne littérale, guillemets échappés compris', () => {
    const lit = 'x = "sys.profil" or y = \'a\\\' sys.profil\' or sys.profil';
    expect(systemRefAt(lit, 8)).toBeUndefined();
    expect(systemRefAt(lit, lit.indexOf("sys.profil'") + 2)).toBeUndefined();
    expect(systemRefAt(lit, lit.length - 2)).toEqual({ path: 'sys.profil', from: lit.length - 10, to: lit.length });
    expect(systemRefAt('`sys.profil` = 1', 3)).toBeUndefined();
    expect(systemRefAt('"a\nb" = sys.profil', 12)).toEqual({ path: 'sys.profil', from: 8, to: 18 }); // chaîne sur deux lignes
  });
});
