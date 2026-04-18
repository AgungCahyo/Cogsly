import { supabase } from '@/lib/supabase';
import { Wallet, TrendingUp, PackageSearch, AlertTriangle, Activity, ArrowUpRight, ChevronRight } from "lucide-react";
import { IngredientPriceFluctuation } from '@/components/IngredientPriceFluctuation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

import { IngredientOption, ProductRow, PurchasePoint, Ingredient } from '@/types';

export default async function Dashboard() {
  const { data: ingredients } = await supabase
    .from('ingredients')
    .select('id, name, stock, low_stock_threshold, average_price')
    .returns<Ingredient[]>();

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
    .select(`id, name, price, operational_cost_buffer, is_percentage_buffer, recipe_items(amount_required, ingredients(average_price))`)
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
        .select('date, price, quantity, purchase_unit, unit_conversion')
        .eq('ingredient_id', initialIngredientId)
        .order('date', { ascending: true })
        .limit(30)
        .returns<PurchasePoint[]>()
    : { data: [] as PurchasePoint[] };

  const stats = [
    {
      label: 'Nilai Aset',
      sublabel: 'Total stok tersedia',
      value: `Rp ${Math.round(totalAssetValue).toLocaleString('id-ID')}`,
      icon: Wallet,
      accentColor: 'var(--gold)',
      accentBg: 'var(--gold-muted)',
      href: '/ingredients',
    },
    {
      label: 'Estimasi Laba',
      sublabel: `Rata-rata markup ${(avgMarkup * 100).toFixed(1)}%`,
      value: `Rp ${Math.round(profitProjection).toLocaleString('id-ID')}`,
      icon: TrendingUp,
      accentColor: 'var(--success)',
      accentBg: 'var(--success-dim)',
      href: '/recipes',
    },
    {
      label: 'Stok Menipis',
      sublabel: lowStockCount > 0
        ? lowStockItems.slice(0, 2).join(', ') + (lowStockItems.length > 2 ? '…' : '')
        : 'Semua stok aman',
      value: `${lowStockCount} Item`,
      icon: lowStockCount > 0 ? AlertTriangle : PackageSearch,
      accentColor: lowStockCount > 0 ? 'var(--danger)' : 'var(--text-muted)',
      accentBg: lowStockCount > 0 ? 'var(--danger-dim)' : 'rgba(74,67,48,0.2)',
      href: '/ingredients',
    },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between pt-2">
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-2"
            style={{ color: 'var(--gold)', fontFamily: 'var(--font-mono)' }}
          >
            ◆ Dasbor Utama
          </p>
          <h1
            className="text-3xl font-bold leading-tight"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-serif)' }}
          >
            Intelijen Bisnis
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Pantau performa dan kesehatan stok secara real-time
          </p>
        </div>
        <div
          className="hidden sm:flex items-center gap-2 text-xs px-3 py-2 rounded-lg"
          style={{
            border: '1px solid var(--border)',
            background: 'var(--bg-card)',
            color: 'var(--text-secondary)',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: 'var(--success)' }} />
          <Activity className="w-3 h-3" />
          Data langsung
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map(({ label, sublabel, value, icon: Icon, accentColor, accentBg, href }) => (
          <Link
            key={label}
            href={href}
            className="group block rounded-2xl p-5 card-interactive"
          >
            <div className="flex items-start justify-between mb-5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: accentBg }}
              >
                <Icon className="w-4.5 h-4.5" style={{ color: accentColor, width: '18px', height: '18px' }} />
              </div>
              <ArrowUpRight
                className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                style={{ color: 'var(--text-muted)' }}
              />
            </div>
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{label}</p>
            <p
              className="text-2xl font-bold tracking-tight mb-1 stat-number"
              style={{ color: accentColor }}
            >
              {value}
            </p>
            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{sublabel}</p>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Tambah Bahan', href: '/ingredients/new', desc: 'Daftarkan bahan baku baru' },
          { label: 'Catat Pembelian', href: '/procurement/new', desc: 'Log pengadaan material' },
          { label: 'Buat Resep', href: '/recipes/new', desc: 'Hitung HPP produk baru' },
          { label: 'Buka Kasir', href: '/pos', desc: 'Mulai proses transaksi' },
        ].map(item => (
          <Link
            key={item.href}
            href={item.href}
            className="group p-4 rounded-xl card-interactive"
          >
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{item.label}</p>
              <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--gold)' }} />
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.desc}</p>
          </Link>
        ))}
      </div>

      {/* Chart */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div>
            <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              Tren Harga Beli Bahan
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Harga per satuan tiap transaksi pembelian — bukan rata-rata keseluruhan
            </p>
          </div>
          <span
            className="text-xs px-2.5 py-1 rounded-lg mono-font"
            style={{ background: 'var(--gold-muted)', color: 'var(--gold)', border: '1px solid rgba(212,170,60,0.2)' }}
          >
            30 transaksi terakhir
          </span>
        </div>
        <div className="p-6 min-h-[380px] flex flex-col">
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