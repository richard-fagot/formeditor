// API publique du module app/i18n : textes de l'interface de l'outil (fr par défaut, en).
import { MESSAGES, type MessageKey } from './messages';

export { MESSAGES, type MessageKey };
export const UI_LANGUAGES = ['fr', 'en'] as const;
export type Translate = (key: MessageKey, params?: Record<string, string | number>) => string;

export function makeTranslate(lang: string): Translate {
  return (key, params) => {
    const m: Record<string, string> = MESSAGES[key];
    const text = m[lang] ?? m.fr ?? key;
    return params ? text.replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? '')) : text;
  };
}
