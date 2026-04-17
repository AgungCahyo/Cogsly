import { supabase } from '@/lib/supabase';
import { ArrowLeft, Save, UploadCloud } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AddPurchasePage() {
  // Fetch ingredients for the dropdown
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

    // 1. Upload file if it exists
    if (receiptFile && receiptFile.size > 0 && receiptFile.name !== 'undefined') {
      const fileExt = receiptFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `receipts/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, receiptFile, {
             cacheControl: '3600',
             upsert: false
        });

      if (!uploadError && uploadData) {
        const { data: publicUrlData } = supabase.storage
          .from('receipts')
          .getPublicUrl(filePath);
        evidence_url = publicUrlData.publicUrl;
      } else {
        console.error("Upload error:", uploadError);
      }
    }

    // 2. Insert purchase log
    const { error: purchaseError } = await supabase
      .from('purchases')
      .insert([{ ingredient_id, supplier, quantity, price, evidence_url }]);

    if (purchaseError) {
      console.error("Purchase error", purchaseError);
      // Handle error visually if possible, but redirect for now
      return redirect('/procurement');
    }

    // 3. Fetch original ingredient to calculate new stock and average price
    const { data: ingredientData } = await supabase
      .from('ingredients')
      .select('stock, average_price')
      .eq('id', ingredient_id)
      .single();

    if (ingredientData) {
      const oldStock = Number(ingredientData.stock) || 0;
      const oldAvgPrice = Number(ingredientData.average_price) || 0;
      
      const oldTotalValue = oldStock * oldAvgPrice;
      const newTotalValue = oldTotalValue + price;
      
      const newStock = oldStock + quantity;
      const newAvgPrice = newTotalValue / newStock;

      // 4. Update ingredient
      await supabase
        .from('ingredients')
        .update({
          stock: newStock,
          average_price: newAvgPrice
        })
        .eq('id', ingredient_id);
    }

    redirect('/procurement');
  }

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Link 
          href="/procurement" 
          className="w-10 h-10 rounded-xl bg-[#111] border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Record Purchase</h1>
          <p className="text-zinc-500 text-sm">Log a new material purchase. This will automatically update your stock and average cost (HPP).</p>
        </div>
      </div>

      <div className="bg-[#111] border border-zinc-800 rounded-2xl p-6 md:p-8">
        <form action={submitPurchase} className="space-y-6">
          <div className="space-y-4">
            
            <div>
              <label htmlFor="ingredient_id" className="block text-sm font-medium text-zinc-300 mb-1.5">
                Select Ingredient
              </label>
              <select 
                id="ingredient_id" 
                name="ingredient_id" 
                required
                className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all appearance-none"
              >
                <option value="" disabled selected>-- Select an ingredient --</option>
                {ingredients?.map(ing => (
                   <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="supplier" className="block text-sm font-medium text-zinc-300 mb-1.5">
                Supplier / Store Name
              </label>
              <input 
                type="text" 
                id="supplier" 
                name="supplier" 
                required 
                placeholder="e.g. Toko Makmur / Pasar Induk"
                className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-xl py-2.5 px-4 text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-zinc-300 mb-1.5">
                  Quantity Bought
                </label>
                <input 
                  type="number" 
                  id="quantity" 
                  name="quantity" 
                  required 
                  min="0"
                  step="0.01"
                  placeholder="0"
                  className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-xl py-2.5 px-4 text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>

               <div>
                <label htmlFor="price" className="block text-sm font-medium text-zinc-300 mb-1.5">
                  Total Price (Rp)
                </label>
                <input 
                  type="number" 
                  id="price" 
                  name="price" 
                  required 
                  min="0"
                  placeholder="e.g. 150000"
                  className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-xl py-2.5 px-4 text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="receipt" className="block text-sm font-medium text-zinc-300 mb-1.5">
                Upload Receipt / Evidence (Optional)
              </label>
              <div className="flex items-center justify-center w-full">
                  <label htmlFor="receipt" className="flex flex-col items-center justify-center w-full h-32 border-2 border-zinc-800 border-dashed rounded-xl cursor-pointer bg-[#1a1a1a] hover:bg-zinc-800/50 hover:border-zinc-600 transition-all">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <UploadCloud className="w-8 h-8 mb-3 text-zinc-500" />
                          <p className="mb-1 text-sm text-zinc-400"><span className="font-semibold text-indigo-400">Click to upload</span> or drag and drop</p>
                          <p className="text-xs text-zinc-600">JPEG, PNG, or PDF</p>
                      </div>
                      <input id="receipt" name="receipt" type="file" className="hidden" accept="image/*,.pdf" />
                  </label>
              </div>
            </div>

          </div>

          <div className="pt-4 border-t border-zinc-800 flex justify-end">
             <button 
                type="submit"
                className="inline-flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-medium transition-colors cursor-pointer"
             >
               <Save className="w-5 h-5" />
               Save & Update Stock
             </button>
          </div>
        </form>
      </div>
    </div>
  );
}
