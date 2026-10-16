import { makeTranslate, type MessageKey } from '../i18n';

/** Message : clé typée, clé avec paramètres, ou texte brut non traduit (ex. erreurs de schéma à l'import). */
export type Message = MessageKey | { key: MessageKey; params?: Record<string, string | number> } | { raw: string };

/** Boîte de message affichée par `ui/shell` : un seul message à la fois, le dernier remplace le précédent. */
export interface Notice {
  title: string;
  lines: string[];
}

/** Branchement sur l'état applicatif (fait par `app/store`, qui ne peut être importé ici sans cycle). */
export interface FeedbackTarget {
  lang(): string;
  set(recipe: (s: { notice?: Notice }) => void): void;
}

let target: FeedbackTarget | undefined;

export function bindFeedback(t: FeedbackTarget): void {
  target = t;
}

const lang = () => target?.lang() ?? 'fr';

/** Texte d'un message dans la langue `lang`. */
export function messageText(lng: string, m: Message): string {
  if (typeof m === 'string') return makeTranslate(lng)(m);
  if ('raw' in m) return m.raw;
  return makeTranslate(lng)(m.key, m.params);
}

/** Notice traduite dans `lng` (pure). */
export function noticeOf(lng: string, title: Message, lines: Message[]): Notice {
  return { title: messageText(lng, title), lines: lines.map((l) => messageText(lng, l)) };
}

function show(title: Message, lines: Message[]): void {
  const notice = noticeOf(lang(), title, lines);
  target?.set((s) => void (s.notice = notice));
}

/** Refus d'une action (rien n'est fait) : titre et lignes d'explication. */
export function refuse(title: Message, ...lines: Message[]): void {
  show(title, lines);
}

/** Information non bloquante (l'action est faite). */
export function inform(title: Message, ...lines: Message[]): void {
  show(title, lines);
}

/** Échec inattendu : le message de l'erreur (ou sa conversion en texte) est la ligne affichée. */
export function fail(title: Message, error: unknown): void {
  show(title, [{ raw: error instanceof Error ? error.message : String(error) }]);
}

/** Demande de confirmation : seul appel à `window.confirm` (simulable en test par `vi.stubGlobal`) ; lignes de précision à la suite. */
export function confirm(question: Message, ...lines: Message[]): boolean {
  return window.confirm([question, ...lines].map((m) => messageText(lang(), m)).join('\n'));
}
