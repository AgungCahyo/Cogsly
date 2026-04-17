import { supabase } from '@/lib/supabase';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default function AddIngredientPage() {
  
  async function createIngredient(formData: FormData) {
    'use server';
    
    const name = (formData.get('name')?.toString() ?? '').trim();
    const category = (formData.get('category')?.toString() ?? '').trim();
    const unit = (formData.get('unit')?.toString() ?? '').trim();
    const lowStockRaw = formData.get('low_stock_threshold')?.toString() ?? '0';
    const low_stock_threshold = Number(lowStockRaw);

    if (!name) throw new Error('Ingredient name is required.');
    if (!category) throw new Error('Category is required.');
    if (!unit) throw new Error('Unit is required.');
    if (!Number.isFinite(low_stock_threshold) || low_stock_threshold < 0) {
      throw new Error('Low stock threshold must be a valid non-negative number.');
    }

    const { error } = await supabase
      .from('ingredients')
      .insert([
        {
          name,
          category,
          unit,
          low_stock_threshold,
          stock: 0,
          average_price: 0
        }
      ]);

    if (error) {
       console.error("Error creating ingredient:", error);
       throw new Error(error.message);
    }

    redirect('/ingredients');
  }

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Link 
          href="/ingredients" 
          className="w-10 h-10 rounded-xl bg-[#111] border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Add New Ingredient</h1>
          <p className="text-zinc-500 text-sm">Register a new raw material to your master list.</p>
        </div>
      </div>

      <div className="bg-[#111] border border-zinc-800 rounded-2xl p-6 md:p-8">
        <form action={createIngredient} className="space-y-6">
          <div className="space-y-4">
            
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-zinc-300 mb-1.5">
                Ingredient Name
              </label>
              <input 
                type="text" 
                id="name" 
                name="name" 
                required 
                placeholder="e.g. Arabica Coffee Beans"
                className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-xl py-2.5 px-4 text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-zinc-300 mb-1.5">
                  Category
                </label>
                <select 
                  id="category" 
                  name="category" 
                  required
                  className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all appearance-none"
                >
                  <option value="Beans">Beans / Coffee</option>
                  <option value="Dairy">Dairy</option>
                  <option value="Syrup">Syrup</option>
                  <option value="Packaging">Packaging</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                 <label htmlFor="unit" className="block text-sm font-medium text-zinc-300 mb-1.5">
                  Unit of Measurement (UoM)
                </label>
                <select 
                  id="unit" 
                  name="unit" 
                  required
                  className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all appearance-none"
                >
                  <option value="gr">Grams (gr)</option>
                  <option value="kg">Kilograms (kg)</option>
                  <option value="ml">Milliliters (ml)</option>
                  <option value="pcs">Pieces (pcs)</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="low_stock_threshold" className="block text-sm font-medium text-zinc-300 mb-1.5">
                Low Stock Alert Threshold
              </label>
              <div className="relative">
                <input 
                  type="number" 
                  id="low_stock_threshold" 
                  name="low_stock_threshold" 
                  required 
                  min="0"
                  step="0.01"
                  defaultValue="0"
                  className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-xl py-2.5 px-4 text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                  <span className="text-zinc-500 text-sm">units</span>
                </div>
              </div>
              <p className="mt-1.5 text-xs text-zinc-500">
                You will be alerted when stock falls below this amount.
              </p>
            </div>

          </div>

          <div className="pt-4 border-t border-zinc-800 flex justify-end">
             <button 
                type="submit"
                className="inline-flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-medium transition-colors"
             >
               <Save className="w-5 h-5" />
               Save Ingredient
             </button>
          </div>
        </form>
      </div>
    </div>
  );
}
