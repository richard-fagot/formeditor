import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { itemUsers, versionAlerts, type GraphNode, type Questionnaire, type Workspace } from '../../core/model';
import { exportFiles, newWorkspace } from '../../format';
import { useStore } from '../store';
import { runCommand } from './index';

const st = () => useStore.getState();
const graph = (id: string, key: string, nodes: GraphNode[]): Questionnaire =>
  ({ formatVersion: 14, kind: 'questionnaire', id, key, title: { fr: key }, start: nodes[0]?.id ?? '', nodes, edges: [] });

/** `blessure` et `dc` utilisent la question de bibliothèque « Identité assuré » (`lq`) ; `dc` aussi le fragment `frg`. */
function workspace(): Workspace {
  const ws = newWorkspace('p', 'fr');
  ws.library.questions.push({ id: 'lq', key: 'identite', label: { fr: 'Identité assuré' }, type: 'text' });
  ws.library.fragments.push({ id: 'frg', key: 'frg', title: { fr: 'Fragment' }, nodes: [{ kind: 'info', id: 'i', text: { fr: 'x' } }], edges: [] });
  ws.questionnaires.push(
    graph('qb', 'blessure', [{ kind: 'question', id: 'n1', ref: 'lq' }]),
    graph('qd', 'dc', [{ kind: 'question', id: 'm1', ref: 'lq' }, { kind: 'fragment', id: 'm2', ref: 'frg', alias: 'f' }]),
  );
  ws.project.questionnaires.push({ id: 'qb', file: 'blessure.json' }, { id: 'qd', file: 'dc.json' });
  return ws;
}
const qn = (id: string) => st().ws.questionnaires.find((q) => q.id === id)!;
const lq = () => st().ws.library.questions[0]!;
const LQ = { kind: 'question', id: 'lq' } as const;
const show = (id: string) => runCommand('tab.show', `q:${id}`);
const closeNotice = () => st().set((s) => void (s.notice = undefined));
const setVersion = (v: string) => runCommand('questionnaire.setVersion', v);
const setItemVersion = (v: string) => runCommand('library.setVersion', { ...LQ, version: v });

describe('versionning (EVO-022)', () => {
  beforeEach(() => st().loadWorkspace(workspace()));
  afterEach(() => vi.unstubAllGlobals());

  describe('questionnaire', () => {
    beforeEach(() => show('qb'));

    it('« 1.0.5 » saisi sur un questionnaire provisoire est enregistré tel quel', () => {
      setVersion('1.0.5');
      expect(qn('qb').version).toBe('1.0.5');
    });

    it('validé : version non modifiable ; dévalidé : de nouveau modifiable', () => {
      setVersion('1.0.5');
      runCommand('questionnaire.validate');
      closeNotice();
      expect(qn('qb').status).toBe('validated');
      setVersion('1.0.6');
      expect(qn('qb').version).toBe('1.0.5');
      closeNotice();
      vi.stubGlobal('window', { confirm: () => true });
      runCommand('questionnaire.unvalidate');
      setVersion('1.0.6');
      expect(qn('qb').version).toBe('1.0.6');
    });

    it('dévalider puis revalider sans toucher à la version : version conservée, aucune erreur', () => {
      setVersion('1.0.5');
      runCommand('questionnaire.validate');
      closeNotice();
      vi.stubGlobal('window', { confirm: () => true });
      runCommand('questionnaire.unvalidate');
      runCommand('questionnaire.validate');
      expect(st().notice?.title).not.toBe('Validation impossible');
      expect([qn('qb').version, qn('qb').status]).toEqual(['1.0.5', 'validated']);
    });

    it('validation refusée avec un message si la version est vide', () => {
      runCommand('questionnaire.validate');
      expect(qn('qb').status).toBeUndefined();
      expect(st().notice).toEqual({ title: 'Validation impossible', lines: ['Saisissez une version pour « blessure » avant de le valider.'] });
    });

    it('valider un questionnaire qui utilise un élément provisoire : alerte non bloquante', () => {
      setVersion('1.0.5');
      runCommand('questionnaire.validate');
      expect(qn('qb').status).toBe('validated');
      expect(st().notice).toEqual({ title: 'Éléments de bibliothèque provisoires', lines: ['« Identité assuré » ((sans version)) n’est pas validé dans la bibliothèque.'] });
    });
  });

  describe('élément de bibliothèque', () => {
    it('« 2.1.0 » saisi sur un élément provisoire est enregistré tel quel', () => {
      setItemVersion('2.1.0');
      expect(lq().version).toBe('2.1.0');
    });

    it('validé : version non modifiable ; dévalidé : de nouveau modifiable', () => {
      setItemVersion('2.1.0');
      runCommand('library.validate', LQ);
      expect(lq().status).toBe('validated');
      setItemVersion('2.2.0');
      expect(lq().version).toBe('2.1.0');
      closeNotice();
      runCommand('library.unvalidate', LQ);
      setItemVersion('2.2.0');
      expect(lq().version).toBe('2.2.0');
    });

    it('dévalider puis revalider sans toucher à la version : version conservée, aucune erreur', () => {
      setItemVersion('2.1.0');
      runCommand('library.validate', LQ);
      runCommand('library.unvalidate', LQ);
      runCommand('library.validate', LQ);
      expect(st().notice).toBeUndefined();
      expect([lq().version, lq().status]).toEqual(['2.1.0', 'validated']);
    });

    it('validation refusée avec un message si la version est vide', () => {
      runCommand('library.validate', LQ);
      expect(lq().status).toBeUndefined();
      expect(st().notice).toEqual({ title: 'Validation impossible', lines: ['Saisissez une version pour « Identité assuré » avant de le valider.'] });
    });

    it('fragment affiché dans son onglet : commandes sans argument', () => {
      runCommand('library.show', { kind: 'fragment', id: 'frg' });
      runCommand('library.setVersion', { kind: 'fragment', id: 'frg', version: '1' });
      expect(runCommand('library.validate')).toBe(true);
      expect(st().ws.library.fragments[0]!.status).toBe('validated');
    });
  });

  it('changement de version d’un élément utilisé par un questionnaire validé : alerte, levée à la revalidation', () => {
    setItemVersion('2.1.0');
    runCommand('library.validate', LQ);
    show('qd');
    setVersion('1.0.4');
    runCommand('questionnaire.validate');
    closeNotice();
    expect(qn('qd').libraryVersions).toEqual({ lq: { version: '2.1.0', status: 'validated' }, frg: { version: '', status: 'draft' } });
    runCommand('library.unvalidate', LQ);
    setItemVersion('2.2.0');
    runCommand('library.validate', LQ);
    expect(versionAlerts(st().ws.library, qn('qd'))).toEqual([{ kind: 'question', id: 'lq', key: 'identite', from: '2.1.0', to: '2.2.0' }]);
    // Questionnaires qui utilisent l'élément (affichés sous sa version).
    expect(itemUsers(st().ws, LQ).map((q) => q.key)).toEqual(['blessure', 'dc']);
    vi.stubGlobal('window', { confirm: () => true });
    runCommand('questionnaire.unvalidate');
    runCommand('questionnaire.validate');
    expect(versionAlerts(st().ws.library, qn('qd'))).toEqual([]);
  });

  it('export : « blessure - 1.0.5 - provisoire.json » et « dc - 1.0.4 - final.json »', () => {
    show('qb');
    setVersion('1.0.5');
    show('qd');
    setVersion('1.0.4');
    runCommand('questionnaire.validate');
    const names = exportFiles(st().ws).map((f) => f.name);
    expect(names).toContain('blessure - 1.0.5 - provisoire.json');
    expect(names).toContain('dc - 1.0.4 - final.json');
  });
});
