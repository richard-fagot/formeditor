import { FORMAT_VERSION, newId, uniqueKey } from '../../core/model';
import { exportBundle, exportFiles, importFiles } from '../../format';
import { blankWorkspace, useStore, type TabId } from '../store';
import { makeTranslate } from '../i18n';
import { download, pickFiles, slug } from './files';
import { exampleWorkspace } from './example';
import type { Command } from './types';

const st = () => useStore.getState();
const t = () => makeTranslate(st().uiLang);
const confirmLoss = () => !st().dirty || window.confirm(t()('project.confirmNew'));

async function importAction() {
  const files = await pickFiles();
  if (!files.length) return;
  const res = importFiles(files, st().ws);
  if (!res.workspace) {
    st().set((s) => void (s.notice = { title: t()('project.importErrors'), lines: res.errors }));
    return;
  }
  const replaces = files.some((f) => /"kind":\s*"(project|bundle)"/.test(f.text));
  if (replaces) {
    if (confirmLoss()) st().loadWorkspace(res.workspace);
    return;
  }
  const before = new Set(st().ws.questionnaires.map((q) => q.id));
  const ws = res.workspace;
  st().edit('project', () => ws);
  ws.questionnaires.filter((q) => !before.has(q.id)).forEach((q) => st().openTab(`q:${q.id}`));
}

export function projectCommands(): Command[] {
  return [
    { id: 'project.new', label: 'project.new', keys: [], scope: 'global', run: () => confirmLoss() && st().loadWorkspace(blankWorkspace()) },
    { id: 'project.open', label: 'project.open', keys: ['$mod+o'], scope: 'global', allowInInput: true, run: () => void importAction() },
    { id: 'project.example', label: 'project.example', keys: [], scope: 'global', run: () => confirmLoss() && st().loadWorkspace(exampleWorkspace()) },
    {
      id: 'project.export', label: 'project.export', keys: ['$mod+s'], scope: 'global', allowInInput: true,
      run: () => {
        download(`${slug(st().ws.project.name)}.bundle.json`, exportBundle(st().ws));
        st().markExported();
      },
    },
    {
      id: 'project.exportFiles', label: 'project.exportFiles', keys: [], scope: 'global',
      run: () => {
        exportFiles(st().ws).forEach((f, i) => setTimeout(() => download(f.name, f.text), i * 250));
        st().markExported();
      },
    },
    {
      id: 'questionnaire.new', label: 'questionnaire.new', keys: [], scope: 'global',
      run: () => {
        const id = newId('q');
        const ws = st().ws;
        const key = uniqueKey('questionnaire', ws.questionnaires.map((q) => q.key));
        st().edit('project', (w) => {
          w.questionnaires.push({
            formatVersion: FORMAT_VERSION, kind: 'questionnaire', id, key,
            title: { [st().contentLang]: t()('questionnaire.untitled') }, start: '', nodes: [], edges: [],
          });
          w.project.questionnaires.push({ id, file: `${key}.json` });
        });
        st().openTab(`q:${id}`);
      },
    },
    { id: 'tab.library', label: 'tab.library', keys: [], scope: 'global', run: () => st().openTab('library') },
    { id: 'tab.system', label: 'tab.system', keys: [], scope: 'global', run: () => st().openTab('system') },
    { id: 'tab.next', label: 'tab.next', keys: ['Control+Tab', 'Alt+ArrowRight'], scope: 'global', allowInInput: true, run: () => cycleTab(1) },
    { id: 'tab.prev', label: 'tab.prev', keys: ['Control+Shift+Tab', 'Alt+ArrowLeft'], scope: 'global', allowInInput: true, run: () => cycleTab(-1) },
    { id: 'palette.open', label: 'palette.open', keys: ['$mod+k'], scope: 'global', allowInInput: true, run: () => st().set((s) => void (s.palette = { open: true, mode: 'commands' })) },
    { id: 'view.problems', label: 'view.problems', keys: [], scope: 'global', run: () => st().set((s) => void (s.problemsOpen = !s.problemsOpen)) },
  ];
}

function cycleTab(delta: number) {
  const { tabs, activeTab } = st();
  const next = tabs[(tabs.indexOf(activeTab) + delta + tabs.length) % tabs.length] as TabId | undefined;
  if (next) st().openTab(next);
}
