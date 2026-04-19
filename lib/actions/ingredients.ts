'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireRoles } from '@/lib/auth/server-auth';

export async function createIngredient(formData: FormData) {
  const { supabase } = await requireRoles(['admin', 'warehouse']);

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
  
  revalidatePath('/ingredients');
  redirect('/ingredients');
}

export async function updateIngredient(id: string, formData: FormData) {
  const { supabase } = await requireRoles(['admin', 'warehouse']);

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
  
  revalidatePath('/ingredients');
  revalidatePath(`/ingredients/${id}`);
  redirect('/ingredients');
}
