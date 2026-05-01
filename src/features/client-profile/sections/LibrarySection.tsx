import { useMemo, useState } from 'react';
import { ExternalLink, Trash2, Search, Folder, FileText } from 'lucide-react';
import type { SavedDesign } from '@/types/dashboard';
import { Card } from '../components/Card';
import type { PortalAsset } from '../hooks/usePortalData';

interface Props {
  designs: SavedDesign[];
  assets: PortalAsset[];
  onDeleteDesign: (id: string) => void;
  accent: string;
}

export function LibrarySection({ designs, assets, onDeleteDesign, accent }: Props) {
  const [query, setQuery] = useState('');

  const filteredDesigns = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return designs;
    return designs.filter((d) => (d.business_name || '').toLowerCase().includes(q));
  }, [designs, query]);

  const previewUrl = (d: SavedDesign) =>
    `/demo?name=${encodeURIComponent(d.business_name)}&service=${encodeURIComponent(d.service_type)}&theme=${encodeURIComponent(d.selected_theme || '')}&template=${encodeURIComponent(d.selected_template || '')}&dark=${d.is_dark_mode}`;

  return (
    <div className="space-y-4">
      <Card icon={Folder} title="Designs" description={`${designs.length} saved design${designs.length === 1 ? '' : 's'}`}>
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search designs"
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
          />
        </div>

        {filteredDesigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-10 text-center">
            <Folder className="h-6 w-6 text-slate-300" />
            <p className="text-sm text-slate-500">{query ? 'No designs match that search.' : 'You have no saved designs yet.'}</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDesigns.map((d) => (
              <article
                key={d.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-slate-300"
              >
                <div
                  className="relative flex aspect-[4/3] items-center justify-center"
                  style={{ background: d.custom_theme?.gradient || '#f1f5f9' }}
                >
                  <span className="px-3 text-center text-sm font-semibold text-white drop-shadow">
                    {d.business_name}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-2 p-3">
                  <h3 className="line-clamp-1 text-sm font-medium text-slate-900">{d.business_name || 'Untitled design'}</h3>
                  <p className="text-xs text-slate-500">
                    {d.service_type} · {d.updated_at ? new Date(d.updated_at).toLocaleDateString() : ''}
                  </p>
                  <div className="mt-auto flex items-center justify-between">
                    <a
                      href={previewUrl(d)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium hover:underline"
                      style={{ color: accent }}
                    >
                      Open <ExternalLink className="h-3 w-3" />
                    </a>
                    <button
                      type="button"
                      onClick={() => onDeleteDesign(d.id)}
                      className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      aria-label="Delete design"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </Card>

      <Card icon={FileText} title="Files" description="Documents and brand assets shared with you.">
        {assets.length === 0 ? (
          <p className="text-sm text-slate-400">No files have been shared yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {assets.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-800">{a.name || a.asset_url}</p>
                  {a.created_at && (
                    <p className="text-xs text-slate-500">{new Date(a.created_at).toLocaleString()}</p>
                  )}
                </div>
                {a.asset_url && (
                  <a
                    href={a.asset_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium hover:underline"
                    style={{ color: accent }}
                  >
                    Open <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
