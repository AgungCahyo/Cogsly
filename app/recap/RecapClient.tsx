'use client';

import { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import {
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  DollarSign,
  Package,
  BarChart3,
  Calendar,
  Star,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  ShoppingCart,
} from 'lucide-react';

import { 
  PeriodStats, 
  ChartPoint, 
  TopProduct, 
  ExpenseCategory, 
  RecapTab as Tab, 
  ChartMode 
} from '@/types';

type Props = {
  todayStats: PeriodStats;
  weekStats: PeriodStats;
  monthStats: PeriodStats;
  chartData: ChartPoint[];
  topProducts: TopProduct[];
  topExpenseCategories: ExpenseCategory[];
};

function formatRupiah(n: number) {
  return `Rp ${n.toLocaleString('id-ID')}`;
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  bg,
  trend,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  trend?: 'up' | 'down' | 'neutral';
}) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3"
      style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
    >
      <div className="flex items-start justify-between">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: bg }}
        >
          <Icon className="w-[18px] h-[18px]" style={{ color }} />
        </div>
        {trend && (
          <div
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
            style={{
              background: trend === 'up' ? 'var(--color-success-dim)' : trend === 'down' ? 'var(--color-danger-dim)' : 'var(--color-bg-elevated)',
              color: trend === 'up' ? 'var(--color-success)' : trend === 'down' ? 'var(--color-danger)' : 'var(--color-text-muted)',
            }}
          >
            {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : trend === 'down' ? <ArrowDownLeft className="w-3 h-3" /> : null}
          </div>
        )}
      </div>
      <div>
        <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
          {label}
        </p>
        <p className="text-xl font-bold stat-number leading-tight" style={{ color }}>
          {value}
        </p>
        {sub && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

function PeriodSummary({ stats }: { stats: PeriodStats }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      <StatCard
        label="Pendapatan"
        value={formatRupiah(stats.revenue)}
        sub={`${stats.orders} transaksi`}
        icon={DollarSign}
        color="var(--color-gold)"
        bg="var(--color-gold-muted)"
        trend="up"
      />
      <StatCard
        label="Laba Kotor"
        value={formatRupiah(stats.grossProfit)}
        sub={`Margin ${stats.margin.toFixed(1)}%`}
        icon={stats.grossProfit >= 0 ? TrendingUp : TrendingDown}
        color={stats.grossProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}
        bg={stats.grossProfit >= 0 ? 'var(--color-success-dim)' : 'var(--color-danger-dim)'}
        trend={stats.grossProfit >= 0 ? 'up' : 'down'}
      />
      <StatCard
        label="HPP Penjualan"
        value={formatRupiah(stats.hpp)}
        sub="Biaya bahan terjual"
        icon={Package}
        color="var(--color-accent)"
        bg="var(--color-accent-dim)"
      />
      <StatCard
        label="Pengeluaran Beli"
        value={formatRupiah(stats.expenses)}
        sub={`${stats.purchaseCount} pembelian`}
        icon={ShoppingCart}
        color="var(--color-danger)"
        bg="var(--color-danger-dim)"
        trend="down"
      />
      <StatCard
        label="Net Cash Flow"
        value={formatRupiah(stats.netCashflow)}
        sub="Pemasukan − Pengeluaran"
        icon={Wallet}
        color={stats.netCashflow >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}
        bg={stats.netCashflow >= 0 ? 'var(--color-success-dim)' : 'var(--color-danger-dim)'}
        trend={stats.netCashflow >= 0 ? 'up' : 'down'}
      />
      <StatCard
        label="Transaksi Jual"
        value={`${stats.orders}`}
        sub={`${stats.purchaseCount} pembelian bahan`}
        icon={ShoppingBag}
        color="var(--color-text-primary)"
        bg="var(--color-bg-elevated)"
      />
    </div>
  );
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; name: string; color: string }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;

  const labelMap: Record<string, string> = {
    revenue: 'Pendapatan',
    profit: 'Laba Kotor',
    hpp: 'HPP',
    expenses: 'Pengeluaran Beli',
    cashflow: 'Net Cash Flow',
  };

  return (
    <div
      className="p-3 rounded-xl shadow-2xl min-w-[200px]"
      style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
    >
      <p className="text-[10px] uppercase tracking-widest mb-2.5 font-mono" style={{ color: 'var(--color-text-muted)' }}>
        {label ? format(parseISO(label), 'dd MMM yyyy', { locale: id }) : ''}
      </p>
      {payload.map((p) => (
        <div key={p.name} className="flex justify-between items-center gap-4 mb-1.5">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {labelMap[p.name] ?? p.name}
            </span>
          </div>
          <span
            className="text-xs font-bold stat-number"
            style={{ color: p.value < 0 ? 'var(--color-danger)' : 'var(--color-text-primary)' }}
          >
            {formatRupiah(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

const categoryLabels: Record<string, string> = {
  Beans: 'Biji Kopi',
  Dairy: 'Susu & Dairy',
  Syrup: 'Sirup',
  Packaging: 'Kemasan',
  Other: 'Lainnya',
};

export function RecapClient({
  todayStats,
  weekStats,
  monthStats,
  chartData,
  topProducts,
  topExpenseCategories,
}: Props) {
  const [tab, setTab] = useState<Tab>('daily');
  const [chartMode, setChartMode] = useState<ChartMode>('revenue');
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');

  const stats = tab === 'daily' ? todayStats : tab === 'weekly' ? weekStats : monthStats;

  const visibleData =
    tab === 'daily'
      ? chartData.slice(-1)
      : tab === 'weekly'
      ? chartData.slice(-7)
      : chartData;

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'daily', label: 'Harian', icon: Calendar },
    { key: 'weekly', label: 'Mingguan', icon: BarChart3 },
    { key: 'monthly', label: 'Bulanan', icon: TrendingUp },
  ];

  const maxRevenue = Math.max(...topProducts.map(p => p.revenue), 1);
  const maxExpense = Math.max(...topExpenseCategories.map(c => c.amount), 1);

  const revenueChartSeries = [
    { key: 'revenue', color: 'var(--color-gold)', label: 'Pendapatan' },
    { key: 'profit', color: 'var(--color-success)', label: 'Laba Kotor' },
    { key: 'hpp', color: 'var(--color-accent)', label: 'HPP' },
  ];

  const cashflowChartSeries = [
    { key: 'revenue', color: 'var(--color-gold)', label: 'Pemasukan' },
    { key: 'expenses', color: 'var(--color-danger)', label: 'Pengeluaran Beli' },
    { key: 'cashflow', color: 'var(--color-success)', label: 'Net Cash Flow' },
  ];

  const activeSeries = chartMode === 'revenue' ? revenueChartSeries : cashflowChartSeries;
  const noData = visibleData.every(d => d.revenue === 0 && d.expenses === 0);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-2"
            style={{ color: 'var(--color-gold)', fontFamily: 'var(--font-mono)' }}
          >
            ◆ Rekap Keuangan
          </p>
          <h1
            className="text-3xl font-bold"
            style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-serif)' }}
          >
            Laporan Performa
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            Pendapatan, pengeluaran bahan, laba, dan arus kas bisnis Anda
          </p>
        </div>

        {/* Tab switcher */}
        <div
          className="flex items-center p-1 rounded-xl"
          style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
        >
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all"
              style={
                tab === key
                  ? { background: 'var(--color-gold)', color: '#0a0905' }
                  : { color: 'var(--color-text-secondary)' }
              }
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats grid */}
      <PeriodSummary stats={stats} />

      {/* Chart + Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div
          className="lg:col-span-2 rounded-2xl overflow-hidden"
          style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
        >
          <div
            className="flex flex-wrap items-center justify-between gap-3 px-6 py-4"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            <div>
              <h2 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {chartMode === 'revenue' ? 'Pendapatan & Laba' : 'Arus Kas (Cash Flow)'}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                {tab === 'daily' ? 'Hari ini' : tab === 'weekly' ? '7 hari terakhir' : '30 hari terakhir'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Chart mode */}
              <div
                className="flex items-center p-0.5 rounded-lg"
                style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}
              >
                {(['revenue', 'cashflow'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setChartMode(m)}
                    className="px-2.5 py-1 rounded-md text-xs font-medium transition-all"
                    style={
                      chartMode === m
                        ? { background: 'var(--color-gold-muted)', color: 'var(--color-gold)' }
                        : { color: 'var(--color-text-muted)' }
                    }
                  >
                    {m === 'revenue' ? 'Penjualan' : 'Cash Flow'}
                  </button>
                ))}
              </div>

              {/* Chart type */}
              <div
                className="flex items-center p-0.5 rounded-lg"
                style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}
              >
                {(['area', 'bar'] as const).map((ct) => (
                  <button
                    key={ct}
                    onClick={() => setChartType(ct)}
                    className="px-2.5 py-1 rounded-md text-xs font-medium transition-all"
                    style={
                      chartType === ct
                        ? { background: 'var(--color-gold-muted)', color: 'var(--color-gold)' }
                        : { color: 'var(--color-text-muted)' }
                    }
                  >
                    {ct === 'area' ? 'Area' : 'Bar'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-6">
            {noData ? (
              <div className="h-64 flex flex-col items-center justify-center text-center">
                <BarChart3 className="w-10 h-10 mb-3 opacity-20" style={{ color: 'var(--color-text-muted)' }} />
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Belum ada data pada periode ini
                </p>
              </div>
            ) : chartType === 'area' ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={visibleData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    {activeSeries.map(({ key, color }) => (
                      <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} className="opacity-20" />
                  <XAxis
                    dataKey="date"
                    stroke="transparent"
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => format(parseISO(v), 'dd/MM', { locale: id })}
                    minTickGap={20}
                  />
                  <YAxis
                    stroke="transparent"
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) =>
                      v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`
                    }
                  />
                  <Tooltip content={<CustomTooltip />} />
                  {activeSeries.map(({ key, color }) => (
                    <Area
                      key={key}
                      type="monotone"
                      dataKey={key}
                      name={key}
                      stroke={color}
                      strokeWidth={2}
                      fill={`url(#grad-${key})`}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={visibleData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} className="opacity-20" />
                  <XAxis
                    dataKey="date"
                    stroke="transparent"
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => format(parseISO(v), 'dd/MM', { locale: id })}
                    minTickGap={20}
                  />
                  <YAxis
                    stroke="transparent"
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) =>
                      v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`
                    }
                  />
                  <Tooltip content={<CustomTooltip />} />
                  {activeSeries.map(({ key, color }) => (
                    <Bar key={key} dataKey={key} name={key} fill={color} radius={[3, 3, 0, 0]} opacity={0.85} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 mt-2 justify-center">
              {activeSeries.map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Products */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
        >
          <div
            className="px-5 py-4 flex items-center gap-2"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            <Star className="w-4 h-4" style={{ color: 'var(--color-gold)' }} />
            <div>
              <h2 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                Produk Terlaris
              </h2>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>30 hari terakhir</p>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {topProducts.length === 0 ? (
              <div className="py-6 text-center">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-20" style={{ color: 'var(--color-text-muted)' }} />
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Belum ada data</p>
              </div>
            ) : (
              topProducts.map((p, idx) => (
                <div key={p.name} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0"
                        style={{
                          background: idx === 0 ? 'var(--color-gold-muted)' : 'var(--color-bg-elevated)',
                          color: idx === 0 ? 'var(--color-gold)' : 'var(--color-text-muted)',
                        }}
                      >
                        {idx + 1}
                      </span>
                      <span className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                        {p.name}
                      </span>
                    </div>
                    <span className="text-xs stat-number shrink-0 ml-2" style={{ color: 'var(--color-text-muted)' }}>
                      ×{p.qty}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-bg-elevated)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(p.revenue / maxRevenue) * 100}%`,
                          background: idx === 0 ? 'var(--color-gold)' : 'var(--color-text-muted)',
                          opacity: idx === 0 ? 1 : 0.45,
                        }}
                      />
                    </div>
                    <span
                      className="text-xs stat-number shrink-0"
                      style={{ color: idx === 0 ? 'var(--color-gold)' : 'var(--color-text-secondary)' }}
                    >
                      {formatRupiah(p.revenue)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Expense breakdown */}
          {topExpenseCategories.length > 0 && (
            <>
              <div
                className="px-5 py-3 flex items-center gap-2"
                style={{ borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}
              >
                <ShoppingCart className="w-4 h-4" style={{ color: 'var(--color-danger)' }} />
                <div>
                  <h2 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                    Pengeluaran per Kategori
                  </h2>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>30 hari terakhir</p>
                </div>
              </div>
              <div className="p-5 space-y-3">
                {topExpenseCategories.map((cat, idx) => (
                  <div key={cat.category} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                        {categoryLabels[cat.category] ?? cat.category}
                      </span>
                      <span className="text-xs stat-number" style={{ color: 'var(--color-danger)' }}>
                        {formatRupiah(cat.amount)}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-bg-elevated)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(cat.amount / maxExpense) * 100}%`,
                          background: 'var(--color-danger)',
                          opacity: idx === 0 ? 0.9 : 0.4,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Comparison table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
      >
        <div
          className="px-6 py-4"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Perbandingan Periode
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            Ringkasan lengkap penjualan & pengeluaran
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--color-bg-elevated)', borderBottom: '1px solid var(--color-border)' }}>
                {['Metrik', 'Hari Ini', '7 Hari', '30 Hari'].map(h => (
                  <th key={h} className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                {
                  label: 'Pendapatan',
                  today: todayStats.revenue,
                  week: weekStats.revenue,
                  month: monthStats.revenue,
                  fmt: formatRupiah,
                  colorFn: () => 'var(--color-gold)',
                },
                {
                  label: 'HPP Penjualan',
                  today: todayStats.hpp,
                  week: weekStats.hpp,
                  month: monthStats.hpp,
                  fmt: formatRupiah,
                  colorFn: () => 'var(--color-accent)',
                },
                {
                  label: 'Laba Kotor',
                  today: todayStats.grossProfit,
                  week: weekStats.grossProfit,
                  month: monthStats.grossProfit,
                  fmt: formatRupiah,
                  colorFn: (v: number) => v >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
                },
                {
                  label: 'Margin Kotor',
                  today: todayStats.margin,
                  week: weekStats.margin,
                  month: monthStats.margin,
                  fmt: (v: number) => `${v.toFixed(1)}%`,
                  colorFn: (v: number) => v >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
                },
                {
                  label: 'Pengeluaran Beli',
                  today: todayStats.expenses,
                  week: weekStats.expenses,
                  month: monthStats.expenses,
                  fmt: formatRupiah,
                  colorFn: () => 'var(--color-danger)',
                },
                {
                  label: 'Net Cash Flow',
                  today: todayStats.netCashflow,
                  week: weekStats.netCashflow,
                  month: monthStats.netCashflow,
                  fmt: formatRupiah,
                  colorFn: (v: number) => v >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
                },
                {
                  label: 'Transaksi Jual',
                  today: todayStats.orders,
                  week: weekStats.orders,
                  month: monthStats.orders,
                  fmt: (v: number) => `${v}`,
                  colorFn: () => 'var(--color-text-primary)',
                },
                {
                  label: 'Pembelian Bahan',
                  today: todayStats.purchaseCount,
                  week: weekStats.purchaseCount,
                  month: monthStats.purchaseCount,
                  fmt: (v: number) => `${v}`,
                  colorFn: () => 'var(--color-text-primary)',
                },
              ].map((row, idx, arr) => (
                <tr
                  key={row.label}
                  style={{ borderBottom: idx < arr.length - 1 ? '1px solid var(--color-border)' : 'none' }}
                >
                  <td className="px-6 py-4 text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                    {row.label}
                  </td>
                  {[row.today, row.week, row.month].map((val, i) => (
                    <td key={i} className="px-6 py-4">
                      <span
                        className="stat-number font-semibold text-sm"
                        style={{ color: row.colorFn(val as number) }}
                      >
                        {row.fmt(val as number)}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}