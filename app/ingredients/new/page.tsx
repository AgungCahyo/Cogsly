// app/ingredients/new/page.tsx
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default function AddIngredientPage() {
  async function createIngredient(formData: FormData) {
    'use server';
    const name = (formData.get('name')?.toString() ?? '').trim();
    const category = (formData.get('category')?.toString() ?? '').trim();
    const unit = (formData.get('unit')?.toString() ?? '').trim();
    const lowStockRaw = formData.get('low_stock_threshold')?.toString() ?? '0';
    const low_stock_threshold = Number(lowStockRaw);

    if (!name) throw new Error('Nama bahan wajib diisi.');
    if (!category) throw new Error('Kategori wajib dipilih.');
    if (!unit) throw new Error('Satuan wajib dipilih.');
    if (!Number.isFinite(low_stock_threshold) || low_stock_threshold < 0) {
      throw new Error('Ambang batas stok harus angka non-negatif yang valid.');
    }

    const { error } = await supabase.from('ingredients').insert([{
      name, category, unit, low_stock_threshold, stock: 0, average_price: 0
    }]);

    if (error) throw new Error(error.message);
    redirect('/ingredients');
  }

  return <IngredientForm action={createIngredient} mode="create" />;
}

// Shared form component
function IngredientForm({
  action,
  mode,
  defaultValues,
}: {
  action: (formData: FormData) => Promise<void>;
  mode: 'create' | 'edit';
  defaultValues?: { name: string; category: string; unit: string; low_stock_threshold: string };
}) {
  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/ingredients"
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-all btn-ghost p-0"
        >
          <ArrowLeft className="w-[18px] h-[18px]" />
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1 text-gold font-mono">
            ◆ Inventori
          </p>
          <h1 className="text-2xl font-bold text-text-primary font-serif">
            {mode === 'create' ? 'Tambah Bahan Baku' : 'Edit Bahan Baku'}
          </h1>
        </div>
      </div>

      <div className="rounded-2xl p-6 md:p-8 space-y-6 bg-bg-card border border-border">
        <form action={action} className="space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-text-secondary">
              Nama Bahan
            </label>
            <input
              type="text"
              name="name"
              required
              placeholder="cth. Biji Kopi Arabika"
              defaultValue={defaultValues?.name}
              className="input-base"
            />
          </div>

          {/* Category + Unit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-text-secondary">
                Kategori
              </label>
              <select name="category" required defaultValue={defaultValues?.category} className="input-base !appearance-none">
                <option value="Beans">Biji Kopi</option>
                <option value="Dairy">Susu & Dairy</option>
                <option value="Syrup">Sirup</option>
                <option value="Packaging">Kemasan</option>
                <option value="Other">Lainnya</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-text-secondary">
                Satuan (UoM)
              </label>
              <select name="unit" required defaultValue={defaultValues?.unit} className="input-base !appearance-none">
                <option value="gr">Gram (gr)</option>
                <option value="kg">Kilogram (kg)</option>
                <option value="ml">Mililiter (ml)</option>
                <option value="pcs">Buah/Pcs</option>
              </select>
            </div>
          </div>

          {/* Threshold */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-text-secondary">
              Ambang Batas Stok Minimum
            </label>
            <div className="relative">
              <input
                type="number"
                name="low_stock_threshold"
                required
                min="0"
                step="0.01"
                defaultValue={defaultValues?.low_stock_threshold ?? '0'}
                className="input-base pr-16"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                <span className="text-xs font-medium text-text-muted">satuan</span>
              </div>
            </div>
            <p className="mt-1.5 text-xs text-text-muted">
              Peringatan akan muncul jika stok di bawah angka ini.
            </p>
          </div>

          {/* Footer */}
          <div className="pt-4 flex justify-between items-center border-t border-border">
            <Link href="/ingredients" className="btn-ghost text-sm">
              Batal
            </Link>
            <button type="submit" className="btn-primary">
              <Save className="w-4 h-4" />
              {mode === 'create' ? 'Simpan Bahan' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}