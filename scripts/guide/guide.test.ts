import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { checkGuide, guideTags, INDEX_END, INDEX_START, shortcutIndex, withIndex, type GuideCommand } from './guide';
import { guideCommands } from './catalog';

const CMDS: GuideCommand[] = [
  { id: 'node.newQuestion', label: 'Nouvelle question à la suite', keys: ['N'] },
  { id: 'edit.redo', label: 'Rétablir', keys: ['Ctrl+Shift+Z', 'Ctrl+Y'] },
  { id: 'project.new', label: 'Nouveau projet', keys: [] },
];

const guide = (body: string, index = shortcutIndex(CMDS)) => `# Guide\n\n${body}\n\n## Index\n${INDEX_START}\n${index}\n${INDEX_END}\n`;
const BODY = [
  '- **Créer une question** — `N`. `[cmd: node.newQuestion]`',
  '- **Rétablir** — `Ctrl+Shift+Z`. `[cmd: edit.redo]`',
  '- **Créer un projet** — barre de projet. `[cmd: project.new]`',
].join('\n');

describe('contrôle du guide', () => {
  it('guide conforme : aucun écart', () => {
    expect(checkGuide(guide(BODY), CMDS)).toEqual([]);
  });

  it('balise retirée : échec', () => {
    const errors = checkGuide(guide(BODY.replace('`[cmd: edit.redo]`', '')), CMDS);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('edit.redo');
  });

  it('balise inconnue : échec', () => {
    const errors = checkGuide(guide(`${BODY}\n- **Voler** — rien. \`[cmd: node.fly]\``), CMDS);
    expect(errors).toEqual(['Balise sans commande correspondante : [cmd: node.fly].']);
  });

  it('index périmé : échec', () => {
    const stale = shortcutIndex(CMDS.map((c) => (c.id === 'node.newQuestion' ? { ...c, keys: ['Q'] } : c)));
    expect(checkGuide(guide(BODY, stale), CMDS)).toEqual(['Index des raccourcis périmé : lancer `npm run guide`.']);
    expect(checkGuide(guide(BODY, shortcutIndex(CMDS.slice(0, 2))), CMDS)).toHaveLength(1);
  });

  it('index absent : échec', () => {
    expect(checkGuide(`# Guide\n${BODY}\n`, CMDS)).toEqual(['Index des raccourcis absent (marqueurs manquants).']);
  });

  it('régénération : index mis à jour, reste du guide intact, idempotente', () => {
    const stale = guide(BODY, '| vieux |');
    const next = withIndex(stale, CMDS);
    expect(next).toBe(guide(BODY));
    expect(withIndex(next, CMDS)).toBe(next);
    expect(() => withIndex('# sans marqueurs', CMDS)).toThrow();
  });

  it('les balises de l’index généré ne comptent pas', () => {
    expect(guideTags(guide('', `${shortcutIndex(CMDS)}\n[cmd: project.new]`))).toEqual([]);
  });

  it('tableau : raccourcis multiples, absence de raccourci', () => {
    expect(shortcutIndex(CMDS).split('\n').slice(2)).toEqual([
      '| Nouvelle question à la suite | `N` | `node.newQuestion` |',
      '| Rétablir | `Ctrl+Shift+Z` ou `Ctrl+Y` | `edit.redo` |',
      '| Nouveau projet | — | `project.new` |',
    ]);
  });
});

describe('docs/GUIDE.md', () => {
  it('est conforme au catalogue de commandes (sinon : npm run guide, puis baliser les commandes)', () => {
    const md = readFileSync('docs/GUIDE.md', 'utf8');
    expect(checkGuide(md, guideCommands())).toEqual([]);
  });
});
