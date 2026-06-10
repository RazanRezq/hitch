'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle, FileText, Loader2, Paperclip, X } from 'lucide-react';
import {
  EVIDENCE_ALLOWED_TYPES,
  EVIDENCE_MAX_BYTES,
  EVIDENCE_MAX_FILES,
  EVIDENCE_MAX_MB,
  type EvidenceContentType,
  type PresignUploadResponse,
} from '@/lib/types';
import { apiClient, API_ROUTES } from '@/lib/api-client';

type Status = 'uploading' | 'done' | 'error';

interface Item {
  id: string;
  name: string;
  status: Status;
  previewUrl?: string;
  key?: string;
}

const ALLOWED = EVIDENCE_ALLOWED_TYPES as readonly string[];
const EXT_TYPE: Record<string, EvidenceContentType> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
  gif: 'image/gif',
  pdf: 'application/pdf',
};

/** Browsers sometimes report an empty type (notably HEIC); fall back to the extension. */
function resolveType(file: File): EvidenceContentType | null {
  if (ALLOWED.includes(file.type)) return file.type as EvidenceContentType;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return EXT_TYPE[ext] ?? null;
}

interface Props {
  onChange: (keys: string[]) => void;
}

/**
 * Direct-to-Spaces evidence uploader. Per file: request a presigned PUT URL from
 * our API, then PUT the bytes straight to DigitalOcean Spaces (the file never
 * touches our server). The resulting object keys are lifted to the parent form,
 * which sends them with the complaint.
 */
export function EvidenceUploader({ onChange }: Props) {
  const t = useTranslations('feedback.evidence');
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep the latest onChange without retriggering the sync effect.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Lift the committed keys (successful uploads only) whenever items change.
  useEffect(() => {
    onChangeRef.current(items.filter((i) => i.status === 'done' && i.key).map((i) => i.key!));
  }, [items]);

  // Revoke object URLs on unmount to avoid leaks.
  useEffect(
    () => () => {
      for (const i of items) if (i.previewUrl) URL.revokeObjectURL(i.previewUrl);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  async function uploadOne(id: string, file: File, contentType: EvidenceContentType) {
    try {
      const { url, key } = await apiClient.post<PresignUploadResponse>(
        API_ROUTES.uploads.presigned,
        { filename: file.name, contentType, size: file.size },
        { idempotencyKey: crypto.randomUUID() },
      );
      const res = await fetch(url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': contentType },
      });
      if (!res.ok) throw new Error(`PUT ${res.status}`);
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status: 'done', key } : i)));
    } catch {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status: 'error' } : i)));
    }
  }

  function addFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setError(null);
    const files = Array.from(fileList);

    if (items.length + files.length > EVIDENCE_MAX_FILES) {
      setError(t('errorTooMany', { max: EVIDENCE_MAX_FILES }));
      return;
    }

    const fresh: { item: Item; file: File; type: EvidenceContentType }[] = [];
    for (const file of files) {
      const type = resolveType(file);
      if (!type) {
        setError(t('errorType', { name: file.name }));
        continue;
      }
      if (file.size > EVIDENCE_MAX_BYTES) {
        setError(t('errorTooLarge', { name: file.name, max: EVIDENCE_MAX_MB }));
        continue;
      }
      const id = crypto.randomUUID();
      fresh.push({
        item: {
          id,
          name: file.name,
          status: 'uploading',
          previewUrl: type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
        },
        file,
        type,
      });
    }

    if (fresh.length === 0) return;
    setItems((prev) => [...prev, ...fresh.map((f) => f.item)]);
    for (const f of fresh) void uploadOne(f.item.id, f.file, f.type);
  }

  function removeItem(id: string) {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
  }

  const atLimit = items.length >= EVIDENCE_MAX_FILES;

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ALLOWED.join(',')}
        className="sr-only"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = '';
        }}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={atLimit}
        className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-input bg-card px-4 py-5 text-sm font-medium text-muted-foreground transition-colors hover:border-ring hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Paperclip size={18} aria-hidden="true" />
        {t('add')}
      </button>

      <p className="text-xs text-muted-foreground">
        {t('hint', { max: EVIDENCE_MAX_FILES, mb: EVIDENCE_MAX_MB })}
      </p>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {items.length > 0 && (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted text-muted-foreground">
                {item.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <FileText size={18} aria-hidden="true" />
                )}
              </span>

              <span className="min-w-0 flex-1 truncate text-sm text-foreground" title={item.name}>
                {item.name}
              </span>

              {item.status === 'uploading' && (
                <Loader2 size={16} className="animate-spin text-muted-foreground" aria-label={t('uploading')} />
              )}
              {item.status === 'error' && (
                <span className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle size={14} aria-hidden="true" />
                  {t('failed')}
                </span>
              )}

              <button
                type="button"
                onClick={() => removeItem(item.id)}
                aria-label={t('remove', { name: item.name })}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
