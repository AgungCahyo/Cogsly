import { supabase } from '@/lib/supabase';
import { POSClient } from './POSClient';

export const dynamic = 'force-dynamic';

type ProductRecipeItemRow = {
  ingredient_id: string;
  amount_required: number | string | null;
  ingredients: { average_price: number | string | null } | null;
};

type ProductRow = {
  id: string;
  name: string;
  price: number | string | null;
  operational_cost_buffer: number | string | null;
  is_percentage_buffer: boolean | null;
  recipe_items: ProductRecipeItemRow[] | null;
};

export default async function POSPage() {
  const { data: products } = await supabase
    .from('products')
    .select(`
      id,
      name,
      price,
      operational_cost_buffer,
      is_percentage_buffer,
      recipe_items (
        ingredient_id,
        amount_required,
        ingredients (
          average_price
        )
      )
    `)
    .returns<ProductRow[]>()
    .order('name');

  // Pre-calculate HPP for each product so the client doesn't have to
  const productsWithData = products?.map((p) => {
    const recipe_items = (p.recipe_items ?? []).map((item) => ({
      ingredient_id: item.ingredient_id,
      amount_required: Number(item.amount_required) || 0,
    }));

    const rawHPP = (p.recipe_items ?? []).reduce((sum, item) => {
      const amount = Number(item.amount_required) || 0;
      return sum + (amount * Number(item.ingredients?.average_price || 0));
    }, 0);

    let opCost = Number(p.operational_cost_buffer) || 0;
    if (p.is_percentage_buffer) {
       opCost = (opCost / 100) * rawHPP;
    }

    return {
      ...p,
      price: Number(p.price) || 0,
      recipe_items,
      hpp: rawHPP + opCost
    };
  }) || [];

  return (
    <div className="h-full flex flex-col">
       <div className="px-8 py-6 border-b border-zinc-800 flex justify-between items-center bg-[#0a0a0a]">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Point of Sale</h1>
            <p className="text-zinc-500 text-sm">Select products to add to cart and checkout.</p>
          </div>
       </div>
       <POSClient products={productsWithData} />
    </div>
  );
}
