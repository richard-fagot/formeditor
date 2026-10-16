/** Textes des éléments de bibliothèque inutilisés (EVO-028). */
export const UNUSED_MESSAGES = {
  'unused.question': { fr: 'Inutilisée : aucun questionnaire ni fragment ne l’utilise.', en: 'Unused: no questionnaire or fragment uses it.' },
  'unused.fragment': { fr: 'Inutilisé : aucun questionnaire ni fragment ne l’appelle.', en: 'Unused: no questionnaire or fragment calls it.' },
  'unused.labelSet': { fr: 'Inutilisé : aucune question booléenne ne l’utilise.', en: 'Unused: no boolean question uses it.' },
  'unused.countF1': { fr: '({n} inutilisée)', en: '({n} unused)' },
  'unused.countF': { fr: '({n} inutilisées)', en: '({n} unused)' },
  'unused.countM1': { fr: '({n} inutilisé)', en: '({n} unused)' },
  'unused.countM': { fr: '({n} inutilisés)', en: '({n} unused)' },
  'unused.total1': { fr: '1 élément de bibliothèque inutilisé', en: '1 unused library item' },
  'unused.total': { fr: '{n} éléments de bibliothèque inutilisés', en: '{n} unused library items' },
} satisfies Record<string, { fr: string; en: string }>;
