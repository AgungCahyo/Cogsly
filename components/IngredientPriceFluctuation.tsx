'use client';

import { useEffect, useMemo, useState } from 'react';
import { PriceChart } from './PriceChart';
import { TrendingUp } from 'lucide-react';

type IngredientOption = {
  id: string;
  name: string;
  unit: string | null;
};

type PurchasePoint = {
  date: string | number | Date;
  price: number | string;
  quantity: number | string;
};

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

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!ingredientId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/purchases?ingredient_id=${encodeURIComponent(ingredientId)}`, { cache: 'no-store' });
        const json: { data?: PurchasePoint[]; error?: string } = await res.json();
        if (!res.ok) throw new Error(json.error || 'Gagal memuat data pembelian');
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
      <div className="h-full flex flex-col items-center justify-center text-center">
        <TrendingUp className="w-8 h-8 mb-2 opacity-20" style={{ color: 'var(--text-muted)' }} />
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Tambahkan bahan baku terlebih dahulu untuk melihat tren harga.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Pilih Bahan</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Grafik menampilkan harga per satuan berdasarkan riwayat pembelian.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={ingredientId ?? ''}
            onChange={(e) => setIngredientId(e.target.value || null)}
            className="input-base"
            style={{ width: 'auto', minWidth: '160px' }}
          >
            {ingredients.map((ing) => (
              <option key={ing.id} value={ing.id}>{ing.name}</option>
            ))}
          </select>
          {loading && (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Memuat…</span>
          )}
        </div>
      </div>

      {error ? (
        <div className="flex-1 flex items-center justify-center text-center">
          <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>
        </div>
      ) : (
        <div className="flex-1 w-full">
          {data.length === 0 && !loading ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <TrendingUp className="w-8 h-8 mb-2 opacity-20" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Belum ada log pembelian untuk bahan ini.
              </p>
            </div>
          ) : (
            <PriceChart data={data} unit={selected?.unit ?? undefined} />
          )}
        </div>
      )}
    </div>
  );
}