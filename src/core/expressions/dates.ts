/** Fonctions de date ajoutées à JSONata. Les dates sont des chaînes ISO `AAAA-MM-JJ`. */
const DAY_MS = 86_400_000;

export function todayIso(now = new Date()): string {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

const toUtc = (iso: string) => Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);

export function addDays(iso: string, n: number): string {
  return new Date(toUtc(iso) + n * DAY_MS).toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((toUtc(b) - toUtc(a)) / DAY_MS);
}

export function age(birth: string, today: string): number {
  const [by, bm, bd] = birth.split('-').map(Number) as [number, number, number];
  const [ty, tm, td] = today.split('-').map(Number) as [number, number, number];
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
}
