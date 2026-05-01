import { useEffect, useRef, useState } from 'react';
import { Pencil, Check, X } from 'lucide-react';

interface Props {
  value: string;
  onCommit: (next: string) => void;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
  className?: string;
  inputClassName?: string;
  displayClassName?: string;
  ariaLabel?: string;
  emptyHint?: string;
}

export function EditableField({
  value,
  onCommit,
  placeholder,
  multiline,
  maxLength = 200,
  className = '',
  inputClassName = '',
  displayClassName = '',
  ariaLabel,
  emptyHint = 'Click to add',
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      // place cursor at end
      const len = inputRef.current.value.length;
      try { inputRef.current.setSelectionRange(len, len); } catch { /* ignore */ }
    }
  }, [editing]);

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed !== value) onCommit(trimmed);
    setEditing(false);
  };

  if (!editing) {
    const isEmpty = !value;
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label={ariaLabel}
        className={`group inline-flex items-center gap-2 rounded-lg px-1.5 py-0.5 text-left transition hover:bg-slate-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 ${className}`}
      >
        <span className={isEmpty ? 'text-slate-400' : displayClassName}>
          {isEmpty ? (placeholder || emptyHint) : value}
        </span>
        <Pencil className="h-3.5 w-3.5 text-slate-400 opacity-0 transition group-hover:opacity-100" />
      </button>
    );
  }

  const sharedProps = {
    ref: inputRef as React.RefObject<HTMLInputElement & HTMLTextAreaElement>,
    value: draft,
    maxLength,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.target.value),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cancel();
      } else if (e.key === 'Enter' && !multiline) {
        e.preventDefault();
        commit();
      } else if (e.key === 'Enter' && multiline && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        commit();
      }
    },
    placeholder,
    className: `w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 ${inputClassName}`,
    'aria-label': ariaLabel,
  };

  return (
    <div className={`flex items-start gap-2 ${className}`}>
      {multiline ? <textarea rows={3} {...sharedProps} /> : <input type="text" {...sharedProps} />}
      <div className="flex shrink-0 items-center gap-1 pt-1">
        <button type="button" onClick={commit} className="rounded-md bg-emerald-50 p-1.5 text-emerald-700 hover:bg-emerald-100" aria-label="Save"><Check className="h-4 w-4" /></button>
        <button type="button" onClick={cancel} className="rounded-md bg-slate-50 p-1.5 text-slate-600 hover:bg-slate-100" aria-label="Cancel"><X className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
