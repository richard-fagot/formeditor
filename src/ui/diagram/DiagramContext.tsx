import { createContext, useContext } from 'react';
import type { Issue } from '../../core/validation';
import type { GraphRef } from '../../app/store';

/** Données partagées par les nœuds du logigramme. */
export interface DiagramInfo {
  graph: GraphRef;
  issuesByNode: Map<string, Issue[]>;
}

export const DiagramContext = createContext<DiagramInfo | null>(null);
export const useDiagram = () => useContext(DiagramContext)!;
