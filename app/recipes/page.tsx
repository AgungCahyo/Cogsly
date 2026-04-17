import { supabase } from '@/lib/supabase';
import { UtensilsCrossed, Plus, Calculator, Pencil } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

type RecipeItemRow = {
  id: string;
  amount_required: number | string | null;
  ingredients: {
    name: string;
    unit: string | null;
    average_price: number | string | null;
  } | null;
};

type ProductRow = {
  id: string;
  name: string;
  price: number | string | null;
  operational_cost_buffer: number | string | null;
  is_percentage_buffer: boolean | null;
  recipe_items: RecipeItemRow[] | null;
};

export default async function RecipesPage() {
  const { data: products, error } = await supabase
    .from('products')
    .select(`
      id,
      name,
      price,
      operational_cost_buffer,
      is_percentage_buffer,
      recipe_items (
        id,
        amount_required,
        ingredients (
          name,
          unit,
          average_price
        )
      )
    `)
    .returns<ProductRow[]>()
    .order('name');

  // Calculate HPP dynamically
  const productsWithHPP = products?.map((product) => {
    const rawMaterialHPP = (product.recipe_items ?? []).reduce((sum, item) => {
      const ingHPP = (Number(item.amount_required) * Number(item.ingredients?.average_price || 0));
      return sum + ingHPP;
    }, 0);

    let opCost = Number(product.operational_cost_buffer) || 0;
    if (product.is_percentage_buffer) {
       opCost = (opCost / 100) * rawMaterialHPP;
    }

    const totalHPP = rawMaterialHPP + opCost;
    const price = Number(product.price) || 0;
    const margin = price - totalHPP;
    const marginPercent = price > 0 ? (margin / price) * 100 : 0;

    return {
      ...product,
      price,
      rawMaterialHPP,
      opCost,
      totalHPP,
      margin,
      marginPercent
    };
  }) || [];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Recipe & HPP</h1>
          <p className="text-zinc-400">Manage products, recipes, and analyze profit margins.</p>
        </div>
        <Link 
          href="/recipes/new" 
          className="inline-flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Recipe
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {error ? (
           <div className="col-span-full p-8 text-center text-rose-400">Failed to load recipes: {error.message}</div>
        ) : productsWithHPP.length === 0 ? (
           <div className="col-span-full p-16 bg-[#111] border border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mb-4">
              <UtensilsCrossed className="w-8 h-8 text-zinc-600" />
            </div>
            <h3 className="text-lg font-medium text-white mb-1">No recipes found</h3>
            <p className="text-zinc-500 mb-6 max-w-md">Create your first product recipe. The system will automatically calculate the Cost of Goods Sold (HPP) based on your ingredient stock prices.</p>
            <Link 
              href="/recipes/new" 
              className="inline-flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              Build Recipe
            </Link>
          </div>
        ) : (
          productsWithHPP.map((product) => (
            <div key={product.id} className="bg-[#111] border border-zinc-800 rounded-2xl p-6 flex flex-col gap-4 hover:border-zinc-700 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center font-bold">
                    {product.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white leading-tight">{product.name}</h3>
                    <p className="text-sm text-zinc-500">{(product.recipe_items ?? []).length} ingredients</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Link
                    href={`/recipes/${product.id}`}
                    className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white"
                    title="Edit recipe"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </Link>
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-medium text-zinc-500 mb-1">Sell Price</span>
                    <span className="text-white font-bold">Rp {Number(product.price).toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800 space-y-3">
                <div className="flex items-center justify-between text-sm">
                   <span className="text-zinc-400 flex items-center gap-1.5"><Calculator className="w-4 h-4" /> Total HPP</span>
                   <span className="text-zinc-100 font-medium">Rp {Math.round(product.totalHPP).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                   <span className="text-zinc-400">Profit Margin</span>
                   <span className={`font-semibold ${product.margin >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                     Rp {Math.round(product.margin).toLocaleString('id-ID')} ({product.marginPercent.toFixed(1)}%)
                   </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
