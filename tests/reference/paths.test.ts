import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildContext, currentStep, getAnswer, groupPath, next, otherPath, setAnswer, start, type RuntimeInput } from '../../src/core/runtime';
import { validateAnswer } from '../../src/core/validation';
import { EXAMPLE_DIR, exampleWorkspace } from './example';

/** Chemin attendu : réponses données dans l'ordre, pages visitées, issue de la fin atteinte. */
interface ExpectedPath {
  questionnaire: string;
  scenario: string;
  today: string;
  answers: { step: string; value: unknown; other?: string; group?: unknown }[];
  path: string[];
  outcome: string;
}

const DIR = join(EXAMPLE_DIR, 'chemins');
const cases = readdirSync(DIR).map((f) => [f, JSON.parse(readFileSync(join(DIR, f), 'utf8')) as ExpectedPath] as const);

describe('chemins attendus par scénario', () => {
  const ws = exampleWorkspace();
  it.each(cases)('%s', (_f, c) => {
    const scenario = ws.project.scenarios.find((s) => s.id === c.scenario)!;
    const input: RuntimeInput = { ws, questionnaireId: c.questionnaire, sys: scenario.values, env: { today: c.today, defaultLang: ws.project.defaultLanguage } };
    const queue = [...c.answers];
    let s = start(input);
    for (let guard = 0; guard < 200; guard++) {
      const step = currentStep(input, s);
      if (step.node.kind === 'end') break;
      if (step.answerPath) {
        if (queue[0]?.step === step.id) {
          const a = queue.shift()!;
          s = setAnswer(input, s, a.value, a.other, a.group);
        }
        const value = getAnswer(s.answers, step.answerPath);
        expect(value, `réponse attendue en ${step.id}`).not.toBeUndefined();
        const errors = validateAnswer(step.question!, value, buildContext(input, s.answers, step.id), input.env, getAnswer(s.answers, otherPath(step.answerPath)), '', getAnswer(s.answers, groupPath(step.answerPath)));
        expect(errors, `réponse invalide en ${step.id}`).toEqual([]);
      }
      s = next(input, s);
      expect(s.blocked, `parcours bloqué en ${step.id}`).toBeFalsy();
    }
    expect(s.history).toEqual(c.path);
    expect(queue, 'réponses non consommées').toEqual([]);
    const end = currentStep(input, s).node;
    expect(end.kind === 'end' && end.outcome).toBe(c.outcome);
  });
});
