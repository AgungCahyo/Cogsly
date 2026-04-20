'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireRoles } from '@/lib/auth/server-auth';

export async function submitPurchase(formData: FormData) {
  const { supabase } = await requireRoles(['admin', 'warehouse']);

  const ingredient_id = formData.get('ingredient_id') as string;
  const supplier = formData.get('supplier') as string;
  const quantity = Number(formData.get('quantity'));
  const price = Number(formData.get('price'));
  const purchase_unit = (formData.get('purchase_unit') as string)?.trim() || null;
  const unit_conversion = Number(formData.get('unit_conversion') || '1');

  // ── Validation ────────────────────────────────────────────
  if (!ingredient_id) throw new Error('Bahan baku wajib dipilih.');
  if (!supplier?.trim()) throw new Error('Pemasok wajib diisi.');
  if (!quantity || quantity <= 0) throw new Error('Jumlah harus lebih dari 0.');
  if (!price || price <= 0) throw new Error('Harga harus lebih dari 0.');

  const safeConversion = unit_conversion > 0 ? unit_conversion : 1;
  const quantityInBaseUnit = quantity * safeConversion;
  const pricePerBaseUnit = price / quantityInBaseUnit; // FIXED: was price/newStock before

  // ── Upload receipt ────────────────────────────────────────
  let evidence_url: string | null = null;
  const receiptFile = formData.get('receipt') as File;
  if (receiptFile && receiptFile.size > 0 && receiptFile.name !== 'undefined') {
    const fileExt = receiptFile.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(`receipts/${fileName}`, receiptFile, { cacheControl: '3600', upsert: false });

    if (!uploadError && uploadData) {
      const { data: publicUrlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(`receipts/${fileName}`);
      evidence_url = publicUrlData.publicUrl;
    }
  }

  // ── Insert purchase log ───────────────────────────────────
  const { error: purchaseError } = await supabase.from('purchases').insert([{
    ingredient_id,
    supplier,
    quantity,
    price,
    evidence_url,
    purchase_unit,
    unit_conversion: safeConversion,
  }]);

  if (purchaseError) throw new Error('Gagal mencatat pembelian: ' + purchaseError.message);

  // ── Update stock + avg price atomically via RPC ───────────
  // Requires running supabase/migrations/20240101_atomic_stock_functions.sql first.
  const { error: rpcError } = await supabase.rpc('update_ingredient_stock_and_price', {
    p_ingredient_id: ingredient_id,
    p_quantity_in_base: quantityInBaseUnit,
    p_price_per_base: pricePerBaseUnit,
  });

  if (rpcError) {
    // Fallback: manual weighted average (non-atomic, but correct formula)
    console.warn('RPC unavailable, falling back to manual update:', rpcError.message);

    const { data: ingredientData, error: fetchError } = await supabase
      .from('ingredients')
      .select('stock, average_price')
      .eq('id', ingredient_id)
      .single();

    if (fetchError || !ingredientData) throw new Error('Gagal membaca data stok.');

    const oldStock = Number(ingredientData.stock) || 0;
    const oldAvgPrice = Number(ingredientData.average_price) || 0;
    const newStock = oldStock + quantityInBaseUnit;
    const newAvgPrice =
      newStock > 0
        ? (oldStock * oldAvgPrice + quantityInBaseUnit * pricePerBaseUnit) / newStock
        : pricePerBaseUnit;

    const { error: updateError } = await supabase
      .from('ingredients')
      .update({ stock: newStock, average_price: newAvgPrice })
      .eq('id', ingredient_id);

    if (updateError) throw new Error('Gagal memperbarui stok: ' + updateError.message);
  }

  revalidatePath('/procurement');
  revalidatePath('/ingredients');
  revalidatePath('/');
  redirect('/procurement');
}