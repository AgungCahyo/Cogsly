'use client';

import { PackageCheck } from 'lucide-react';

export function StockPreview({
  quantity,
  purchaseUnit,
  conversion,
  baseUnit,
}: {
  quantity: number;
  purchaseUnit: string;
  conversion: number;
  baseUnit: string;
}) {
  const stockAdded = quantity * (conversion || 1);

  return (
    <div className="bg-zinc-100/50 border border-zinc-200/50 rounded-2xl px-5 py-4 flex items-center justify-between shadow-inner">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-zinc-950 text-white rounded-lg shadow-sm">
          <PackageCheck className="w-4 h-4" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Proyeksi Penambahan Stok</p>
          <p className="text-sm font-bold text-zinc-950 tracking-tight">Cek kalkulasi otomatis</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-xl font-bold font-mono tracking-tighter text-zinc-950">
          +{stockAdded.toLocaleString('id-ID')}
        </p>
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
          {baseUnit}
        </p>
      </div>
    </div>
  );
}
