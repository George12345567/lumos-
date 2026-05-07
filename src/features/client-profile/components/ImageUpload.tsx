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
      // Path layout is locked to the storage RLS policy installed by
      // 20260507120300_storage_rls_client_assets.sql:
      //   <auth.uid()>/<pathPrefix>/<timestamp>-<safe-name>
      // The first segment MUST equal the caller's auth uid, otherwise the
      // upload is rejected by RLS. Callers pass `clientId === auth.uid()`.
      const path = `${clientId}/${pathPrefix}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type || undefined });
      if (uploadError) {
        console.error('[ImageUpload] upload failed:', uploadError);
        toast.error('Upload failed.');
        return;
      }
      // The bucket is private. Use a long-lived signed URL for display.
      // NOTE: signed URLs eventually expire. The proper long-term fix is to
      // persist the object PATH on the row and resolve a fresh signed URL at
      // render time (see profileService.getAvatarUrl). That is a follow-up
      // refactor; this change keeps the existing { url } contract working.
      const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
      const { data: signed, error: signError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(path, ONE_YEAR_SECONDS);
      if (signError || !signed?.signedUrl) {
        console.error('[ImageUpload] sign failed:', signError);
        toast.error('Upload succeeded but the preview link could not be generated.');
        return;
      }
      onChange(signed.signedUrl);
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
