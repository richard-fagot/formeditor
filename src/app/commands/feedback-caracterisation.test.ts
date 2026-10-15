import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GraphNode, Questionnaire, Workspace } from '../../core/model';
import { newWorkspace } from '../../format';
import { useStore } from '../store';
import { runCommand } from './index';

/**
 * EVO-025 — tests de caractérisation de la gestion des erreurs (comportement figé avant refactoring).
 * Chaque refus / échec / information atteignable depuis le store ou les commandes : contenu exact de `notice`
 * (titre, lignes) en français et en anglais ; chaque confirmation : question posée et effet si acceptée / refusée.
 * Non atteignables hors interface : `ui/diagram/useImageExport.ts` (2 écritures) et `ui/properties/HiddenFields.tsx`
 * (1 écriture), logique interne de composants React.
 */

const st = () => useStore.getState();
const q = (id: string, key: string): GraphNode => ({ kind: 'question', id, key, label: { fr: key }, type: 'text' }) as GraphNode;
const graph = (id: string, key: string, nodes: GraphNode[], edges: Questionnaire['edges'] = [], extra: Partial<Questionnaire> = {}): Questionnaire =>
  ({ formatVersion: 14, kind: 'questionnaire', id, key, title: { fr: key }, start: nodes[0]?.id ?? '', nodes, edges, ...extra });

/**
 * `qa` (version 1.0, provisoire) : n1 date → n2 lieu (ref `lq`) → n3 fin, et n1 → n4 ; `qb` sans version ;
 * `qv` validé ; bibliothèque : `lq` provisoire sans version, `lv` validée, fragments `fa` et `fb` (appelle `fa`).
 * Commentaires sur `qa/n1`, sur `lq` et sur une question du fragment `fa`.
 */
function workspace(): Workspace {
  const ws = newWorkspace('p', 'fr');
  ws.library.questions.push(
    { id: 'lq', key: 'identite', label: { fr: 'Identité assuré' }, type: 'text' },
    { id: 'lv', key: 'date', label: { fr: 'Date' }, type: 'date', version: '2.0', status: 'validated' } as Workspace['library']['questions'][number],
  );
  ws.library.fragments.push(
    { id: 'fa', key: 'fa', title: { fr: 'Fragment A' }, nodes: [q('f1', 'nom')], edges: [] },
    { id: 'fb', key: 'fb', title: { fr: 'Fragment B' }, nodes: [{ kind: 'fragment', id: 'g1', ref: 'fa', alias: 'a' }], edges: [] },
  );
  ws.questionnaires.push(
    graph('qa', 'declaration', [q('n1', 'date'), { kind: 'question', id: 'n2', ref: 'lq' }, { kind: 'end', id: 'n3', message: { fr: 'Fin', en: 'End' } }, q('n4', 'autre')], [
      { id: 'e1', from: 'n1', to: 'n2', when: 'date != ""' }, { id: 'e2', from: 'n2', to: 'n3' }, { id: 'e3', from: 'n1', to: 'n4' },
    ], { title: { fr: 'Déclaration', en: 'Claim' }, version: '1.0' }),
    graph('qb', 'remboursement', [q('m1', 'montant')]),
    graph('qv', 'verrou', [q('v1', 'x')], [], { title: { fr: 'Verrouillé', en: 'Locked' }, version: '1.0', status: 'validated', validatedAt: '2026-01-01' }),
  );
  ws.project.questionnaires.push(...['qa', 'qb', 'qv'].map((id) => ({ id, file: `${id}.json` })));
  ws.layouts.push(
    { formatVersion: 14, kind: 'layout', graph: 'qa', nodes: { n1: { x: 0, y: 0 } }, comments: [{ node: 'n1', x: 300, y: 0, text: 'à revoir', replies: [] }] },
    { formatVersion: 14, kind: 'layout', graph: 'lq', nodes: {}, comments: [{ node: 'lq', text: 'à revoir', replies: [] }] },
    { formatVersion: 14, kind: 'layout', graph: 'fa', nodes: {}, comments: [{ node: 'f1', x: 300, y: 0, text: 'à revoir', replies: [] }] },
  );
  return ws;
}

const A = { kind: 'questionnaire', id: 'qa' } as const;
const setLang = (lang: string) => st().set((s) => void (s.uiLang = lang));
const notice = () => st().notice;

/** Simule `window.confirm` : renvoie `answer`, enregistre les questions posées. */
function stubConfirm(answer: boolean) {
  const asked: string[] = [];
  vi.stubGlobal('window', { confirm: (m: string) => (asked.push(m), answer) });
  return asked;
}

/** Simule le sélecteur de fichiers de `pickFiles` (app/commands/files.ts) : il « choisit » `files`. */
function stubPickFiles(files: { name: string; text: string }[]) {
  const input: Record<string, unknown> = {
    click: () => (input.onchange as () => void)(),
    files: files.map((f) => ({ name: f.name, text: async () => f.text })),
  };
  vi.stubGlobal('document', { createElement: () => input });
}
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  st().loadWorkspace(workspace());
  setLang('fr');
});
afterEach(() => {
  vi.unstubAllGlobals();
  setLang('fr');
});

describe('EVO-025 — notices (refus, échecs, informations)', () => {
  /** Chaque cas : action qui produit la notice, puis notice attendue en fr et en en. */
  const cases: { name: string; act: () => void | Promise<void>; fr: { title: string; lines: string[] }; en: { title: string; lines: string[] } }[] = [
    {
      name: 'store.ts refused() : modification d’un formulaire validé',
      act: () => st().edit('q:qv', (ws) => void (ws.questionnaires[2]!.key = 'autre')),
      fr: { title: 'Formulaire validé : modification impossible', lines: ['« Verrouillé » est validé, donc en lecture seule. Dévalidez-le pour le modifier.'] },
      en: { title: 'Validated form: change refused', lines: ['“Verrouillé” is validated, hence read-only. Unvalidate it to change it.'] },
    },
    {
      name: 'clipboard-commands report() : fin écartée au collage dans un fragment',
      act: () => {
        runCommand('tab.show', 'q:qa');
        st().select({ graph: A, nodes: ['n3'] });
        runCommand('node.copy');
        runCommand('tab.show', 'f:fa');
        runCommand('node.paste');
      },
      fr: { title: 'Collage : éléments écartés', lines: ['La fin « Fin » n’est pas collée : un fragment n’a pas de fin.'] },
      en: { title: 'Paste: items left out', lines: ['End "Fin" is not pasted: a fragment has no end.'] },
    },
    {
      name: 'project-commands importAction() : import impossible',
      act: async () => {
        stubPickFiles([{ name: 'x.json', text: '{ "kind": "inconnu" }' }]);
        runCommand('project.open');
        await flush();
      },
      fr: { title: 'Import impossible', lines: ['x.json Type de document inconnu (propriété "kind").'] },
      en: { title: 'Import failed', lines: ['x.json Type de document inconnu (propriété "kind").'] },
    },
    {
      name: 'version-commands : validation d’un questionnaire sans version',
      act: () => { runCommand('tab.show', 'q:qb'); runCommand('questionnaire.validate'); },
      fr: { title: 'Validation impossible', lines: ['Saisissez une version pour « remboursement » avant de le valider.'] },
      en: { title: 'Validation refused', lines: ['Enter a version for “remboursement” before validating it.'] },
    },
    {
      name: 'version-commands : questionnaire validé utilisant un élément provisoire',
      act: () => { runCommand('tab.show', 'q:qa'); runCommand('questionnaire.validate'); },
      fr: { title: 'Éléments de bibliothèque provisoires', lines: ['« Identité assuré » ((sans version)) n’est pas validé dans la bibliothèque.'] },
      en: { title: 'Draft library items', lines: ['“Identité assuré” ((no version)) is not validated in the library.'] },
    },
    {
      name: 'version-commands : version d’un élément validé non modifiable',
      act: () => void runCommand('library.setVersion', { kind: 'question', id: 'lv', version: '3.0' }),
      fr: { title: 'Désactiver la validation pour modifier la version', lines: ['Date'] },
      en: { title: 'Unvalidate to change the version', lines: ['Date'] },
    },
    {
      name: 'version-commands : validation d’un élément de bibliothèque sans version',
      act: () => void runCommand('library.validate', { kind: 'question', id: 'lq' }),
      fr: { title: 'Validation impossible', lines: ['Saisissez une version pour « Identité assuré » avant de le valider.'] },
      en: { title: 'Validation refused', lines: ['Enter a version for “Identité assuré” before validating it.'] },
    },
    {
      name: 'library-item-commands openRef() : lien rompu',
      act: () => void runCommand('library.openRef', { kind: 'question', id: 'absente' }),
      fr: { title: 'Objet de bibliothèque introuvable', lines: ['L’objet lié (« absente ») n’existe plus dans la bibliothèque : le lien est rompu.'] },
      en: { title: 'Library item not found', lines: ['The linked item ("absente") no longer exists in the library: the link is broken.'] },
    },
    {
      name: 'library-item-commands insertItem() : cycle d’appels',
      act: () => { runCommand('tab.show', 'f:fa'); runCommand('library.insertItem', { kind: 'fragment', id: 'fb' }); },
      fr: { title: 'Insertion refusée', lines: ['Le fragment « Fragment B » appelle déjà ce fragment (directement ou non) : l’insérer créerait un cycle d’appels.'] },
      en: { title: 'Insertion refused', lines: ['Fragment "Fragment B" already calls this fragment (directly or not): inserting it would create a call cycle.'] },
    },
    {
      name: 'library-item-commands copyQuestion() : références réécrites',
      act: () => {
        runCommand('tab.show', 'q:qa');
        st().select({ graph: A, nodes: ['n1'] });
        runCommand('node.toLibrary', { graph: A, nodeId: 'n1', key: 'date_sinistre' });
      },
      fr: { title: 'Copie faite : références réécrites', lines: ['e1 · when : date != "" → date_sinistre != ""'] },
      en: { title: 'Copied: references rewritten', lines: ['e1 · when : date != "" → date_sinistre != ""'] },
    },
    {
      name: 'library-item-commands node.group : sélection contenant une fin',
      act: () => { runCommand('tab.show', 'q:qa'); st().select({ graph: A, nodes: ['n2', 'n3'] }); runCommand('node.group'); },
      fr: { title: 'Extraction en fragment impossible', lines: ['La sélection contient une fin ou une sortie : un fragment n’en contient pas.'] },
      en: { title: 'Cannot extract into a fragment', lines: ['The selection contains an end or an exit: a fragment contains none.'] },
    },
    {
      name: 'library-item-commands node.group : plusieurs entrées',
      act: () => { runCommand('tab.show', 'q:qa'); st().select({ graph: A, nodes: ['n2', 'n4'] }); runCommand('node.group'); },
      fr: { title: 'Extraction en fragment impossible', lines: ['La sélection a plusieurs entrées (n2, autre) ; un fragment n’a qu’une entrée. Sélectionner des nœuds atteints par une seule entrée.'] },
      en: { title: 'Cannot extract into a fragment', lines: ['The selection has several entries (n2, autre); a fragment has a single entry. Select nodes reached through a single entry.'] },
    },
  ];

  for (const lang of ['fr', 'en'] as const) {
    for (const c of cases) {
      it(`${c.name} (${lang})`, async () => {
        setLang(lang);
        await c.act();
        expect(notice()).toEqual(c[lang]);
      });
    }
  }
});

describe('EVO-025 — un seul message à la fois', () => {
  it('le dernier message remplace le précédent', () => {
    runCommand('library.openRef', { kind: 'question', id: 'absente' });
    runCommand('library.validate', { kind: 'question', id: 'lq' });
    expect(notice()).toEqual({ title: 'Validation impossible', lines: ['Saisissez une version pour « Identité assuré » avant de le valider.'] });
  });
});

describe('EVO-025 — confirmations (window.confirm simulé)', () => {
  const qn = (id: string) => st().ws.questionnaires.find((x) => x.id === id)!;
  const QUESTIONS = {
    unvalidate: {
      fr: 'Dévalider le formulaire « Verrouillé » ? Il redeviendra modifiable et ne sera plus marqué livrable.',
      en: 'Unvalidate the form “Verrouillé”? It will become editable again and no longer be marked as deliverable.',
    },
    newProject: { fr: 'Des modifications ne sont pas exportées. Continuer ?', en: 'Some changes are not exported. Continue?' },
    deleteCommented: {
      fr: 'Une question sélectionnée porte un commentaire de révision : il sera supprimé avec elle. Continuer ?',
      en: 'A selected question has a review comment: it will be deleted with it. Continue?',
    },
    deleteFragment: {
      fr: 'Des questions de ce fragment portent des commentaires de révision : ils seront supprimés avec lui. Continuer ?',
      en: 'Some questions of this fragment have review comments: they will be deleted with it. Continue?',
    },
  };

  for (const lang of ['fr', 'en'] as const) {
    describe(lang, () => {
      beforeEach(() => setLang(lang));

      it('edit-commands questionnaire.unvalidate : refusée → reste validé ; acceptée → dévalidé', () => {
        runCommand('tab.show', 'q:qv');
        let asked = stubConfirm(false);
        runCommand('questionnaire.unvalidate');
        expect(asked).toEqual([QUESTIONS.unvalidate[lang]]);
        expect(qn('qv').status).toBe('validated');
        asked = stubConfirm(true);
        runCommand('questionnaire.unvalidate');
        expect(asked).toEqual([QUESTIONS.unvalidate[lang]]);
        expect(qn('qv').status).toBeUndefined();
      });

      it('project-commands confirmLoss : sans modification, pas de question ; sinon refusée → projet conservé, acceptée → remplacé', () => {
        let asked = stubConfirm(false);
        runCommand('project.new');
        expect(asked).toEqual([]);
        expect(st().ws.project.name).toBe('Nouveau projet');
        st().loadWorkspace(workspace());
        runCommand('project.rename', 'autre');
        expect(st().dirty).toBe(true);
        runCommand('project.example');
        expect(asked).toEqual([QUESTIONS.newProject[lang]]);
        expect(st().ws.project.name).toBe('autre');
        asked = stubConfirm(true);
        runCommand('project.new');
        expect(asked).toEqual([QUESTIONS.newProject[lang]]);
        expect(st().ws.project.name).toBe('Nouveau projet');
        expect(st().dirty).toBe(false);
      });

      it('project-commands importAction : projet importé sur des modifications non exportées → même confirmation', async () => {
        runCommand('project.rename', 'autre');
        const asked = stubConfirm(false);
        stubPickFiles([{ name: 'p.json', text: JSON.stringify(newWorkspace('importé', 'fr').project) }]);
        runCommand('project.open');
        await flush();
        expect(asked).toEqual([QUESTIONS.newProject[lang]]);
        expect(st().ws.project.name).toBe('autre');
      });

      it('graph-commands node.delete : question commentée, refusée → conservée ; acceptée → supprimée', () => {
        runCommand('tab.show', 'q:qa');
        st().select({ graph: A, nodes: ['n1'] });
        let asked = stubConfirm(false);
        runCommand('node.delete');
        expect(asked).toEqual([QUESTIONS.deleteCommented[lang]]);
        expect(qn('qa').nodes.some((n) => n.id === 'n1')).toBe(true);
        asked = stubConfirm(true);
        st().select({ graph: A, nodes: ['n1'] });
        runCommand('node.delete');
        expect(asked).toEqual([QUESTIONS.deleteCommented[lang]]);
        expect(qn('qa').nodes.some((n) => n.id === 'n1')).toBe(false);
      });

      it('graph-commands node.delete : question non commentée, aucune question posée', () => {
        runCommand('tab.show', 'q:qa');
        st().select({ graph: A, nodes: ['n4'] });
        const asked = stubConfirm(false);
        runCommand('node.delete');
        expect(asked).toEqual([]);
        expect(qn('qa').nodes.some((n) => n.id === 'n4')).toBe(false);
      });

      it('library-item-commands library.delete : question commentée, refusée → conservée ; acceptée → supprimée', () => {
        let asked = stubConfirm(false);
        runCommand('library.delete', { kind: 'question', id: 'lq' });
        expect(asked).toEqual([QUESTIONS.deleteCommented[lang]]);
        expect(st().ws.library.questions.some((x) => x.id === 'lq')).toBe(true);
        asked = stubConfirm(true);
        runCommand('library.delete', { kind: 'question', id: 'lq' });
        expect(asked).toEqual([QUESTIONS.deleteCommented[lang]]);
        expect(st().ws.library.questions.some((x) => x.id === 'lq')).toBe(false);
      });

      it('library-item-commands library.delete : fragment aux questions commentées, refusée → conservé ; acceptée → supprimé', () => {
        let asked = stubConfirm(false);
        runCommand('library.delete', { kind: 'fragment', id: 'fa' });
        expect(asked).toEqual([QUESTIONS.deleteFragment[lang]]);
        expect(st().ws.library.fragments.some((x) => x.id === 'fa')).toBe(true);
        asked = stubConfirm(true);
        runCommand('library.delete', { kind: 'fragment', id: 'fa' });
        expect(asked).toEqual([QUESTIONS.deleteFragment[lang]]);
        expect(st().ws.library.fragments.some((x) => x.id === 'fa')).toBe(false);
      });

      it('library-item-commands library.delete : élément non commenté, aucune question posée', () => {
        const asked = stubConfirm(false);
        runCommand('library.delete', { kind: 'question', id: 'lv' });
        expect(asked).toEqual([]);
        expect(st().ws.library.questions.some((x) => x.id === 'lv')).toBe(false);
      });
    });
  }
});
