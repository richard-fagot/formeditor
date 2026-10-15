/** Messages d'erreur d'un champ de saisie (un paragraphe `role="alert"` par message). */
export function FieldErrors({ messages }: { messages: string[] }) {
  return <>{messages.map((m, i) => <p key={i} className="text-sm text-rose-600" role="alert">{m}</p>)}</>;
}
