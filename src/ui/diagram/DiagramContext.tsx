import { createContext, useContext } from 'react';
import type { Issue } from '../../core/validation';
import type { GraphRef } from '../../app/store';

/** Données partagées par les nœuds du logigramme. */
export interface DiagramInfo {
  graph: GraphRef;
  issuesByNode: Map<string, Issue[]>;
  /** Logigramme en lecture seule (vue côte à côte). */
  readOnly?: boolean;
  /** Formulaire validé (EVO-015) : sélection permise, ni déplacement, ni liaison, ni dépôt, ni édition en place. */
  locked?: boolean;
}

export const DiagramContext = createContext<DiagramInfo | null>(null);
export const useDiagram = () => useContext(DiagramContext)!;
