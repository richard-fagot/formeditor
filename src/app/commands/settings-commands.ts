import { activeGraphRef, activeQuestionnaire, addLanguage, removeLanguage, setDefaultLanguage, useStore } from '../store';
import type { Command } from './types';

const st = () => useStore.getState();
const str = (x: unknown) => (typeof x === 'string' ? x : undefined);

/** Paramètres : langues des contenus, raccourcis personnalisés ; vue côte à côte, mise en page automatique. */
export function settingsCommands(): Command[] {
  return [
    { id: 'tab.settings', label: 'tab.settings', keys: [], scope: 'global', run: () => st().openTab('settings') },
    {
      // `arg` : code de langue (ex. `en`).
      id: 'lang.add', label: 'lang.add', keys: [], scope: 'global', hidden: true,
      run: (arg) => {
        const code = str(arg)?.trim();
        if (code && !st().ws.project.languages.includes(code)) st().edit('project', (ws) => void addLanguage(ws, code));
      },
    },
    {
      id: 'lang.remove', label: 'lang.remove', keys: [], scope: 'global', hidden: true,
      run: (arg) => {
        const code = str(arg);
        if (!code || code === st().ws.project.defaultLanguage || !st().ws.project.languages.includes(code)) return;
        st().edit('project', (ws) => void removeLanguage(ws, code));
        const fallback = st().ws.project.defaultLanguage;
        st().set((s) => {
          if (s.contentLang === code) s.contentLang = fallback;
          for (const p of Object.values(s.preview)) if (p.lang === code) p.lang = fallback;
        });
      },
    },
    {
      id: 'lang.default', label: 'lang.default', keys: [], scope: 'global', hidden: true,
      run: (arg) => {
        const code = str(arg);
        if (code && st().ws.project.languages.includes(code) && code !== st().ws.project.defaultLanguage) {
          st().edit('project', (ws) => void setDefaultLanguage(ws, code));
        }
      },
    },
    {
      // Langue de la prévisualisation affichée ; sans paramètre, la suivante.
      id: 'preview.lang', label: 'preview.lang', keys: [], scope: 'global',
      enabled: () => !!previewed() && st().ws.project.languages.length > 1,
      run: (arg) => {
        const q = previewed()!;
        const langs = st().ws.project.languages;
        const current = st().preview[q.id]?.lang ?? st().contentLang;
        const lang = typeof arg === 'string' ? (langs.includes(arg) ? arg : undefined) : langs[(langs.indexOf(current) + 1) % langs.length];
        if (lang) st().set((s) => void (s.preview[q.id] = { ...s.preview[q.id], lang }));
      },
    },
    {
      // `arg` : `{ id, keys }` (combinaisons tinykeys ; liste vide : aucun raccourci).
      id: 'shortcut.set', label: 'shortcut.set', keys: [], scope: 'global', hidden: true,
      run: (arg) => {
        const a = arg as { id?: unknown; keys?: unknown } | undefined;
        if (typeof a?.id !== 'string' || !Array.isArray(a.keys) || !a.keys.every((k) => typeof k === 'string')) return;
        const keys = [...new Set(a.keys as string[])];
        st().set((s) => void (s.keymap = { ...s.keymap, [a.id as string]: keys }));
      },
    },
    {
      // `arg` : id de commande ; sans paramètre, tous les raccourcis reviennent aux valeurs par défaut.
      id: 'shortcut.reset', label: 'shortcut.resetAll', keys: [], scope: 'global',
      enabled: () => Object.keys(st().keymap).length > 0,
      run: (arg) => {
        const id = str(arg);
        st().set((s) => {
          if (!id) s.keymap = {};
          else {
            const { [id]: _, ...rest } = s.keymap;
            s.keymap = rest;
          }
        });
      },
    },
    {
      id: 'view.layout', label: 'view.layout', keys: ['l'], scope: 'graph', enabled: () => diagramShown(),
      run: () => st().set((s) => void (s.layoutRequest += 1)),
    },
    {
      // `arg` : questionnaire affiché à droite ; sans paramètre : bascule (le suivant de la liste, ou fermeture).
      id: 'view.compare', label: 'view.compare', keys: [], scope: 'global',
      enabled: () => !!activeQuestionnaire(st()) && st().ws.questionnaires.length > 1,
      run: (arg) => {
        const active = activeQuestionnaire(st())!;
        const others = st().ws.questionnaires.filter((q) => q.id !== active.id);
        const shown = others.some((q) => q.id === st().compare);
        const target = typeof arg === 'string' ? others.find((q) => q.id === arg)?.id : shown ? undefined : others[0]?.id;
        if (typeof arg === 'string' && !target) return;
        st().set((s) => {
          s.compare = target;
          if (target) s.view[active.id] = 'diagram';
        });
      },
    },
  ];
}

function previewed() {
  const q = activeQuestionnaire(st());
  return q && st().view[q.id] === 'preview' ? q : undefined;
}

/** Un logigramme modifiable est-il affiché (questionnaire en vue logigramme, ou bloc de la bibliothèque) ? */
function diagramShown(): boolean {
  const r = activeGraphRef(st());
  return !!r && (r.kind === 'block' || (st().view[r.id] ?? 'diagram') === 'diagram');
}
