'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { TrendingUp, DollarSign, Package, BarChart3, Calendar, Star, ArrowDownLeft, ArrowUpRight, Wallet, PieChart as PieIcon } from 'lucide-react';
import { PeriodStats, ChartPoint, TopProduct, ExpenseCategory, RecapTab as Tab, ChartMode } from '@/types';

type Props = {
  todayStats: PeriodStats;
  weekStats: PeriodStats;
  monthStats: PeriodStats;
  customStats?: PeriodStats;
  chartData: ChartPoint[];
  topProducts: TopProduct[];
  topExpenseCategories: ExpenseCategory[];
  paymentStats: Record<string, number>;
  initialTab?: Tab;
  customStartDate?: string;
  customEndDate?: string;
  basePath?: string;
  hideHeader?: boolean;
};

function formatRupiah(n: number) {
  if (n >= 1000000) return `Rp ${(n / 1000000).toFixed(1)}Jt`;
  if (n >= 1000) return `Rp ${(n / 1000).toFixed(0)}K`;
  return `Rp ${n.toLocaleString('id-ID')}`;
}

function formatRupiahFull(n: number) {
  return `Rp ${n.toLocaleString('id-ID')}`;
}

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

function StatCard({ label, value, sub, icon: Icon, isMain, trend }: { label: string; value: string; sub?: string; icon: React.ElementType; isMain?: boolean; trend?: 'up' | 'down' | 'neutral'; }) {
  return (
    <div className={cn(
      "rounded-2xl p-4 flex flex-col gap-3 border transition-all duration-300 sm:p-5",
      isMain ? "bg-zinc-950 text-white border-zinc-950 shadow-lg shadow-zinc-950/20" : "bg-white text-zinc-950 border-zinc-200"
    )}>
      <div className="flex items-start justify-between">
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center transition-colors", isMain ? "bg-white/10" : "bg-zinc-50 text-zinc-400")}>
          <Icon className="w-4 h-4" />
        </div>
        {trend && (
          <div className={cn("flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-lg", isMain ? "bg-white/10 text-white" : "bg-zinc-100 text-zinc-500")}>
            {trend === 'up' ? <ArrowUpRight className="w-2.5 h-2.5" /> : trend === 'down' ? <ArrowDownLeft className="w-2.5 h-2.5" /> : null}
            {trend}
          </div>
        )}
      </div>
      <div>
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-1 text-zinc-400">{label}</p>
        <p className="text-lg font-bold font-mono tracking-tighter leading-tight sm:text-xl">{value}</p>
        {sub && <p className={cn("text-[9px] font-bold uppercase tracking-widest mt-1", isMain ? "text-zinc-500" : "text-zinc-300")}>{sub}</p>}
      </div>
    </div>
  );
}

type TooltipPayload = { name?: string; value?: number; color?: string };

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: TooltipPayload[]; label?: string; }) => {
  if (!active || !payload?.length) return null;
  const labelMap: Record<string, string> = { revenue: 'Pendapatan', profit: 'Laba', hpp: 'HPP', expenses: 'Belanja', cashflow: 'Kas' };
  return (
    <div className="bg-zinc-950 text-white p-3.5 rounded-xl shadow-2xl border border-zinc-800 min-w-[160px]">
      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-3 font-mono">{label ? format(parseISO(label), 'dd MMM yyyy', { locale: id }) : ''}</p>
      <div className="space-y-2">
        {payload.map((p, i) => (
          <div key={p.name ?? i} className="flex justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
              <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-300">{p.name != null ? (labelMap[p.name] ?? p.name) : '—'}</span>
            </div>
            <span className={cn("text-[10px] font-bold font-mono tracking-tight", Number(p.value) < 0 ? "text-zinc-500" : "text-white")}>{formatRupiahFull(Number(p.value))}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export function FinancialRecap({ todayStats, weekStats, monthStats, customStats, chartData, topProducts, topExpenseCategories, paymentStats, initialTab = 'daily', customStartDate, customEndDate, basePath = '/recap', hideHeader = false }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [chartMode, setChartMode] = useState<ChartMode>('revenue');
  const [customStart, setCustomStart] = useState(customStartDate || '');
  const [customEnd, setCustomEnd] = useState(customEndDate || '');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const applyCustomFilter = () => {
    if (customStart && customEnd) router.push(`${basePath}?start=${customStart}&end=${customEnd}`);
  };

  const clearCustomFilter = () => {
    setCustomStart(''); setCustomEnd('');
    if (tab === 'custom') setTab('daily');
    router.push(basePath);
  };

  const stats = tab === 'daily' ? todayStats : tab === 'weekly' ? weekStats : tab === 'monthly' ? monthStats : (customStats || monthStats);

  const visibleData = tab === 'daily' ? chartData.slice(-1) : tab === 'weekly' ? chartData.slice(-7) : tab === 'monthly' ? chartData.slice(-30) : (() => {
    if (customStartDate && customEndDate) {
      const cs = new Date(customStartDate); cs.setHours(0, 0, 0, 0);
      const ce = new Date(customEndDate); ce.setHours(23, 59, 59, 999);
      return chartData.filter(d => { const dt = new Date(d.date); return dt >= cs && dt <= ce; });
    }
    return chartData;
  })();

  const paymentChartData = Object.entries(paymentStats).map(([name, value]) => ({ name, value }));
  const COLORS = ['#09090b', '#71717a', '#a1a1aa', '#e4e4e7'];

  return (
    <div className="space-y-5">
      {/* Header tabs */}
      <div className={cn("flex items-center", hideHeader ? "justify-end" : "justify-between")}>
        {!hideHeader && (
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-1 font-mono">◆ Financial</p>
            <h2 className="text-xl font-bold tracking-tight text-zinc-950 font-serif">Dashboard Keuangan</h2>
          </div>
        )}

        <div className="relative">
          <div className="flex bg-zinc-100 p-1 rounded-xl border border-zinc-200 overflow-x-auto max-w-[calc(100vw-2rem)]">
            {(['daily', 'weekly', 'monthly'] as Tab[]).map((t) => (
              <button key={t} onClick={() => { setTab(t); setShowDatePicker(false); if (customStartDate || customEndDate) router.push(basePath); }}
                className={cn("px-3 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all whitespace-nowrap sm:px-4", tab === t ? "bg-zinc-950 text-white shadow-md" : "text-zinc-400 hover:text-zinc-950")}>
                {t === 'daily' ? 'Hari Ini' : t === 'weekly' ? '7 Hari' : '30 Hari'}
              </button>
            ))}
            <button onClick={() => { setShowDatePicker(!showDatePicker); if (!showDatePicker && customStats) setTab('custom'); }}
              className={cn("px-3 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-1.5 sm:px-4", tab === 'custom' || showDatePicker ? "bg-zinc-950 text-white shadow-md" : "text-zinc-400 hover:text-zinc-950")}>
              <Calendar className="w-3 h-3" />
              <span className="hidden sm:inline">{customStartDate && customEndDate ? `${format(parseISO(customStartDate), 'dd MMM', { locale: id })} - ${format(parseISO(customEndDate), 'dd MMM', { locale: id })}` : 'Kustom'}</span>
              <span className="sm:hidden">Kustom</span>
            </button>
          </div>

          {showDatePicker && (
            <div className="absolute top-full mt-2 right-0 bg-white border border-zinc-200 p-4 rounded-2xl shadow-xl z-50 flex flex-col gap-3 w-64 animate-in fade-in zoom-in-95 origin-top-right">
              <div className="flex items-center justify-between">
                <h4 className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Filter Tanggal</h4>
                {(customStartDate || customEndDate) && (
                  <button onClick={() => { clearCustomFilter(); setShowDatePicker(false); }} className="text-[9px] font-bold uppercase text-red-500">Reset</button>
                )}
              </div>
              <div className="flex flex-col gap-2.5">
                <div>
                  <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-1 block">Dari</label>
                  <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-950 outline-none focus:border-zinc-500" />
                </div>
                <div>
                  <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-1 block">Sampai</label>
                  <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-950 outline-none focus:border-zinc-500" />
                </div>
              </div>
              <button onClick={() => { applyCustomFilter(); setShowDatePicker(false); }} disabled={!customStart || !customEnd}
                className="w-full bg-zinc-950 text-white py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest disabled:opacity-50">Terapkan</button>
            </div>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-4">
        <StatCard label="Revenue" value={formatRupiah(stats.revenue)} sub={`${stats.orders} Penjualan`} icon={DollarSign} isMain />
        <StatCard label="Gross Profit" value={formatRupiah(stats.grossProfit)} sub={`Margin ${stats.margin.toFixed(1)}%`} icon={TrendingUp} trend="up" />
        <StatCard label="HPP" value={formatRupiah(stats.hpp)} sub="Harga Pokok" icon={Package} />
        <StatCard label="Net Flow" value={formatRupiah(stats.netCashflow)} sub="Kesehatan Kas" icon={Wallet} trend={stats.netCashflow >= 0 ? 'up' : 'down'} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-2xl p-5 flex flex-col gap-5 sm:p-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold font-serif italic">Performa Penjualan</h3>
              <p className="text-[9px] font-bold uppercase text-zinc-300 tracking-widest">Aliran Transaksi</p>
            </div>
            <div className="flex bg-zinc-50 p-1 rounded-xl border border-zinc-100">
              <button onClick={() => setChartMode('revenue')} className={cn("px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase", chartMode === 'revenue' ? "bg-zinc-950 text-white" : "text-zinc-300")}>Sales</button>
              <button onClick={() => setChartMode('cashflow')} className={cn("px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase", chartMode === 'cashflow' ? "bg-zinc-950 text-white" : "text-zinc-300")}>Cash</button>
            </div>
          </div>
          <div className="h-[220px] w-full min-w-0 sm:h-[280px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={32}>
              <AreaChart data={visibleData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#09090b" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#09090b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="#f4f4f5" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#a1a1aa' }} tickFormatter={(v) => format(parseISO(v), 'dd/MM')} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#a1a1aa' }} tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${v / 1000}k`} axisLine={false} tickLine={false} width={40} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey={chartMode === 'revenue' ? 'revenue' : 'cashflow'} stroke="#09090b" strokeWidth={2.5} fill="url(#colorSales)" dot={{ r: 3, fill: '#09090b', strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Side panels */}
        <div className="flex flex-col gap-4">
          {/* Payment pie */}
          <div className="bg-zinc-950 rounded-2xl p-5 text-white flex flex-col gap-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-5 opacity-10"><PieIcon className="w-16 h-16" /></div>
            <div className="relative z-10">
              <h3 className="text-sm font-bold font-serif italic uppercase tracking-tighter">Sebaran Bayar</h3>
              <p className="text-[9px] font-bold uppercase text-zinc-500 tracking-widest">Distribusi Metode</p>
            </div>
            <div className="h-[140px] w-full min-w-0 relative z-10">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={32}>
                <PieChart>
                  <Pie data={paymentChartData} innerRadius={45} outerRadius={60} paddingAngle={5} dataKey="value">
                    {paymentChartData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const row = payload[0];
                    return <div className="bg-white text-zinc-950 px-2.5 py-1.5 rounded-xl shadow-xl text-[9px] font-bold uppercase font-mono border border-zinc-100">{String(row.name)}: {formatRupiahFull(Number(row.value))}</div>;
                  }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 relative z-10">
              {paymentChartData.map((p, i) => (
                <div key={p.name} className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-[9px] font-bold uppercase text-zinc-400">{p.name}: {((p.value / stats.revenue) * 100 || 0).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top products */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 flex-1">
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-3.5 h-3.5 text-zinc-950" />
              <h3 className="text-xs font-bold uppercase tracking-widest">Top Products</h3>
            </div>
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div key={p.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn("w-5 h-5 rounded-lg flex items-center justify-center text-[9px] font-bold", i === 0 ? "bg-zinc-950 text-white" : "bg-zinc-50 text-zinc-300")}>{i + 1}</span>
                    <span className="text-[10px] font-bold text-zinc-950 truncate max-w-[120px]">{p.name}</span>
                  </div>
                  <span className="text-[9px] font-bold font-mono text-zinc-400">×{p.qty}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Comparison table */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-zinc-50 flex items-center gap-3 sm:p-5">
          <div className="p-2 bg-zinc-50 rounded-xl"><BarChart3 className="w-3.5 h-3.5 text-zinc-400" /></div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest">Perbandingan Periode</h3>
            <p className="text-[9px] font-bold uppercase text-zinc-300">Matriks Kinerja</p>
          </div>
        </div>
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left min-w-[480px]">
            <thead className="bg-zinc-50/50">
              <tr>
                <th className="px-4 py-3.5 text-[9px] font-bold uppercase text-zinc-400 tracking-widest sm:px-6">Metric</th>
                <th className="px-4 py-3.5 text-[9px] font-bold uppercase text-zinc-400 tracking-widest sm:px-6">Hari Ini</th>
                <th className="px-4 py-3.5 text-[9px] font-bold uppercase text-zinc-400 tracking-widest sm:px-6">7 Hari</th>
                <th className="px-4 py-3.5 text-[9px] font-bold uppercase text-zinc-400 tracking-widest sm:px-6">30 Hari</th>
                {customStats && <th className="px-4 py-3.5 text-[9px] font-bold uppercase text-zinc-950 tracking-widest bg-zinc-100 sm:px-6">Kustom</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {[
                { label: 'Revenue', today: todayStats.revenue, week: weekStats.revenue, month: monthStats.revenue, custom: customStats?.revenue, type: 'money' },
                { label: 'Orders', today: todayStats.orders, week: weekStats.orders, month: monthStats.orders, custom: customStats?.orders, type: 'count' },
                { label: 'Margin', today: todayStats.margin, week: weekStats.margin, month: monthStats.margin, custom: customStats?.margin, type: 'percent' },
                { label: 'Net Flow', today: todayStats.netCashflow, week: weekStats.netCashflow, month: monthStats.netCashflow, custom: customStats?.netCashflow, type: 'money' },
              ].map(row => (
                <tr key={row.label} className="hover:bg-zinc-50/50 transition-colors">
                  <td className="px-4 py-3.5 text-[9px] font-bold uppercase text-zinc-500 sm:px-6">{row.label}</td>
                  {[row.today, row.week, row.month].map((v, i) => (
                    <td key={i} className="px-4 py-3.5 text-xs font-bold font-mono sm:px-6">
                      {row.type === 'money' ? formatRupiah(v as number) : row.type === 'percent' ? `${(v as number).toFixed(1)}%` : v}
                    </td>
                  ))}
                  {customStats && row.custom !== undefined && (
                    <td className="px-4 py-3.5 text-xs font-bold font-mono bg-zinc-50 border-l border-zinc-100 text-zinc-950 sm:px-6">
                      {row.type === 'money' ? formatRupiah(row.custom) : row.type === 'percent' ? `${row.custom.toFixed(1)}%` : row.custom}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}