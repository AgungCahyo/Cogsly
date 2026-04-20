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

export async function importBulkIngredients(csvText: string) {
  const { supabase } = await requireRoles(['admin', 'warehouse']);

  function parseCSV(text: string) {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    const parseLine = (line: string) => {
      const regex = /("([^"]|"")*"|([^",]*))(?:,|$)/g;
      let match;
      const result = [];
      // avoid infinite loop on empty string
      while (line.length > 0 && (match = regex.exec(line)) !== null && match[0] !== '') {
        const val = match[2] !== undefined ? match[2].replace(/""/g, '"') : (match[3] ?? '');
        result.push(val.trim());
      }
      return result;
    };
    return lines.map(parseLine);
  }

  const rows = parseCSV(csvText);
  if (rows.length < 2) throw new Error('File CSV kosong atau tidak memiliki data.');

  const headers = rows[0].map(h => h.toLowerCase());
  const nameIdx = headers.indexOf('name');
  const catIdx = headers.indexOf('category');
  const unitIdx = headers.indexOf('unit');
  const threshIdx = headers.indexOf('low_stock_threshold');

  if (nameIdx === -1 || catIdx === -1 || unitIdx === -1) {
    throw new Error('Format CSV tidak valid. Dibutuhkan setidaknya header: name, category, unit, low_stock_threshold');
  }

  const { data: existing } = await supabase.from('ingredients').select('name');
  const existingNames = new Set((existing || []).map(i => i.name.toLowerCase()));

  const inserts = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    const name = row[nameIdx];
    if (!name || existingNames.has(name.toLowerCase())) continue;
    
    inserts.push({
      name,
      category: row[catIdx] || 'Other',
      unit: row[unitIdx] || 'pcs',
      low_stock_threshold: threshIdx !== -1 ? (Number(row[threshIdx]) || 0) : 0,
      stock: 0,
      average_price: 0
    });
    // Prevent intra-csv duplicates
    existingNames.add(name.toLowerCase());
  }

  if (inserts.length === 0) {
    return { success: false, message: 'Tidak ada data valid baru (semua terdeteksi sebagai duplikat atau format tidak lengkap).' };
  }

  const { error } = await supabase.from('ingredients').insert(inserts);
  if (error) throw new Error(error.message);

  revalidatePath('/ingredients');
  return { success: true, count: inserts.length };
}
