// app/pos/page.tsx
import { supabase } from '@/lib/supabase';
import { POSClient } from './POSClient';

import { ProductRow } from '@/types';

export const dynamic = 'force-dynamic';

export default async function POSPage() {
  const { data: products } = await supabase
    .from('products')
    .select(`id, name, price, operational_cost_buffer, is_percentage_buffer, recipe_items(ingredient_id, amount_required, ingredients(average_price))`)
    .returns<ProductRow[]>()
    .order('name');

    const productsWithData = products?.map((p) => {
    const recipe_items = (p.recipe_items ?? []).map((item) => ({
      ingredient_id: item.ingredient_id || '',
      amount_required: Number(item.amount_required) || 0,
    }));
    const rawHPP = (p.recipe_items ?? []).reduce((sum, item) => {
      return sum + (Number(item.amount_required) || 0) * Number(item.ingredients?.average_price || 0);
    }, 0);
    let opCost = Number(p.operational_cost_buffer) || 0;
    if (p.is_percentage_buffer) opCost = (opCost / 100) * rawHPP;
    return { ...p, price: Number(p.price) || 0, recipe_items, hpp: rawHPP + opCost };
  }) || [];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div
        className="px-6 py-5 flex justify-between items-center shrink-0"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}
      >
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-1"
            style={{ color: 'var(--gold)', fontFamily: 'DM Mono, monospace' }}
          >
            ◆ Kasir
          </p>
          <h1
            className="text-xl font-bold"
            style={{ color: 'var(--text-primary)', fontFamily: 'DM Serif Display, serif' }}
          >
            Point of Sale
          </h1>
        </div>
        <div
          className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
        >
          <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: 'var(--success)' }} />
          {productsWithData.length} produk aktif
        </div>
      </div>
      <POSClient products={productsWithData} />
    </div>
  );
}