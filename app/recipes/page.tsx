import { supabase } from '@/lib/supabase';
import { UtensilsCrossed, Plus, Calculator, Pencil, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

type RecipeItemRow = {
  id: string;
  amount_required: number | string | null;
  ingredients: { name: string; unit: string | null; average_price: number | string | null } | null;
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
    .select(`id, name, price, operational_cost_buffer, is_percentage_buffer, recipe_items(id, amount_required, ingredients(name, unit, average_price))`)
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
    return { ...product, price, rawMaterialHPP, opCost, totalHPP, margin, marginPercent };
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
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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
          <div className="col-span-2 sm:col-span-1 p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Produk Profitable</p>
            <p className="text-2xl font-bold stat-number" style={{ color: 'var(--gold)' }}>
              {productsWithHPP.filter(p => p.margin > 0).length}
            </p>
          </div>
        </div>
      )}

      {/* Product cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {error ? (
          <div className="col-span-full p-8 text-center" style={{ color: 'var(--danger)' }}>
            Gagal memuat resep: {error.message}
          </div>
        ) : productsWithHPP.length === 0 ? (
          <div
            className="col-span-full p-16 rounded-2xl flex flex-col items-center justify-center text-center"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <UtensilsCrossed className="w-7 h-7" style={{ color: 'var(--text-muted)' }} />
            </div>
            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-serif)' }}>
              Belum ada resep
            </h3>
            <p className="text-sm mb-6 max-w-md" style={{ color: 'var(--text-secondary)' }}>
              Buat resep produk pertama Anda. Sistem akan otomatis menghitung HPP berdasarkan harga bahan baku terkini.
            </p>
            <Link href="/recipes/new" className="btn-ghost text-sm">Buat Resep Pertama</Link>
          </div>
        ) : (
          productsWithHPP.map((product) => (
            <div
              key={product.id}
              className="rounded-2xl p-5 flex flex-col gap-4 card-interactive"
            >
              {/* Card top */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0"
                    style={{ background: 'rgba(212,170,60,0.1)', color: 'var(--gold)' }}
                  >
                    {product.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                      {product.name}
                    </h3>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
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

              {/* Sell price */}
              <div
                className="flex items-center justify-between p-3 rounded-xl"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
              >
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Harga Jual</span>
                <span className="font-bold stat-number" style={{ color: 'var(--text-primary)' }}>
                  Rp {Number(product.price).toLocaleString('id-ID')}
                </span>
              </div>

              {/* HPP breakdown */}
              <div className="space-y-2 pt-1" style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                    <Calculator className="w-3.5 h-3.5" />
                    Total HPP
                  </span>
                  <span className="stat-number font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Rp {Math.round(product.totalHPP).toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                    <TrendingUp className="w-3.5 h-3.5" />
                    Margin
                  </span>
                  <div className="text-right">
                    <span
                      className="font-bold stat-number"
                      style={{ color: product.margin >= 0 ? 'var(--success)' : 'var(--danger)' }}
                    >
                      Rp {Math.round(product.margin).toLocaleString('id-ID')}
                    </span>
                    <span
                      className="ml-1.5 text-xs px-1.5 py-0.5 rounded-md font-medium"
                      style={{
                        background: product.margin >= 0 ? 'var(--success-dim)' : 'var(--danger-dim)',
                        color: product.margin >= 0 ? 'var(--success)' : 'var(--danger)',
                      }}
                    >
                      {product.marginPercent.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Margin bar */}
                <div className="h-1.5 rounded-full overflow-hidden mt-2" style={{ background: 'var(--bg-elevated)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, Math.max(0, product.marginPercent))}%`,
                      background: product.margin >= 0 ? 'var(--success)' : 'var(--danger)',
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