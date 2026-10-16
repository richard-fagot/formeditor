import { beforeEach, describe, expect, it } from 'vitest';
import type { GraphNode, Questionnaire, RedirectNode, Workspace } from '../../core/model';
import { infoKind } from '../../plugins/node-kinds/info';
import { NODE_KIND_PLUGINS, nodeKind } from '../../registry';
import { newWorkspace } from '../../format';
import { getGraph, useStore } from '../store';
import { command, runCommand } from './index';

const st = () => useStore.getState();
const q = (id: string, key: string): GraphNode => ({ kind: 'question', id, key, label: { fr: key }, type: 'text' }) as GraphNode;
const graph = (id: string, key: string, nodes: GraphNode[], edges: Questionnaire['edges'] = []): Questionnaire =>
  ({ formatVersion: 15, kind: 'questionnaire', id, key, title: { fr: key }, version: '1', start: nodes[0]?.id ?? '', nodes, edges });
const redirect = (): RedirectNode => ({
  kind: 'redirect', id: 'n2', title: { fr: 'Renvoi' }, text: { fr: 'Mauvais questionnaire' }, finishLabel: { fr: 'Fermer' },
  buttons: [
    { label: { fr: 'Corriger' }, target: { node: 'n1' }, when: 'proprio = "x"' },
    { label: { fr: 'Avant' }, target: { node: 'n0' } },
    { label: { fr: 'Déclarer' }, target: { questionnaire: 'qb', prefill: true, replace: false } },
  ],
});

/** `qa` : n0 → n1 (proprio) → n2 (Renvoi) → n3 (fin) ; `qb` : autre questionnaire ; fragment `frg`. */
function workspace(): Workspace {
  const ws = newWorkspace('p', 'fr');
  ws.questionnaires.push(
    graph('qa', 'rc', [q('n0', 'avant'), q('n1', 'proprio'), redirect(), { kind: 'end', id: 'n3', message: { fr: 'Fin' } }],
      [{ id: 'e0', from: 'n0', to: 'n1' }, { id: 'e1', from: 'n1', to: 'n2' }, { id: 'e2', from: 'n2', to: 'n3' }]),
    graph('qb', 'dommage', [q('m1', 'montant')]),
  );
  ws.library.fragments.push({ id: 'frg', key: 'f', title: { fr: 'F' }, nodes: [q('f1', 'nom')], edges: [] });
  ws.project.questionnaires.push({ id: 'qa', file: 'rc.json' }, { id: 'qb', file: 'dommage.json' });
  ws.layouts.push({ formatVersion: 15, kind: 'layout', graph: 'qa', nodes: { n0: { x: 0, y: 0 }, n1: { x: 0, y: 150 }, n2: { x: 0, y: 300 } } });
  return ws;
}
const A = { kind: 'questionnaire', id: 'qa' } as const;
const qOf = (id: string) => st().ws.questionnaires.find((x) => x.id === id)!;
const redirectsOf = (g: { nodes: GraphNode[] }) => g.nodes.filter((n): n is RedirectNode => n.kind === 'redirect');
const strip = (r: RedirectNode) => { const { id: _id, ...rest } = r; return rest; };

describe('nœud Renvoi : création, copie, historique (EVO-024)', () => {
  beforeEach(() => st().loadWorkspace(workspace()));

  it('EVO-024-001 — « Nouveau nœud Renvoi » (Alt+R) crée un nœud Renvoi chaîné après la sélection, comme les autres pages', () => {
    const cmd = command('node.newRedirect')!;
    expect(cmd.keys).toEqual(['Alt+r']);
    runCommand('tab.show', 'q:qa');
    st().select({ graph: A, nodes: ['n0'] });
    expect(runCommand('node.newRedirect')).toBe(true);
    const created = redirectsOf(qOf('qa')).find((n) => n.id !== 'n2')!;
    expect(created).toMatchObject({ kind: 'redirect', text: { fr: 'Texte de renvoi' }, buttons: [] });
    expect(qOf('qa').edges.some((e) => e.from === 'n0' && e.to === created.id)).toBe(true);
    expect(qOf('qa').edges.some((e) => e.from === created.id && e.to === 'n1')).toBe(true);
  });

  it('EVO-024-002 — la création d’un nœud Renvoi n’est pas proposée dans un fragment', () => {
    runCommand('library.show', { kind: 'fragment', id: 'frg' });
    expect(st().activeTab).toBe('f:frg');
    expect(command('node.newRedirect')!.enabled!()).toBe(false);
    runCommand('node.newRedirect');
    expect(getGraph(st().ws, { kind: 'fragment', id: 'frg' })!.nodes.map((n) => n.kind)).toEqual(['question']);
  });

  it('EVO-024-037, EVO-024-058 — forme propre au Renvoi ; le nœud information garde sa création et sa forme', () => {
    expect(nodeKind('redirect').shapeClass).not.toBe(nodeKind('info').shapeClass);
    expect(NODE_KIND_PLUGINS.map((p) => p.kind)).toEqual(['question', 'info', 'summary', 'end', 'fragment', 'exit', 'redirect']);
    expect(infoKind.create!('x')).toEqual({ kind: 'info', id: 'x', text: { fr: 'Texte d’information', en: 'Information text' } });
    expect(command('node.newInfo')!.keys).toEqual(['Alt+i']);
  });

  it('EVO-024-052, EVO-024-053 — copier-coller du Renvoi et de ses cibles : boutons copiés, cibles copiées repointées', () => {
    runCommand('tab.show', 'q:qa');
    st().select({ graph: A, nodes: ['n1', 'n2'] });
    runCommand('node.copy');
    runCommand('node.paste');
    const pasted = redirectsOf(qOf('qa')).find((n) => n.id !== 'n2')!;
    const copyOfN1 = qOf('qa').nodes.find((n) => n.kind === 'question' && n.id !== 'n1' && n.id !== 'n0')!;
    expect(pasted.buttons.map((b) => b.target)).toEqual([{ node: copyOfN1.id }, { node: 'n0' }, { questionnaire: 'qb', prefill: true, replace: false }]);
    expect(pasted.buttons.map((b) => b.label)).toEqual(redirect().buttons.map((b) => b.label));
    // Référence interne à la sélection réécrite comme toute expression collée (EVO-010) : `proprio` collé devient `proprio_2`.
    expect(pasted.buttons[0]!.when).toBe('proprio_2 = "x"');
    expect(pasted.finishLabel).toEqual({ fr: 'Fermer' });
  });

  it('EVO-024-054 — cible hors de la sélection copiée : le bouton collé garde la cible d’origine (autre questionnaire compris)', () => {
    runCommand('tab.show', 'q:qa');
    st().select({ graph: A, nodes: ['n2'] });
    runCommand('node.copy');
    runCommand('tab.show', 'q:qb');
    runCommand('node.paste');
    expect(strip(redirectsOf(qOf('qb'))[0]!)).toEqual(strip(redirect()));
  });

  it('EVO-024-002 — un nœud Renvoi collé dans un fragment est écarté et signalé', () => {
    runCommand('tab.show', 'q:qa');
    st().select({ graph: A, nodes: ['n1', 'n2'] });
    runCommand('node.copy');
    runCommand('library.show', { kind: 'fragment', id: 'frg' });
    runCommand('node.paste');
    expect(getGraph(st().ws, { kind: 'fragment', id: 'frg' })!.nodes.map((n) => n.kind)).toEqual(['question', 'question']);
    expect(st().notice?.lines.join(' ')).toContain('Le nœud Renvoi « Renvoi » n’est pas collé');
  });

  it('EVO-024-066, EVO-024-055 — dupliquer le questionnaire copie ses Renvoi et fait viser aux cibles nœud les nœuds de la copie', () => {
    runCommand('questionnaire.duplicate', 'qa');
    const copy = st().ws.questionnaires[1]!;
    const r = redirectsOf(copy)[0]!;
    const idOf = (key: string) => copy.nodes.find((n) => n.kind === 'question' && 'key' in n && n.key === key)!.id;
    expect(r.buttons.map((b) => b.target)).toEqual([{ node: idOf('proprio') }, { node: idOf('avant') }, { questionnaire: 'qb', prefill: true, replace: false }]);
    expect(r.buttons.map((b) => b.label)).toEqual(redirect().buttons.map((b) => b.label));
    expect(redirectsOf(qOf('qa'))[0]).toEqual(redirect());
  });

  it('EVO-024-061 — annuler / rétablir une modification des boutons, comme pour les autres nœuds', () => {
    st().edit('q:qa', (ws) => void (redirectsOf(ws.questionnaires[0]!)[0]!.buttons.reverse()));
    expect(redirectsOf(qOf('qa'))[0]!.buttons[0]!.label).toEqual({ fr: 'Déclarer' });
    st().undo('q:qa');
    expect(redirectsOf(qOf('qa'))[0]).toEqual(redirect());
    st().redo('q:qa');
    expect(redirectsOf(qOf('qa'))[0]!.buttons[0]!.label).toEqual({ fr: 'Déclarer' });
  });

  it('EVO-024-062 — questionnaire validé : ses nœuds Renvoi et leurs boutons ne sont plus modifiables', () => {
    runCommand('tab.show', 'q:qa');
    expect(runCommand('questionnaire.validate')).toBe(true);
    st().set((s) => void (s.notice = undefined));
    st().edit('q:qa', (ws) => void redirectsOf(ws.questionnaires[0]!)[0]!.buttons.pop());
    st().edit('q:qa', (ws) => void (redirectsOf(ws.questionnaires[0]!)[0]!.text = { fr: 'autre' }));
    expect(redirectsOf(qOf('qa'))[0]).toEqual(redirect());
    expect(st().notice?.lines[0]).toContain('« rc » est validé');
  });

  it('EVO-024-002 — l’extraction en fragment refuse une sélection contenant un nœud Renvoi', () => {
    runCommand('tab.show', 'q:qa');
    st().select({ graph: A, nodes: ['n1', 'n2'] });
    runCommand('node.group');
    expect(st().ws.library.fragments).toHaveLength(1);
    expect(st().notice?.lines.join(' ')).toContain('nœud Renvoi');
  });
});
