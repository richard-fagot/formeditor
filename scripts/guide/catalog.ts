// Catalogue de commandes vu par le guide : identifiant, libellé (langue d'interface par défaut), raccourcis par défaut.
import { commands, labelOf } from '../../src/app/commands';
import { formatKey } from '../../src/app/shortcuts';
import { makeTranslate } from '../../src/app/i18n';
import type { GuideCommand } from './guide';

export function guideCommands(): GuideCommand[] {
  const t = makeTranslate('fr');
  return commands().map((c) => ({ id: c.id, label: labelOf(c, t), keys: c.keys.map(formatKey) }));
}
