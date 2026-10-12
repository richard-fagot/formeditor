import { hoverTooltip } from '@codemirror/view';
import type { Scope } from '../../core/references';

const NAME = /[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*/g;

/**
 * Référence `sys.…` sous la position `pos` : chemin jusqu'au segment survolé (au moins `sys.<nom>`).
 * `undefined` hors d'une référence système.
 */
export function systemRefAt(text: string, pos: number): { path: string; from: number; to: number } | undefined {
  for (const m of text.matchAll(NAME)) {
    const from = m.index, to = from + m[0].length;
    if (pos < from || pos > to) continue;
    if (!m[0].startsWith('sys.')) return undefined;
    const next = m[0].indexOf('.', Math.max(pos - from, 4));
    const end = next < 0 ? to : from + next;
    return { path: text.slice(from, end), from, to: end };
  }
  return undefined;
}

/** Infobulle de survol d'une référence système : clé, libellé et description (rien sans l'un ni l'autre). */
export function systemHover(getScope: () => Scope) {
  return hoverTooltip((view, pos) => {
    const line = view.state.doc.lineAt(pos);
    const ref = systemRefAt(line.text, pos - line.from);
    const info = ref && getScope().get(ref.path);
    if (!ref || !info || info.kind !== 'system' || (!info.caption && !info.description)) return null;
    return {
      pos: line.from + ref.from,
      end: line.from + ref.to,
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
