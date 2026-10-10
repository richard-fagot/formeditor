import * as RadixDialog from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';
import { cn } from './cn';

/** Fenêtre modale accessible (Radix). */
export function Dialog({
  open, onOpenChange, title, children, className, description,
}: { open: boolean; onOpenChange(open: boolean): void; title: ReactNode; children: ReactNode; className?: string; description?: ReactNode }) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-[1px]" />
        <RadixDialog.Content
          className={cn('fixed left-1/2 top-[12vh] z-50 w-[min(640px,92vw)] -translate-x-1/2 rounded-xl border border-slate-200 bg-white shadow-2xl focus:outline-none', className)}
          aria-describedby={undefined}
        >
          <RadixDialog.Title className={description ? 'px-4 pt-3 text-sm font-semibold text-slate-700' : 'sr-only'}>{title}</RadixDialog.Title>
          {description && <RadixDialog.Description className="px-4 text-xs text-slate-500">{description}</RadixDialog.Description>}
          {children}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
