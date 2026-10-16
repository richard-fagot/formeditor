// Suppression d'un questionnaire (EVO-027) : retrait du projet, effets sur les onglets, annulation depuis tout onglet.
import type { Workspace } from '../../core/model';
import type { TabId } from './travel';

/** Ce que la confirmation de suppression annonce (EVO-027-006 à 008). */
export interface DeletionImpact {
  validated: boolean;
  /** Commentaires de révision du questionnaire. */
  comments: number;
  /** Boutons de renvoi d'autres questionnaires qui le ciblent. */
  redirects: number;
}

export function deletionImpact(ws: Workspace, id: string): DeletionImpact {
  const q = ws.questionnaires.find((x) => x.id === id);
  const redirects = ws.questionnaires
    .filter((x) => x.id !== id)
    .flatMap((x) => x.nodes)
    .flatMap((n) => (n.kind === 'redirect' ? n.buttons : []))
    .filter((b) => b.target && 'questionnaire' in b.target && b.target.questionnaire === id).length;
  return {
    validated: q?.status === 'validated',
    comments: ws.layouts.find((l) => l.graph === id)?.comments?.length ?? 0,
    redirects,
  };
}

/** Retire du projet le questionnaire, sa mise en page (commentaires compris) et son entrée ; la bibliothèque reste inchangée. */
export function removeQuestionnaire(ws: Workspace, id: string): void {
  ws.questionnaires = ws.questionnaires.filter((q) => q.id !== id);
  ws.layouts = ws.layouts.filter((l) => l.graph !== id);
  ws.project.questionnaires = ws.project.questionnaires.filter((e) => e.id !== id);
}

/**
 * Dernière suppression : `tx` du point d'historique (portées `project` et `q:<id>`), rangs du questionnaire et de sa mise
 * en page dans le projet, place de l'onglet (-1 : fermé), onglet actif ou non, `done` vrai tant que la suppression est en
 * place (faux après l'avoir annulée).
 * Effacée par toute autre modification du projet, annulation ou rétablissement.
 */
export interface Deletion {
  tx: number;
  id: string;
  index: number;
  layout: number;
  tab: number;
  active: boolean;
  done: boolean;
}

interface TabState {
  ws: Workspace;
  tabs: TabId[];
  activeTab: TabId;
  selection: { graph?: { kind: string; id: string }; nodes: string[]; edge?: string };
  compare?: string;
}

/** Après la suppression : onglet retiré, onglet précédent actif (Bibliothèque sans onglet ou sans questionnaire), vue côte à côte fermée. */
export function closeDeleted(s: TabState, id: string): void {
  const tab: TabId = `q:${id}`;
  const i = s.tabs.indexOf(tab);
  s.tabs = s.tabs.filter((t) => t !== tab);
  if (s.activeTab === tab) s.activeTab = s.tabs[Math.max(0, i - 1)] ?? 'library';
  if (!s.tabs.length || !s.ws.questionnaires.length) {
    if (!s.tabs.includes('library')) s.tabs.push('library');
    s.activeTab = 'library';
  }
  if (s.compare === id) s.compare = undefined;
  if (s.selection.graph?.kind === 'questionnaire' && s.selection.graph.id === id) s.selection = { nodes: [] };
}

/** Place d'une suppression à venir : rangs du questionnaire, de sa mise en page et de son onglet. */
export function deletionPlace(s: TabState, id: string): Pick<Deletion, 'index' | 'layout' | 'tab' | 'active'> {
  return {
    index: s.ws.questionnaires.findIndex((q) => q.id === id),
    layout: s.ws.layouts.findIndex((l) => l.graph === id),
    tab: s.tabs.indexOf(`q:${id}`),
    active: s.activeTab === `q:${id}`,
  };
}

/** Remet l'élément `pred` de `list` au rang `at` (restauré en fin de tableau par l'historique). */
function moveTo<T>(list: T[], pred: (x: T) => boolean, at: number): void {
  const i = list.findIndex(pred);
  if (i < 0 || at < 0) return;
  const [x] = list.splice(i, 1);
  list.splice(Math.min(at, list.length), 0, x!);
}

/**
 * Après l'annulation d'une suppression : questionnaire et mise en page à leur rang (projet identique à l'avant-suppression),
 * onglet à sa place (ou fermé), actif s'il l'était.
 */
export function reopenDeleted(s: TabState, d: Deletion): void {
  moveTo(s.ws.questionnaires, (q) => q.id === d.id, d.index);
  moveTo(s.ws.layouts, (l) => l.graph === d.id, d.layout);
  const tab: TabId = `q:${d.id}`;
  s.tabs = s.tabs.filter((t) => t !== tab);
  if (d.tab >= 0) s.tabs.splice(Math.min(d.tab, s.tabs.length), 0, tab);
  if (d.active) s.activeTab = tab;
}
