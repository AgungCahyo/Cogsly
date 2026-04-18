import { supabase } from '@/lib/supabase';
import { UtensilsCrossed, Plus, Calculator, Pencil, TrendingUp, AlertTriangle, ChefHat } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

import { RecipeItemRow, ProductRow } from '@/types';

export default async function RecipesPage() {
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

    // Check which ingredients have insufficient stock for 1 serving
    const lowStockIngredients = (product.recipe_items ?? []).filter(item => {
      const needed = Number(item.amount_required) || 0;
      const stock = Number(item.ingredients?.stock) || 0;
      return needed > 0 && stock < needed;
    });

    return { ...product, price, rawMaterialHPP, opCost, totalHPP, margin, marginPercent, lowStockIngredients };
  }) || [];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--gold)', fontFamily: 'var(--font-mono)' }}>
            ◆ Resep & HPP
          </p>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-serif)' }}>
            Resep & Harga Pokok
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Kelola produk, resep, dan analisis margin keuntungan
          </p>
        </div>
        <Link href="/recipes/new" className="btn-primary">
          <Plus className="w-4 h-4" />
          Buat Resep
        </Link>
      </div>

      {/* Summary */}
      {productsWithHPP.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Total Produk</p>
            <p className="text-2xl font-bold stat-number" style={{ color: 'var(--text-primary)' }}>{productsWithHPP.length}</p>
          </div>
          <div className="p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Rata-rata Margin</p>
            <p className="text-2xl font-bold stat-number" style={{ color: 'var(--success)' }}>
              {productsWithHPP.length > 0
                ? `${(productsWithHPP.reduce((s, p) => s + p.marginPercent, 0) / productsWithHPP.length).toFixed(1)}%`
                : '—'}
            </p>
          </div>
          <div className="p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Produk Profitable</p>
            <p className="text-2xl font-bold stat-number" style={{ color: 'var(--gold)' }}>
              {productsWithHPP.filter(p => p.margin > 0).length}
            </p>
          </div>
          <div className="p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Stok Kurang</p>
            <p className="text-2xl font-bold stat-number" style={{ color: productsWithHPP.filter(p => p.lowStockIngredients.length > 0).length > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
              {productsWithHPP.filter(p => p.lowStockIngredients.length > 0).length}
            </p>
          </div>
        </div>
      )}

      {/* Product cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {error ? (
          <div className="col-span-full p-8 text-center text-danger">
            Gagal memuat resep: {error.message}
          </div>
        ) : productsWithHPP.length === 0 ? (
          <div className="col-span-full h-full flex flex-col items-center justify-center text-center p-16 border-2 border-dashed border-border rounded-2xl bg-bg-card/30">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-bg-elevated border border-border">
              <ChefHat className="w-8 h-8 text-text-muted" />
            </div>
            <h3 className="text-lg font-bold mb-2 text-text-primary font-serif">
              Belum ada resep
            </h3>
            <p className="text-sm mb-6 max-w-md text-text-secondary">
              Buat resep produk pertama Anda. Sistem akan otomatis menghitung HPP berdasarkan harga bahan baku terkini.
            </p>
            <Link href="/recipes/new" className="btn-ghost text-sm">Buat Resep Pertama</Link>
          </div>
        ) : (
          productsWithHPP.map((product) => (
            <div
              key={product.id}
              className={`rounded-2xl p-5 flex flex-col gap-4 card-interactive ${product.lowStockIngredients.length > 0 ? 'border border-danger/20' : ''}`}
            >
              {/* Card top */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 bg-gold/10 text-gold"
                  >
                    {product.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold leading-tight text-text-primary">
                      {product.name}
                    </h3>
                    <p className="text-xs mt-0.5 text-text-muted">
                      {(product.recipe_items ?? []).length} bahan
                    </p>
                  </div>
                </div>
                <Link
                  href={`/recipes/${product.id}`}
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg item-interactive"
                >
                  <Pencil className="w-3 h-3" />
                  Edit
                </Link>
              </div>

              {/* Low stock warning */}
              {product.lowStockIngredients.length > 0 && (
                <div
                  className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs bg-danger-dim border border-danger/20"
                >
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-danger" />
                  <div className="text-danger">
                    <p className="font-semibold mb-0.5">Stok bahan tidak cukup untuk 1 porsi:</p>
                    {product.lowStockIngredients.map(item => (
                      <p key={item.id} className="opacity-85">
                        {item.ingredients?.name} — butuh {Number(item.amount_required).toLocaleString('id-ID')} {item.ingredients?.unit},
                        ada {Number(item.ingredients?.stock).toLocaleString('id-ID')} {item.ingredients?.unit}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Sell price */}
              <div
                className="flex items-center justify-between p-3 rounded-xl bg-bg-elevated border border-border"
              >
                <span className="text-xs text-text-muted">Harga Jual</span>
                <span className="font-bold stat-number text-text-primary">
                  Rp {Number(product.price).toLocaleString('id-ID')}
                </span>
              </div>

              {/* Ingredient list */}
              <div className="space-y-1">
                {(product.recipe_items ?? []).map((item) => {
                  const needed = Number(item.amount_required) || 0;
                  const stock = Number(item.ingredients?.stock) || 0;
                  const isInsufficient = needed > 0 && stock < needed;
                  return (
                    <div key={item.id} className="flex items-center justify-between text-xs">
                      <span
                        className={`flex items-center gap-1.5 ${isInsufficient ? 'text-danger' : 'text-text-secondary'}`}
                      >
                        {isInsufficient && <AlertTriangle className="w-3 h-3 shrink-0" />}
                        {item.ingredients?.name}
                      </span>
                      <span className={`stat-number ${isInsufficient ? 'text-danger' : 'text-text-muted'}`}>
                        {needed.toLocaleString('id-ID')} {item.ingredients?.unit}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* HPP breakdown */}
              <div className="space-y-2 border-t border-border pt-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-text-secondary">
                    <Calculator className="w-3.5 h-3.5" />
                    Total HPP
                  </span>
                  <span className="stat-number font-medium text-text-secondary">
                    Rp {Math.round(product.totalHPP).toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-text-secondary">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Margin
                  </span>
                  <div className="text-right">
                    <span
                      className={`font-bold stat-number ${product.margin >= 0 ? 'text-success' : 'text-danger'}`}
                    >
                      Rp {Math.round(product.margin).toLocaleString('id-ID')}
                    </span>
                    <span
                      className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-md font-medium ${product.margin >= 0 ? 'bg-success-dim text-success' : 'bg-danger-dim text-danger'}`}
                    >
                      {product.marginPercent.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Margin bar */}
                <div className="h-1.5 rounded-full overflow-hidden mt-2 bg-bg-elevated">
                  <div
                    className={`h-full rounded-full transition-all ${product.margin >= 0 ? 'bg-success' : 'bg-danger'}`}
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