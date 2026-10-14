import { isValidated, type LocalizedText } from '../../core/model';
import {
  activeGraphRef, activeQuestionnaire, canRenameQuestionnaire, connect, getGraph, moveEdge, patchQuestionnaire, renameQuestionnaire,
  scopeOf, setValidation, useStore, type GraphRef,
} from '../store';
import { makeTranslate } from '../i18n';
import { validateQuestionnaire } from './version-commands';
import type { Command } from './types';

const st = () => useStore.getState();
const ref = () => activeGraphRef(st());

/** Arête sélectionnée, son rang parmi les arêtes sortantes de son origine et leur nombre. */
function selectedEdge() {
  const r = ref();
  const g = r && getGraph(st().ws, r);
  const edge = g && st().selection.edge ? g.edges.find((e) => e.id === st().selection.edge) : undefined;
  if (!r || !g || !edge) return undefined;
  const siblings = g.edges.filter((e) => e.from === edge.from);
  return { r, edge, rank: siblings.indexOf(edge), count: siblings.length };
}

function moveSelectedEdge(delta: -1 | 1) {
  const s = selectedEdge();
  if (s) st().edit(scopeOf(s.r), (ws) => moveEdge(ws, s.r, s.edge.id, delta), `${s.edge.id}:rank`);
}

/** Modifie le questionnaire actif dans son historique (`q:<id>`) ; `key` regroupe les frappes. */
function editQuestionnaire(key: string, recipe: Parameters<ReturnType<typeof st>['edit']>[1]) {
  const q = activeQuestionnaire(st());
  if (q) st().edit(`q:${q.id}`, recipe, `${q.id}:${key}`);
}

const hasQuestionnaire = () => !!activeQuestionnaire(st());

/** Questionnaire visé par la validation (EVO-015) : `arg` = id, sinon le questionnaire affiché. */
const target = (arg?: unknown) => (typeof arg === 'string' ? st().ws.questionnaires.find((q) => q.id === arg) : activeQuestionnaire(st()));

/** Modifications ponctuelles : rang des arêtes, liaison par glisser, propriétés du questionnaire et du projet. */
export function editCommands(): Command[] {
  return [
    {
      id: 'edge.moveUp', label: 'edge.moveUp', keys: ['Alt+ArrowUp'], scope: 'graph',
      enabled: () => (selectedEdge()?.rank ?? 0) > 0, run: () => moveSelectedEdge(-1),
    },
    {
      id: 'edge.moveDown', label: 'edge.moveDown', keys: ['Alt+ArrowDown'], scope: 'graph',
      enabled: () => { const s = selectedEdge(); return !!s && s.rank < s.count - 1; }, run: () => moveSelectedEdge(1),
    },
    {
      // Liaison tracée à la souris (`arg` = { graph?, from, to, exit? } ; graphe actif par défaut ; `exit` : sortie de bloc).
      id: 'edge.create', label: 'node.connect', keys: [], scope: 'graph', hidden: true,
      run: (arg) => {
        const { graph, from, to, exit } = (arg ?? {}) as { graph?: GraphRef; from?: string; to?: string; exit?: string };
        const r = graph ?? ref();
        if (r && from && to) st().edit(scopeOf(r), (ws) => void connect(ws, r, from, to, undefined, exit || undefined));
      },
    },
    {
      // Sans sélection, le panneau de propriétés affiche celles du questionnaire.
      id: 'questionnaire.properties', label: 'questionnaire.properties', keys: [], scope: 'global', enabled: hasQuestionnaire,
      run: () => st().select({ graph: ref(), nodes: [] }),
    },
    {
      id: 'questionnaire.setTitle', label: 'questionnaire.title', keys: [], scope: 'global', hidden: true, enabled: hasQuestionnaire,
      run: (title) => editQuestionnaire('title', (ws) => patchQuestionnaire(ws, activeQuestionnaire(st())!.id, { title: title as LocalizedText })),
    },
    {
      id: 'questionnaire.setDescription', label: 'props.description', keys: [], scope: 'global', hidden: true, enabled: hasQuestionnaire,
      run: (d) => editQuestionnaire('description', (ws) => patchQuestionnaire(ws, activeQuestionnaire(st())!.id, { description: String(d ?? '') })),
    },
    {
      id: 'questionnaire.rename', label: 'questionnaire.key', keys: [], scope: 'global', hidden: true, enabled: hasQuestionnaire,
      run: (key) => {
        const id = activeQuestionnaire(st())!.id;
        if (typeof key !== 'string' || !canRenameQuestionnaire(st().ws, id, key)) return;
        editQuestionnaire('key', (ws) => renameQuestionnaire(ws, id, key));
      },
    },
    {
      // EVO-015 : un point d'historique du questionnaire ; le verrou ne porte pas sur l'état de validation.
      // EVO-022 : refusée sans version ; alerte non bloquante sur les éléments de bibliothèque provisoires.
      id: 'questionnaire.validate', label: 'questionnaire.validate', keys: [], scope: 'global',
      enabled: (arg) => { const q = target(arg); return !!q && !isValidated(q); },
      run: (arg) => {
        const q = target(arg);
        if (q && !isValidated(q)) validateQuestionnaire(q);
      },
    },
    {
      id: 'questionnaire.unvalidate', label: 'questionnaire.unvalidate', keys: [], scope: 'global',
      enabled: (arg) => isValidated(target(arg)),
      run: (arg) => {
        const q = target(arg);
        if (!q || !isValidated(q)) return;
        const name = q.title[st().contentLang] ?? q.title[st().ws.project.defaultLanguage] ?? q.key;
        if (!window.confirm(makeTranslate(st().uiLang)('validation.confirmUnvalidate', { name }))) return;
        st().edit(`q:${q.id}`, (ws) => setValidation(ws, q.id, undefined));
      },
    },
    {
      id: 'project.rename', label: 'project.name', keys: [], scope: 'global', hidden: true,
      run: (name) => st().edit('project', (ws) => void (ws.project.name = String(name ?? '')), 'name'),
    },
  ];
}
