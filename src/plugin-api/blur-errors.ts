import { useState } from 'react';
import type { LocalizedText } from '../core/model';
import type { RenderEnv } from './contract';

/** Erreur de format d'un champ (forme de `FieldError` de core/validation, sans en dépendre). */
export interface BlurError {
  message: LocalizedText;
}

/** Messages calculés à la sortie du champ, dans la langue de la prévisualisation (pure). */
export function blurMessages(errors: BlurError[], label: (l: LocalizedText) => string): string[] {
  return errors.map((e) => label(e.message));
}

/**
 * Messages affichés (pure) : seulement si les contrôles de saisie sont actifs (`checks !== false`, EVO-014) et que la
 * question n'a pas déjà une erreur de validation (`errors['']`).
 */
export function shownBlurErrors(messages: string[], checks: boolean | undefined, errors: Record<string, string[]>): string[] {
  return checks !== false && !(errors[''] ?? []).length ? messages : [];
}

/**
 * Erreurs « à la sortie du champ » (mail, téléphone, adresse) : `onBlur(formatErrors(…))` à la sortie, `reset()` à la
 * saisie ; `shown` : messages à afficher (`FieldErrors` de ui-kit).
 */
export function useBlurErrors(env: Pick<RenderEnv, 'label' | 'checks'>, errors: Record<string, string[]>) {
  const [messages, setMessages] = useState<string[]>([]);
  return {
    shown: shownBlurErrors(messages, env.checks, errors),
    onBlur: (errs: BlurError[]) => setMessages(blurMessages(errs, env.label)),
    reset: () => setMessages([]),
  };
}
