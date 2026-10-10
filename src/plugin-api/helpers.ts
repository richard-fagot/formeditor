import { isVariantLabel, type Label, type LocalizedText, type Question } from '../core/model';
import type { QuestionBase } from './contract';

/** Chaîne de l'interface de l'outil dans la langue demandée (repli : français). */
export function tr(t: LocalizedText, lang: string): string {
  return t[lang] ?? t.fr ?? Object.values(t)[0] ?? '';
}

/** Propriétés communes d'une question (pour un changement de type). */
export function commonQuestionFields(q: Question): QuestionBase {
  const { id, key, label, description, help, placeholder, required, messages, constraints } = q;
  return Object.fromEntries(
    Object.entries({ id, key, label, description, help, placeholder, required, messages, constraints }).filter(([, v]) => v !== undefined),
  ) as QuestionBase;
}

/** Texte brut d'un libellé pour l'éditeur (variante « sinon », langue du contenu, sans interpolation). */
export function previewText(label: Label | undefined, env: { contentLang: string; defaultLang: string }): string {
  if (!label) return '';
  const t = isVariantLabel(label) ? label.otherwise : label;
  return t[env.contentLang] ?? t[env.defaultLang] ?? Object.values(t)[0] ?? '';
}
