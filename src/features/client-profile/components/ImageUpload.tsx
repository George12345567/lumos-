import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Upload, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { MAX_UPLOAD_BYTES, STORAGE_BUCKET } from '../constants';

interface Props {
  clientId: string;
  pathPrefix: string;
  currentUrl?: string;
  onChange: (url: string) => void;
  onClear?: () => void;
  shape?: 'square' | 'circle';
  label?: string;
  className?: string;
  size?: number;
  /** Optional: render a custom trigger instead of the default frame */
  children?: (state: { trigger: () => void; uploading: boolean; preview?: string }) => React.ReactNode;
}

export function ImageUpload({
  clientId,
  pathPrefix,
  currentUrl,
  onChange,
  onClear,
  shape = 'square',
  label,
  className = '',
  size = 96,
  children,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const trigger = () => inputRef.current?.click();

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error('Image must be smaller than 5 MB.');
      return;
    }
    setUploading(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${pathPrefix}/${clientId}-${Date.now()}-${safeName}`;
      const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, file, { upsert: true });
      if (error) {
        console.error('[ImageUpload] upload failed:', error);
        toast.error('Upload failed.');
        return;
      }
      const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      onChange(urlData.publicUrl);
    } catch (err) {
      console.error(err);
      toast.error('Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  if (children) {
    return (
      <>
        {children({ trigger, uploading, preview: currentUrl })}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.currentTarget.value = '';
          }}
        />
      </>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className={`relative flex shrink-0 items-center justify-center overflow-hidden border border-slate-200 bg-slate-50 ${shape === 'circle' ? 'rounded-full' : 'rounded-2xl'}`}
        style={{ width: size, height: size }}
      >
        {currentUrl ? (
          <img src={currentUrl} alt={label || 'Image'} className="h-full w-full object-cover" />
        ) : (
          <Upload className="h-6 w-6 text-slate-400" />
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80">
            <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        {label && <span className="text-xs font-medium text-slate-500">{label}</span>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={trigger}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Upload className="h-3.5 w-3.5" />
            {currentUrl ? 'Replace' : 'Upload'}
          </button>
          {currentUrl && onClear && (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </button>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.currentTarget.value = '';
        }}
      />
    </div>
  );
}
