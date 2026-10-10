import { useMemo } from 'react';
import { useEditorEnv } from '../../app/store';
import type { EditorEnv } from '../../plugin-api';
import { questionType } from '../../registry';

/** Environnement transmis aux plugins : celui de l'éditeur, plus l'accès aux types de questions du registre. */
export function usePluginEnv(): EditorEnv {
  const env = useEditorEnv();
  return useMemo(() => ({ ...env, questionType }), [env]);
}
