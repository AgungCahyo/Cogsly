import { createClient } from '@/lib/supabase/server';
import { Wallet, TrendingUp, PackageSearch, AlertTriangle, Activity, ArrowUpRight, ChevronRight } from "lucide-react";
import { IngredientPriceFluctuation } from '@/components/ingredients/IngredientPriceFluctuation';
import Link from 'next/link';
import { effectiveRole } from '@/lib/auth/access-policy';

export const dynamic = 'force-dynamic';

import { IngredientOption, ProductRow, PurchasePoint, Ingredient, UserRole } from '@/types';

export default async function Dashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profileRow } = user
    ? await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    : { data: null };
  const role = effectiveRole(profileRow?.role as UserRole | undefined);

  const canInventory = role === 'admin' || role === 'warehouse';
  const canRecipes = role === 'admin';
  const canSeePurchaseTrend = role === 'admin' || role === 'warehouse' || role === 'cashier';

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

  const inventoryHref = canInventory ? '/ingredients' : '/pos';
  const recipesHref = canRecipes ? '/recipes' : '/pos';

  let ingredientOptions: IngredientOption[] = [];
  let initialIngredientId: string | null = null;
  let initialPurchases: PurchasePoint[] = [];

  if (canSeePurchaseTrend) {
    const { data: opts } = await supabase
      .from('ingredients')
      .select('id, name, unit')
      .order('name')
      .returns<IngredientOption[]>();
    ingredientOptions = opts ?? [];

    const { data: latestPurchase } = await supabase
      .from('purchases')
      .select('ingredient_id, date')
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle()
      .returns<{ ingredient_id: string; date: string } | null>();

    initialIngredientId = latestPurchase?.ingredient_id ?? ingredientOptions[0]?.id ?? null;

    if (initialIngredientId) {
      const { data: purchases } = await supabase
        .from('purchases')
        .select('date, price, quantity, purchase_unit, unit_conversion')
        .eq('ingredient_id', initialIngredientId)
        .order('date', { ascending: true })
        .limit(30)
        .returns<PurchasePoint[]>();
      initialPurchases = purchases ?? [];
    }
  }

  const stats = [
    {
      label: 'Nilai Aset',
      sublabel: 'Total stok tersedia',
      value: `Rp ${Math.round(totalAssetValue).toLocaleString('id-ID')}`,
      icon: Wallet,
      href: inventoryHref,
    },
    {
      label: 'Estimasi Laba',
      sublabel: `Rata-rata markup ${(avgMarkup * 100).toFixed(1)}%`,
      value: `Rp ${Math.round(profitProjection).toLocaleString('id-ID')}`,
      icon: TrendingUp,
      href: recipesHref,
    },
    {
      label: 'Stok Menipis',
      sublabel: lowStockCount > 0
        ? lowStockItems.slice(0, 2).join(', ') + (lowStockItems.length > 2 ? '…' : '')
        : 'Semua stok aman',
      value: `${lowStockCount} Item`,
      icon: lowStockCount > 0 ? AlertTriangle : PackageSearch,
      isWarning: lowStockCount > 0,
      href: inventoryHref,
    },
  ];

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-10">
      {/* Header */}
      <div className="flex items-end justify-between border-b border-zinc-200 pb-8">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-2 font-mono">
            ◆ Dasbor Utama
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-zinc-950 font-serif">
            Intelijen Bisnis
          </h1>
          <p className="text-sm mt-1.5 text-zinc-500 font-medium tracking-tight">
            Analisis performa dan kesehatan inventori secara real-time
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2.5 text-[10px] font-bold uppercase tracking-widest px-4 py-2.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-pulse" />
          <Activity className="w-3.5 h-3.5" />
          Data Langsung
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map(({ label, sublabel, value, icon: Icon, href, isWarning }) => (
          <Link
            key={label}
            href={href}
            className="group block bg-white border border-zinc-200 rounded-3xl p-7 transition-all duration-300 hover:border-zinc-950 hover:shadow-2xl hover:shadow-zinc-950/5 relative overflow-hidden"
          >
            <div className="flex items-start justify-between mb-8">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors shadow-sm",
                isWarning ? "bg-zinc-950 text-white" : "bg-zinc-50 text-zinc-500 group-hover:bg-zinc-950 group-hover:text-white"
              )}>
                <Icon className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-5 h-5 text-zinc-300 transition-all duration-300 group-hover:text-zinc-950 group-hover:translate-x-1 group-hover:-translate-y-1" />
            </div>
            
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1.5">{label}</p>
            <p className={cn(
              "text-3xl font-bold tracking-tighter font-mono mb-2 transition-colors",
              isWarning ? "text-zinc-950" : "text-zinc-950"
            )}>
              {value}
            </p>
            <p className="text-xs font-medium text-zinc-500">{sublabel}</p>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {(
          [
            {
              label: 'Tambah Bahan',
              href: '/ingredients/new',
              desc: 'Daftar inventory baru',
              roles: ['admin', 'warehouse'] as const,
            },
            {
              label: 'Catat Pembelian',
              href: '/procurement/new',
              desc: 'Log pengadaan material',
              roles: ['admin', 'warehouse'] as const,
            },
            {
              label: 'Buat Resep',
              href: '/recipes/new',
              desc: 'Hitung HPP produk',
              roles: ['admin'] as const,
            },
            {
              label: 'Buka Kasir',
              href: '/pos',
              desc: 'Mulai transaksi',
              roles: ['admin', 'cashier', 'waiter'] as const,
            },
          ] as const
        )
          .filter((item) => (item.roles as readonly UserRole[]).includes(role))
          .map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group p-5 bg-white border border-zinc-200 rounded-2xl transition-all hover:border-zinc-950 hover:bg-zinc-950 hover:text-white"
            >
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-sm font-bold tracking-tight">{item.label}</p>
                <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-white transition-transform group-hover:translate-x-1" />
              </div>
              <p className="text-[10px] font-medium text-zinc-400 group-hover:text-zinc-300 transition-colors uppercase tracking-widest">
                {item.desc}
              </p>
            </Link>
          ))}
      </div>

      {/* Chart Section */}
      {canSeePurchaseTrend && (
        <div className="bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-sm shadow-zinc-950/5">
          <div className="flex items-center justify-between px-8 py-6 border-b border-zinc-100 bg-zinc-50/30">
            <div>
              <h2 className="text-base font-bold text-zinc-950 tracking-tight">Tren Harga Satuan</h2>
              <p className="text-[11px] font-medium text-zinc-500 mt-1 uppercase tracking-wide">
                Harga per unit tiap transaksi — bukan rata-rata
              </p>
            </div>
            <span className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-zinc-950 text-white font-mono tracking-widest">
              30 Transaksi Terakhir
            </span>
          </div>
          <div className="p-8 min-h-[400px]">
            <IngredientPriceFluctuation
              ingredients={ingredientOptions}
              initialIngredientId={initialIngredientId}
              initialData={initialPurchases}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}