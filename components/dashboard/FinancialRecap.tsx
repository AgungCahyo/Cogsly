'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, } from 'recharts';
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
  return `Rp ${n.toLocaleString('id-ID')}`;
}

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  isMain,
  trend,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  isMain?: boolean;
  trend?: 'up' | 'down' | 'neutral';
}) {
  return (
    <div className={cn(
      "rounded-3xl p-7 flex flex-col gap-6 border transition-all duration-300 print:shadow-none print:border-zinc-200 print:p-5 print:rounded-2xl print:gap-4 print:break-inside-avoid",
      isMain ? "bg-zinc-950 text-white border-zinc-950 shadow-xl shadow-zinc-950/20" : "bg-white text-zinc-950 border-zinc-200"
    )}>
      <div className="flex items-start justify-between">
        <div className={cn(
          "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors print:w-10 print:h-10",
          isMain ? "bg-white/10" : "bg-zinc-50 text-zinc-400"
        )}>
          <Icon className="w-5 h-5 print:w-4 print:h-4" />
        </div>
        {trend && (
          <div className={cn(
            "flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg print:hidden",
            isMain ? "bg-white/10 text-white" : "bg-zinc-100 text-zinc-500"
          )}>
            {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : trend === 'down' ? <ArrowDownLeft className="w-3 h-3" /> : null}
            {trend}
          </div>
        )}
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1.5 text-zinc-400">
          {label}
        </p>
        <p className="text-2xl font-bold font-mono tracking-tighter leading-tight print:text-xl">
          {value}
        </p>
        {sub && (
          <p className={cn(
            "text-[10px] font-bold uppercase tracking-widest mt-1.5",
            isMain ? "text-zinc-500" : "text-zinc-300"
          )}>
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

type TooltipPayload = { name?: string; value?: number; color?: string };

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;

  const labelMap: Record<string, string> = {
    revenue: 'Pendapatan',
    profit: 'Laba Kotor',
    hpp: 'HPP',
    expenses: 'Belanja',
    cashflow: 'Arus Kas',
  };

  return (
    <div className="bg-zinc-950 text-white p-5 rounded-2xl shadow-2xl border border-zinc-800 min-w-[200px] animate-in zoom-in-95 duration-200">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-4 font-mono">
        {label ? format(parseISO(label), 'dd MMMM yyyy', { locale: id }) : ''}
      </p>
      <div className="space-y-3">
        {payload.map((p: TooltipPayload, i) => (
          <div key={p.name ?? `row-${i}`} className="flex justify-between items-center gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">
                {(p.name != null ? labelMap[p.name] ?? p.name : null) ?? "—"}
              </span>
            </div>
            <span className={cn(
              "text-xs font-bold font-mono tracking-tight",
              Number(p.value) < 0 ? "text-zinc-500" : "text-white"
            )}>
              {formatRupiah(Number(p.value))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export function FinancialRecap({
  todayStats,
  weekStats,
  monthStats,
  customStats,
  chartData,
  topProducts,
  topExpenseCategories,
  paymentStats,
  initialTab = 'daily',
  customStartDate,
  customEndDate,
  basePath = '/recap',
  hideHeader = false
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [chartMode, setChartMode] = useState<ChartMode>('revenue');
  const [customStart, setCustomStart] = useState(customStartDate || '');
  const [customEnd, setCustomEnd] = useState(customEndDate || '');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const applyCustomFilter = () => {
    if (customStart && customEnd) {
      router.push(`${basePath}?start=${customStart}&end=${customEnd}`);
    }
  };

  const clearCustomFilter = () => {
    setCustomStart('');
    setCustomEnd('');
    if (tab === 'custom') setTab('daily');
    router.push(basePath);
  };

  const stats = tab === 'daily' ? todayStats : tab === 'weekly' ? weekStats : tab === 'monthly' ? monthStats : (customStats || monthStats);

  const visibleData =
    tab === 'daily'
      ? chartData.slice(-1)
      : tab === 'weekly'
      ? chartData.slice(-7)
      : tab === 'monthly'
      ? chartData.slice(-30)
      : (() => {
          // If custom, we filter the chartData to only include dates within the custom range
          if (customStartDate && customEndDate) {
            const cs = new Date(customStartDate);
            cs.setHours(0, 0, 0, 0);
            const ce = new Date(customEndDate);
            ce.setHours(23, 59, 59, 999);
            return chartData.filter(d => {
              const dt = new Date(d.date);
              return dt >= cs && dt <= ce;
            });
          }
          return chartData;
      })();

  const paymentChartData = Object.entries(paymentStats).map(([name, value]) => ({ name, value }));
  const COLORS = ['#09090b', '#71717a', '#a1a1aa', '#e4e4e7'];

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-10 print:p-0 print:space-y-6 print:max-w-none print:w-full">
      {/* Header */}
      <div className={cn("flex flex-col lg:flex-row items-start lg:items-center gap-8 border-b border-zinc-200 pb-10 print:pb-6", hideHeader ? "justify-end" : "justify-between")}>
        {!hideHeader && (
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-2 font-mono">
              ◆ Restaurant Intelligence
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-zinc-950 font-serif print:text-2xl">
              Financial Dashboard
            </h1>
            <p className="text-sm mt-1.5 text-zinc-500 font-medium">
              Periode: <span className="text-zinc-950">{tab === 'daily' ? 'Hari Ini' : tab === 'weekly' ? 'Minggu Ini' : tab === 'monthly' ? 'Bulan Ini' : 'Khusus'}</span>
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4 w-full lg:w-auto z-50">
          <div className="relative">
            <div className="flex bg-zinc-100 p-1.5 rounded-2xl border border-zinc-200 print:hidden shrink-0 overflow-x-auto max-w-full">
              {(['daily', 'weekly', 'monthly'] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                     setTab(t);
                     setShowDatePicker(false);
                     if (customStartDate || customEndDate) {
                         router.push(basePath);
                     }
                  }}
                  className={cn(
                    "px-4 md:px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                    tab === t ? "bg-zinc-950 text-white shadow-lg" : "text-zinc-400 hover:text-zinc-950"
                  )}
                >
                  {t === 'daily' ? 'Hari Ini' : t === 'weekly' ? '7 Hari' : '30 Hari'}
                </button>
              ))}
              <button
                 onClick={() => {
                    setShowDatePicker(!showDatePicker);
                    if (!showDatePicker && customStats) setTab('custom');
                 }}
                 className={cn(
                    "px-4 md:px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2",
                    tab === 'custom' || showDatePicker ? "bg-zinc-950 text-white shadow-lg" : "text-zinc-400 hover:text-zinc-950"
                 )}
              >
                 <Calendar className="w-3.5 h-3.5" />
                 {customStartDate && customEndDate
                    ? `${format(parseISO(customStartDate), 'dd MMM', { locale: id })} - ${format(parseISO(customEndDate), 'dd MMM', { locale: id })}`
                    : 'Kustom'}
              </button>
            </div>
            
            {showDatePicker && (
               <div className="absolute top-full mt-2 right-0 bg-white border border-zinc-200 p-5 rounded-3xl shadow-xl z-50 flex flex-col gap-4 w-72 animate-in fade-in zoom-in-95 origin-top-right print:hidden">
                  <div className="flex items-center justify-between">
                     <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 font-mono">Filter Tanggal</h4>
                     {(customStartDate || customEndDate) && (
                        <button onClick={() => {
                           clearCustomFilter();
                           setShowDatePicker(false);
                        }} className="text-[10px] font-bold uppercase tracking-widest text-red-500 hover:text-red-700 transition-colors">Reset</button>
                     )}
                  </div>
                  <div className="flex flex-col gap-3">
                     <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 block">Dari Tanggal</label>
                        <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-sm text-zinc-950 outline-none focus:border-zinc-500 transition-colors" />
                     </div>
                     <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 block">Sampai Tanggal</label>
                        <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-sm text-zinc-950 outline-none focus:border-zinc-500 transition-colors" />
                     </div>
                  </div>
                  <button onClick={() => {
                     applyCustomFilter();
                     setShowDatePicker(false);
                  }} disabled={!customStart || !customEnd} className="w-full bg-zinc-950 text-white py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest mt-2 disabled:opacity-50 transition-opacity">
                     Terapkan
                  </button>
               </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Revenue" value={formatRupiah(stats.revenue)} sub={`${stats.orders} Penjualan`} icon={DollarSign} isMain />
        <StatCard label="Gross Profit" value={formatRupiah(stats.grossProfit)} sub={`Margin ${stats.margin.toFixed(1)}%`} icon={TrendingUp} trend="up" />
        <StatCard label="Total HPP" value={formatRupiah(stats.hpp)} sub="Harga Pokok Terjual" icon={Package} />
        <StatCard label="Net Flow" value={formatRupiah(stats.netCashflow)} sub="Kesehatan Kas" icon={Wallet} trend={stats.netCashflow >= 0 ? 'up' : 'down'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-w-0">
        {/* Main Chart */}
        <div className="lg:col-span-2 min-w-0 bg-white border border-zinc-200 rounded-[2.5rem] p-10 flex flex-col gap-8">
          <div className="flex justify-between items-center">
             <div>
                <h3 className="text-xl font-bold font-serif italic">Performa Penjualan</h3>
                <p className="text-[10px] font-bold uppercase text-zinc-300 tracking-widest">Aliran Transaksi</p>
             </div>
             <div className="flex bg-zinc-50 p-1 rounded-xl border border-zinc-100">
               <button onClick={() => setChartMode('revenue')} className={cn("px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase", chartMode === 'revenue' ? "bg-zinc-950 text-white" : "text-zinc-300")}>Sales</button>
               <button onClick={() => setChartMode('cashflow')} className={cn("px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase", chartMode === 'cashflow' ? "bg-zinc-950 text-white" : "text-zinc-300")}>Cash</button>
             </div>
          </div>

          <div className="h-[350px] w-full min-w-0 min-h-[280px]">
            <ResponsiveContainer
              width="100%"
              height="100%"
              minWidth={0}
              initialDimension={{ width: 1200, height: 350 }}
              debounce={32}
            >
              <AreaChart data={visibleData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#09090b" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#09090b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="#f4f4f5" />
                <XAxis dataKey="date" tick={{fontSize: 10, fill: '#a1a1aa'}} tickFormatter={(v) => format(parseISO(v), 'dd/MM')} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize: 10, fill: '#a1a1aa'}} tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : `${v/1000}k`} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey={chartMode === 'revenue' ? 'revenue' : 'cashflow'} stroke="#09090b" strokeWidth={3} fill="url(#colorSales)" dot={{r: 4, fill: '#09090b', strokeWidth: 0}} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment & Top Category Side */}
        <div className="flex flex-col gap-8 min-w-0">
          {/* Payment Method Pie */}
          <div className="bg-zinc-950 rounded-[2.5rem] p-10 text-white flex flex-col gap-6 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-10"><PieIcon className="w-20 h-20" /></div>
             <div className="relative z-10">
                <h3 className="text-lg font-bold font-serif italic mb-1 uppercase tracking-tighter">Sebaran Bayar</h3>
                <p className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest">Distribusi Metode</p>
             </div>

             <div className="h-[200px] w-full min-w-0 min-h-[180px] relative z-10">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                  minWidth={0}
                  initialDimension={{ width: 400, height: 200 }}
                  debounce={32}
                >
                  <PieChart>
                    <Pie
                      data={paymentChartData}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {paymentChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const row = payload[0];
                        return (
                          <div className="bg-white text-zinc-950 px-3 py-2 rounded-xl shadow-xl text-[10px] font-bold uppercase font-mono border border-zinc-100">
                            {String(row.name)}: {formatRupiah(Number(row.value))}
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
             </div>

             <div className="grid grid-cols-2 gap-4 relative z-10">
                {paymentChartData.map((p, i) => (
                  <div key={p.name} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-[10px] font-bold uppercase text-zinc-400">{p.name}: {((p.value / stats.revenue) * 100 || 0).toFixed(0)}%</span>
                  </div>
                ))}
             </div>
          </div>

          {/* Top Products Small List */}
          <div className="bg-white border border-zinc-200 rounded-[2.5rem] p-8 flex-1">
             <div className="flex items-center gap-3 mb-6">
                <Star className="w-4 h-4 text-zinc-950" />
                <h3 className="text-sm font-bold uppercase tracking-widest">Top Products</h3>
             </div>
             <div className="space-y-4">
                {topProducts.map((p, i) => (
                  <div key={p.name} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                       <span className={cn("w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold", i === 0 ? "bg-zinc-950 text-white" : "bg-zinc-50 text-zinc-300")}>{i+1}</span>
                       <span className="text-xs font-bold text-zinc-950">{p.name}</span>
                    </div>
                    <span className="text-[10px] font-bold font-mono text-zinc-400">×{p.qty}</span>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="bg-white border border-zinc-200 rounded-[2.5rem] overflow-hidden">
        <div className="p-8 border-b border-zinc-50 flex items-center gap-4">
          <div className="p-2 bg-zinc-50 rounded-xl"><BarChart3 className="w-4 h-4 text-zinc-400" /></div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest">Detailed Comparison</h3>
            <p className="text-[10px] font-bold uppercase text-zinc-300">Period Matriks Rundown</p>
          </div>
        </div>
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead className="bg-zinc-50/50">
              <tr>
                <th className="px-10 py-5 text-[10px] font-bold uppercase text-zinc-400 tracking-widest whitespace-nowrap">Metric</th>
                <th className="px-10 py-5 text-[10px] font-bold uppercase text-zinc-400 tracking-widest whitespace-nowrap">Hari Ini</th>
                <th className="px-10 py-5 text-[10px] font-bold uppercase text-zinc-400 tracking-widest whitespace-nowrap">7 Hari</th>
                <th className="px-10 py-5 text-[10px] font-bold uppercase text-zinc-400 tracking-widest whitespace-nowrap">30 Hari</th>
                {customStats && (
                  <th className="px-10 py-5 text-[10px] font-bold uppercase text-zinc-950 tracking-widest bg-zinc-100 whitespace-nowrap">Kustom</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {[
                { label: 'Revenue', today: todayStats.revenue, week: weekStats.revenue, month: monthStats.revenue, custom: customStats?.revenue, type: 'money' },
                { label: 'Orders', today: todayStats.orders, week: weekStats.orders, month: monthStats.orders, custom: customStats?.orders, type: 'count' },
                { label: 'Gross Margin', today: todayStats.margin, week: weekStats.margin, month: monthStats.margin, custom: customStats?.margin, type: 'percent' },
                { label: 'Net Flow', today: todayStats.netCashflow, week: weekStats.netCashflow, month: monthStats.netCashflow, custom: customStats?.netCashflow, type: 'money' },
              ].map(row => (
                <tr key={row.label} className="hover:bg-zinc-50/50 transition-colors">
                  <td className="px-10 py-5 text-[10px] font-bold uppercase text-zinc-500 whitespace-nowrap">{row.label}</td>
                  {[row.today, row.week, row.month].map((v, i) => (
                    <td key={i} className="px-10 py-5 text-sm font-bold font-mono whitespace-nowrap">
                      {row.type === 'money' ? formatRupiah(v as number) : row.type === 'percent' ? `${(v as number).toFixed(1)}%` : v}
                    </td>
                  ))}
                  {customStats && row.custom !== undefined && (
                    <td className="px-10 py-5 text-sm font-bold font-mono bg-zinc-50 border-l border-zinc-100 whitespace-nowrap text-zinc-950">
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