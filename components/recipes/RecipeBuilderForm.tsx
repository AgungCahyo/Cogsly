'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/ToastProvider';

import { IngredientOption, RecipeInput } from '@/types';
import { RecipeItemRow } from './RecipeItemRow';
import { HPPProjector } from './HPPProjector';

export function RecipeBuilderForm({
  ingredients,
  submitRecipe,
  initialRecipe,
}: {
  ingredients: IngredientOption[];
  submitRecipe: (data: RecipeInput) => Promise<{ success: boolean }>;
  initialRecipe?: RecipeInput;
}) {
  const router = useRouter();
  const { showToast } = useToast();
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

  const addItem = () => setItems([...items, { id: Date.now().toString(), ingredient_id: '', amount: '' }]);
  const removeItem = (id: string) => { if (items.length > 1) setItems(items.filter(i => i.id !== id)); };
  const updateItem = (id: string, field: 'ingredient_id' | 'amount', value: string | number) =>
    setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));

  const rawMaterialHPP = items.reduce((sum, item) => {
    if (!item.ingredient_id || !item.amount) return sum;
    const ing = ingredients.find(i => i.id === item.ingredient_id);
    if (!ing) return sum;
    return sum + (Number(item.amount) * Number(ing.average_price));
  }, 0);

  const opCost = isPercent ? (Number(buffer) / 100) * rawMaterialHPP : Number(buffer);
  const totalHPP = rawMaterialHPP + opCost;
  const margin = Number(price) - totalHPP;
  const marginPercent = Number(price) > 0 ? (margin / Number(price)) * 100 : 0;

  const stockWarnings = items
    .filter(item => item.ingredient_id && item.amount)
    .map(item => {
      const ing = ingredients.find(i => i.id === item.ingredient_id);
      if (!ing) return null;
      const stock = Number(ing.stock) || 0;
      const needed = Number(item.amount) || 0;
      if (needed > stock) return { name: ing.name, stock, needed, unit: ing.unit };
      return null;
    })
    .filter(Boolean) as { name: string; stock: number; needed: number; unit: string | null }[];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const validItems = items.filter(i => i.ingredient_id && i.amount);
    if (validItems.length === 0) {
      showToast('Tambahkan minimal satu bahan yang valid.', 'error');
      setLoading(false);
      return;
    }
    try {
      const res = await submitRecipe({
        name, price: Number(price),
        operational_cost_buffer: Number(buffer),
        is_percentage_buffer: isPercent,
        items: validItems.map(i => ({ ingredient_id: i.ingredient_id, amount_required: Number(i.amount) }))
      });
      
      if (res.success) {
        router.push('/recipes');
        router.refresh();
      }
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan resep.';
      showToast(msg, 'error');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        {/* Product Details Section */}
        <div className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-sm shadow-zinc-950/5">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-6 font-mono">
            Detail Produk
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400">Nama Produk</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="cth. Iced Cafe Latte"
                className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-5 py-3.5 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/15 focus-visible:ring-offset-2 focus:border-zinc-950 transition-all placeholder:text-zinc-200"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400">Harga Jual (IDR)</label>
              <div className="relative group">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-300 group-focus-within:text-zinc-950 transition-colors">Rp</span>
                <input
                  type="number"
                  required
                  min="0"
                  value={price}
                  onChange={e => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="0"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl pl-12 pr-5 py-3.5 text-sm font-bold font-mono tracking-tighter text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/15 focus-visible:ring-offset-2 focus:border-zinc-950 transition-all placeholder:text-zinc-200"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Recipe Composition Section */}
        <div className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-sm shadow-zinc-950/5">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 font-mono">
              Komposisi Resep
            </h2>
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">
              {items.filter(i => i.ingredient_id).length} Bahan Dipilih
            </span>
          </div>

          <div className="space-y-3">
            {items.map((item, itemIdx) => (
              <RecipeItemRow
                key={item.id}
                item={item}
                index={itemIdx}
                ingredients={ingredients}
                onUpdate={updateItem}
                onRemove={removeItem}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={addItem}
            className="mt-6 inline-flex items-center gap-2.5 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-950 transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center justify-center group-hover:bg-zinc-950 group-hover:text-white transition-all">
              <Plus className="w-4 h-4" />
            </div>
            Tambah Bahan
          </button>
        </div>

        {/* Operational Cost Section */}
        <div className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-sm shadow-zinc-950/5">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-1 font-mono">
            Biaya Operasional
          </h2>
          <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-300 mb-6 font-sans">
            Buffer untuk kemasan, listrik, & tenaga kerja
          </p>
          <div className="relative max-w-sm group">
            <input
              type="number"
              min="0"
              step="0.01"
              value={buffer}
              onChange={e => setBuffer(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-5 py-4 text-sm font-bold font-mono tracking-tighter text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/15 focus-visible:ring-offset-2 focus:border-zinc-950 transition-all pr-24"
            />
            <div className="absolute inset-y-0 right-2 flex items-center">
              <div className="flex bg-white rounded-xl border border-zinc-100 p-1.5 shadow-sm">
                <button
                  type="button"
                  onClick={() => setIsPercent(true)}
                  className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${
                    isPercent ? 'bg-zinc-950 text-white shadow-md' : 'text-zinc-300 hover:text-zinc-950'
                  }`}
                >%</button>
                <button
                  type="button"
                  onClick={() => setIsPercent(false)}
                  className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${
                    !isPercent ? 'bg-zinc-950 text-white shadow-md' : 'text-zinc-300 hover:text-zinc-950'
                  }`}
                >Rp</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-1">
        <HPPProjector
          rawMaterialHPP={rawMaterialHPP}
          opCost={opCost}
          totalHPP={totalHPP}
          price={Number(price)}
          margin={margin}
          marginPercent={marginPercent}
          stockWarnings={stockWarnings}
          loading={loading}
        />
      </div>
    </form>
  );
}
