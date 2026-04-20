'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireRoles } from '@/lib/auth/server-auth';

export async function submitPurchase(formData: FormData) {
  const { supabase } = await requireRoles(['admin', 'warehouse']);
  const { data: { user } } = await supabase.auth.getUser();

  const ingredient_id = formData.get('ingredient_id') as string;
  const stock_source = ((formData.get('stock_source') as string) || 'purchase').trim();
  const supplierInput = ((formData.get('supplier') as string) || '').trim();
  const quantity = Number(formData.get('quantity'));
  const price = Number(formData.get('price'));
  const purchase_unit = (formData.get('purchase_unit') as string)?.trim() || null;
  const unit_conversion = Number(formData.get('unit_conversion') || '1');
  const isInternalSource = stock_source === 'internal';
  const supplier = isInternalSource
    ? (supplierInput || 'Produksi Internal')
    : supplierInput;

  // ── Validation ────────────────────────────────────────────
  if (!ingredient_id) throw new Error('Bahan baku wajib dipilih.');
  if (!isInternalSource && !supplier?.trim()) throw new Error('Pemasok wajib diisi.');
  if (!quantity || quantity <= 0) throw new Error('Jumlah harus lebih dari 0.');
  if (!Number.isFinite(price) || price < 0) throw new Error('Harga/biaya tidak valid.');
  if (!isInternalSource && price <= 0) throw new Error('Harga harus lebih dari 0 untuk pembelian.');

  const safeConversion = unit_conversion > 0 ? unit_conversion : 1;
  const quantityInBaseUnit = quantity * safeConversion;
  const pricePerBaseUnit = quantityInBaseUnit > 0 ? price / quantityInBaseUnit : 0;

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
  let { error: purchaseError } = await supabase.from('purchases').insert([{
    ingredient_id,
    supplier,
    quantity,
    price,
    evidence_url,
    purchase_unit,
    unit_conversion: safeConversion,
    created_by: user?.id ?? null,
  }]);

  if (
    purchaseError &&
    purchaseError.message.toLowerCase().includes('column') &&
    purchaseError.message.includes('created_by')
  ) {
    const fallbackInsert = await supabase.from('purchases').insert([{
      ingredient_id,
      supplier,
      quantity,
      price,
      evidence_url,
      purchase_unit,
      unit_conversion: safeConversion,
    }]);
    purchaseError = fallbackInsert.error;
  }

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

type ProductionComponent = {
  ingredient_id: string;
  amount_required: number;
};

export async function submitInternalProduction(formData: FormData) {
  const fail = (message: string) => {
    redirect(`/procurement/internal?error=${encodeURIComponent(message)}`);
  };

  const { supabase } = await requireRoles(['admin', 'warehouse']);
  const { data: { user } } = await supabase.auth.getUser();

  const ingredient_id = (formData.get('ingredient_id') as string)?.trim();
  const quantity = Number(formData.get('quantity'));
  const extra_cost = Number(formData.get('extra_cost') || '0');
  const supplierInput = ((formData.get('supplier') as string) || '').trim();
  const supplier = supplierInput ? `Produksi Internal - ${supplierInput}` : 'Produksi Internal';
  const rawComponents = (formData.get('components_json') as string) || '[]';

  let components: ProductionComponent[] = [];
  try {
    const parsed = JSON.parse(rawComponents);
    components = Array.isArray(parsed) ? parsed : [];
  } catch {
    fail('Format komponen produksi tidak valid.');
  }

  if (!ingredient_id) fail('Bahan hasil wajib dipilih.');
  if (!Number.isFinite(quantity) || quantity <= 0) fail('Jumlah hasil harus lebih dari 0.');
  if (!Number.isFinite(extra_cost) || extra_cost < 0) fail('Biaya tambahan tidak valid.');

  const normalizedComponents = components
    .map((item) => ({
      ingredient_id: (item.ingredient_id || '').trim(),
      amount_required: Number(item.amount_required),
    }))
    .filter((item) => item.ingredient_id && Number.isFinite(item.amount_required) && item.amount_required > 0);

  if (normalizedComponents.length === 0) {
    fail('Minimal harus ada 1 komponen bahan untuk produksi internal.');
  }

  const aggregated = new Map<string, number>();
  for (const component of normalizedComponents) {
    if (component.ingredient_id === ingredient_id) {
      fail('Bahan hasil tidak boleh sama dengan bahan komponen.');
    }
    aggregated.set(
      component.ingredient_id,
      (aggregated.get(component.ingredient_id) ?? 0) + component.amount_required
    );
  }

  const affectedIngredientIds = Array.from(new Set([ingredient_id, ...aggregated.keys()]));
  const { data: ingredients, error: fetchError } = await supabase
    .from('ingredients')
    .select('id, name, stock, average_price')
    .in('id', affectedIngredientIds);

  if (fetchError || !ingredients) {
    fail('Gagal membaca data bahan untuk proses produksi.');
  }

  const ingredientMap = new Map(ingredients.map((ing) => [ing.id as string, ing]));
  const outputIngredient = ingredientMap.get(ingredient_id);
  if (!outputIngredient) fail('Bahan hasil tidak ditemukan.');

  const insufficientItems: string[] = [];
  let componentCost = 0;

  for (const [componentId, needed] of aggregated.entries()) {
    const component = ingredientMap.get(componentId);
    if (!component) {
      insufficientItems.push(`Komponen tidak ditemukan (${componentId}).`);
      continue;
    }

    const currentStock = Number(component.stock) || 0;
    if (currentStock < needed) {
      insufficientItems.push(`${component.name} (butuh ${needed}, tersedia ${currentStock})`);
    }

    const avgPrice = Number(component.average_price) || 0;
    componentCost += needed * avgPrice;
  }

  if (insufficientItems.length > 0) {
    fail(`Stok komponen tidak cukup: ${insufficientItems.join(' | ')}`);
  }

  const restoreComponentsBestEffort = async () => {
    for (const [componentId, needed] of aggregated.entries()) {
      const { data: ing } = await supabase
        .from('ingredients')
        .select('stock')
        .eq('id', componentId)
        .single();
      if (!ing) continue;
      await supabase
        .from('ingredients')
        .update({ stock: Number(ing.stock) + needed })
        .eq('id', componentId);
    }
  };

  const deductOutputBestEffort = async () => {
    const { error: rpcError } = await supabase.rpc('deduct_ingredient_stock', {
      p_ingredient_id: ingredient_id,
      p_amount: quantity,
    });
    if (!rpcError) return;

    const { data: output } = await supabase
      .from('ingredients')
      .select('stock')
      .eq('id', ingredient_id)
      .single();
    if (!output) return;

    await supabase
      .from('ingredients')
      .update({ stock: Math.max(0, Number(output.stock) - quantity) })
      .eq('id', ingredient_id);
  };

  // 1) Deduct all component stocks.
  for (const [componentId, needed] of aggregated.entries()) {
    const { error: rpcError } = await supabase.rpc('deduct_ingredient_stock', {
      p_ingredient_id: componentId,
      p_amount: needed,
    });

    if (rpcError) {
      const component = ingredientMap.get(componentId);
      const currentStock = Number(component?.stock) || 0;
      const { error: updateError } = await supabase
        .from('ingredients')
        .update({ stock: Math.max(0, currentStock - needed) })
        .eq('id', componentId);
      if (updateError) {
        throw new Error('Gagal mengurangi stok komponen: ' + updateError.message);
      }
    }
  }

  // 2) Increase output ingredient stock and update average price.
  const totalCost = componentCost + extra_cost;
  const pricePerBaseUnit = totalCost / quantity;
  let outputAdded = false;

  const { error: outputRpcError } = await supabase.rpc('update_ingredient_stock_and_price', {
    p_ingredient_id: ingredient_id,
    p_quantity_in_base: quantity,
    p_price_per_base: pricePerBaseUnit,
  });

  if (outputRpcError) {
    const oldStock = Number(outputIngredient.stock) || 0;
    const oldAvgPrice = Number(outputIngredient.average_price) || 0;
    const newStock = oldStock + quantity;
    const newAvgPrice =
      newStock > 0
        ? (oldStock * oldAvgPrice + quantity * pricePerBaseUnit) / newStock
        : pricePerBaseUnit;

    const { error: fallbackUpdateError } = await supabase
      .from('ingredients')
      .update({ stock: newStock, average_price: newAvgPrice })
      .eq('id', ingredient_id);

    if (fallbackUpdateError) {
      await restoreComponentsBestEffort();
      throw new Error('Produksi gagal saat menambah stok bahan hasil: ' + fallbackUpdateError.message);
    }
  }
  outputAdded = true;

  // 3) Log as stock-in record for reporting.
  let { error: logError } = await supabase.from('purchases').insert([
    {
      ingredient_id,
      supplier,
      quantity,
      price: totalCost,
      purchase_unit: null,
      unit_conversion: 1,
      evidence_url: null,
      created_by: user?.id ?? null,
    },
  ]);

  if (
    logError &&
    logError.message.toLowerCase().includes('column') &&
    logError.message.includes('created_by')
  ) {
    const fallbackLog = await supabase.from('purchases').insert([
      {
        ingredient_id,
        supplier,
        quantity,
        price: totalCost,
        purchase_unit: null,
        unit_conversion: 1,
        evidence_url: null,
      },
    ]);
    logError = fallbackLog.error;
  }

  if (logError) {
    if (outputAdded) {
      await deductOutputBestEffort();
    }
    await restoreComponentsBestEffort();
    throw new Error('Stok terupdate tapi gagal menyimpan log produksi: ' + logError.message);
  }

  revalidatePath('/procurement');
  revalidatePath('/ingredients');
  revalidatePath('/');
  redirect('/procurement');
}