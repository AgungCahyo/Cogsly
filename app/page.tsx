import { supabase } from '@/lib/supabase';
import { Wallet, TrendingUp, PackageSearch, ArrowUpRight, Activity } from "lucide-react";
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
  const { data: ingredients } = await supabase
    .from('ingredients')
    .select('id, name, stock, low_stock_threshold, average_price')
    .returns<IngredientRow[]>();

  let totalAssetValue = 0;
  let lowStockCount = 0;
  const lowStockItems: string[] = [];

  ingredients?.forEach((ing) => {
    totalAssetValue += Number(ing.stock) * Number(ing.average_price);
    if (Number(ing.stock) <= Number(ing.low_stock_threshold)) {
      lowStockCount++;
      lowStockItems.push(ing.name);
    }
  });

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
      rawHPP += Number(item.amount_required) * Number(item.ingredients?.average_price || 0);
    });
    let opCost = Number(p.operational_cost_buffer) || 0;
    if (p.is_percentage_buffer) opCost = (opCost / 100) * rawHPP;
    const hpp = rawHPP + opCost;
    const price = Number(p.price) || 0;
    if (hpp > 0 && price > hpp) {
      totalMarkupPercent += (price - hpp) / hpp;
      validProducts++;
    }
  });

  const avgMarkup = validProducts > 0 ? totalMarkupPercent / validProducts : 0;
  const profitProjection = totalAssetValue * avgMarkup;

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

  const stats = [
    {
      label: 'Asset Value',
      sublabel: 'Total stock in hand',
      value: `Rp ${Math.round(totalAssetValue).toLocaleString('id-ID')}`,
      icon: Wallet,
      iconBg: 'bg-violet-500/10',
      iconColor: 'text-violet-400',
      borderHover: 'hover:border-violet-500/30',
      valueColor: 'text-white',
    },
    {
      label: 'Est. Profit Projection',
      sublabel: `Avg markup ${(avgMarkup * 100).toFixed(1)}%`,
      value: `Rp ${Math.round(profitProjection).toLocaleString('id-ID')}`,
      icon: TrendingUp,
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-400',
      borderHover: 'hover:border-emerald-500/30',
      valueColor: 'text-white',
    },
    {
      label: 'Low Stock Alerts',
      sublabel:
        lowStockCount > 0
          ? lowStockItems.slice(0, 2).join(', ') + (lowStockItems.length > 2 ? '…' : '')
          : 'All items stocked',
      value: `${lowStockCount} Items`,
      icon: PackageSearch,
      iconBg: lowStockCount > 0 ? 'bg-rose-500/10' : 'bg-zinc-800',
      iconColor: lowStockCount > 0 ? 'text-rose-400' : 'text-zinc-500',
      borderHover: 'hover:border-rose-500/30',
      valueColor: lowStockCount > 0 ? 'text-rose-400' : 'text-white',
    },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-1">Overview</p>
          <h1 className="text-2xl font-bold tracking-tight text-white">Business Intelligence</h1>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-zinc-500 bg-white/[0.04] border border-white/[0.08] px-3 py-1.5 rounded-lg">
          <Activity className="w-3 h-3 text-emerald-400" />
          Live data
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map(({ label, sublabel, value, icon: Icon, iconBg, iconColor, valueColor, borderHover }) => (
          <div
            key={label}
            className={`group relative bg-[#111] border border-white/[0.06] rounded-2xl p-5 transition-all duration-200 ${borderHover} hover:bg-[#141414]`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-9 h-9 ${iconBg} rounded-xl flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${iconColor}`} />
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-zinc-700 group-hover:text-zinc-500 transition-colors" />
            </div>
            <p className="text-[13px] font-medium text-zinc-400 mb-1">{label}</p>
            <p className={`text-2xl font-bold tracking-tight ${valueColor} mb-1`}>{value}</p>
            <p className="text-[11px] text-zinc-600 truncate">{sublabel}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-[#111] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div>
            <h2 className="text-sm font-semibold text-white">Ingredient Price Fluctuation</h2>
            <p className="text-[11px] text-zinc-500 mt-0.5">Price per unit over time based on purchase history</p>
          </div>
        </div>
        <div className="p-6 min-h-[360px] flex flex-col">
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