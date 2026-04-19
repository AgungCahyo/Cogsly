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
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-end sm:items-center justify-between gap-6 border-b border-zinc-200 pb-8">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-2 font-mono">
            ◆ Resep & HPP
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-zinc-950 font-serif">
            Resep & Harga Pokok
          </h1>
          <p className="text-sm mt-1.5 text-zinc-500 font-medium tracking-tight">
            Kelola produk, resep, dan analisis margin keuntungan
          </p>
        </div>
        <Link 
          href="/recipes/new" 
          className="inline-flex items-center gap-2.5 bg-zinc-950 text-white px-6 py-3 rounded-2xl font-bold text-sm transition-all hover:bg-zinc-800 hover:shadow-xl hover:shadow-zinc-950/10"
        >
          <Plus className="w-4 h-4" />
          Buat Resep
        </Link>
      </div>

      {/* Summary strips */}
      {productsWithHPP.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-zinc-200 rounded-2xl px-6 py-5 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Total Produk</p>
            <p className="text-3xl font-bold font-mono tracking-tighter text-zinc-950">{productsWithHPP.length}</p>
          </div>
          <div className="bg-white border border-zinc-200 rounded-2xl px-6 py-5 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Rata-rata Margin</p>
            <p className="text-3xl font-bold font-mono tracking-tighter text-zinc-950">
              {productsWithHPP.length > 0
                ? `${(productsWithHPP.reduce((s, p) => s + p.marginPercent, 0) / productsWithHPP.length).toFixed(1)}%`
                : '—'}
            </p>
          </div>
          <div className="bg-white border border-zinc-200 rounded-2xl px-6 py-5 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Profitable</p>
            <p className="text-3xl font-bold font-mono tracking-tighter text-zinc-950">
              {productsWithHPP.filter(p => p.margin > 0).length}
            </p>
          </div>
          <div className="bg-white border border-zinc-200 rounded-2xl px-6 py-5 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Stok Kurang</p>
            <p className={`text-3xl font-bold font-mono tracking-tighter ${productsWithHPP.filter(p => p.lowStockIngredients.length > 0).length > 0 ? 'text-zinc-950' : 'text-zinc-200'}`}>
              {productsWithHPP.filter(p => p.lowStockIngredients.length > 0).length}
            </p>
          </div>
        </div>
      )}

      {/* Recipes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {error ? (
          <div className="col-span-full p-20 text-center font-bold text-zinc-950">
            Gagal memuat resep: {error.message}
          </div>
        ) : productsWithHPP.length === 0 ? (
          <div className="col-span-full p-20 flex flex-col items-center justify-center text-center bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-[2.5rem]">
            <div className="w-20 h-20 rounded-3xl bg-white border border-zinc-100 flex items-center justify-center mb-6 shadow-sm">
              <ChefHat className="w-10 h-10 text-zinc-300" />
            </div>
            <h3 className="text-xl font-bold text-zinc-950 mb-2 font-serif">Belum ada resep</h3>
            <p className="text-sm text-zinc-500 max-w-sm mb-8 font-medium leading-relaxed">
              Buat resep produk pertama Anda. Sistem akan menghitung HPP otomatis berdasarkan harga bahan baku terkini.
            </p>
            <Link 
              href="/recipes/new" 
              className="bg-zinc-950 text-white px-8 py-3.5 rounded-2xl font-bold text-sm transition-all hover:bg-zinc-800"
            >
              Buat Resep Pertama
            </Link>
          </div>
        ) : (
          productsWithHPP.map((product) => (
            <div
              key={product.id}
              className={`group bg-white rounded-3xl p-7 border transition-all duration-300 flex flex-col gap-6 hover:shadow-2xl hover:shadow-zinc-950/5 ${
                product.lowStockIngredients.length > 0 ? 'border-zinc-950 ring-1 ring-zinc-950' : 'border-zinc-200'
              }`}
            >
              {/* Card top */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm bg-zinc-100 text-zinc-400 group-hover:bg-zinc-950 group-hover:text-white transition-colors">
                    {product.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-950 leading-tight">
                      {product.name}
                    </h3>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mt-1">
                      {(product.recipe_items ?? []).length} Bahan Baku
                    </p>
                  </div>
                </div>
                <Link
                  href={`/recipes/${product.id}`}
                  className="p-2 bg-zinc-50 text-zinc-400 rounded-xl hover:bg-zinc-950 hover:text-white transition-all border border-transparent hover:border-zinc-950"
                >
                  <Pencil className="w-4 h-4" />
                </Link>
              </div>

              {/* Price Display */}
              <div className="bg-zinc-50 border border-zinc-100 rounded-2xl px-5 py-4 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Harga Jual</span>
                <span className="font-bold font-mono text-base text-zinc-950 tracking-tighter">
                  Rp {Number(product.price).toLocaleString('id-ID')}
                </span>
              </div>

              {/* Stock Warning UI */}
              {product.lowStockIngredients.length > 0 && (
                <div className="bg-zinc-950 text-white rounded-2xl px-5 py-4 space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-white" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Stok Tidak Cukup</span>
                  </div>
                  {product.lowStockIngredients.map(item => (
                    <div key={item.id} className="text-[10px] flex justify-between font-medium text-zinc-400">
                      <span>{item.ingredients?.name}</span>
                      <span>Butuh {Number(item.amount_required).toLocaleString('id-ID')} {item.ingredients?.unit}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Ingredients List */}
              <div className="space-y-2.5">
                {(product.recipe_items ?? []).map((item) => {
                  const needed = Number(item.amount_required) || 0;
                  const stock = Number(item.ingredients?.stock) || 0;
                  const isInsufficient = needed > 0 && stock < needed;
                  return (
                    <div key={item.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isInsufficient ? (
                          <div className="w-1.5 h-1.5 rounded-full bg-zinc-950" />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-zinc-200" />
                        )}
                        <span className={`text-xs font-medium ${isInsufficient ? 'text-zinc-950 font-bold' : 'text-zinc-500'}`}>
                          {item.ingredients?.name}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold font-mono text-zinc-400">
                        {needed.toLocaleString('id-ID')} {item.ingredients?.unit}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Margin Breakdown */}
              <div className="mt-auto pt-6 border-t border-zinc-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Calculator className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Total HPP</span>
                  </div>
                  <span className="text-xs font-bold font-mono text-zinc-500 tracking-tighter">
                    Rp {Math.round(product.totalHPP).toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Margin</span>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <span className={`font-bold font-mono text-sm tracking-tighter ${product.margin >= 0 ? 'text-zinc-950' : 'text-zinc-300'}`}>
                      Rp {Math.round(product.margin).toLocaleString('id-ID')}
                    </span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${product.margin >= 0 ? 'bg-zinc-950 text-white' : 'bg-zinc-100 text-zinc-400'}`}>
                      {product.marginPercent.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Progress Bar (Monochrome) */}
                <div className="h-1 bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-700 ${product.margin >= 0 ? 'bg-zinc-950' : 'bg-zinc-300'}`}
                    style={{
                      width: `${Math.min(100, Math.max(0, product.marginPercent))}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}