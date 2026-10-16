import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const guide = readFileSync('docs/GUIDE.md', 'utf8');

describe('guide utilisateur (EVO-024)', () => {
  it('EVO-024-060 — le guide décrit le nœud Renvoi, ses boutons, les deux toggles, le bouton Terminer et ce que la prévisualisation ne simule pas', () => {
    expect(guide).toMatch(/jusqu'à EVO-02[4-9]/);
    for (const text of [
      '**Créer un nœud Renvoi à la suite**', '`[cmd: node.newRedirect]`', '**Paramétrer un nœud Renvoi**', '« Ajouter un bouton »',
      '« Pré-remplissage de la cible »', '« Annule et remplace »', '**documentaires**', '**Choisir le libellé du bouton Terminer**',
      '**Tester un nœud Renvoi**', '**Simuler un renvoi vers un autre questionnaire**',
    ]) expect(guide).toContain(text);
  });
});
