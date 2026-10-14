import { isItemValidated, libraryItemOf, type LibraryItemRef, type Workspace } from '../../core/model';

/**
 * Version d'un élément de bibliothèque (EVO-022), texte libre ; vide = retirée. Refusée (renvoie `false`) si l'élément
 * est validé : sa version est figée tant que la validation n'est pas désactivée.
 */
export function setItemVersion(ws: Workspace, item: LibraryItemRef, version: string): boolean {
  const x = libraryItemOf(ws.library, item);
  if (!x || isItemValidated(x)) return false;
  if (version) x.version = version;
  else delete x.version;
  return true;
}

/** Valide (`true`) ou dévalide un élément de bibliothèque (EVO-022) ; dévalider retire `status` (provisoire). */
export function setItemValidation(ws: Workspace, item: LibraryItemRef, validated: boolean): void {
  const x = libraryItemOf(ws.library, item);
  if (!x) return;
  if (validated) x.status = 'validated';
  else delete x.status;
}
