import type { LocalizedText } from '../model';

/** Messages d'erreur par défaut des contraintes intégrées (`{0}` = valeur de la borne). */
export const DEFAULT_MESSAGES: Record<string, LocalizedText> = {
  required: { fr: 'Réponse obligatoire.', en: 'This answer is required.' },
  minLength: { fr: 'Au moins {0} caractères.', en: 'At least {0} characters.' },
  maxLength: { fr: 'Au plus {0} caractères.', en: 'At most {0} characters.' },
  pattern: { fr: 'Format invalide.', en: 'Invalid format.' },
  format: { fr: 'Date invalide (AAAA-MM-JJ).', en: 'Invalid date (YYYY-MM-DD).' },
  min: { fr: 'Valeur minimale : {0}.', en: 'Minimum value: {0}.' },
  max: { fr: 'Valeur maximale : {0}.', en: 'Maximum value: {0}.' },
  numberKind: { fr: 'Nombre {0} attendu.', en: '{0} number expected.' },
  decimals: { fr: 'Au plus {0} décimales.', en: 'At most {0} decimals.' },
  minSelected: { fr: 'Choisissez au moins {0} réponses.', en: 'Select at least {0} answers.' },
  maxSelected: { fr: 'Choisissez au plus {0} réponses.', en: 'Select at most {0} answers.' },
  option: { fr: "Cette réponse n'est plus proposée.", en: 'This answer is no longer available.' },
  otherDetail: { fr: 'Précisez votre réponse.', en: 'Please specify.' },
  minOccurrences: { fr: 'Au moins {0} élément(s).', en: 'At least {0} item(s).' },
  maxOccurrences: { fr: 'Au plus {0} élément(s).', en: 'At most {0} item(s).' },
  constraint: { fr: 'Valeur invalide.', en: 'Invalid value.' },
  email: { fr: 'Adresse mail invalide.', en: 'Invalid email address.' },
  phone: { fr: 'Numéro de téléphone invalide.', en: 'Invalid phone number.' },
  lineType: { fr: 'Numéro {0} attendu.', en: '{0} number expected.' },
  address: { fr: 'Adresse invalide : une ligne de {0} caractères, avec au moins une lettre.', en: 'Invalid address: one line of {0} characters, with at least one letter.' },
  postalCode: { fr: 'Code postal manquant.', en: 'Postal code missing.' },
};

const LINE_TYPES: Record<string, LocalizedText> = {
  mobile: { fr: 'mobile', en: 'Mobile' },
  fixed: { fr: 'fixe', en: 'Landline' },
};

const NUMBER_KINDS: Record<string, LocalizedText> = {
  natural: { fr: 'entier positif', en: 'Natural' },
  integer: { fr: 'entier', en: 'Integer' },
};

/** Message par défaut, borne insérée (accolades échappées : le message est ensuite interpolé). */
export function defaultMessage(param: string, arg?: unknown): LocalizedText {
  const base = DEFAULT_MESSAGES[param] ?? DEFAULT_MESSAGES.constraint!;
  return Object.fromEntries(
    Object.entries(base).map(([lang, t]) => {
      const names = param === 'numberKind' ? NUMBER_KINDS : param === 'lineType' ? LINE_TYPES : undefined;
      const a = names ? (names[String(arg)]?.[lang] ?? String(arg)) : String(arg ?? '');
      return [lang, t.replace('{0}', a.replace(/[{}]/g, (c) => c + c))];
    }),
  );
}

/** Problèmes de vérification (§4.6) : gabarits par code et par langue. */
export const ISSUE_MESSAGES: Record<string, LocalizedText> = {
  invalidExpression: { fr: 'Expression invalide « {expr} » : {error}', en: 'Invalid expression "{expr}": {error}' },
  unknownReference: { fr: 'Référence inconnue « {ref} »', en: 'Unknown reference "{ref}"' },
  unknownFilterReference: {
    fr: 'Référence inconnue « {ref} » : dans un filtre, un nom désigne un champ de l’élément ; pour la question « {key} », écrire $$.{key}',
    en: 'Unknown reference "{ref}": in a filter, a name is a field of the item; for the question "{key}", write $$.{key}',
  },
  duplicateKey: { fr: 'Clé en double « {key} »', en: 'Duplicate key "{key}"' },
  invalidKey: { fr: 'Clé invalide « {key} » (snake_case attendu)', en: 'Invalid key "{key}" (snake_case expected)' },
  unreachable: { fr: 'Nœud inaccessible depuis le départ', en: 'Node unreachable from start' },
  deadEnd: { fr: 'Nœud sans sortie qui n’est pas une fin', en: 'Node without exit that is not an end' },
  exitNotConnected: { fr: 'Sortie « {exit} » du fragment non raccordée', en: 'Fragment exit "{exit}" not connected' },
  unknownExit: { fr: 'Sortie « {exit} » inconnue dans le fragment', en: 'Unknown fragment exit "{exit}"' },
  implicitExitNotConnected: {
    fr: 'Sorties du fragment non raccordées : aucune arête sans nom de sortie',
    en: 'Fragment exits not connected: no edge without an exit name',
  },
  fragmentEntry: {
    fr: 'Fragment sans entrée unique ({count} nœuds sans arête entrante) : définir l’entrée du fragment',
    en: 'Fragment without a single entry ({count} nodes without incoming edge): set the fragment entry',
  },
  fragmentNoExit: { fr: 'Fragment sans sortie (aucun nœud sans arête sortante)', en: 'Fragment without exit (no node without outgoing edge)' },
  fragmentCycle: { fr: 'Cycle d’appels : ce fragment s’appelle lui-même', en: 'Call cycle: this fragment calls itself' },
  unusedFragment: { fr: 'Fragment inutilisé', en: 'Unused fragment' },
  endInFragment: { fr: 'Fin dans un fragment : le parcours s’y termine', en: 'End inside a fragment: the run stops there' },
  expectedKeyMissing: {
    fr: 'Clé « {ref} » attendue par le fragment « {fragment} » absente',
    en: 'Key "{ref}" expected by fragment "{fragment}" is missing',
  },
  loopWithoutExit: { fr: 'Boucle sans sortie possible', en: 'Loop without possible exit' },
  noElse: { fr: 'Plusieurs sorties sans « sinon »', en: 'Several exits without "else"' },
  multipleElse: { fr: 'Plusieurs arêtes sans condition : seule la première sert', en: 'Several unconditioned edges: only the first is used' },
  notGuaranteed: { fr: '« {ref} » n’est pas posée sur tous les chemins menant ici', en: '"{ref}" is not asked on every path leading here' },
  missingTranslation: { fr: 'Traduction manquante ({lang}) : {property}', en: 'Missing translation ({lang}): {property}' },
  libraryMissing: { fr: 'Élément de bibliothèque introuvable « {ref} »', en: 'Library item not found "{ref}"' },
  duplicateGroup: { fr: 'Groupe d’options en double « {group} »', en: 'Duplicate option group "{group}"' },
  reservedGroupCode: { fr: 'Code de groupe réservé « {group} » (« Autre (préciser) » ou « Ne sais pas »)', en: 'Reserved group code "{group}" ("Other (specify)" or "Don’t know")' },
  emptyGroup: { fr: 'Groupe d’options sans option « {group} »', en: 'Option group without options "{group}"' },
  missingStart: { fr: 'Nœud de départ introuvable', en: 'Start node not found' },
};
