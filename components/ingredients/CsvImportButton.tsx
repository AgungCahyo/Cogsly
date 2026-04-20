'use client';

import { useRef, useTransition, useState } from 'react';
import { UploadCloud, Loader2 } from 'lucide-react';
import { importBulkIngredients } from '@/lib/actions/ingredients';

export function CsvImportButton() {
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text !== 'string') return;
      
      startTransition(async () => {
        try {
          const res = await importBulkIngredients(text);
          if (!res?.success) {
            setError(res?.message || 'Gagal mengimpor dari CSV.');
          } else {
            alert(`Berhasil mengimpor ${res.count} bahan baku dari CSV!`);
          }
        } catch (err: any) {
          setError(err.message || 'Terjadi kesalahan sistem.');
        } finally {
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      });
    };
    reader.onerror = () => {
      setError('Gagal membaca file.');
    };
    reader.readAsText(file);
  };

  return (
    <div className="relative">
      <input
        type="file"
        accept=".csv"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      <button
        type="button"
        disabled={isPending}
        title="Format CSV Header yg diperlukan: name, category, unit, low_stock_threshold"
        onClick={() => fileInputRef.current?.click()}
        className="inline-flex items-center gap-2.5 bg-white border border-zinc-200 text-zinc-950 px-6 py-3 rounded-2xl font-bold text-sm transition-all hover:bg-zinc-50 hover:border-zinc-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? <Loader2 className="w-4 h-4 animate-spin text-zinc-500" /> : <UploadCloud className="w-4 h-4 text-zinc-500" />}
        {isPending ? 'Mengimpor...' : 'Import CSV'}
      </button>
      {error && (
        <span className="absolute top-full right-0 sm:left-0 sm:right-auto mt-2 text-[10px] bg-red-50 text-red-600 px-3 py-1.5 rounded-lg border border-red-100 font-bold whitespace-nowrap shadow-sm z-50">
          {error}
        </span>
      )}
    </div>
  );
}
