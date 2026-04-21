import { createClient } from '@/lib/supabase/server';
import { Wallet, TrendingUp, PackageSearch, AlertTriangle, Activity, ArrowUpRight, ChevronRight } from "lucide-react";
import { IngredientPriceFluctuation } from '@/components/ingredients/IngredientPriceFluctuation';
import { FinancialRecap } from '@/components/dashboard/FinancialRecap';
import Link from 'next/link';
import { effectiveRole } from '@/lib/auth/access-policy';

export const dynamic = 'force-dynamic';

import { IngredientOption, ProductRow, PurchasePoint, Ingredient, UserRole, PurchaseRow } from '@/types';

export default async function Dashboard(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();
  const searchParams = await props.searchParams;
  
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profileRow } = user
    ? await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    : { data: null };
  const role = effectiveRole(profileRow?.role as UserRole | undefined);

  const canInventory = role === 'admin' || role === 'warehouse';
  const canRecipes = role === 'admin';
  const canSeePurchaseTrend = role === 'admin' || role === 'warehouse' || role === 'cashier';
  const isAdmin = role === 'admin';

  const [{ data: ingredients }, { data: products }] = await Promise.all([
    supabase.from('ingredients').select('id, name, stock, low_stock_threshold, average_price').returns<Ingredient[]>(),
    supabase.from('products').select(`id, name, price, operational_cost_buffer, is_percentage_buffer, recipe_items(amount_required, ingredients(average_price))`).returns<ProductRow[]>()
  ]);

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
    const { data: opts } = await supabase.from('ingredients').select('id, name, unit').order('name').returns<IngredientOption[]>();
    ingredientOptions = opts ?? [];

    const { data: latestPurchase } = await supabase
      .from('purchases').select('ingredient_id, date').order('date', { ascending: false }).limit(1).maybeSingle()
      .returns<{ ingredient_id: string; date: string } | null>();

    initialIngredientId = latestPurchase?.ingredient_id ?? ingredientOptions[0]?.id ?? null;

    if (initialIngredientId) {
      const { data: purchases } = await supabase
        .from('purchases').select('date, price, quantity, purchase_unit, unit_conversion')
        .eq('ingredient_id', initialIngredientId).order('date', { ascending: true }).limit(30)
        .returns<PurchasePoint[]>();
      initialPurchases = purchases ?? [];
    }
  }

  const stats = [
    { label: 'Nilai Aset', sublabel: 'Total stok tersedia', value: `Rp ${Math.round(totalAssetValue).toLocaleString('id-ID')}`, icon: Wallet, href: inventoryHref },
    { label: 'Est. Laba', sublabel: `Markup ${(avgMarkup * 100).toFixed(1)}%`, value: `Rp ${Math.round(profitProjection).toLocaleString('id-ID')}`, icon: TrendingUp, href: recipesHref },
    { label: 'Stok Menipis', sublabel: lowStockCount > 0 ? lowStockItems.slice(0, 2).join(', ') : 'Semua aman', value: `${lowStockCount} Item`, icon: lowStockCount > 0 ? AlertTriangle : PackageSearch, isWarning: lowStockCount > 0, href: inventoryHref },
  ];

  let recapProps: any = null;
  
  if (isAdmin) {
    const customStartStr = searchParams?.start as string | undefined;
    const customEndStr = searchParams?.end as string | undefined;
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - 6); weekStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now); monthStart.setDate(now.getDate() - 29); monthStart.setHours(0, 0, 0, 0);

    let queryStart = monthStart;
    let queryEnd = now;

    if (customStartStr && customEndStr) {
      const cs = new Date(customStartStr);
      if (!isNaN(cs.getTime())) queryStart = cs;
      const ce = new Date(customEndStr);
      if (!isNaN(ce.getTime())) { ce.setHours(23, 59, 59, 999); queryEnd = ce; }
    }

    const fetchStart = queryStart < monthStart ? queryStart : monthStart;
    const fetchEnd = queryEnd > now ? queryEnd : now;

    const [{ data: orders }, { data: orderItems }, { data: purchases }] = await Promise.all([
      supabase.from('orders').select('*').eq('status', 'paid').gte('completed_at', fetchStart.toISOString()).lte('completed_at', fetchEnd.toISOString()).order('completed_at', { ascending: true }),
      supabase.from('order_items').select('order_id, product_id, quantity, price, hpp, products(name)').returns<any[]>(),
      supabase.from('purchases').select('id, date, price, quantity, supplier, ingredients(name, category)').gte('date', fetchStart.toISOString()).lte('date', fetchEnd.toISOString()).order('date', { ascending: true }).returns<PurchaseRow[]>(),
    ]);

    const dailyMap: Record<string, { revenue: number; hpp: number; orders: number; expenses: number }> = {};
    const rangeStart = new Date(fetchStart); rangeStart.setHours(0, 0, 0, 0);
    for (let d = new Date(rangeStart); d <= fetchEnd; d.setDate(d.getDate() + 1)) {
      dailyMap[d.toISOString().slice(0, 10)] = { revenue: 0, hpp: 0, orders: 0, expenses: 0 };
    }

    const todayOrders: any[] = [], weekOrders: any[] = [], monthOrders: any[] = [], customOrders: any[] = [];
    const paymentStats: Record<string, number> = { cash: 0, qris: 0, debit: 0, credit: 0 };

    (orders || []).forEach(o => {
      const oDate = new Date(o.completed_at);
      const key = oDate.toISOString().slice(0, 10);
      if (dailyMap[key]) { dailyMap[key].revenue += Number(o.total_price); dailyMap[key].hpp += Number(o.total_hpp); dailyMap[key].orders += 1; }
      if (oDate >= todayStart) todayOrders.push(o);
      if (oDate >= weekStart) weekOrders.push(o);
      if (oDate >= monthStart) monthOrders.push(o);
      if (oDate >= queryStart && oDate <= queryEnd) customOrders.push(o);
      if (oDate >= queryStart && oDate <= queryEnd && o.payment_method) {
        paymentStats[o.payment_method] = (paymentStats[o.payment_method] || 0) + Number(o.total_price);
      }
    });

    const chartData = Object.entries(dailyMap).map(([date, vals]) => ({
      date, revenue: Math.round(vals.revenue), hpp: Math.round(vals.hpp), profit: Math.round(vals.revenue - vals.hpp), expenses: 0, orders: vals.orders,
    }));

    (purchases || []).forEach(p => {
      const key = new Date(p.date).toISOString().slice(0, 10);
      const c = chartData.find(d => d.date === key);
      if (c) c.expenses += Number(p.price);
    });

    const chartDataWithCashflow = chartData.map(c => ({ ...c, cashflow: c.revenue - c.expenses }));

    function buildPeriodStats(orderRows: any[], purchaseRows: PurchaseRow[]) {
      const revenue = orderRows.reduce((s, r) => s + Number(r.total_price), 0);
      const hpp = orderRows.reduce((s, r) => s + Number(r.total_hpp), 0);
      const expenses = purchaseRows.reduce((s, r) => s + Number(r.price), 0);
      const grossProfit = revenue - hpp;
      return { revenue, hpp, grossProfit, expenses, netCashflow: revenue - expenses, orders: orderRows.length, purchaseCount: purchaseRows.length, margin: revenue > 0 ? (grossProfit / revenue) * 100 : 0 };
    }

    const todayPurchases = (purchases || []).filter(p => new Date(p.date) >= todayStart);
    const weekPurchases = (purchases || []).filter(p => new Date(p.date) >= weekStart);
    const monthPurchases = (purchases || []).filter(p => new Date(p.date) >= monthStart);
    const customPurchases = (purchases || []).filter(p => new Date(p.date) >= queryStart && new Date(p.date) <= queryEnd);

    const referenceOrders = customStartStr && customEndStr ? customOrders : monthOrders;
    const referenceOrderIds = new Set(referenceOrders.map(o => o.id));
    const productMap: Record<string, { name: string; qty: number; revenue: number }> = {};
    (orderItems || []).forEach(item => {
      if (!referenceOrderIds.has(item.order_id)) return;
      const pid = item.product_id;
      if (!productMap[pid]) productMap[pid] = { name: item.products?.name ?? 'Unknown', qty: 0, revenue: 0 };
      productMap[pid].qty += Number(item.quantity);
      productMap[pid].revenue += Number(item.price) * Number(item.quantity);
    });

    const categoryMap: Record<string, number> = {};
    const referencePurchases = customStartStr && customEndStr ? customPurchases : monthPurchases;
    (referencePurchases || []).forEach(p => {
      const cat = p.ingredients?.category ?? 'Lainnya';
      categoryMap[cat] = (categoryMap[cat] ?? 0) + Number(p.price);
    });

    recapProps = {
      todayStats: buildPeriodStats(todayOrders, todayPurchases),
      weekStats: buildPeriodStats(weekOrders, weekPurchases),
      monthStats: buildPeriodStats(monthOrders, monthPurchases),
      customStats: customStartStr && customEndStr ? buildPeriodStats(customOrders, customPurchases) : undefined,
      chartData: chartDataWithCashflow,
      topProducts: Object.values(productMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5).map(p => ({ ...p, revenue: Math.round(p.revenue) })),
      topExpenseCategories: Object.entries(categoryMap).sort((a, b) => b[1] - a[1]).map(([category, amount]) => ({ category, amount: Math.round(amount) })),
      paymentStats,
      initialTab: (customStartStr && customEndStr) ? 'custom' : 'daily',
      customStartDate: customStartStr,
      customEndDate: customEndStr,
      basePath: '/',
      hideHeader: true,
    };
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-zinc-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-1 font-mono">◆ Dasbor Utama</p>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 font-serif sm:text-3xl">Intelijen Bisnis</h1>
          <p className="text-xs mt-1 text-zinc-500 font-medium">Pusat kendali performa bisnis secara real-time.</p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 text-[9px] font-bold uppercase tracking-widest px-3 py-2 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-pulse" />
          <Activity className="w-3 h-3" />
          Live
        </div>
      </div>

      {/* Quick actions */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-zinc-950 tracking-tight">Aksi Cepat</h2>
          <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Sesuai role</p>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {(
          [
            { label: 'Tambah Bahan', href: '/ingredients/new', desc: 'Inventory baru', roles: ['admin', 'warehouse'] as const },
            { label: 'Catat Stok', href: '/procurement/new', desc: 'Stok masuk', roles: ['admin', 'warehouse'] as const },
            { label: 'Produksi', href: '/procurement/internal', desc: 'Ubah komponen', roles: ['admin', 'warehouse'] as const },
            { label: 'Buat Resep', href: '/recipes/new', desc: 'Hitung HPP', roles: ['admin'] as const },
            { label: 'Buka Kasir', href: '/pos', desc: 'Mulai transaksi', roles: ['admin', 'cashier', 'waiter'] as const },
          ] as const
          )
            .filter((item) => (item.roles as readonly UserRole[]).includes(role))
            .map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group p-3 bg-white border border-zinc-200 rounded-xl transition-all hover:border-zinc-950 hover:bg-zinc-950 hover:text-white"
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-bold tracking-tight">{item.label}</p>
                  <ChevronRight className="w-3 h-3 text-zinc-300 group-hover:text-white transition-transform group-hover:translate-x-0.5" />
                </div>
                <p className="text-[9px] font-medium text-zinc-400 group-hover:text-zinc-300 transition-colors uppercase tracking-widest">{item.desc}</p>
              </Link>
            ))}
        </div>
      </div>

      {/* Financial Recap */}
      {isAdmin && recapProps && <FinancialRecap {...recapProps} />}

      {/* Stat cards */}
      <div>
        <h2 className="text-sm font-bold font-serif mb-3 flex items-center gap-2">
          <Wallet className="w-4 h-4 text-zinc-400" />
          Ringkasan Operasional
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {stats.map(({ label, sublabel, value, icon: Icon, href, isWarning }) => (
            <Link
              key={label}
              href={href}
              className="group block bg-white border border-zinc-200 rounded-2xl p-4 transition-all hover:border-zinc-950 hover:shadow-xl hover:shadow-zinc-950/5"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center transition-colors shadow-sm',
                  isWarning ? 'bg-zinc-950 text-white' : 'bg-zinc-50 text-zinc-500 group-hover:bg-zinc-950 group-hover:text-white'
                )}>
                  <Icon className="w-4 h-4" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-zinc-300 transition-all group-hover:text-zinc-950 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-1">{label}</p>
              <p className="text-lg font-bold tracking-tighter font-mono mb-0.5 text-zinc-950">{value}</p>
              <p className="text-[10px] font-medium text-zinc-500 truncate">{sublabel}</p>
            </Link>
          ))}
        </div>
      </div>

      {canInventory && lowStockCount > 0 && (
        <div className="flex flex-col gap-2.5 px-4 py-3.5 bg-zinc-950 text-white rounded-xl sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <p className="text-xs font-semibold leading-relaxed">
              Ada {lowStockCount} bahan menipis. Prioritaskan restock.
            </p>
          </div>
          <Link
            href="/ingredients"
            className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-zinc-950 bg-white px-3 py-1.5 rounded-lg"
          >
            Lihat
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* Purchase Trend Chart */}
      {canSeePurchaseTrend && (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-4 border-b border-zinc-100 bg-zinc-50/30 sm:px-6">
            <div>
              <h2 className="text-sm font-bold text-zinc-950 tracking-tight">Tren Harga Bahan</h2>
              <p className="text-[9px] font-medium text-zinc-500 mt-0.5 uppercase tracking-wide">Harga per unit tiap transaksi</p>
            </div>
            <span className="text-[9px] font-bold px-2.5 py-1 rounded-full bg-zinc-950 text-white font-mono tracking-widest">30 Tx</span>
          </div>
          {ingredientOptions.length === 0 ? (
            <div className="p-8 flex items-center justify-center">
              <p className="text-xs font-bold text-zinc-950 text-center">Belum ada data bahan</p>
            </div>
          ) : (
            <div className="p-4 min-h-[280px] sm:p-6 sm:min-h-[360px]">
              <IngredientPriceFluctuation
                ingredients={ingredientOptions}
                initialIngredientId={initialIngredientId}
                initialData={initialPurchases}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}