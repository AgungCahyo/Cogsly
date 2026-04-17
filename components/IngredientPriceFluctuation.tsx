'use client';

import { useEffect, useMemo, useState } from 'react';
import { PriceChart } from './PriceChart';

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
        const res = await fetch(`/api/purchases?ingredient_id=${encodeURIComponent(ingredientId)}`, {
          cache: 'no-store',
        });
        const json: { data?: PurchasePoint[]; error?: string } = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load purchases');
        if (!cancelled) setData(json.data ?? []);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [ingredientId]);

  if (!ingredients.length) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center">
        <p className="text-zinc-500 text-sm mt-2">Add ingredients first to see price trends.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-zinc-300">Ingredient</p>
          <p className="text-xs text-zinc-500">Chart shows price per unit for the selected ingredient.</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={ingredientId ?? ''}
            onChange={(e) => setIngredientId(e.target.value || null)}
            className="bg-[#1a1a1a] border border-zinc-800 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all appearance-none"
          >
            {ingredients.map((ing) => (
              <option key={ing.id} value={ing.id}>
                {ing.name}
              </option>
            ))}
          </select>

          {loading && <span className="text-xs text-zinc-500">Loading…</span>}
        </div>
      </div>

      {error ? (
        <div className="flex-1 flex items-center justify-center text-center">
          <p className="text-rose-400 text-sm">{error}</p>
        </div>
      ) : (
        <div className="flex-1 w-full">
          {data.length === 0 && !loading ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <p className="text-zinc-500 text-sm">
                No purchase logs for this ingredient yet.
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

