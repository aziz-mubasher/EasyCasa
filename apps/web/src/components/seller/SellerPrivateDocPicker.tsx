'use client';

import { useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';

type Props = {
  multiple?: boolean;
  disabled?: boolean;
  busy?: boolean;
  onFilesSelected: (files: File[]) => void | Promise<void>;
};

/**
 * PP-6 — private document picker for VO/checklist uploads.
 * Files are posted to API routes that run EXIF-stripping ingest (MediaService).
 */
export function SellerPrivateDocPicker({
  multiple = false,
  disabled = false,
  busy = false,
  onFilesSelected,
}: Props) {
  const t = useTranslations('sellerTrust.upload');
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedNames, setSelectedNames] = useState<string[]>([]);

  const onChange = async () => {
    const input = inputRef.current;
    if (!input?.files?.length) return;
    const files = Array.from(input.files);
    setSelectedNames(files.map((f) => f.name));
    await onFilesSelected(files);
    input.value = '';
  };

  return (
    <div className="space-y-2" data-testid="seller-private-doc-picker">
      <label htmlFor={inputId} className="text-sm font-medium text-ink">
        {multiple ? t('filesLabel') : t('fileLabel')}
      </label>
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        className="sr-only"
        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
        multiple={multiple}
        disabled={disabled || busy}
        onChange={() => void onChange()}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={disabled || busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? t('uploading') : multiple ? t('chooseFiles') : t('chooseFile')}
        </Button>
        {selectedNames.length > 0 ? (
          <p className="text-xs text-muted">{selectedNames.join(', ')}</p>
        ) : null}
      </div>
      <p className="text-xs text-muted">{t('hint')}</p>
    </div>
  );
}
