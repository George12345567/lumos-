import { useState } from 'react';
import { Plus, X, Check } from 'lucide-react';
import { BRAND_COLOR_PRESETS } from '../constants';

interface Props {
  colors: string[];
  onChange: (next: string[]) => void;
  accent?: string;
  onAccentChange?: (next: string) => void;
}

const isValidHex = (v: string) => /^#?[0-9a-fA-F]{6}$/.test(v);
const normalizeHex = (v: string) => (v.startsWith('#') ? v : `#${v}`).toLowerCase();

export function ColorPicker({ colors, onChange, accent, onAccentChange }: Props) {
  const [draft, setDraft] = useState('#');

  const addColor = (hex: string) => {
    const norm = normalizeHex(hex);
    if (!isValidHex(norm)) return;
    if (colors.includes(norm)) return;
    onChange([...colors, norm]);
  };

  const removeColor = (hex: string) => {
    onChange(colors.filter((c) => c !== hex));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {colors.map((c) => (
          <div key={c} className="group relative">
            <button
              type="button"
              onClick={() => onAccentChange?.(c)}
              className={`relative h-10 w-10 rounded-xl border-2 shadow-sm transition ${accent === c ? 'border-slate-900' : 'border-white'}`}
              style={{ backgroundColor: c }}
              aria-label={`Brand color ${c}${accent === c ? ' (active accent)' : ''}`}
            >
              {accent === c && <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow" />}
            </button>
            <button
              type="button"
              onClick={() => removeColor(c)}
              className="absolute -right-1 -top-1 hidden h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow group-hover:flex hover:text-rose-600"
              aria-label={`Remove ${c}`}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {colors.length < 10 && (
          <label className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-slate-300 text-slate-400 hover:border-slate-400 hover:text-slate-600">
            <Plus className="h-4 w-4" />
            <input
              type="color"
              className="sr-only"
              onChange={(e) => addColor(e.target.value)}
            />
          </label>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Quick add</span>
        {BRAND_COLOR_PRESETS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => addColor(c)}
            disabled={colors.includes(c)}
            className="h-6 w-6 rounded-md border border-slate-200 transition hover:scale-110 disabled:opacity-30"
            style={{ backgroundColor: c }}
            aria-label={`Add ${c}`}
          />
        ))}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="#hex"
          className="w-28 rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm focus:border-slate-400 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => {
            addColor(draft);
            setDraft('#');
          }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          Add hex
        </button>
      </div>
    </div>
  );
}
