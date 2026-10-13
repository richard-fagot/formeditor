/** Textes de la validation d'un formulaire (EVO-015). */
export const VALIDATION_MESSAGES = {
  'questionnaire.validate': { fr: 'Valider le formulaire', en: 'Validate the form' },
  'questionnaire.unvalidate': { fr: 'Dévalider', en: 'Unvalidate' },
  'validation.confirmUnvalidate': {
    fr: 'Dévalider le formulaire « {name} » ? Il redeviendra modifiable et ne sera plus marqué livrable.',
    en: 'Unvalidate the form “{name}”? It will become editable again and no longer be marked as deliverable.',
  },
  'validation.badge': { fr: 'Validé', en: 'Validated' },
  'validation.badgeTitle': { fr: 'Formulaire validé le {date} : lecture seule', en: 'Form validated on {date}: read-only' },
  'validation.locked': { fr: 'Formulaire validé : modification impossible', en: 'Validated form: change refused' },
  'validation.lockedLine': {
    fr: '« {name} » est validé, donc en lecture seule. Dévalidez-le pour le modifier.',
    en: '“{name}” is validated, hence read-only. Unvalidate it to change it.',
  },
} satisfies Record<string, { fr: string; en: string }>;
