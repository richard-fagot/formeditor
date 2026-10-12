import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { EXAMPLE_DIR, exampleWorkspace } from '../../../tests/reference/example';
import { FORMAT_VERSION, type Questionnaire } from '../../core/model';
import { newWorkspace } from '../../format';
import { currentStep, next, setAnswer, start, withAnswer, type RuntimeInput, type Session } from '../../core/runtime';
import { answerErrors, firstInvalidStep, guardEnd } from './path-check';

const ws = exampleWorkspace();
const chemin = JSON.parse(readFileSync(`${EXAMPLE_DIR}/chemins/ud_tiers_inconnu.json`, 'utf8')) as { answers: { step: string; value: unknown; other?: string }[] };
const sys = ws.project.scenarios.find((s) => s.id === 'sc_ud_2_sinistres')!.values as Record<string, unknown>;

/** Rejoue le chemin attendu jusqu'à la fin, avec le sinistre S-101 choisi comme sinistre lié. */
function playToEnd(input: RuntimeInput): Session {
  const queue = chemin.answers.map((a) => (a.step === 'n_lien' ? { ...a, value: 'S-101' } : a));
  let s = start(input);
  for (let i = 0; i < 100 && currentStep(input, s).node.kind !== 'end'; i++) {
    if (queue[0]?.step === currentStep(input, s).id) {
      const a = queue.shift()!;
      s = setAnswer(input, s, a.value, a.other);
    }
    s = next(input, s);
  }
  return s;
}

describe('fin de parcours bloquée par une réponse devenue invalide (EVO-001)', () => {
  const input: RuntimeInput = { ws, questionnaireId: 'q_declaration', sys, env: { today: '2026-10-10' } };
  const atEnd = playToEnd(input);

  it('réponses valides : la fin s’affiche', () => {
    expect(currentStep(input, atEnd).node.kind).toBe('end');
    expect(guardEnd(input, atEnd)).toBeUndefined();
  });

  it('valeur dynamique disparue de l’état du système : retour à la question, réponse conservée', () => {
    const changed: RuntimeInput = { ...input, sys: { ...sys, sinistres: (sys.sinistres as { id: string }[]).filter((x) => x.id !== 'S-101') } };
    expect(firstInvalidStep(changed, atEnd.answers)).toBe('n_lien');
    const back = guardEnd(changed, atEnd)!;
    expect(currentStep(changed, back).id).toBe('n_lien');
    expect(back.answers.sinistre_lie).toBe('S-101');
    // Corrigée : la fin redevient atteignable.
    expect(guardEnd(changed, { ...atEnd, answers: withAnswer(atEnd.answers, ['sinistre_lie'], 'S-102') })).toBeUndefined();
  });

  it('réponse précédente modifiée : la valeur choisie plus loin n’est plus proposée', () => {
    const q = {
      formatVersion: FORMAT_VERSION, kind: 'questionnaire', id: 'q', key: 'q', title: { fr: 'Q' }, start: 'n1',
      nodes: [
        { kind: 'question', id: 'n1', key: 'couleurs', label: { fr: 'Couleurs' }, type: 'multiple', options: [{ value: 'bleu', label: { fr: 'Bleu' } }, { value: 'vert', label: { fr: 'Vert' } }] },
        { kind: 'question', id: 'n2', key: 'preferee', label: { fr: 'Préférée' }, type: 'single', options: [{ from: 'couleurs' }, { value: 'aucune', label: { fr: 'Aucune' } }] },
        { kind: 'end', id: 'n3', message: { fr: 'Fin' } },
      ],
      edges: [{ id: 'e1', from: 'n1', to: 'n2' }, { id: 'e2', from: 'n2', to: 'n3' }],
    } as Questionnaire;
    const small: RuntimeInput = { ws: { ...newWorkspace('P', 'fr'), questionnaires: [q] }, questionnaireId: 'q', sys: {} };
    let s = setAnswer(small, start(small), ['bleu', 'vert']);
    s = setAnswer(small, next(small, s), 'vert');
    s = next(small, s);
    expect(guardEnd(small, s)).toBeUndefined();
    const changed = { ...s, answers: withAnswer(s.answers, ['couleurs'], ['bleu']) };
    expect(currentStep(small, guardEnd(small, changed)!).id).toBe('n2');
  });
});

describe('groupe de la sélection (EVO-003) : lu à côté de la réponse validée', () => {
  const w = structuredClone(ws);
  const qualite = w.questionnaires[0]!.nodes.find((n) => n.id === 'n_qualite')!;
  // Question homonyme dans le fragment : sa réponse est rangée sous `tiers`.
  w.library.fragments[0]!.nodes.push({ ...structuredClone(qualite), id: 'bn_qualite' });
  const input: RuntimeInput = { ws: w, questionnaireId: 'q_declaration', sys, env: { defaultLang: 'fr' } };
  const params = (answers: Record<string, unknown>, step: string) => answerErrors(input, answers, step).map((e) => e.param);

  it('question du questionnaire : couple (groupe, valeur)', () => {
    expect(params({ qualite_declarant: 'enfant', qualite_declarant_group: 'SC' }, 'n_qualite')).toEqual([]);
    expect(params({ qualite_declarant: 'enfant', qualite_declarant_group: 'Ayant droit' }, 'n_qualite')).toEqual(['option']);
  });

  it('question d’un fragment : le groupe homonyme de l’appelant ne s’applique pas', () => {
    const host = { qualite_declarant: 'conjoint', qualite_declarant_group: 'Ayant droit' };
    expect(params({ ...host, tiers: { qualite_declarant: 'enfant' } }, 'n_bloc_tiers/bn_qualite')).toEqual([]);
    expect(params({ ...host, tiers: { qualite_declarant: 'enfant', qualite_declarant_group: 'SC' } }, 'n_bloc_tiers/bn_qualite')).toEqual([]);
    expect(params({ ...host, tiers: { qualite_declarant: 'ascendant', qualite_declarant_group: 'SC' } }, 'n_bloc_tiers/bn_qualite')).toEqual(['option']);
  });
});
