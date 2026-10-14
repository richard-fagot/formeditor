import { isItemValidated, itemUsers, libraryItemOf, type LibraryItemRef } from '../../core/model';
import { runCommand } from '../../app/commands';
import { useStore, useT } from '../../app/store';
import { Badge, Button, Field, Input } from '../../ui-kit';

/**
 * Version et statut d'un élément de bibliothèque (EVO-022) : champ « Version » grisé tant qu'il est validé (infobulle),
 * indicateur Validé / Provisoire, bouton Valider / Dévalider, questionnaires qui l'utilisent (directement ou par un fragment).
 */
export function ItemVersion({ item, className }: { item: LibraryItemRef; className?: string }) {
  const t = useT();
  const ws = useStore((s) => s.ws);
  const x = libraryItemOf(ws.library, item);
  if (!x) return null;
  const validated = isItemValidated(x);
  const users = itemUsers(ws, item).map((q) => (q.status === 'validated' ? t('version.userValidated', { name: q.key }) : q.key));
  return (
    <div className={className} data-testid="item-version">
      <div className="flex items-end gap-3">
        <div className="w-40" title={validated ? t('version.locked') : undefined}>
          <Field label={t('version.label')} htmlFor={`version-${item.id}`}>
            <Input id={`version-${item.id}`} data-testid="item-version-input" value={x.version ?? ''} placeholder="1.0.0" disabled={validated}
              onChange={(e) => runCommand('library.setVersion', { ...item, version: e.target.value })} />
          </Field>
        </div>
        <span className="pb-1.5" data-testid="item-version-status">
          <Badge tone={validated ? 'emerald' : 'slate'}>{validated ? t('version.final') : t('version.draft')}</Badge>
        </span>
        {validated
          ? <Button size="sm" data-testid="item-unvalidate" onClick={() => runCommand('library.unvalidate', item)}>{t('questionnaire.unvalidate')}</Button>
          : <Button size="sm" data-testid="item-validate" onClick={() => runCommand('library.validate', item)}>{t('version.validate')}</Button>}
      </div>
      <p className="mt-1 text-xs text-slate-500" data-testid="item-users">
        {users.length ? t('version.users', { list: users.join(', ') }) : t('version.noUser')}
      </p>
    </div>
  );
}
