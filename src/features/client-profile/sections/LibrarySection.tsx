import { useMemo, useState } from 'react';
import { ExternalLink, Search, Folder, Download, FileText, FileImage, FileArchive, FileCode, File as FileIcon, Shield } from 'lucide-react';
import type { SavedDesign } from '@/types/dashboard';
import { Card } from '../components/Card';
import type { MockAsset } from '../mockData';

interface Props {
  designs: SavedDesign[];
  assets: MockAsset[];
  onDeleteDesign: (id: string) => void;
  accent: string;
  isArabic?: boolean;
}

function fileTypeIcon(type: MockAsset['asset_type']) {
  switch (type) {
    case 'pdf': return FileText;
    case 'image': return FileImage;
    case 'design': return FileCode;
    case 'archive': return FileArchive;
    case 'document': return FileText;
    case 'video': return FileImage;
    case 'spreadsheet': return FileText;
    default: return FileIcon;
  }
}

function fileTypeColor(type: MockAsset['asset_type']) {
  switch (type) {
    case 'pdf': return '#ef4444';
    case 'image': return '#3b82f6';
    case 'design': return '#8b5cf6';
    case 'archive': return '#f59e0b';
    case 'document': return '#22c55e';
    case 'video': return '#ec4899';
    case 'spreadsheet': return '#10b981';
    default: return '#64748b';
  }
}

export function LibrarySection({ designs, assets, onDeleteDesign, accent, isArabic }: Props) {
  const [query, setQuery] = useState('');

  const filteredDesigns = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return designs;
    return designs.filter((d) => (d.business_name || '').toLowerCase().includes(q));
  }, [designs, query]);

  const previewUrl = (d: SavedDesign) =>
    `/demo?name=${encodeURIComponent(d.business_name)}&service=${encodeURIComponent(d.service_type)}&theme=${encodeURIComponent(d.selected_theme || '')}&template=${encodeURIComponent(d.selected_template || '')}&dark=${d.is_dark_mode}`;

  const sharedEmptyCopy = isArabic
    ? 'سيظهر أي ملف تشاركه أو يشاركه فريق Lumos هنا.'
    : 'Files shared by you or Lumos will appear here.';

  return (
    <div className="space-y-5" dir={isArabic ? 'rtl' : 'ltr'}>
      <Card icon={Folder} title={isArabic ? 'تصميماتي' : 'My Designs'} description={`${designs.length} ${isArabic ? 'تصميم محفوظ' : 'saved design'}${designs.length === 1 ? '' : isArabic ? '' : 's'}`}>
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isArabic ? 'ابحث في التصميمات...' : 'Search designs...'}
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
          />
        </div>

        {filteredDesigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-10 text-center">
            <Folder className="h-6 w-6 text-slate-300" />
            <p className="text-sm text-slate-500">{query ? (isArabic ? 'لا توجد نتائج' : 'No designs match that search.') : (isArabic ? 'لا توجد تصميمات محفوظة بعد' : 'No saved designs yet.')}</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
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
                    {d.service_type} · {d.updated_at ? new Date(d.updated_at).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US') : ''}
                  </p>
                  <div className="mt-auto flex items-center justify-between">
                    <a
                      href={previewUrl(d)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium hover:underline"
                      style={{ color: accent }}
                    >
                      {isArabic ? 'فتح' : 'Open'} <ExternalLink className="h-3 w-3" />
                    </a>
                    <button
                      type="button"
                      onClick={() => onDeleteDesign(d.id)}
                      className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      aria-label="Delete design"
                    >
                      {/* Trash2 is already imported */}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </Card>

      <Card
        icon={Shield}
        title={isArabic ? 'الملفات المشتركة' : 'Shared Files'}
        description={isArabic ? 'ملفات ووثائق شاركها فريق Lumos معك.' : 'Files and documents shared with you by the Lumos team.'}
      >
        {assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-8 text-center">
            <FileIcon className="h-6 w-6 text-slate-300" />
            <p className="text-sm text-slate-500">{sharedEmptyCopy}</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {assets.map((a) => {
              const Icon = fileTypeIcon(a.asset_type);
              const color = fileTypeColor(a.asset_type);
              return (
                <li key={a.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${color}12`, color }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {isArabic && a.nameAr ? a.nameAr : a.name}
                      </p>
                      <span
                        className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white"
                        style={{ backgroundColor: color }}
                      >
                        {a.file_type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>{isArabic ? a.sizeAr : a.size}</span>
                      <span className="text-slate-300">·</span>
                      <span>{new Date(a.created_at).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                        {isArabic ? 'من الأدمن' : 'Admin'}
                      </span>
                    </div>
                  </div>
                  {a.asset_url ? (
                    <a
                      href={a.asset_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-800"
                    >
                      <Download className="h-3.5 w-3.5" />
                      {isArabic ? 'تحميل' : 'Download'}
                    </a>
                  ) : (
                    <span className="text-[11px] text-slate-400">
                      {isArabic ? 'الرابط غير متاح' : 'No link'}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}