import { describe, expect, it } from 'vitest';
import { exampleWorkspace } from '../../../tests/reference/example';
import {
  addScenario, addVariable, blankWorkspace, deleteScenario, deleteVariable, renameVariable, setVariableType, valueError,
} from './index';

describe('dictionnaire de l’état du système', () => {
  it('ajoute des variables aux noms uniques, change leur type et les supprime des scénarios', () => {
    const ws = blankWorkspace();
    expect([addVariable(ws), addVariable(ws)]).toEqual(['variable', 'variable_2']);
    setVariableType(ws, 'variable', 'enum');
    expect(ws.project.systemState[0]).toEqual({ name: 'variable', type: 'enum', values: [] });
    setVariableType(ws, 'variable', 'list');
    expect(ws.project.systemState[0]).toEqual({ name: 'variable', type: 'list', fields: [], example: [] });
    const id = addScenario(ws, 'Mon scénario', { variable: [], variable_2: 'x' });
    deleteVariable(ws, 'variable');
    expect(ws.project.systemState.map((v) => v.name)).toEqual(['variable_2']);
    expect(ws.project.scenarios[0]).toMatchObject({ id, name: 'Mon scénario', values: { variable_2: 'x' } });
    deleteScenario(ws, id);
    expect(ws.project.scenarios).toEqual([]);
  });

  it('renomme une variable partout (expressions, scénarios) et refuse un nom invalide ou pris', () => {
    const ws = exampleWorkspace();
    const out = renameVariable(ws, 'contrat_actif', 'contrat_en_cours');
    expect(out.project.systemState.some((v) => v.name === 'contrat_en_cours')).toBe(true);
    expect(out.project.scenarios.every((s) => 'contrat_en_cours' in s.values && !('contrat_actif' in s.values))).toBe(true);
    expect(JSON.stringify(out.questionnaires)).not.toContain('sys.contrat_actif');
    expect(renameVariable(ws, 'contrat_actif', 'nom_assure')).toBe(ws);
    expect(renameVariable(ws, 'contrat_actif', 'Pas Valide')).toBe(ws);
  });

  it('nomme un nouveau scénario de façon unique', () => {
    const ws = exampleWorkspace();
    const name = ws.project.scenarios[0]!.name;
    const id = addScenario(ws, name, {});
    expect(ws.project.scenarios.find((s) => s.id === id)!.name).toBe(`${name} (2)`);
  });

  it('signale une valeur qui ne correspond pas au type déclaré', () => {
    const list = { name: 'l', type: 'list' as const, fields: [{ name: 'd', type: 'date' as const }] };
    expect(valueError({ name: 'n', type: 'number' }, 3)).toBeUndefined();
    expect(valueError({ name: 'n', type: 'number' }, '3')).toBe('number');
    expect(valueError({ name: 'd', type: 'date' }, '2026-13-01')).toBe('date');
    expect(valueError({ name: 'e', type: 'enum', values: ['a'] }, 'b')).toBe('enum');
    expect(valueError(list, [{ d: '2026-01-01' }])).toBeUndefined();
    expect(valueError(list, [{ d: 3 }])).toBe('d: date');
    expect(valueError(list, {})).toBe('list');
    expect(valueError({ name: 'b', type: 'boolean' }, undefined)).toBeUndefined();
  });
});
