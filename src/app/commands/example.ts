import project from '../../../examples/declaration-sinistre/projet.json';
import library from '../../../examples/declaration-sinistre/bibliotheque.json';
import questionnaire from '../../../examples/declaration-sinistre/declaration_sinistre - 1.0.5 - provisoire.json';
import layout from '../../../examples/declaration-sinistre/declaration_sinistre - 1.0.5 - provisoire.layout.json';
import refund from '../../../examples/declaration-sinistre/demande_remboursement - 1.0.4 - final.json';
import refundLayout from '../../../examples/declaration-sinistre/demande_remboursement - 1.0.4 - final.layout.json';
import fragmentLayout from '../../../examples/declaration-sinistre/fragment_identification_assure.layout.json';
import { importFiles, serialize } from '../../format';

/** Projet d'exemple embarqué dans l'outil (démonstrations). */
export function exampleWorkspace() {
  const files = [
    { name: 'projet.json', text: serialize(project) },
    { name: 'bibliotheque.json', text: serialize(library) },
    { name: 'declaration_sinistre - 1.0.5 - provisoire.json', text: serialize(questionnaire) },
    { name: 'declaration_sinistre - 1.0.5 - provisoire.layout.json', text: serialize(layout) },
    { name: 'demande_remboursement - 1.0.4 - final.json', text: serialize(refund) },
    { name: 'demande_remboursement - 1.0.4 - final.layout.json', text: serialize(refundLayout) },
    { name: 'fragment_identification_assure.layout.json', text: serialize(fragmentLayout) },
  ];
  return importFiles(files).workspace!;
}
