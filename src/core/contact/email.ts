/**
 * Mail (EVO-007) : syntaxe `addr-spec` de la RFC 5322 restreinte par la forme `Mailbox` de la RFC 5321
 * (pas de syntaxe obsolète, ni commentaire, ni espace repliable), ASCII seulement (RFC 6531 / 6532 non prises en charge).
 */

/** `atext` (RFC 5322 §3.2.3) : lettres, chiffres et `!#$%&'*+-/=?^_`{|}~`. */
const DOT_ATOM = /^[A-Za-z0-9!#$%&'*+\-/=?^_`{|}~]+(\.[A-Za-z0-9!#$%&'*+\-/=?^_`{|}~]+)*$/;
/** `Quoted-string` (RFC 5321 §4.1.2) : `qtextSMTP` (32-33, 35-91, 93-126) ou paire `\` + 32-126. */
const QUOTED = /^"([\x20\x21\x23-\x5B\x5D-\x7E]|\\[\x20-\x7E])*"$/;
/** Label de nom de domaine : 1 à 63 caractères, lettres, chiffres, tirets, sans tiret en début ni en fin. */
const LABEL = /^[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;
const SNUM = /^(25[0-5]|2[0-4]\d|1\d\d|\d{1,2})$/;
const HEX = /^[0-9A-Fa-f]{1,4}$/;

const isIPv4 = (s: string) => {
  const parts = s.split('.');
  return parts.length === 4 && parts.every((p) => SNUM.test(p));
};

/** `IPv6-addr` (RFC 5321 §4.1.3) : complète, compressée, avec ou sans IPv4 finale (qui compte pour 2 groupes). */
function isIPv6(s: string): boolean {
  let head = s;
  let v4 = 0;
  const i = s.lastIndexOf(':');
  if (i < 0) return false;
  if (s.slice(i + 1).includes('.')) {
    if (!isIPv4(s.slice(i + 1))) return false;
    head = s.slice(0, i + 1);
    if (!head.endsWith('::')) head = head.slice(0, -1);
    v4 = 2;
  }
  const halves = head.split('::');
  if (halves.length > 2) return false;
  const list = (h: string) => (h === '' ? [] : h.split(':'));
  if (halves.length === 1) {
    const g = list(head);
    return g.length === 8 - v4 && g.every((x) => HEX.test(x));
  }
  const all = [...list(halves[0]!), ...list(halves[1]!)];
  // « :: » vaut au moins deux groupes : au plus 6 groupes (4 avec une IPv4) en plus.
  return all.every((x) => HEX.test(x)) && all.length <= 6 - v4;
}

function isDomain(d: string): boolean {
  if (d.startsWith('[') && d.endsWith(']')) {
    const lit = d.slice(1, -1);
    return /^IPv6:/i.test(lit) ? isIPv6(lit.slice(5)) : isIPv4(lit);
  }
  return d.split('.').every((l) => LABEL.test(l));
}

/** Vrai si `s` (sans espaces de bord) est une adresse conforme. */
export function isEmail(s: string): boolean {
  const at = s.lastIndexOf('@');
  if (at <= 0 || s.length > 254) return false;
  const local = s.slice(0, at);
  const domain = s.slice(at + 1);
  return local.length <= 64 && (DOT_ATOM.test(local) || QUOTED.test(local)) && isDomain(domain);
}

/** Mail normalisé : espaces de bord retirés, nom de domaine en minuscules (partie locale et littéral IP inchangés). */
export function normalizeEmail(input: string): { value: string; valid: boolean } {
  const s = input.trim();
  if (!isEmail(s)) return { value: s, valid: false };
  const at = s.lastIndexOf('@');
  const domain = s.slice(at + 1);
  return { value: s.slice(0, at + 1) + (domain.startsWith('[') ? domain : domain.toLowerCase()), valid: true };
}
