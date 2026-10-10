import { deriveKey, isLocalQuestion, uniqueKey, type Label, type Workspace } from '../../core/model';
import { renameKey } from '../../core/references';
import { previewText } from '../../plugin-api';
import { getGraph, updateNode, usedKeys, type GraphRef } from './graph';

/**
 * Change l'intitulé d'une question. Si la clé était encore dérivée de l'ancien intitulé, elle est
 * dérivée du nouveau et le renommage est propagé (spec §4.3).
 */
export function setQuestionLabel(ws: Workspace, ref: GraphRef, nodeId: string, label: Label | undefined, lang: string): Workspace {
  const g = getGraph(ws, ref);
  const node = g?.nodes.find((n) => n.id === nodeId);
  if (!g || !node || node.kind !== 'question') return ws;
  const env = { contentLang: lang, defaultLang: ws.project.defaultLanguage };
  if (!isLocalQuestion(node)) {
    updateNode(ws, ref, nodeId, { label });
    return ws;
  }
  const oldBase = deriveKey(previewText(node.label, env));
  const derived = new RegExp(`^${oldBase}(_\\d+)?$`).test(node.key);
  updateNode(ws, ref, nodeId, { label: label ?? {} });
  const text = previewText(label, env);
  if (!derived || !text.trim()) return ws;
  const others = usedKeys(ws, g).filter((k) => k !== node.key);
  const key = uniqueKey(deriveKey(text), others);
  if (key === node.key) return ws;
  const owner = ref.kind === 'questionnaire' ? { kind: 'questionnaire' as const, id: ref.id } : { kind: 'block' as const, id: ref.id };
  return renameKey(ws, { kind: 'question', owner, nodeId }, key);
}
