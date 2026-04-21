'use client';

import { useMemo } from 'react';
import { Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { IngredientOption } from '@/types';
import { Select } from '@/components/ui/Select';

export function RecipeItemRow({
  item,
  index,
  ingredients,
  onUpdate,
  onRemove,
}: {
  item: { id: string; ingredient_id: string; amount: number | '' };
  index: number;
  ingredients: IngredientOption[];
  onUpdate: (id: string, field: 'ingredient_id' | 'amount', value: string | number) => void;
  onRemove: (id: string) => void;
}) {
  const selectedIng = ingredients.find(i => i.id === item.ingredient_id);
  const stock = Number(selectedIng?.stock) || 0;
  const needed = Number(item.amount) || 0;
  const isLowStock = selectedIng && needed > 0 && needed > stock;
  const hasStock = selectedIng && stock > 0;

  const ingredientOptions = useMemo(() => 
    ingredients.map(ing => ({
      label: `${ing.name} (${ing.unit})`,
      value: ing.id
    })), 
    [ingredients]
  );

  return (
    <div
      className={`rounded-2xl  border transition-all duration-300 ${
        isLowStock 
          ? 'border-zinc-950 bg-zinc-50 shadow-inner ring-1 ring-zinc-950' 
          : 'border-zinc-100 bg-white hover:border-zinc-200'
      }`}
    >
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 p-4">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold transition-colors ${
          isLowStock ? 'bg-zinc-950 text-white' : 'bg-zinc-100 text-zinc-400'
        }`}>
          {index + 1}
        </div>

        <div className="flex-1 min-w-0">
          <Select
            options={ingredientOptions}
            value={item.ingredient_id}
            onChange={(val) => onUpdate(item.id, 'ingredient_id', val)}
            placeholder="Pilih bahan baku..."
            searchable={true}
          />

          {selectedIng && (
            <div className="flex items-center gap-4 mt-2 ml-1">
              {Number(selectedIng.average_price) > 0 && (
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                  Rp {Number(selectedIng.average_price).toLocaleString('id-ID')} / {selectedIng.unit}
                </span>
              )}
              <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-tighter ${
                isLowStock ? 'bg-zinc-950 text-white' : hasStock ? 'bg-zinc-100 text-zinc-500' : 'text-zinc-300'
              }`}>
                {isLowStock
                  ? <AlertTriangle className="w-3 h-3" />
                  : hasStock
                  ? <CheckCircle2 className="w-3 h-3" />
                  : null
                }
                Stok: {stock.toLocaleString('id-ID')} {selectedIng.unit}
              </div>
            </div>
          )}
        </div>

        <div className={`flex items-center gap-3 px-4 py-2 rounded-xl shrink-0 transition-colors self-start mt-0.5 ${
          isLowStock ? 'bg-zinc-100 border border-zinc-950' : 'bg-zinc-50 border border-zinc-100'
        }`}>
          <input
            type="number"
            min="0"
            step="0.01"
            required
            value={item.amount}
            onChange={e => onUpdate(item.id, 'amount', e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="0.00"
            className="w-full md:w-24 md:w-24 md:w-16 text-right text-sm font-bold font-mono tracking-tighter bg-transparent border-none outline-none text-zinc-950 placeholder:text-zinc-200"
          />
          {selectedIng && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">
              {selectedIng.unit}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="p-2 rounded-xl transition-all text-zinc-300 hover:bg-zinc-950 hover:text-white self-start mt-0.5"
        >
          <Trash2 className="w-4.5 h-4.5" />
        </button>
      </div>

      {isLowStock && (
        <div className="px-5 py-2.5 flex items-center gap-2.5 bg-zinc-950 border-t border-zinc-950">
          <AlertTriangle className="w-4 h-4 text-white" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-white leading-none">
            Stok Kurang — Butuh {needed.toLocaleString('id-ID')} {selectedIng?.unit}, Tersedia {stock.toLocaleString('id-ID')}
          </span>
        </div>
      )}
    </div>
  );
}
