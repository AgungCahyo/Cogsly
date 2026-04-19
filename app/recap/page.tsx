// app/recap/page.tsx
import { createClient } from '@/lib/supabase/server';
import { RecapClient } from './RecapClient';

export const dynamic = 'force-dynamic';

import { Order, OrderItem, PurchaseRow } from '@/types';

export default async function RecapPage() {
  const supabase = await createClient();
  const now = new Date();

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);

  const monthStart = new Date(now);
  monthStart.setDate(now.getDate() - 29);
  monthStart.setHours(0, 0, 0, 0);

  // Fetch orders (replaces sales) and purchases in parallel
  const [{ data: orders }, { data: orderItems }, { data: purchases }] = await Promise.all([
    supabase
      .from('orders')
      .select('*')
      .eq('status', 'paid')
      .gte('completed_at', monthStart.toISOString())
      .order('completed_at', { ascending: true }),

    supabase
      .from('order_items')
      .select('order_id, product_id, quantity, price, hpp, products(name)')
      .returns<any[]>(),

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

  const todayOrders: any[] = [];
  const weekOrders: any[] = [];
  const monthOrders: any[] = [];

  // Payment method stats
  const paymentStats: Record<string, number> = { cash: 0, qris: 0, debit: 0, credit: 0 };

  (orders || []).forEach(o => {
    const oDate = new Date(o.completed_at);
    const key = oDate.toISOString().slice(0, 10);
    if (dailyMap[key]) {
      dailyMap[key].revenue += Number(o.total_price);
      dailyMap[key].hpp += Number(o.total_hpp);
      dailyMap[key].orders += 1;
    }
    if (oDate >= todayStart) todayOrders.push(o);
    if (oDate >= weekStart) weekOrders.push(o);
    monthOrders.push(o);

    if (o.payment_method) {
      paymentStats[o.payment_method] = (paymentStats[o.payment_method] || 0) + Number(o.total_price);
    }
  });

  const chartData = Object.entries(dailyMap).map(([date, vals]) => ({
    date,
    revenue: Math.round(vals.revenue),
    hpp: Math.round(vals.hpp),
    profit: Math.round(vals.revenue - vals.hpp),
    expenses: Math.round(vals.expenses), // Expenses calculated from purchases below
    orders: vals.orders,
  }));

  // Map expenses to chartData from purchases
  (purchases || []).forEach(p => {
    const pDate = new Date(p.date);
    const key = pDate.toISOString().slice(0, 10);
    const chartEntry = chartData.find(c => c.date === key);
    if (chartEntry) {
      chartEntry.expenses += Number(p.price);
    }
  });

  const chartDataWithCashflow = chartData.map((c) => ({
    ...c,
    cashflow: c.revenue - c.expenses,
  }));

  // Summarize a period
  function buildPeriodStats(orderRows: any[], purchaseRows: PurchaseRow[]) {
    const revenue = orderRows.reduce((s, r) => s + Number(r.total_price), 0);
    const hpp = orderRows.reduce((s, r) => s + Number(r.total_hpp), 0);
    const ordersCount = orderRows.length;
    
    // Expenses from purchases filtered by date
    // (In a real app, you'd filter purchaseRows properly here)
    const expenses = purchaseRows.reduce((s, r) => s + Number(r.price), 0);
    
    const grossProfit = revenue - hpp;
    const netCashflow = revenue - expenses;
    const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
    
    return {
      revenue,
      hpp,
      grossProfit,
      expenses,
      netCashflow,
      orders: ordersCount,
      purchaseCount: purchaseRows.length,
      margin,
    };
  }

  // Filter purchases for start dates
  const todayPurchases = (purchases || []).filter(p => new Date(p.date) >= todayStart);
  const weekPurchases = (purchases || []).filter(p => new Date(p.date) >= weekStart);

  const todayStats = buildPeriodStats(todayOrders, todayPurchases);
  const weekStats = buildPeriodStats(weekOrders, weekPurchases);
  const monthStats = buildPeriodStats(monthOrders, purchases || []);

  // Top products this month
  const productMap: Record<string, { name: string; qty: number; revenue: number }> = {};
  const monthOrderIds = new Set(monthOrders.map(o => o.id));
  (orderItems || []).forEach(item => {
    if (!monthOrderIds.has(item.order_id)) return;
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
  (purchases || []).forEach(p => {
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
      chartData={chartDataWithCashflow}
      topProducts={topProducts}
      topExpenseCategories={topExpenseCategories}
      paymentStats={paymentStats}
    />
  );
}
