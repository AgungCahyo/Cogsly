'use client';

import { useState } from 'react';
import { Save, Plus, Trash2, Calculator } from 'lucide-react';
import { useRouter } from 'next/navigation';

type IngredientOption = {
  id: string;
  name: string;
  unit: string | null;
  average_price: number | string | null;
};

type SubmitRecipeInput = {
  name: string;
  price: number;
  operational_cost_buffer: number;
  is_percentage_buffer: boolean;
  items: { ingredient_id: string; amount_required: number }[];
};

type InitialRecipe = {
  name: string;
  price: number;
  operational_cost_buffer: number;
  is_percentage_buffer: boolean;
  items: { ingredient_id: string; amount_required: number }[];
};

export function RecipeBuilderForm({
  ingredients,
  submitRecipe,
  initialRecipe,
}: {
  ingredients: IngredientOption[];
  submitRecipe: (data: SubmitRecipeInput) => Promise<void>;
  initialRecipe?: InitialRecipe;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialRecipe?.name ?? '');
  const [price, setPrice] = useState<number | ''>(initialRecipe?.price ?? '');
  const [buffer, setBuffer] = useState<number | ''>(initialRecipe?.operational_cost_buffer ?? 0);
  const [isPercent, setIsPercent] = useState(initialRecipe?.is_percentage_buffer ?? true);
  
  const [items, setItems] = useState<{ id: string; ingredient_id: string; amount: number | '' }[]>(() =>
    (initialRecipe?.items?.length ? initialRecipe.items : [{ ingredient_id: '', amount_required: 0 }]).map(
      (i, idx) => ({
        id: `${i.ingredient_id || 'item'}-${idx}`,
        ingredient_id: i.ingredient_id,
        amount: i.amount_required || '',
      })
    )
  );

  const [loading, setLoading] = useState(false);

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), ingredient_id: '', amount: '' }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: 'ingredient_id' | 'amount', value: string | number) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  // Calculations
  const rawMaterialHPP = items.reduce((sum, item) => {
    if (!item.ingredient_id || !item.amount) return sum;
    const ingredient = ingredients.find(i => i.id === item.ingredient_id);
    if (!ingredient) return sum;
    return sum + (Number(item.amount) * Number(ingredient.average_price));
  }, 0);

  const opCost = isPercent 
    ? (Number(buffer) / 100) * rawMaterialHPP 
    : Number(buffer);

  const totalHPP = rawMaterialHPP + opCost;
  const margin = Number(price) - totalHPP;
  const marginPercent = Number(price) > 0 ? (margin / Number(price)) * 100 : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const validItems = items.filter(i => i.ingredient_id && i.amount);
    
    if (validItems.length === 0) {
      alert("Please add at least one valid ingredient.");
      setLoading(false);
      return;
    }

    try {
      await submitRecipe({
        name,
        price: Number(price),
        operational_cost_buffer: Number(buffer),
        is_percentage_buffer: isPercent,
        items: validItems.map(i => ({ ingredient_id: i.ingredient_id, amount_required: Number(i.amount) }))
      });
      router.push('/recipes');
    } catch (err) {
      console.error(err);
      alert("Error saving recipe");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-[#111] border border-zinc-800 rounded-2xl p-6 md:p-8 space-y-6">
          <h2 className="text-xl font-bold text-white mb-4">Product Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Product Name</label>
              <input 
                type="text" 
                required 
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Iced Cafe Latte"
                className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-xl py-2.5 px-4 text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Selling Price (Rp)</label>
              <input 
                type="number" 
                required 
                min="0"
                value={price}
                onChange={e => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0"
                className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-xl py-2.5 px-4 text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Recipe Composition</h3>
            
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex flex-col sm:flex-row items-center gap-3 p-3 bg-[#1a1a1a] border border-zinc-800 rounded-xl">
                  <div className="flex-1 w-full relative">
                    <select
                      value={item.ingredient_id}
                      onChange={e => updateItem(item.id, 'ingredient_id', e.target.value)}
                      required
                      className="w-full bg-transparent text-white focus:outline-none appearance-none pr-8"
                    >
                      <option value="" disabled>Select Ingredient</option>
                      {ingredients.map(ing => (
                        <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="w-full sm:w-32 relative">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={item.amount}
                      onChange={e => updateItem(item.id, 'amount', e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Amount"
                      className="w-full bg-transparent text-white focus:outline-none text-right pr-2"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="p-2 text-zinc-500 hover:text-rose-400 bg-zinc-900 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addItem}
              className="mt-4 inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Ingredient
            </button>
          </div>
        </div>

        <div className="bg-[#111] border border-zinc-800 rounded-2xl p-6 md:p-8">
           <h2 className="text-xl font-bold text-white mb-4">Operational Costs</h2>
           <p className="text-sm text-zinc-500 mb-4">Buffer for packaging, electricity, labor, etc.</p>

           <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="relative flex items-center">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={buffer}
                    onChange={e => setBuffer(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-xl py-2.5 px-4 pr-16 text-white focus:outline-none focus:border-indigo-500 transition-all font-medium"
                  />
                  <div className="absolute right-2 flex items-center bg-zinc-800 rounded-lg p-1">
                     <button
                       type="button"
                       onClick={() => setIsPercent(true)}
                       className={`px-2 py-1 text-xs font-bold rounded-md ${isPercent ? 'bg-indigo-500 text-white' : 'text-zinc-400 hover:text-white'}`}
                     >%</button>
                     <button
                       type="button"
                       onClick={() => setIsPercent(false)}
                       className={`px-2 py-1 text-xs font-bold rounded-md ${!isPercent ? 'bg-indigo-500 text-white' : 'text-zinc-400 hover:text-white'}`}
                     >Rp</button>
                  </div>
                </div>
              </div>
           </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-6 sticky top-8">
          <div className="flex items-center gap-2 text-indigo-400 mb-6">
            <Calculator className="w-5 h-5" />
            <h3 className="font-bold">Live HPP Estimate</h3>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between text-zinc-400">
              <span>Ingredients Cost</span>
              <span>Rp {Math.round(rawMaterialHPP).toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Operational Buffer</span>
              <span>+ Rp {Math.round(opCost).toLocaleString('id-ID')}</span>
            </div>
            <div className="pt-3 border-t border-indigo-500/20 flex justify-between font-bold text-white text-lg">
              <span>Total HPP</span>
              <span>Rp {Math.round(totalHPP).toLocaleString('id-ID')}</span>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-indigo-500/20">
             <div className="flex justify-between text-zinc-400 mb-2">
              <span className="text-sm">Projected Margin</span>
              <span className={`font-bold ${margin >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {marginPercent.toFixed(1)}%
              </span>
            </div>
            <div className={`text-2xl font-bold ${margin >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              Rp {Math.round(margin).toLocaleString('id-ID')}
            </div>
          </div>

          <button 
             type="submit"
             disabled={loading}
             className="mt-8 w-full flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold transition-colors cursor-pointer"
          >
            <Save className="w-5 h-5" />
            {loading ? 'Saving...' : 'Save Recipe'}
          </button>
        </div>
      </div>
    </form>
  )
}
