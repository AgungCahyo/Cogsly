import { supabase } from '@/lib/supabase';
import { ArrowLeft, Save, UploadCloud } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AddPurchasePage() {
  const { data: ingredients } = await supabase
    .from('ingredients')
    .select('id, name, unit')
    .order('name');

  async function submitPurchase(formData: FormData) {
    'use server';
    const ingredient_id = formData.get('ingredient_id') as string;
    const supplier = formData.get('supplier') as string;
    const quantity = Number(formData.get('quantity'));
    const price = Number(formData.get('price'));
    const receiptFile = formData.get('receipt') as File;

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
      .insert([{ ingredient_id, supplier, quantity, price, evidence_url }]);

    if (purchaseError) return redirect('/procurement');

    const { data: ingredientData } = await supabase
      .from('ingredients')
      .select('stock, average_price')
      .eq('id', ingredient_id)
      .single();

    if (ingredientData) {
      const oldStock = Number(ingredientData.stock) || 0;
      const oldAvgPrice = Number(ingredientData.average_price) || 0;
      const newStock = oldStock + quantity;
      const newAvgPrice = (oldStock * oldAvgPrice + price) / newStock;
      await supabase.from('ingredients').update({ stock: newStock, average_price: newAvgPrice }).eq('id', ingredient_id);
    }

    redirect('/procurement');
  }

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/procurement" className="btn-ghost" style={{ padding: '0.5rem', borderRadius: '10px' }}>
          <ArrowLeft style={{ width: '18px', height: '18px' }} />
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--gold)', fontFamily: 'var(--font-mono)' }}>
            ◆ Pengadaan
          </p>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-serif)' }}>
            Catat Pembelian
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            HPP rata-rata akan diperbarui otomatis
          </p>
        </div>
      </div>

      <div className="rounded-2xl p-6 md:p-8" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <form action={submitPurchase} className="space-y-5">
          {/* Ingredient */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Pilih Bahan Baku
            </label>
            <select name="ingredient_id" required className="input-base" style={{ appearance: 'none' }}>
              <option value="" disabled>-- Pilih bahan --</option>
              {ingredients?.map(ing => (
                <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
              ))}
            </select>
          </div>

          {/* Supplier */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Nama Pemasok / Toko
            </label>
            <input
              type="text"
              name="supplier"
              required
              placeholder="cth. Toko Makmur / Pasar Induk"
              className="input-base"
            />
          </div>

          {/* Qty + Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Jumlah Dibeli
              </label>
              <input
                type="number"
                name="quantity"
                required
                min="0"
                step="0.01"
                placeholder="0"
                className="input-base"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Total Harga (Rp)
              </label>
              <input
                type="number"
                name="price"
                required
                min="0"
                placeholder="cth. 150000"
                className="input-base"
              />
            </div>
          </div>

          {/* Receipt upload */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Upload Bukti Nota <span className="font-normal" style={{ color: 'var(--text-muted)' }}>(opsional)</span>
            </label>
            <label
              htmlFor="receipt"
              className="flex flex-col items-center justify-center w-full h-28 rounded-xl cursor-pointer upload-interactive"
            >
              <UploadCloud className="w-6 h-6 mb-2" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--gold)' }} className="font-medium">Klik untuk upload</span> atau seret file
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>JPEG, PNG, atau PDF</p>
              <input id="receipt" name="receipt" type="file" className="hidden" accept="image/*,.pdf" />
            </label>
          </div>

          {/* Footer */}
          <div className="pt-4 flex justify-between items-center" style={{ borderTop: '1px solid var(--border)' }}>
            <Link href="/procurement" className="btn-ghost text-sm">Batal</Link>
            <button type="submit" className="btn-primary">
              <Save className="w-4 h-4" />
              Simpan & Update Stok
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}