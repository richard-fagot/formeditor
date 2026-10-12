// API publique du module app/persistence : sauvegarde automatique dans IndexedDB.
import { createStore, get, set } from 'idb-keyval';
import type { Workspace } from '../../core/model';
import { importFiles, exportBundle } from '../../format';
import { useStore, type ImageOptions, type TabId } from '../store';

const DB = () => createStore('editeur-questionnaires', 'etat');
const KEY = 'session';
const DELAY_MS = 500;

interface Saved {
  bundle: string;
  dirty: boolean;
  tabs: TabId[];
  activeTab: TabId;
  uiLang: string;
  keymap: Record<string, string[]>;
  /** Derniers choix du dialogue d'export d'image (EVO-004). */
  imageOptions?: ImageOptions;
}

/** Restaure la dernière session (renvoie `false` s'il n'y en a pas ou si elle est illisible). */
export async function restoreSession(): Promise<boolean> {
  try {
    const saved = await get<Saved>(KEY, DB());
    if (!saved) return false;
    const { workspace } = importFiles([{ name: 'session.bundle.json', text: saved.bundle }]);
    if (!workspace) return false;
    const s = useStore.getState();
    s.loadWorkspace(workspace as Workspace);
    s.set((st) => {
      st.dirty = saved.dirty;
      st.uiLang = saved.uiLang ?? 'fr';
      st.keymap = saved.keymap ?? {};
      if (saved.imageOptions) st.imageOptions = { scope: saved.imageOptions.scope === 'selection' ? 'selection' : 'all', title: saved.imageOptions.title !== false };
      st.tabs = saved.tabs?.filter((t) => !t.startsWith('q:') || workspace.questionnaires.some((q) => `q:${q.id}` === t)) ?? st.tabs;
      if (st.tabs.includes(saved.activeTab)) st.activeTab = saved.activeTab;
    });
    return true;
  } catch {
    return false;
  }
}

/** Sauvegarde en continu (avec un léger délai) à chaque changement ; renvoie la désinscription. */
export function startAutosave(): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const save = () => {
    const s = useStore.getState();
    const data: Saved = { bundle: exportBundle(s.ws), dirty: s.dirty, tabs: s.tabs, activeTab: s.activeTab, uiLang: s.uiLang, keymap: s.keymap, imageOptions: s.imageOptions };
    void set(KEY, data, DB()).catch(() => undefined);
  };
  const unsub = useStore.subscribe((s, prev) => {
    if (s.ws === prev.ws && s.tabs === prev.tabs && s.activeTab === prev.activeTab && s.dirty === prev.dirty && s.uiLang === prev.uiLang && s.keymap === prev.keymap && s.imageOptions === prev.imageOptions) return;
    clearTimeout(timer);
    timer = setTimeout(save, DELAY_MS);
  });
  return () => {
    clearTimeout(timer);
    unsub();
  };
}
