// actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { requireRoles } from '@/lib/auth/server-auth';
import { WASTE_ROLES, WasteCategory } from './constant'; // Import from the new file

export async function logWaste(formData: FormData) {
  const { supabase } = await requireRoles([...WASTE_ROLES]);
  const { data: { user } } = await supabase.auth.getUser();

  const ingredient_id = formData.get('ingredient_id') as string;
  const quantity = Number(formData.get('quantity'));
  const category = (formData.get('category') as WasteCategory) || 'other';
  const reason = (formData.get('reason') as string)?.trim();

  // Validation
  if (!ingredient_id) throw new Error('Bahan baku wajib dipilih.');
  if (!quantity || quantity <= 0) throw new Error('Jumlah waste harus lebih dari 0.');
  if (!reason) throw new Error('Keterangan waste wajib diisi.');

  // Read current stock
  const { data: ing, error: fetchError } = await supabase
    .from('ingredients')
    .select('stock, name, unit')
    .eq('id', ingredient_id)
    .single();

  if (fetchError || !ing) throw new Error('Bahan baku tidak ditemukan.');

  const currentStock = Number(ing.stock);

  if (quantity > currentStock) {
    throw new Error(
      `Jumlah waste (${quantity} ${ing.unit}) melebihi stok tersedia (${currentStock} ${ing.unit}) untuk ${ing.name}.`
    );
  }

  // Log the waste
  const { error: logError } = await supabase.from('waste_logs').insert([{
    ingredient_id,
    quantity,
    category,
    reason,
    logged_by: user?.id ?? null,
  }]);

  if (logError) throw new Error('Gagal mencatat waste: ' + logError.message);

  // Deduct from stock atomically via RPC
  const { error: rpcError } = await supabase.rpc('deduct_ingredient_stock', {
    p_ingredient_id: ingredient_id,
    p_amount: quantity,
  });

  if (rpcError) {
    // Fallback
    console.warn('RPC unavailable, manual deduct:', rpcError.message);
    const newStock = currentStock - quantity;
    const { error: updateError } = await supabase
      .from('ingredients')
      .update({ stock: newStock })
      .eq('id', ingredient_id);
    if (updateError) throw new Error('Gagal mengupdate stok: ' + updateError.message);
  }

  revalidatePath('/ingredients');
  revalidatePath('/ingredients/waste');
  revalidatePath('/');
  return true;
}

export async function getWasteLogs() {
  const { supabase } = await requireRoles([...WASTE_ROLES]);

  // Current calendar month only
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const { data, error } = await supabase
    .from('waste_logs')
    .select('*, ingredients(name, unit)')
    .gte('created_at', monthStart.toISOString())
    .lte('created_at', monthEnd.toISOString())
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw new Error('Gagal memuat log waste: ' + error.message);
  return data ?? [];
}

export async function getWasteStats() {
  const { supabase } = await requireRoles([...WASTE_ROLES]);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const { data, error } = await supabase
    .from('waste_logs')
    .select('category, quantity, ingredients(average_price)')
    .gte('created_at', monthStart.toISOString());

  if (error || !data) return { totalEvents: 0, totalLoss: 0, byCategory: {} };

  let totalLoss = 0;
  const byCategory: Record<string, number> = {};

  for (const log of data) {
    const price = Number((log.ingredients as any)?.average_price ?? 0);
    const loss = Number(log.quantity) * price;
    totalLoss += loss;
    const cat = (log.category as string) || 'other';
    byCategory[cat] = (byCategory[cat] ?? 0) + 1;
  }

  return { totalEvents: data.length, totalLoss, byCategory };
}