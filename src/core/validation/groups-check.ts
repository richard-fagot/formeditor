import { pickText } from '../expressions';
import { isChoiceGroup, isVariantLabel, OTHER_GROUP, type ChoiceGroup, type Question, type StructureField, type Workspace } from '../model';
import type { Owner } from '../references';
import { issue, type Issue } from './issue';

/** Identifiant statique d'un groupe : code, sinon libellé (texte « sinon » d'un libellé à variantes) dans la langue par défaut. */
function staticId(g: ChoiceGroup, defaultLang: string): string {
  if (g.code) return g.code;
  const text = isVariantLabel(g.group) ? g.group.otherwise : g.group;
  return pickText(text, { lang: defaultLang, defaultLang });
}

/**
 * Groupes d'options d'un choix (et des choix d'une structure) : identifiant en double, code `AUTRE` réservé,
 * groupe sans option (spec §4.6, EVO-003).
 */
export function checkGroups(ws: Workspace, q: Question | StructureField, owner: Owner, nodeId: string, out: Issue[], prefix = '') {
  if (q.type === 'structure') return q.fields.forEach((f) => checkGroups(ws, f, owner, nodeId, out, `fields.${f.key}.`));
  if (q.type !== 'single' && q.type !== 'multiple') return;
  const seen = new Set<string>();
  q.options.forEach((e, i) => {
    if (!isChoiceGroup(e)) return;
    const id = staticId(e, ws.project.defaultLanguage);
    const where = { nodeId, property: `${prefix}options[${i}]` };
    if (seen.has(id)) out.push(issue('duplicateGroup', owner, where, { group: id }));
    if (id === OTHER_GROUP) out.push(issue('reservedGroupCode', owner, where, { group: id }));
    if (!e.options.length) out.push(issue('emptyGroup', owner, where, { group: id }));
    seen.add(id);
  });
}
