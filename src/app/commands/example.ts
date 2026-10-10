import project from '../../../examples/declaration-sinistre/projet.json';
import library from '../../../examples/declaration-sinistre/bibliotheque.json';
import questionnaire from '../../../examples/declaration-sinistre/declaration_sinistre.json';
import layout from '../../../examples/declaration-sinistre/declaration_sinistre.layout.json';
import { importFiles, serialize } from '../../format';

/** Projet d'exemple embarqué dans l'outil (démonstrations). */
export function exampleWorkspace() {
  const files = [
    { name: 'projet.json', text: serialize(project) },
    { name: 'bibliotheque.json', text: serialize(library) },
    { name: 'declaration_sinistre.json', text: serialize(questionnaire) },
    { name: 'declaration_sinistre.layout.json', text: serialize(layout) },
  ];
  return importFiles(files).workspace!;
}
