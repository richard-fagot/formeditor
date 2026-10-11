// Guide utilisateur (docs/GUIDE.md) : index des raccourcis généré et contrôle des balises `[cmd: …]`.
// Fonctions pures, sans accès disque : utilisées par `scripts/guide.mjs` et par les tests.

/** Commande du catalogue, telle que le guide la voit. */
export interface GuideCommand {
  id: string;
  /** Libellé affiché (langue d'interface par défaut). */
  label: string;
  /** Raccourcis par défaut, déjà mis en forme (`Ctrl+K`, `Alt+I`). */
  keys: string[];
}

export const INDEX_START = '<!-- debut:raccourcis (généré par npm run guide, ne pas modifier à la main) -->';
export const INDEX_END = '<!-- fin:raccourcis -->';
const TAG = /\[cmd:\s*([^\]\s]+)\s*\]/g;

const cell = (s: string) => s.replace(/\|/g, '\\|');

/** Tableau « Action | Raccourci par défaut | Identifiant », dans l'ordre du catalogue. */
export function shortcutIndex(commands: GuideCommand[]): string {
  const rows = commands.map((c) => {
    const keys = c.keys.length ? c.keys.map((k) => `\`${cell(k)}\``).join(' ou ') : '—';
    return `| ${cell(c.label)} | ${keys} | \`${c.id}\` |`;
  });
  return ['| Action | Raccourci par défaut | Identifiant |', '| --- | --- | --- |', ...rows].join('\n');
}

/** Position du bloc généré (entre les marqueurs), ou `undefined` si les marqueurs manquent. */
function indexBounds(md: string): { from: number; to: number } | undefined {
  const start = md.indexOf(INDEX_START);
  const end = md.indexOf(INDEX_END);
  if (start < 0 || end < start) return undefined;
  return { from: start + INDEX_START.length, to: end };
}

/** Guide dont l'index est régénéré ; lève une erreur si les marqueurs manquent. */
export function withIndex(md: string, commands: GuideCommand[]): string {
  const b = indexBounds(md);
  if (!b) throw new Error(`Marqueurs de l'index des raccourcis introuvables (${INDEX_START} … ${INDEX_END}).`);
  return `${md.slice(0, b.from)}\n${shortcutIndex(commands)}\n${md.slice(b.to)}`;
}

/** Identifiants des balises `[cmd: …]` hors de l'index généré. */
export function guideTags(md: string): string[] {
  const b = indexBounds(md);
  const text = b ? md.slice(0, b.from) + md.slice(b.to) : md;
  return [...text.matchAll(TAG)].map((m) => m[1]!);
}

/**
 * Écarts entre le guide et le catalogue : commande sans balise, balise inconnue, index absent ou périmé.
 * Liste vide : guide conforme.
 */
export function checkGuide(md: string, commands: GuideCommand[]): string[] {
  const errors: string[] = [];
  const tags = new Set(guideTags(md));
  const ids = new Set(commands.map((c) => c.id));
  for (const c of commands) if (!tags.has(c.id)) errors.push(`Commande sans entrée balisée dans le guide : [cmd: ${c.id}] (${c.label}).`);
  for (const t of tags) if (!ids.has(t)) errors.push(`Balise sans commande correspondante : [cmd: ${t}].`);
  if (!indexBounds(md)) errors.push('Index des raccourcis absent (marqueurs manquants).');
  else if (withIndex(md, commands) !== md) errors.push('Index des raccourcis périmé : lancer `npm run guide`.');
  return errors;
}
