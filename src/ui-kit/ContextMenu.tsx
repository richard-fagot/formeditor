import { useEffect, useRef, type ReactNode } from 'react';

export interface ContextMenuItem {
  label: string;
  /** Raccourci affiché à droite (texte déjà formaté). */
  hint?: ReactNode;
  disabled?: boolean;
  onSelect(): void;
}

/** Menu contextuel positionné au point du clic ; se ferme au clic extérieur, à Échap ou après un choix. */
export function ContextMenu({ at, items, onClose }: { at?: { x: number; y: number }; items: ContextMenuItem[]; onClose(): void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!at) return;
    const down = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && onClose();
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('mousedown', down, true);
    window.addEventListener('keydown', key, true);
    return () => {
      window.removeEventListener('mousedown', down, true);
      window.removeEventListener('keydown', key, true);
    };
  }, [at, onClose]);
  if (!at) return null;
  return (
    <div ref={ref} role="menu" className="fixed z-50 min-w-44 rounded-md border border-slate-200 bg-white py-1 text-sm shadow-lg" style={{ left: at.x, top: at.y }}
      onContextMenu={(e) => e.preventDefault()}>
      {items.map((it) => (
        <button key={it.label} type="button" role="menuitem" disabled={it.disabled}
          className="flex w-full items-center justify-between gap-4 px-3 py-1 text-left text-slate-700 hover:bg-slate-100 disabled:opacity-40"
          onClick={() => {
            onClose();
            it.onSelect();
          }}>
          <span>{it.label}</span>
          {it.hint && <span className="text-xs text-slate-400">{it.hint}</span>}
        </button>
      ))}
    </div>
  );
}
