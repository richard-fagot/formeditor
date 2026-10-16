import { describe, expect, it } from 'vitest';
import type { Workspace } from '../../core/model';
import { checkWorkspace, type Issue } from '../../core/validation';
import { issuesOf, selectIssues } from '../issues';
import { exampleWorkspace } from '../../../tests/reference/example';

/**
 * EVO-025 — tests de caractérisation des filtres de problèmes des 7 vues, appliqués au projet d'exemple
 * (sans problème) et à une variante où des problèmes sont introduits. Chaque filtre reproduit l'expression locale
 * de la vue (fichier:ligne cité) ; le refactoring la remplacera par `selectIssues`, sans changer les valeurs attendues.
 */

/** QuestionnaireView.tsx:28, ComparePane.tsx:15, Outline.tsx:16 : problèmes d'un questionnaire. */
const ofQuestionnaire = (ws: Workspace, id: string) => selectIssues(issuesOf(ws), { owner: { kind: 'questionnaire', id } });
/** library/FragmentView.tsx:32 : problèmes d'un fragment. */
const ofFragment = (ws: Workspace, id: string) => selectIssues(issuesOf(ws), { owner: { kind: 'fragment', id } });
/** settings/TranslationsSection.tsx:34 : traductions manquantes. */
const translations = (ws: Workspace) => selectIssues(issuesOf(ws), { code: 'missingTranslation' });
/** system-state/SystemState.tsx:18 : dictionnaire de l'état du système. */
const ofSystem = (ws: Workspace) => selectIssues(issuesOf(ws), { owner: { kind: 'system' } });
/** preview/Preview.tsx:87-90 : nombre de textes non traduits dans `lang` (questionnaire et éléments de bibliothèque qu'il utilise). */
function previewMissing(ws: Workspace, questionnaireId: string, lang: string): number {
  const q = ws.questionnaires.find((x) => x.id === questionnaireId);
  const used = new Set([questionnaireId, ...(q?.nodes ?? []).flatMap((x) => ('ref' in x && typeof x.ref === 'string' ? [x.ref] : []))]);
  return selectIssues(issuesOf(ws), { code: 'missingTranslation', ownerIds: [...used], lang }).length;
}

const summary = (issues: Issue[]) => issues.map((i) => `${i.owner.kind}:${i.owner.id} ${i.code}${i.params.lang ? ` (${i.params.lang})` : ''}`);

/** Variante de l'exemple : traductions anglaises retirées, départ manquant, variable système invalide. */
function damaged(): Workspace {
  const ws = exampleWorkspace();
  const decl = ws.questionnaires.find((q) => q.id === 'q_declaration')!;
  delete decl.title.en;
  const lib = decl.nodes.find((n) => 'ref' in n && ws.library.questions.some((x) => x.id === n.ref)) as { ref: string };
  delete (ws.library.questions.find((x) => x.id === lib.ref)!.label as Record<string, string>).en;
  ws.questionnaires.find((q) => q.id === 'q_remboursement')!.start = '';
  delete ws.library.fragments.find((f) => f.id === 'frg_identification_assure')!.title.en;
  ws.project.systemState.push({ name: 'Nom invalide', type: 'text' });
  return ws;
}

describe('EVO-025 — filtres de problèmes des vues', () => {
  it('projet d’exemple : aucun problème dans aucune vue', () => {
    const ws = exampleWorkspace();
    for (const id of ['q_declaration', 'q_remboursement']) expect(ofQuestionnaire(ws, id)).toEqual([]);
    for (const id of ['frg_identification_assure', 'blk_identite_tiers']) expect(ofFragment(ws, id)).toEqual([]);
    expect(translations(ws)).toEqual([]);
    expect(ofSystem(ws)).toEqual([]);
    for (const lang of ['fr', 'en']) for (const id of ['q_declaration', 'q_remboursement']) expect(previewMissing(ws, id, lang)).toBe(0);
  });

  describe('variante avec problèmes', () => {
    const ws = damaged();

    it('QuestionnaireView / ComparePane / Outline : problèmes du questionnaire affiché seulement', () => {
      expect(summary(ofQuestionnaire(ws, 'q_declaration'))).toEqual(['questionnaire:q_declaration missingTranslation (en)']);
      expect(summary(ofQuestionnaire(ws, 'q_remboursement'))).toEqual([
        'questionnaire:q_remboursement missingStart',
        ...Array(5).fill('questionnaire:q_remboursement unreachable'),
      ]);
      expect(ofQuestionnaire(ws, 'absent')).toEqual([]);
    });

    it('FragmentView : problèmes du fragment affiché seulement', () => {
      expect(summary(ofFragment(ws, 'frg_identification_assure'))).toEqual(['fragment:frg_identification_assure missingTranslation (en)']);
      expect(ofFragment(ws, 'blk_identite_tiers')).toEqual([]);
    });

    it('TranslationsSection : toutes les traductions manquantes, quel que soit le propriétaire', () => {
      expect(summary(translations(ws))).toEqual([
        'libraryQuestion:lq_date_sinistre missingTranslation (en)',
        'questionnaire:q_declaration missingTranslation (en)',
        'fragment:frg_identification_assure missingTranslation (en)',
      ]);
    });

    it('SystemState : problèmes du dictionnaire de l’état du système', () => {
      expect(summary(ofSystem(ws))).toEqual(['system:Nom invalide invalidKey']);
    });

    it('Preview : textes non traduits du questionnaire et des éléments qu’il utilise, par langue', () => {
      expect(previewMissing(ws, 'q_declaration', 'en')).toBe(2);
      expect(previewMissing(ws, 'q_remboursement', 'en')).toBe(1);
      expect(previewMissing(ws, 'q_declaration', 'fr')).toBe(0);
      expect(previewMissing(ws, 'q_remboursement', 'fr')).toBe(0);
    });

    it('chaque vue lit le même résultat de checkWorkspace (ordre conservé)', () => {
      const all = checkWorkspace(ws);
      expect(ofQuestionnaire(ws, 'q_remboursement')).toEqual(all.filter((i) => i.owner.id === 'q_remboursement'));
      expect(translations(ws)).toEqual(all.filter((i) => i.code === 'missingTranslation'));
    });
  });
});
