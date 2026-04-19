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
  const receiptFile = formData.get('receipt') as File;

  const quantityInBaseUnit = quantity * (unit_conversion > 0 ? unit_conversion : 1);

  let evidence_url = null;
  if (receiptFile && receiptFile.size > 0 && receiptFile.name !== 'undefined') {
    const fileExt = receiptFile.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `receipts/${fileName}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(filePath, receiptFile, { cacheControl: '3600', upsert: false });
    if (!uploadError && uploadData) {
      const { data: publicUrlData } = supabase.storage.from('receipts').getPublicUrl(filePath);
      evidence_url = publicUrlData.publicUrl;
    }
  }

  const { error: purchaseError } = await supabase
    .from('purchases')
    .insert([{ ingredient_id, supplier, quantity, price, evidence_url, purchase_unit, unit_conversion }]);

  if (purchaseError) {
    console.error('Purchase Error:', purchaseError);
    return;
  }

  const { data: ingredientData } = await supabase
    .from('ingredients')
    .select('stock, average_price')
    .eq('id', ingredient_id)
    .single();

  if (ingredientData) {
    const oldStock = Number(ingredientData.stock) || 0;
    const oldAvgPrice = Number(ingredientData.average_price) || 0;
    const newStock = oldStock + quantityInBaseUnit;
    const newAvgPrice = (oldStock * oldAvgPrice + price) / newStock;
    await supabase.from('ingredients').update({ stock: newStock, average_price: newAvgPrice }).eq('id', ingredient_id);
  }

  revalidatePath('/procurement');
  revalidatePath('/ingredients');
  redirect('/procurement');
}
