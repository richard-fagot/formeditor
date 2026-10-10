/** Sérialisation canonique : JSON indenté de 2 espaces, ordre des clés conservé, saut de ligne final. */
export function serialize(doc: unknown): string {
  return JSON.stringify(doc, null, 2) + '\n';
}
