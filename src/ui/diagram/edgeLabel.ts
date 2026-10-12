/**
 * Texte de condition d'une arête, partagé par la pastille et son infobulle :
 * condition (tronquée à `max`), « ? » si encore vide, « sinon » pour une arête sans condition parmi
 * plusieurs sorties (`conditioned`), rien pour une arête seule sans condition.
 */
export function edgeConditionText(when: string | undefined, conditioned: boolean, elseText: string, max = Infinity): string | undefined {
  if (when) return when.length > max ? when.slice(0, max) + '…' : when;
  if (when === '') return '?';
  return conditioned ? elseText : undefined;
}

/** Infobulle de la pastille : libellé puis condition complète (même règle que la pastille), sinon la condition seule. */
export function edgeTitle(caption: string | undefined, when: string | undefined, conditioned: boolean, elseText: string): string | undefined {
  if (!caption) return when;
  const condition = edgeConditionText(when, conditioned, elseText);
  return condition === undefined ? caption : `${caption}\n${condition}`;
}
