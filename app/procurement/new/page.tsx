import { supabase } from '@/lib/supabase';
import { ArrowLeft, PackagePlus, Save } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ProcurementForm } from '@/components/ProcurementForm';

import { IngredientOption } from '@/types';

export const dynamic = 'force-dynamic';

export default async function AddPurchasePage() {
  const { data: ingredients } = await supabase
    .from('ingredients')
    .select('id, name, unit')
    .returns<IngredientOption[]>()
    .order('name');

  async function submitPurchase(formData: FormData) {
    'use server';
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

    if (purchaseError) return redirect('/procurement');

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

    redirect('/procurement');
  }

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-2">
        <Link href="/procurement" className="btn-ghost p-2 rounded-[10px] shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gold/10 border border-gold/20">
            <PackagePlus className="w-5 h-5 text-gold" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-serif text-gold tracking-tight leading-none">Catat Pembelian</h1>
            <p className="text-xs text-text-muted mt-1 uppercase tracking-wider font-mono">Update Stok & HPP</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl">
        <div className="rounded-2xl p-8 bg-bg-card border border-border">
          <ProcurementForm ingredients={ingredients || []} onSubmit={submitPurchase} />
        </div>
      </div>
    </div>
  );
}