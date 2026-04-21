import { createClient } from '@/lib/supabase/server';
import { UtensilsCrossed, Plus, Calculator, Pencil, TrendingUp, AlertTriangle, ChefHat } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

import { RecipeItemRow, ProductRow } from '@/types';

export default async function RecipesPage() {
  const supabase = await createClient();
  const { data: products, error } = await supabase
    .from('products')
    .select(`id, name, price, operational_cost_buffer, is_percentage_buffer,
      recipe_items(id, amount_required, ingredients(name, unit, average_price, stock))`)
    .returns<ProductRow[]>()
    .order('name');

  const productsWithHPP = products?.map((product) => {
    const rawMaterialHPP = (product.recipe_items ?? []).reduce((sum, item) => {
      return sum + Number(item.amount_required) * Number(item.ingredients?.average_price || 0);
    }, 0);
    let opCost = Number(product.operational_cost_buffer) || 0;
    if (product.is_percentage_buffer) opCost = (opCost / 100) * rawMaterialHPP;
    const totalHPP = rawMaterialHPP + opCost;
    const price = Number(product.price) || 0;
    const margin = price - totalHPP;
    const marginPercent = price > 0 ? (margin / price) * 100 : 0;

    const lowStockIngredients = (product.recipe_items ?? []).filter(item => {
      const needed = Number(item.amount_required) || 0;
      const stock = Number(item.ingredients?.stock) || 0;
      return needed > 0 && stock < needed;
    });

    return { ...product, price, rawMaterialHPP, opCost, totalHPP, margin, marginPercent, lowStockIngredients };
  }) || [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-zinc-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-1 font-mono">◆ Resep & HPP</p>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 font-serif sm:text-3xl">Resep & Harga Pokok</h1>
          <p className="text-xs mt-1 text-zinc-500 font-medium">Kelola produk, resep, dan analisis margin</p>
        </div>
        <Link href="/recipes/new" className="inline-flex items-center gap-2 bg-zinc-950 text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-all hover:bg-zinc-800">
          <Plus className="w-3.5 h-3.5" />
          Buat Resep
        </Link>
      </div>

      {/* Summary strips */}
      {productsWithHPP.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <div className="bg-white border border-zinc-200 rounded-xl px-4 py-3.5 shadow-sm">
            <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-0.5">Total Produk</p>
            <p className="text-2xl font-bold font-mono tracking-tighter text-zinc-950">{productsWithHPP.length}</p>
          </div>
          <div className="bg-white border border-zinc-200 rounded-xl px-4 py-3.5 shadow-sm">
            <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-0.5">Rata-rata Margin</p>
            <p className="text-2xl font-bold font-mono tracking-tighter text-zinc-950">
              {productsWithHPP.length > 0 ? `${(productsWithHPP.reduce((s, p) => s + p.marginPercent, 0) / productsWithHPP.length).toFixed(1)}%` : '—'}
            </p>
          </div>
          <div className="bg-white border border-zinc-200 rounded-xl px-4 py-3.5 shadow-sm">
            <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-0.5">Profitable</p>
            <p className="text-2xl font-bold font-mono tracking-tighter text-zinc-950">{productsWithHPP.filter(p => p.margin > 0).length}</p>
          </div>
          <div className="bg-white border border-zinc-200 rounded-xl px-4 py-3.5 shadow-sm">
            <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-0.5">Stok Kurang</p>
            <p className={`text-2xl font-bold font-mono tracking-tighter ${productsWithHPP.filter(p => p.lowStockIngredients.length > 0).length > 0 ? 'text-zinc-950' : 'text-zinc-200'}`}>
              {productsWithHPP.filter(p => p.lowStockIngredients.length > 0).length}
            </p>
          </div>
        </div>
      )}

      {/* Recipes Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {error ? (
          <div className="col-span-full p-10 text-center font-bold text-zinc-950 text-sm">Gagal memuat: {error.message}</div>
        ) : productsWithHPP.length === 0 ? (
          <div className="col-span-full p-12 flex flex-col items-center justify-center text-center bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-2xl">
            <div className="w-14 h-14 rounded-3xl bg-white border border-zinc-100 flex items-center justify-center mb-4 shadow-sm">
              <ChefHat className="w-7 h-7 text-zinc-300" />
            </div>
            <h3 className="text-base font-bold text-zinc-950 mb-1.5 font-serif">Belum ada resep</h3>
            <p className="text-xs text-zinc-500 max-w-xs mb-6 font-medium leading-relaxed">Buat resep pertama dan hitung HPP otomatis berdasarkan harga bahan baku terkini.</p>
            <Link href="/recipes/new" className="bg-zinc-950 text-white px-6 py-2.5 rounded-xl font-bold text-xs hover:bg-zinc-800">Buat Resep Pertama</Link>
          </div>
        ) : productsWithHPP.map((product) => (
          <div key={product.id} className={`group bg-white rounded-2xl p-5 border transition-all duration-300 flex flex-col gap-4 hover:shadow-xl hover:shadow-zinc-950/5 ${product.lowStockIngredients.length > 0 ? 'border-zinc-950 ring-1 ring-zinc-950' : 'border-zinc-200'}`}>
            {/* Card top */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs bg-zinc-100 text-zinc-400 group-hover:bg-zinc-950 group-hover:text-white transition-colors">
                  {product.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-zinc-950 leading-tight">{product.name}</h3>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mt-0.5">{(product.recipe_items ?? []).length} Bahan</p>
                </div>
              </div>
              <Link href={`/recipes/${product.id}`} className="p-2 bg-zinc-50 text-zinc-400 rounded-xl hover:bg-zinc-950 hover:text-white transition-all border border-transparent hover:border-zinc-950">
                <Pencil className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Price */}
            <div className="bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Harga Jual</span>
              <span className="font-bold font-mono text-sm text-zinc-950">Rp {Number(product.price).toLocaleString('id-ID')}</span>
            </div>

            {/* Stock warning */}
            {product.lowStockIngredients.length > 0 && (
              <div className="bg-zinc-950 text-white rounded-xl px-4 py-3 space-y-1.5">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-bold uppercase tracking-widest">Stok Tidak Cukup</span>
                </div>
                {product.lowStockIngredients.slice(0, 2).map(item => (
                  <div key={item.id} className="text-[9px] flex justify-between font-medium text-zinc-400">
                    <span className="truncate">{item.ingredients?.name}</span>
                    <span className="shrink-0 ml-2">Butuh {Number(item.amount_required).toLocaleString()} {item.ingredients?.unit}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Ingredients */}
            <div className="space-y-2">
              {(product.recipe_items ?? []).slice(0, 4).map((item) => {
                const needed = Number(item.amount_required) || 0;
                const stock = Number(item.ingredients?.stock) || 0;
                const isInsufficient = needed > 0 && stock < needed;
                return (
                  <div key={item.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${isInsufficient ? 'bg-zinc-950' : 'bg-zinc-200'}`} />
                      <span className={`text-[10px] font-medium ${isInsufficient ? 'text-zinc-950 font-bold' : 'text-zinc-500'}`}>{item.ingredients?.name}</span>
                    </div>
                    <span className="text-[9px] font-bold font-mono text-zinc-400">{needed.toLocaleString()} {item.ingredients?.unit}</span>
                  </div>
                );
              })}
              {(product.recipe_items ?? []).length > 4 && (
                <p className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest">+{(product.recipe_items ?? []).length - 4} bahan lainnya</p>
              )}
            </div>

            {/* Margin */}
            <div className="mt-auto pt-4 border-t border-zinc-100 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <Calculator className="w-3 h-3" />
                  <span className="text-[9px] font-bold uppercase tracking-widest">Total HPP</span>
                </div>
                <span className="text-xs font-bold font-mono text-zinc-500">Rp {Math.round(product.totalHPP).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <TrendingUp className="w-3 h-3" />
                  <span className="text-[9px] font-bold uppercase tracking-widest">Margin</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`font-bold font-mono text-sm ${product.margin >= 0 ? 'text-zinc-950' : 'text-zinc-300'}`}>
                    Rp {Math.round(product.margin).toLocaleString('id-ID')}
                  </span>
                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md uppercase ${product.margin >= 0 ? 'bg-zinc-950 text-white' : 'bg-zinc-100 text-zinc-400'}`}>
                    {product.marginPercent.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="h-1 bg-zinc-100 rounded-full overflow-hidden">
                <div className={`h-full transition-all duration-700 ${product.margin >= 0 ? 'bg-zinc-950' : 'bg-zinc-300'}`}
                  style={{ width: `${Math.min(100, Math.max(0, product.marginPercent))}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}