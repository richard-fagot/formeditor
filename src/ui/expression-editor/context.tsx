import { createContext, useContext, type ReactNode } from 'react';
import type { Scope } from '../../core/references';

/** Ce que l'éditeur d'expression doit connaître : portée des références et langues. */
export interface ExpressionEnv {
  scope: Scope;
  uiLang: string;
  languages: string[];
  contentLang: string;
}

const Ctx = createContext<ExpressionEnv>({ scope: new Map(), uiLang: 'fr', languages: ['fr'], contentLang: 'fr' });

export function ExpressionEnvProvider({ value, children }: { value: ExpressionEnv; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useExpressionEnv = () => useContext(Ctx);
