import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { importFiles } from '../../format';
import { blankWorkspace, useStore } from '../store';
import { runCommand } from './index';

const st = () => useStore.getState();

describe('library.openRef : ouvrir l’objet lié depuis le badge « bib. » (EVO-013)', () => {
  let qid = '';
  beforeEach(() => {
    const ws = blankWorkspace();
    qid = ws.questionnaires[0]!.id;
    st().loadWorkspace(ws);
  });

  it('ouvre une question de bibliothèque dans l’onglet Bibliothèque, sélectionnée', () => {
    runCommand('library.newQuestion');
    const id = st().ws.library.questions[0]!.id;
    runCommand('tab.show', `q:${qid}`);
    runCommand('library.openRef', { kind: 'question', id });
    expect(st().activeTab).toBe('library');
    expect(st().libraryItem).toEqual({ kind: 'question', id });
  });

  it('ouvre un fragment dans son onglet', () => {
    runCommand('library.newFragment');
    const id = st().ws.library.fragments[0]!.id;
    runCommand('tab.show', `q:${qid}`);
    runCommand('library.openRef', { kind: 'fragment', id });
    expect(st().activeTab).toBe(`f:${id}`);
  });

  it('lien rompu : message, aucune navigation', () => {
    runCommand('tab.show', `q:${qid}`);
    runCommand('library.openRef', { kind: 'question', id: 'disparu' });
    expect(st().activeTab).toBe(`q:${qid}`);
    expect(st().notice?.title).toBe('Objet de bibliothèque introuvable');
    expect(st().notice?.lines[0]).toContain('disparu');
  });
});

describe('projet antérieur (EVO-013)', () => {
  const fixture = (name: string) => readFileSync(new URL(`../../format/fixtures/${name}`, import.meta.url), 'utf8');
  it('un projet v1 avec une référence de question et une instance de bloc se charge ; ses liens s’ouvrent', () => {
    const q = JSON.parse(fixture('questionnaire-v1.json'));
    q.nodes.push({ kind: 'question', id: 'n_ref', ref: 'lq_choix' }, { kind: 'block', id: 'n_blk', ref: 'blk', alias: 'blk' });
    const { workspace, errors } = importFiles([{ name: 'q.json', text: JSON.stringify(q) }, { name: 'bibliotheque.json', text: fixture('bibliotheque-v1.json') }]);
    expect(errors).toEqual([]);
    st().loadWorkspace(workspace!);
    const nodes = st().ws.questionnaires[0]!.nodes;
    expect(nodes.find((n) => n.id === 'n_blk')).toMatchObject({ kind: 'fragment', ref: 'blk' });
    runCommand('library.openRef', { kind: 'question', id: 'lq_choix' });
    expect(st().libraryItem).toEqual({ kind: 'question', id: 'lq_choix' });
    runCommand('library.openRef', { kind: 'fragment', id: 'blk' });
    expect(st().activeTab).toBe('f:blk');
    expect(st().notice).toBeUndefined();
  });
});

describe('guide (EVO-013)', () => {
  it('décrit l’ouverture de l’objet lié depuis le badge « bib. »', () => {
    const guide = readFileSync('docs/GUIDE.md', 'utf8');
    expect(guide).toMatch(/\*\*Ouvrir l'objet lié depuis son badge « bib\. »\*\* —(.*\n)*?.*\[cmd: library\.openRef\]/);
  });
});
