// app/recap/page.tsx
import { supabase } from '@/lib/supabase';
import { RecapClient } from './RecapClient';

export const dynamic = 'force-dynamic';

import { SaleRow, SaleItemRow, PurchaseRow } from '@/types';

export default async function RecapPage() {
  const now = new Date();

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);

  const monthStart = new Date(now);
  monthStart.setDate(now.getDate() - 29);
  monthStart.setHours(0, 0, 0, 0);

  // Fetch sales and purchases in parallel
  const [{ data: sales }, { data: saleItems }, { data: purchases }] = await Promise.all([
    supabase
      .from('sales')
      .select('id, date, total_price, total_hpp')
      .gte('date', monthStart.toISOString())
      .order('date', { ascending: true })
      .returns<SaleRow[]>(),

    supabase
      .from('sale_items')
      .select('sale_id, product_id, quantity, price, hpp, products(name)')
      .returns<SaleItemRow[]>(),

    supabase
      .from('purchases')
      .select('id, date, price, quantity, supplier, ingredients(name, category)')
      .gte('date', monthStart.toISOString())
      .order('date', { ascending: true })
      .returns<PurchaseRow[]>(),
  ]);

  // Build daily chart data for 30 days
  const dailyMap: Record<string, {
    revenue: number;
    hpp: number;
    orders: number;
    expenses: number;
  }> = {};

  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dailyMap[key] = { revenue: 0, hpp: 0, orders: 0, expenses: 0 };
  }

  const todaySales: SaleRow[] = [];
  const weekSales: SaleRow[] = [];
  const monthSales: SaleRow[] = [];

  (sales || []).forEach(s => {
    const sDate = new Date(s.date);
    const key = sDate.toISOString().slice(0, 10);
    if (dailyMap[key]) {
      dailyMap[key].revenue += Number(s.total_price);
      dailyMap[key].hpp += Number(s.total_hpp);
      dailyMap[key].orders += 1;
    }
    if (sDate >= todayStart) todaySales.push(s);
    if (sDate >= weekStart) weekSales.push(s);
    monthSales.push(s);
  });

  const todayPurchases: PurchaseRow[] = [];
  const weekPurchases: PurchaseRow[] = [];
  const monthPurchases: PurchaseRow[] = [];

  (purchases || []).forEach(p => {
    const pDate = new Date(p.date);
    const key = pDate.toISOString().slice(0, 10);
    if (dailyMap[key]) {
      dailyMap[key].expenses += Number(p.price);
    }
    if (pDate >= todayStart) todayPurchases.push(p);
    if (pDate >= weekStart) weekPurchases.push(p);
    monthPurchases.push(p);
  });

  const chartData = Object.entries(dailyMap).map(([date, vals]) => ({
    date,
    revenue: Math.round(vals.revenue),
    hpp: Math.round(vals.hpp),
    profit: Math.round(vals.revenue - vals.hpp),
    expenses: Math.round(vals.expenses),
    cashflow: Math.round(vals.revenue - vals.expenses),
    orders: vals.orders,
  }));

  // Summarize a period
  function summarizeSales(rows: SaleRow[]) {
    const revenue = rows.reduce((s, r) => s + Number(r.total_price), 0);
    const hpp = rows.reduce((s, r) => s + Number(r.total_hpp), 0);
    return { revenue: Math.round(revenue), hpp: Math.round(hpp), orders: rows.length };
  }

  function summarizePurchases(rows: PurchaseRow[]) {
    const expenses = rows.reduce((s, r) => s + Number(r.price), 0);
    return { expenses: Math.round(expenses), purchaseCount: rows.length };
  }

  function buildPeriodStats(salesRows: SaleRow[], purchaseRows: PurchaseRow[]) {
    const { revenue, hpp, orders } = summarizeSales(salesRows);
    const { expenses, purchaseCount } = summarizePurchases(purchaseRows);
    const grossProfit = revenue - hpp;
    const netCashflow = revenue - expenses;
    const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
    return {
      revenue,
      hpp,
      grossProfit,
      expenses,
      netCashflow,
      orders,
      purchaseCount,
      margin,
    };
  }

  const todayStats = buildPeriodStats(todaySales, todayPurchases);
  const weekStats = buildPeriodStats(weekSales, weekPurchases);
  const monthStats = buildPeriodStats(monthSales, monthPurchases);

  // Top products this month
  const productMap: Record<string, { name: string; qty: number; revenue: number }> = {};
  const monthSaleIds = new Set(monthSales.map(s => s.id));
  (saleItems || []).forEach(item => {
    if (!monthSaleIds.has(item.sale_id)) return;
    const pid = item.product_id;
    if (!productMap[pid]) {
      productMap[pid] = { name: item.products?.name ?? 'Unknown', qty: 0, revenue: 0 };
    }
    productMap[pid].qty += Number(item.quantity);
    productMap[pid].revenue += Number(item.price) * Number(item.quantity);
  });

  const topProducts = Object.values(productMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
    .map(p => ({ ...p, revenue: Math.round(p.revenue) }));

  // Top expense categories this month
  const categoryMap: Record<string, number> = {};
  monthPurchases.forEach(p => {
    const cat = p.ingredients?.category ?? 'Lainnya';
    categoryMap[cat] = (categoryMap[cat] ?? 0) + Number(p.price);
  });

  const topExpenseCategories = Object.entries(categoryMap)
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount]) => ({ category, amount: Math.round(amount) }));

  return (
    <RecapClient
      todayStats={todayStats}
      weekStats={weekStats}
      monthStats={monthStats}
      chartData={chartData}
      topProducts={topProducts}
      topExpenseCategories={topExpenseCategories}
    />
  );
}