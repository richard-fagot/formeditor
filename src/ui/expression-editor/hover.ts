import { hoverTooltip } from '@codemirror/view';
import type { Scope } from '../../core/references';
import { STRING_LITERAL } from './language';

/** Littéraux (chaînes, noms entre accents graves, commentaires) consommés en bloc, puis chemins. */
const TOKEN = new RegExp(`${STRING_LITERAL}|\`[^\`]*\`?|/\\*[\\s\\S]*?(?:\\*/|$)|([A-Za-z_]\\w*(?:\\.[A-Za-z_]\\w*)*)`, 'g');

/**
 * Référence `sys.…` sous la position `pos` : chemin jusqu'au segment survolé (au moins `sys.<nom>`).
 * `undefined` hors d'une référence système, notamment dans une chaîne littérale (`"sys.profil"`).
 */
export function systemRefAt(text: string, pos: number): { path: string; from: number; to: number } | undefined {
  for (const m of text.matchAll(TOKEN)) {
    const from = m.index, to = from + m[0].length;
    if (pos < from || pos > to) continue;
    if (m[1] === undefined) return undefined; // littéral
    if (!m[1].startsWith('sys.')) return undefined;
    const next = m[0].indexOf('.', Math.max(pos - from, 4));
    const end = next < 0 ? to : from + next;
    return { path: text.slice(from, end), from, to: end };
  }
  return undefined;
}

/** Infobulle de survol d'une référence système : clé, libellé et description (rien sans l'un ni l'autre). */
export function systemHover(getScope: () => Scope) {
  return hoverTooltip((view, pos) => {
    const ref = systemRefAt(view.state.doc.toString(), pos);
    const info = ref && getScope().get(ref.path);
    if (!ref || !info || info.kind !== 'system' || (!info.caption && !info.description)) return null;
    return {
      pos: ref.from,
      end: ref.to,
      above: true,
      create: () => {
        const dom = document.createElement('div');
        dom.dataset.sysHover = ref.path;
        dom.className = 'max-w-72 px-2 py-1 text-xs';
        const add = (text: string, className: string) => {
          const el = dom.appendChild(document.createElement('div'));
          el.textContent = text;
          el.className = className;
        };
        add(ref.path, 'font-mono text-slate-500');
        if (info.caption) add(info.caption, 'font-medium text-slate-800');
        if (info.description) add(info.description, 'text-slate-600');
        return { dom };
      },
    };
  });
}
