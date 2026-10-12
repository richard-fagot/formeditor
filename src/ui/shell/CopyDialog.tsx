import { useEffect, useState } from 'react';
import { isValidKey, uniqueKey } from '../../core/model';
import { runCommand } from '../../app/commands';
import { getGraph, useStore, useT, usedKeys } from '../../app/store';
import { Button, Dialog, Field, Input } from '../../ui-kit';

/** Copie en bibliothèque d'une question dont la clé y est déjà prise : choix d'une autre clé (EVO-009). */
export function CopyDialog() {
  const t = useT();
  const req = useStore((s) => s.copyRequest);
  const ws = useStore((s) => s.ws);
  const g = req ? getGraph(ws, req.graph) : undefined;
  const node = g?.nodes.find((n) => n.id === req?.nodeId);
  const current = node && node.kind === 'question' && !('ref' in node) ? node.key : '';
  const taken = g ? [...ws.library.questions.map((q) => q.key), ...usedKeys(ws, g).filter((k) => k !== current)] : [];
  const [key, setKey] = useState('');
  // Proposition à l'ouverture du dialogue seulement.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setKey(current ? uniqueKey(current, taken) : ''), [req]);
  const valid = isValidKey(key) && !taken.includes(key);
  const close = () => useStore.getState().set((s) => void (s.copyRequest = undefined));
  const confirm = () => valid && req && runCommand('node.toLibrary', { ...req, key });
  return (
    <Dialog open={!!req && !!current} onOpenChange={close} title={t('node.toLibrary')} description={t('copy.keyTaken', { key: current })}>
      <div className="p-4">
        <Field label={t('copy.newKey')} htmlFor="copy-key">
          <Input id="copy-key" className={`font-mono ${valid ? '' : 'border-rose-400'}`} value={key} autoFocus
            onChange={(e) => setKey(e.target.value.trim())} onKeyDown={(e) => e.key === 'Enter' && confirm()} />
          {!valid && <p className="mt-1 text-xs text-rose-600">{t('copy.keyInvalid')}</p>}
        </Field>
      </div>
      <div className="flex justify-end gap-2 p-3">
        <Button onClick={close}>{t('common.cancel')}</Button>
        <Button variant="primary" disabled={!valid} onClick={confirm}>{t('copy.confirm')}</Button>
      </div>
    </Dialog>
  );
}
