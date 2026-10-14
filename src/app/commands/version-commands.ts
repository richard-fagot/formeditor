import {
  isItemValidated, isVariantLabel, libraryItemOf, provisionalItems, type LibraryItemRef, type LocalizedText, type Questionnaire,
} from '../../core/model';
import { todayIso } from '../../core/expressions';
import { activeQuestionnaire, patchQuestionnaire, setItemValidation, setItemVersion, setValidation, useStore } from '../store';
import { makeTranslate } from '../i18n';
import { inform, refuse } from '../feedback';
import type { Command } from './types';

// Versionning des questionnaires et des éléments de bibliothèque (EVO-022).

const st = () => useStore.getState();
const t = () => makeTranslate(st().uiLang);
const text = (l: LocalizedText) => l[st().contentLang] ?? l[st().ws.project.defaultLanguage];

/** Nom d'un élément de bibliothèque dans la langue du contenu (intitulé ou titre), sinon sa clé. */
export function itemName(item: LibraryItemRef): string {
  const x = libraryItemOf(st().ws.library, item);
  if (!x) return item.id;
  const label = 'label' in x ? (isVariantLabel(x.label) ? x.label.otherwise : x.label) : x.title;
  return text(label) || x.key;
}

const isRef = (x: unknown): x is LibraryItemRef =>
  !!x && typeof x === 'object' && ((x as LibraryItemRef).kind === 'question' || (x as LibraryItemRef).kind === 'fragment') && typeof (x as LibraryItemRef).id === 'string';

/** Élément visé : `arg`, sinon le fragment de l'onglet actif, sinon la question affichée dans l'onglet Bibliothèque. */
function target(arg?: unknown): LibraryItemRef | undefined {
  if (isRef(arg)) return arg;
  const tab = st().activeTab;
  if (tab.startsWith('f:')) return { kind: 'fragment', id: tab.slice(2) };
  return tab === 'library' ? st().libraryItem : undefined;
}
const itemOf = (arg?: unknown) => { const r = target(arg); return r ? libraryItemOf(st().ws.library, r) : undefined; };

/**
 * Valide un questionnaire (EVO-015) : refusé avec un message si sa version est vide ; sinon validé (versions de
 * référence relevées), puis alerte non bloquante s'il utilise des éléments provisoires.
 */
export function validateQuestionnaire(q: Questionnaire) {
  const name = text(q.title) || q.key;
  if (!q.version?.trim()) return refuse('version.required', { key: 'version.requiredLine', params: { name } });
  st().edit(`q:${q.id}`, (ws) => setValidation(ws, q.id, todayIso()));
  const drafts = provisionalItems(st().ws.library, q);
  if (!drafts.length) return;
  const version = (r: LibraryItemRef) => libraryItemOf(st().ws.library, r)?.version || t()('version.empty');
  inform('version.provisional', ...drafts.map((r) => ({ key: 'version.provisionalLine' as const, params: { name: itemName(r), version: version(r) } })));
}

export function versionCommands(): Command[] {
  return [
    {
      id: 'questionnaire.setVersion', label: 'version.label', keys: [], scope: 'global', hidden: true, enabled: () => !!activeQuestionnaire(st()),
      run: (v) => {
        const q = activeQuestionnaire(st());
        if (q) st().edit(`q:${q.id}`, (ws) => patchQuestionnaire(ws, q.id, { version: String(v ?? '') }), `${q.id}:version`);
      },
    },
    {
      // `arg` = { kind, id, version } ; refusé sur un élément validé (version figée).
      id: 'library.setVersion', label: 'version.label', keys: [], scope: 'global', hidden: true,
      run: (arg) => {
        const r = target(arg);
        const version = String((arg as { version?: unknown })?.version ?? '');
        if (!r) return;
        if (isItemValidated(libraryItemOf(st().ws.library, r))) return refuse('version.locked', { raw: itemName(r) });
        st().edit('library', (ws) => void setItemVersion(ws, r, version), `${r.id}:version`);
      },
    },
    {
      id: 'library.validate', label: 'library.validate', keys: [], scope: 'global',
      enabled: (arg) => { const x = itemOf(arg); return !!x && !isItemValidated(x); },
      run: (arg) => {
        const r = target(arg);
        const x = itemOf(arg);
        if (!r || !x || isItemValidated(x)) return;
        if (!x.version?.trim()) return refuse('version.required', { key: 'version.requiredLine', params: { name: itemName(r) } });
        st().edit('library', (ws) => setItemValidation(ws, r, true));
      },
    },
    {
      // Sans confirmation : seule la version est figée par la validation d'un élément.
      id: 'library.unvalidate', label: 'library.unvalidate', keys: [], scope: 'global',
      enabled: (arg) => isItemValidated(itemOf(arg)),
      run: (arg) => {
        const r = target(arg);
        if (r && isItemValidated(itemOf(arg))) st().edit('library', (ws) => setItemValidation(ws, r, false));
      },
    },
  ];
}
