import { supabase } from '@/lib/supabase';
import { Wallet, TrendingUp, PackageSearch } from "lucide-react";
import { IngredientPriceFluctuation } from '@/components/IngredientPriceFluctuation';

export const dynamic = 'force-dynamic';

type IngredientRow = {
  id: string;
  name: string;
  stock: number | string | null;
  low_stock_threshold: number | string | null;
  average_price: number | string | null;
};

type ProductRecipeItemRow = {
  amount_required: number | string | null;
  ingredients: { average_price: number | string | null } | null;
};

type ProductRow = {
  price: number | string | null;
  operational_cost_buffer: number | string | null;
  is_percentage_buffer: boolean | null;
  recipe_items: ProductRecipeItemRow[] | null;
};

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

export default async function Dashboard() {
  // 1. Fetch Ingredients to calculate Asset Value and Low Stock
  const { data: ingredients } = await supabase
    .from('ingredients')
    .select('id, name, stock, low_stock_threshold, average_price')
    .returns<IngredientRow[]>();

  let totalAssetValue = 0;
  let lowStockCount = 0;

  ingredients?.forEach((ing) => {
    totalAssetValue += (Number(ing.stock) * Number(ing.average_price));
    if (Number(ing.stock) <= Number(ing.low_stock_threshold)) {
      lowStockCount++;
    }
  });

  // 2. Fetch Products to calculate Average Markup for Profit Projection
  const { data: products } = await supabase
    .from('products')
    .select(`
      price,
      operational_cost_buffer,
      is_percentage_buffer,
      recipe_items (
        amount_required,
        ingredients (average_price)
      )
    `)
    .returns<ProductRow[]>();

  let totalMarkupPercent = 0;
  let validProducts = 0;

  products?.forEach((p) => {
    let rawHPP = 0;
    p.recipe_items?.forEach((item) => {
      rawHPP += (Number(item.amount_required) * Number(item.ingredients?.average_price || 0));
    });
    
    let opCost = Number(p.operational_cost_buffer) || 0;
    if (p.is_percentage_buffer) opCost = (opCost / 100) * rawHPP;
    
    const hpp = rawHPP + opCost;
    const price = Number(p.price) || 0;
    if (hpp > 0 && price > hpp) {
       totalMarkupPercent += ((price - hpp) / hpp);
       validProducts++;
    }
  });

  const avgMarkup = validProducts > 0 ? (totalMarkupPercent / validProducts) : 0;
  const profitProjection = totalAssetValue * avgMarkup;

  // 3. Ingredient price fluctuation (per ingredient)
  const { data: ingredientOptions } = await supabase
    .from('ingredients')
    .select('id, name, unit')
    .order('name')
    .returns<IngredientOption[]>();

  const { data: latestPurchase } = await supabase
    .from('purchases')
    .select('ingredient_id, date')
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle()
    .returns<{ ingredient_id: string; date: string } | null>();

  const initialIngredientId =
    latestPurchase?.ingredient_id ?? ingredientOptions?.[0]?.id ?? null;
  const { data: initialPurchases } = initialIngredientId
    ? await supabase
        .from('purchases')
        .select('date, price, quantity')
        .eq('ingredient_id', initialIngredientId)
        .order('date', { ascending: true })
        .limit(30)
        .returns<PurchasePoint[]>()
    : { data: [] as PurchasePoint[] };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Business Intelligence</h1>
        <p className="text-zinc-400">Overview of your F&B business performance and asset value.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-[#111] border border-zinc-800 rounded-2xl p-6 flex flex-col gap-4 hover:border-indigo-500/50 transition-colors">
          <div className="flex items-center justify-between">
             <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
               <Wallet className="w-5 h-5" />
             </div>
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-400">Total Asset Value (Stock)</p>
            <p className="text-3xl font-bold text-white mt-1">Rp {Math.round(totalAssetValue).toLocaleString('id-ID')}</p>
          </div>
        </div>

        <div className="bg-[#111] border border-zinc-800 rounded-2xl p-6 flex flex-col gap-4 hover:border-emerald-500/50 transition-colors">
          <div className="flex items-center justify-between">
             <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
               <TrendingUp className="w-5 h-5" />
             </div>
          </div>
          <div>
             <div className="flex items-center gap-2">
               <p className="text-sm font-medium text-zinc-400">Est. Profit Projection</p>
               <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-sm">Avg Markup</span>
             </div>
            <p className="text-3xl font-bold text-white mt-1">Rp {Math.round(profitProjection).toLocaleString('id-ID')}</p>
          </div>
        </div>

        <div className="bg-[#111] border border-zinc-800 rounded-2xl p-6 flex flex-col gap-4 hover:border-rose-500/50 transition-colors">
          <div className="flex items-center justify-between">
             <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
               <PackageSearch className="w-5 h-5" />
             </div>
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-400">Low Stock Alerts</p>
            <p className={`text-3xl font-bold mt-1 ${lowStockCount > 0 ? 'text-rose-400' : 'text-white'}`}>
               {lowStockCount} Items
            </p>
          </div>
        </div>
      </div>

      <div className="bg-[#111] border border-zinc-800 rounded-2xl p-8 flex flex-col min-h-[400px]">
         <h3 className="text-lg font-bold text-white mb-6">Ingredient Price Fluctuation</h3>
         <div className="flex-1 w-full">
            <IngredientPriceFluctuation
              ingredients={ingredientOptions || []}
              initialIngredientId={initialIngredientId}
              initialData={initialPurchases || []}
            />
         </div>
      </div>
    </div>
  );
}
