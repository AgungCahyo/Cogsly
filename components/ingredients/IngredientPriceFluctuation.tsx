'use client';

import { useEffect, useMemo, useState } from 'react';
import { PriceChart } from './PriceChart';
import { TrendingUp, Activity, Search } from 'lucide-react';
import { getPurchaseTrends } from './actions';
import { Select } from '@/components/ui/Select';

import { IngredientOption, PurchasePoint } from '@/types';

export function IngredientPriceFluctuation({
  ingredients,
  initialIngredientId,
  initialData,
}: {
  ingredients: IngredientOption[];
  initialIngredientId: string | null;
  initialData: PurchasePoint[];
}) {
  const [ingredientId, setIngredientId] = useState<string | null>(initialIngredientId);
  const [data, setData] = useState<PurchasePoint[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => ingredients.find((i) => i.id === ingredientId) ?? null,
    [ingredients, ingredientId]
  );

  const ingredientOptions = useMemo(() => 
    ingredients.map(ing => ({
      label: ing.name,
      value: ing.id
    })), 
    [ingredients]
  );

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!ingredientId) return;
      setLoading(true);
      setError(null);
      try {
        const json = await getPurchaseTrends(ingredientId);
        if (json.error) throw new Error(json.error);
        if (!cancelled) setData(json.data ?? []);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [ingredientId]);

  if (!ingredients.length) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-12">
        <TrendingUp className="w-12 h-12 mb-4 text-zinc-200" />
        <h3 className="text-sm font-bold text-zinc-950 uppercase tracking-widest mb-2 font-serif">Belum Ada Bahan Baku</h3>
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 max-w-xs leading-relaxed">
          Tambahkan bahan baku di modul inventori untuk mulai melacak tren harga pasar.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 h-full">
      {/* Search & Selector Area */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-950 font-mono flex items-center gap-2">
            <Search className="w-3 h-3" />
            Pilih Bahan
          </p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">
            Harga per {selected?.unit ?? 'satuan'} tiap transaksi — bukan rata-rata
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Select
            options={ingredientOptions}
            value={ingredientId ?? ''}
            onChange={(val) => setIngredientId(val || null)}
            placeholder="Cari bahan..."
            className="w-full sm:min-w-[240px]"
            searchable={true}
          />
          {loading && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-50 border border-zinc-100 animate-pulse">
              <Activity className="w-3 h-3 text-zinc-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Syncing…</span>
            </div>
          )}
        </div>
      </div>

      {/* Chart Output */}
      {error ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-zinc-50 border border-zinc-100 rounded-2xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-950 mb-2 font-mono">Galat Data</p>
          <p className="text-xs font-medium text-zinc-400">{error}</p>
        </div>
      ) : (
        <div className="flex-1 w-full bg-white relative">
          {data.length === 0 && !loading ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-zinc-50 rounded-3xl">
              <Activity className="w-10 h-10 mb-4 text-zinc-100" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">
                Belum ada log pembelian untuk bahan ini
              </p>
            </div>
          ) : (
            <div className={loading ? 'opacity-40 grayscale blur-[1px] transition-all duration-500' : 'transition-all duration-500'}>
              <PriceChart data={data} unit={selected?.unit ?? undefined} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
