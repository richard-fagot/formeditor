import { describe, expect, it } from 'vitest';
import {
  alwaysBefore, isJustBeforeEnd, redirectButtonError, redirectTargets, retargetButtons, targetFromValue, targetName, targetValue, upstreamNodes,
  type GraphNode, type Questionnaire, type RedirectNode, type Workspace,
} from './index';

const q = (id: string, key: string): GraphNode => ({ kind: 'question', id, key, label: { fr: key }, type: 'text' }) as GraphNode;
const redirect = (id: string, buttons: RedirectNode['buttons'] = []): RedirectNode => ({ kind: 'redirect', id, text: { fr: 'Renvoi' }, buttons });

/**
 * q1 : n0 (a) ─si→ n1 (info) → n2 (appel `ident` du fragment f : f1 → f2) → n3 (Renvoi) → n4 (fin) ; n0 ─sinon→ n2 ;
 * n3 → n5 (b, en aval). q2 : autre questionnaire.
 */
function workspace(): Workspace {
  const q1: Questionnaire = {
    formatVersion: 15, kind: 'questionnaire', id: 'q1', key: 'premier', title: { fr: 'Premier' }, start: 'n0',
    nodes: [q('n0', 'a'), { kind: 'info', id: 'n1', title: { fr: 'Info' }, text: { fr: 'texte' } }, { kind: 'fragment', id: 'n2', ref: 'f', alias: 'ident' },
      redirect('n3'), { kind: 'end', id: 'n4', message: { fr: 'Fin' } }, q('n5', 'b'), { kind: 'summary', id: 'n6' }],
    edges: [
      { id: 'e0', from: 'n0', to: 'n1', when: 'a = "x"' }, { id: 'e1', from: 'n0', to: 'n2' }, { id: 'e2', from: 'n1', to: 'n2' },
      { id: 'e3', from: 'n2', to: 'n3' }, { id: 'e4', from: 'n3', to: 'n4' }, { id: 'e5', from: 'n3', to: 'n5' }, { id: 'e6', from: 'n5', to: 'n4' },
    ],
  };
  const q2: Questionnaire = { formatVersion: 15, kind: 'questionnaire', id: 'q2', key: 'second', title: { fr: 'Second' }, start: '', nodes: [], edges: [] };
  return {
    project: { formatVersion: 15, kind: 'project', id: 'p', name: 'p', languages: ['fr'], defaultLanguage: 'fr', systemState: [], scenarios: [], questionnaires: [] },
    library: {
      formatVersion: 15, kind: 'library', questions: [], labelSets: [],
      fragments: [{ id: 'f', key: 'f', title: { fr: 'F' }, nodes: [q('f1', 'nom'), q('f2', 'prenom'), q('f3', 'age')], edges: [{ id: 'g1', from: 'f1', to: 'f2' }, { id: 'g2', from: 'f1', to: 'f3' }] }],
    },
    questionnaires: [q1, q2],
    layouts: [],
  };
}

describe('nœud Renvoi : cibles (EVO-024)', () => {
  it('EVO-024-007, EVO-024-008, EVO-024-009, EVO-024-010 — cibles autorisées : autres questionnaires, question, information ou synthèse en amont, questions des fragments appelés en amont, jamais le Renvoi', () => {
    const values = redirectTargets(workspace(), 'q1', 'n3', 'fr').map((c) => [c.value, c.name]);
    expect(values).toEqual([
      ['q:q2', 'Second'], ['n:n0', 'a'], ['n:n1', 'Info'], ['n:n2/f1', 'ident.nom'], ['n:n2/f2', 'ident.prenom'], ['n:n2/f3', 'ident.age'],
    ]);
  });

  it('EVO-024-009 — un Renvoi dans une boucle ne se propose pas lui-même ; un nœud en aval n’est pas proposé', () => {
    const ws = workspace();
    ws.questionnaires[0]!.edges.push({ id: 'e7', from: 'n5', to: 'n3' });
    expect(upstreamNodes(ws.questionnaires[0]!, 'n3').has('n3')).toBe(false);
    expect(upstreamNodes(ws.questionnaires[0]!, 'n3').has('n5')).toBe(true);
    expect(redirectTargets(workspace(), 'q1', 'n3', 'fr').some((c) => c.value === 'n:n5' || c.value === 'n:n3' || c.value === 'n:n6')).toBe(false);
  });

  it('EVO-024-011 — la cible est désignée par identifiant : renommer la question ou le questionnaire visé ne change pas la cible', () => {
    const ws = workspace();
    const b = { label: { fr: 'Corriger' }, target: { node: 'n0' } };
    const c = { label: { fr: 'Ailleurs' }, target: { questionnaire: 'q2', prefill: false, replace: false } };
    (ws.questionnaires[0]!.nodes[0] as { key: string }).key = 'renomme';
    ws.questionnaires[1]!.key = 'autre_cle';
    ws.questionnaires[1]!.title = { fr: 'Nouveau titre' };
    expect(targetName(ws, 'q1', b.target, 'fr')).toBe('renomme');
    expect(targetName(ws, 'q1', c.target, 'fr')).toBe('Nouveau titre');
    expect(redirectButtonError(ws, 'q1', b)).toBeUndefined();
    expect(redirectButtonError(ws, 'q1', c)).toBeUndefined();
  });

  it('EVO-024-012, EVO-024-013, EVO-024-014, EVO-024-015 — cible questionnaire : deux toggles désactivés ; cible nœud : aucun toggle', () => {
    expect(targetFromValue('q:q2')).toEqual({ questionnaire: 'q2', prefill: false, replace: false });
    expect(targetFromValue('n:n0')).toEqual({ node: 'n0' });
    expect(targetFromValue('')).toBeUndefined();
    expect(targetValue({ questionnaire: 'q2', prefill: true, replace: true })).toBe('q:q2');
    expect(targetValue({ node: 'n2/f1' })).toBe('n:n2/f1');
  });

  it('EVO-024-048, EVO-024-049 — juste avant une fin : au moins une arête, toutes vers une fin', () => {
    const g = workspace().questionnaires[0]!;
    expect(isJustBeforeEnd(g, 'n3')).toBe(false);
    expect(isJustBeforeEnd(g, 'n5')).toBe(true);
    expect(isJustBeforeEnd(g, 'n6')).toBe(false);
  });

  it('EVO-024-036 — cible parcourue sur tous les chemins : par dominance, question de fragment comprise', () => {
    const ws = workspace();
    const q1 = ws.questionnaires[0]!;
    expect(alwaysBefore(ws, q1, 'n3', 'n0')).toBe(true);
    expect(alwaysBefore(ws, q1, 'n3', 'n1')).toBe(false);
    expect(alwaysBefore(ws, q1, 'n3', 'n2/f1')).toBe(true);
    expect(alwaysBefore(ws, q1, 'n3', 'n2/f2')).toBe(false);
    expect(alwaysBefore(ws, q1, 'n3', 'n5')).toBe(false);
  });

  it('EVO-024-031, EVO-024-032, EVO-024-033 — bouton en erreur : libellé vide, cible vide, cible introuvable', () => {
    const ws = workspace();
    expect(redirectButtonError(ws, 'q1', { label: { fr: ' ' }, target: { node: 'n0' } })).toBe('noLabel');
    expect(redirectButtonError(ws, 'q1', { label: { fr: 'x' } })).toBe('noTarget');
    expect(redirectButtonError(ws, 'q1', { label: { fr: 'x' }, target: { node: 'absent' } })).toBe('targetMissing');
    expect(redirectButtonError(ws, 'q1', { label: { fr: 'x' }, target: { node: 'n2/absent' } })).toBe('targetMissing');
    expect(redirectButtonError(ws, 'q1', { label: { fr: 'x' }, target: { questionnaire: 'q9', prefill: false, replace: false } })).toBe('targetMissing');
    expect(redirectButtonError(ws, 'q1', { label: { en: 'x' }, target: { node: 'n2/f2' } })).toBeUndefined();
  });

  it('EVO-024-053, EVO-024-054 — repointage : chemin dont le premier nœud est copié, sinon cible conservée', () => {
    const r = redirect('n3', [
      { label: { fr: 'a' }, target: { node: 'n0' } }, { label: { fr: 'b' }, target: { node: 'n2/f1' } },
      { label: { fr: 'c' }, target: { node: 'n1' } }, { label: { fr: 'd' }, target: { questionnaire: 'q2', prefill: true, replace: false } },
    ]);
    const out = retargetButtons(r, new Map([['n0', 'x0'], ['n2', 'x2']]));
    expect(out.buttons.map((b) => b.target)).toEqual([{ node: 'x0' }, { node: 'x2/f1' }, { node: 'n1' }, { questionnaire: 'q2', prefill: true, replace: false }]);
  });
});
