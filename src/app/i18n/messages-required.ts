/** Textes de la surcharge du caractère obligatoire (EVO-012). */
export const REQUIRED_MESSAGES = {
  'node.resetRequired': { fr: 'Revenir à la valeur héritée', en: 'Revert to the inherited value' },
  'required.label': { fr: 'Caractère obligatoire', en: 'Required' },
  'required.inherited': { fr: 'Hérité ({value}, {from})', en: 'Inherited ({value}, {from})' },
  'required.yes': { fr: 'Obligatoire', en: 'Required' },
  'required.no': { fr: 'Facultatif', en: 'Optional' },
  'required.when': { fr: 'Obligatoire sous condition', en: 'Conditionally required' },
  'required.fromLibrary': { fr: 'bibliothèque', en: 'library' },
  'required.fromFragment': { fr: 'fragment {name}', en: 'fragment {name}' },
  'required.local': { fr: 'surcharge locale', en: 'local override' },
  'required.effective': { fr: 'Valeur effective : {value} ({origin}).', en: 'Effective value: {value} ({origin}).' },
  'required.overridden': { fr: 'Surchargé', en: 'Overridden' },
  'required.badge': { fr: 'surch.', en: 'ovr.' },
  'required.badgeTitle': { fr: 'Caractère obligatoire surchargé localement', en: 'Required status overridden locally' },
  'required.fragmentQuestions': { fr: 'Questions du fragment : caractère obligatoire', en: 'Fragment questions: required status' },
  'required.none': { fr: 'Aucune question.', en: 'No question.' },
} satisfies Record<string, { fr: string; en: string }>;
