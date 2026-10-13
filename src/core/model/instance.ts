import type { LibraryQuestionNode } from './node';
import type { Question } from './question';

/**
 * Question effective d'une instance de bibliothèque (EVO-009) : intitulé et caractère obligatoire (EVO-012) surchargés, champs masqués d'une structure
 * retirés (ordre de la bibliothèque). Une clé masquée inconnue est ignorée ; si aucun champ ne resterait affiché,
 * le masquage est ignoré.
 */
export function instanceQuestion(q: Question, node: LibraryQuestionNode): Question {
  let out: Question = node.label ? { ...q, label: node.label } : q;
  if (node.required !== undefined) out = { ...out, required: node.required };
  const hidden = node.hiddenFields;
  if (out.type === 'structure' && hidden?.length) {
    const fields = out.fields.filter((f) => !hidden.includes(f.key));
    if (fields.length && fields.length < out.fields.length) out = { ...out, fields };
  }
  return out;
}

/** Clés des champs affichés d'une instance de structure (toutes les clés hors structure : aucune). */
export function visibleFieldKeys(q: Question, node: LibraryQuestionNode): string[] {
  const eff = instanceQuestion(q, node);
  return eff.type === 'structure' ? eff.fields.map((f) => f.key) : [];
}
