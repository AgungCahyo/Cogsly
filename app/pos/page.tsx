// app/pos/page.tsx
import { createClient } from '@/lib/supabase/server';
import { POSClient } from './POSClient';
import { ProductRow } from '@/types';

export const dynamic = 'force-dynamic';

export default async function POSPage() {
  const supabase = await createClient();
  
  // Fetch Products
  const { data: products } = await supabase
    .from('products')
    .select(`id, name, price, operational_cost_buffer, is_percentage_buffer, recipe_items(ingredient_id, amount_required, ingredients(average_price))`)
    .returns<ProductRow[]>()
    .order('name');

  // Fetch Tables
  const { data: tables } = await supabase
    .from('tables')
    .select('*')
    .order('name');

  // Fetch Current User for Waiter ID
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user?.id).single();

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
    <div className="h-full flex flex-col bg-zinc-50">
      {/* Header */}
      <div className="px-8 py-6 flex justify-between items-center shrink-0 border-b border-zinc-200 bg-white shadow-sm z-20">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-1 font-mono">
            ◆ Kasir / POS
          </p>
          <h1 className="text-2xl font-bold font-serif tracking-tight text-zinc-950">
            Professional Point of Sale
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full bg-zinc-50 border border-zinc-100 text-zinc-400">
            {tables?.length || 0} Meja
          </div>
          <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full bg-zinc-950 text-white shadow-lg shadow-zinc-950/20">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            {productsWithData.length} Produk
          </div>
        </div>
      </div>
      
      <div className="flex-1 min-h-0 overflow-hidden relative">
        <POSClient 
          products={productsWithData} 
          tables={tables || []} 
          userRole={profile?.role || 'waiter'} 
        />
      </div>
    </div>
  );
}