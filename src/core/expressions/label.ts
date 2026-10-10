import { isVariantLabel, type Label, type LocalizedText } from '../model';
import { evaluateCondition, type EvalContext, type EvalEnv } from './evaluate';
import { interpolate } from './template';

export interface LangChoice {
  lang: string;
  defaultLang: string;
}

/** Texte dans la langue demandée, sinon la langue par défaut, sinon la première disponible. */
export function pickText(text: LocalizedText | undefined, { lang, defaultLang }: LangChoice): string {
  if (!text) return '';
  return text[lang] ?? text[defaultLang] ?? Object.values(text)[0] ?? '';
}

/** Choisit la variante, la langue, puis interpole. */
export function resolveLabel(label: Label | undefined, langs: LangChoice, ctx: EvalContext, env: EvalEnv = {}): string {
  if (!label) return '';
  const text = isVariantLabel(label)
    ? (label.variants.find((v) => evaluateCondition(v.when, ctx, env))?.text ?? label.otherwise)
    : label;
  return interpolate(pickText(text, langs), ctx, env);
}
