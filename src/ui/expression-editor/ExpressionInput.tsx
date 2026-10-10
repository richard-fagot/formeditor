import { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, placeholder as cmPlaceholder } from '@codemirror/view';
import { autocompletion, completionKeymap, closeBrackets } from '@codemirror/autocomplete';
import { linter, type Diagnostic } from '@codemirror/lint';
import { history, historyKeymap, defaultKeymap } from '@codemirror/commands';
import { checkSyntax, extractReferences } from '../../core/expressions';
import { resolvePath } from '../../core/references';
import { cn } from '../../ui-kit';
import { useExpressionEnv } from './context';
import { completeReferences } from './completion';
import { jsonataHighlight, jsonataLanguage } from './language';

const MESSAGES = {
  unknown: { fr: 'Référence inconnue', en: 'Unknown reference' },
};

/**
 * Saisie d'une expression JSONata : coloration, autocomplétion des clés et variables,
 * validation en direct (syntaxe, références inconnues). Une seule ligne ; Entrée valide.
 */
export function ExpressionInput({
  value, onChange, placeholder, autoFocus, id, className, onSubmit,
}: {
  value: string;
  onChange(v: string): void;
  placeholder?: string;
  autoFocus?: boolean;
  id?: string;
  className?: string;
  onSubmit?: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView>(null);
  const env = useExpressionEnv();
  const envRef = useRef(env);
  envRef.current = env;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;

  useEffect(() => {
    const lint = linter((v): Diagnostic[] => {
      const text = v.state.doc.toString();
      if (!text.trim()) return [];
      const err = checkSyntax(text);
      if (err) {
        const to = Math.min(Math.max(err.position, 1), text.length);
        return [{ from: Math.max(0, to - 1), to, severity: 'error', message: err.message }];
      }
      const lang = envRef.current.uiLang === 'en' ? 'en' : 'fr';
      return extractReferences(text)
        .filter((r) => !resolvePath(envRef.current.scope, r))
        .map((r) => {
          const name = r.join('.');
          const from = Math.max(0, text.indexOf(r[0]!));
          return { from, to: from + name.length, severity: 'warning' as const, message: `${MESSAGES.unknown[lang]} : ${name}` };
        });
    }, { delay: 250 });
    const v = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: value,
        extensions: [
          history(),
          EditorState.transactionFilter.of((tr) => (tr.newDoc.lines > 1 ? [] : tr)),
          keymap.of([
            { key: 'Enter', run: () => (onSubmitRef.current?.(), true) },
            { key: 'Escape', run: (ev) => (ev.contentDOM.blur(), true) },
            ...completionKeymap, ...historyKeymap, ...defaultKeymap,
          ]),
          closeBrackets(),
          jsonataLanguage,
          jsonataHighlight,
          autocompletion({ override: [completeReferences(() => envRef.current.scope)], activateOnTyping: true }),
          lint,
          cmPlaceholder(placeholder ?? ''),
          EditorView.updateListener.of((u) => u.docChanged && onChangeRef.current(u.state.doc.toString())),
          EditorView.contentAttributes.of({ 'aria-label': placeholder ?? 'expression', ...(id ? { id } : {}) }),
          EditorView.theme({
            '&': { fontSize: '13px' },
            '&.cm-focused': { outline: 'none' },
            '.cm-content': { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', padding: '5px 0' },
            '.cm-line': { padding: '0 8px' },
          }),
        ],
      }),
    });
    view.current = v;
    if (autoFocus) v.focus();
    return () => v.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const v = view.current;
    if (v && v.state.doc.toString() !== value) v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } });
  }, [value]);

  useEffect(() => {
    if (!autoFocus) return;
    view.current?.focus();
    // Le logigramme peut reprendre le focus juste après : on le redonne.
    const id = setTimeout(() => view.current?.focus(), 30);
    return () => clearTimeout(id);
  }, [autoFocus]);

  return (
    <div
      ref={host}
      data-expression-editor
      className={cn('rounded-md border border-slate-200 bg-white shadow-xs focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100', className)}
    />
  );
}
