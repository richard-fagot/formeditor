import { describe, expect, it } from 'vitest';
import { edgeConditionText, edgeTitle } from './edgeLabel';

describe('edgeConditionText', () => {
  it('condition tronquée, « ? » si vide, « sinon » seulement parmi plusieurs sorties', () => {
    expect(edgeConditionText('abcdef', true, 'sinon', 3)).toBe('abc…');
    expect(edgeConditionText('abc', true, 'sinon', 3)).toBe('abc');
    expect(edgeConditionText('', true, 'sinon')).toBe('?');
    expect(edgeConditionText(undefined, true, 'sinon')).toBe('sinon');
    expect(edgeConditionText(undefined, false, 'sinon')).toBeUndefined();
  });
});

describe('edgeTitle (infobulle)', () => {
  it('libellé puis condition, même règle que la pastille', () => {
    expect(edgeTitle('Lib', 'x = 1', true, 'sinon')).toBe('Lib\nx = 1');
    expect(edgeTitle('Lib', '', true, 'sinon')).toBe('Lib\n?');
    expect(edgeTitle('Lib', undefined, true, 'sinon')).toBe('Lib\nsinon');
    expect(edgeTitle('Lib', undefined, false, 'sinon')).toBe('Lib');
  });
  it('sans libellé : la condition seule', () => {
    expect(edgeTitle(undefined, 'x = 1', true, 'sinon')).toBe('x = 1');
    expect(edgeTitle(undefined, undefined, false, 'sinon')).toBeUndefined();
  });
});
