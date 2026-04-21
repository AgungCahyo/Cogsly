'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Package, Save } from 'lucide-react';
import { Select } from '@/components/ui/Select';
import { PageHeader } from '@/components/ui/PageHeader';

export type IngredientFormValues = {
  name: string;
  category: string;
  unit: string;
  low_stock_threshold: string;
};

const CATEGORY_OPTIONS = [
  { label: 'Biji Kopi', value: 'Beans' },
  { label: 'Susu & Dairy', value: 'Dairy' },
  { label: 'Sirup', value: 'Syrup' },
  { label: 'Kemasan', value: 'Packaging' },
  { label: 'Lainnya', value: 'Other' },
];

const UNIT_OPTIONS = [
  { label: 'Gram (gr)', value: 'gr' },
  { label: 'Kilogram (kg)', value: 'kg' },
  { label: 'Mililiter (ml)', value: 'ml' },
  { label: 'Buah/Pcs', value: 'pcs' },
];

export function IngredientForm({
  action, mode, defaultValues,
}: {
  action: (formData: FormData) => Promise<void>;
  mode: 'create' | 'edit';
  defaultValues?: IngredientFormValues;
}) {
  const [category, setCategory] = useState(defaultValues?.category || '');
  const [unit, setUnit] = useState(defaultValues?.unit || '');

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto space-y-6">
      <PageHeader
        eyebrow="◆ Inventori"
        title={mode === 'create' ? 'Tambah Bahan Baku' : 'Edit Bahan Baku'}
        backHref="/ingredients"
        icon={<Package className="h-5 w-5" aria-hidden />}
      />

      <div className="bg-white border border-zinc-200 rounded-2xl p-5 sm:p-7 shadow-sm shadow-zinc-950/5">
        <form action={action} className="space-y-5">
          <div className="space-y-1.5">
            <label className="block text-[9px] font-bold uppercase tracking-widest text-zinc-400">Nama Bahan Baku</label>
            <input type="text" name="name" required placeholder="cth. Biji Kopi Arabika" defaultValue={defaultValues?.name}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-xs font-medium focus:outline-none focus:border-zinc-950 transition-all placeholder:text-zinc-300" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select label="Kategori" name="category" options={CATEGORY_OPTIONS} value={category} onChange={setCategory} required searchable={false} />
            <Select label="Satuan (UoM)" name="unit" options={UNIT_OPTIONS} value={unit} onChange={setUnit} required searchable={false} />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[9px] font-bold uppercase tracking-widest text-zinc-400">Ambang Batas Stok Minimum</label>
            <div className="relative">
              <input type="number" name="low_stock_threshold" required min="0" step="0.01"
                defaultValue={defaultValues?.low_stock_threshold ?? '0'}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-xs font-medium focus:outline-none focus:border-zinc-950 transition-all pr-20" />
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-300">
                  {UNIT_OPTIONS.find(u => u.value === unit)?.label?.split(' ')[0] || 'Unit'}
                </span>
              </div>
            </div>
            <p className="mt-1.5 text-[9px] uppercase tracking-widest text-zinc-400 font-medium">
              Peringatan Low Stock muncul jika stok di bawah angka ini.
            </p>
          </div>

          <div className="pt-5 flex justify-between items-center border-t border-zinc-100">
            <Link href="/ingredients" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-950 transition-all">Batal</Link>
            <button type="submit"
              className="bg-zinc-950 text-white px-6 py-3 rounded-xl font-bold text-xs flex items-center gap-2 transition-all hover:bg-zinc-800 active:scale-[0.98]">
              <Save className="w-3.5 h-3.5" />
              {mode === 'create' ? 'Simpan Bahan' : 'Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}