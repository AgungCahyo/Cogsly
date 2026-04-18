import { supabase } from '@/lib/supabase';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

import { Ingredient } from '@/types';

export default async function EditIngredientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: ingredient, error } = await supabase
    .from('ingredients')
    .select('id, name, category, unit, low_stock_threshold')
    .eq('id', id)
    .single()
    .returns<Ingredient>();

  if (error || !ingredient) notFound();

  async function updateIngredient(formData: FormData) {
    'use server';
    const name = (formData.get('name')?.toString() ?? '').trim();
    const category = (formData.get('category')?.toString() ?? '').trim();
    const unit = (formData.get('unit')?.toString() ?? '').trim();
    const low_stock_threshold = Number(formData.get('low_stock_threshold')?.toString() ?? '0');

    if (!name) throw new Error('Nama bahan wajib diisi.');
    if (!category) throw new Error('Kategori wajib dipilih.');
    if (!unit) throw new Error('Satuan wajib dipilih.');
    if (!Number.isFinite(low_stock_threshold) || low_stock_threshold < 0) {
      throw new Error('Ambang batas stok harus angka non-negatif yang valid.');
    }

    const { error: updateError } = await supabase
      .from('ingredients')
      .update({ name, category, unit, low_stock_threshold })
      .eq('id', id);

    if (updateError) throw new Error(updateError.message);
    redirect('/ingredients');
  }

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/ingredients" className="btn-ghost" style={{ padding: '0.5rem', borderRadius: '10px' }}>
          <ArrowLeft className="w-4.5 h-4.5" style={{ width: '18px', height: '18px' }} />
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--gold)', fontFamily: 'DM Mono, monospace' }}>
            ◆ Inventori
          </p>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'DM Serif Display, serif' }}>
            Edit Bahan Baku
          </h1>
        </div>
      </div>

      <div className="rounded-2xl p-6 md:p-8 space-y-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <form action={updateIngredient} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Nama Bahan
            </label>
            <input
              type="text"
              name="name"
              required
              defaultValue={ingredient.name}
              className="input-base"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Kategori
              </label>
              <select name="category" required defaultValue={ingredient.category ?? undefined} className="input-base" style={{ appearance: 'none' }}>
                <option value="Beans">Biji Kopi</option>
                <option value="Dairy">Susu & Dairy</option>
                <option value="Syrup">Sirup</option>
                <option value="Packaging">Kemasan</option>
                <option value="Other">Lainnya</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Satuan (UoM)
              </label>
              <select name="unit" required defaultValue={ingredient.unit ?? undefined} className="input-base" style={{ appearance: 'none' }}>
                <option value="gr">Gram (gr)</option>
                <option value="kg">Kilogram (kg)</option>
                <option value="ml">Mililiter (ml)</option>
                <option value="pcs">Buah/Pcs</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Ambang Batas Stok Minimum
            </label>
            <div className="relative">
              <input
                type="number"
                name="low_stock_threshold"
                required
                min="0"
                step="0.01"
                defaultValue={String(ingredient.low_stock_threshold ?? 0)}
                className="input-base"
                style={{ paddingRight: '4rem' }}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>satuan</span>
              </div>
            </div>
            <p className="mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              Peringatan muncul jika stok di bawah angka ini.
            </p>
          </div>

          <div className="pt-4 flex justify-between items-center" style={{ borderTop: '1px solid var(--border)' }}>
            <Link href="/ingredients" className="btn-ghost text-sm">Batal</Link>
            <button type="submit" className="btn-primary">
              <Save className="w-4 h-4" />
              Simpan Perubahan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}