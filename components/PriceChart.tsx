'use client';

import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

type PurchasePoint = {
  date: string | number | Date;
  price: number | string;
  quantity: number | string;
};

function formatRupiah(value: number) {
  return `Rp ${value.toLocaleString('id-ID')}`;
}

export function PriceChart({ data, unit }: { data: PurchasePoint[]; unit?: string }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Grafik akan muncul setelah ada cukup log pembelian.
        </p>
      </div>
    );
  }

  // 1. Clean and Map data. We strip original fields to prevent Recharts auto-scaling artifacts
  const formattedData = data
    .map((d) => {
      const qty = Number(d.quantity);
      const total = Number(d.price);
      const pricePerUnit = qty > 0 && Number.isFinite(total) ? total / qty : null;
      
      const dateObj = new Date(d.date);
      
      return {
        // Essential for plotting
        pricePerUnit,
        // Unique ID for Recharts to prevent tooltip grouping/duplication
        timestamp: dateObj.getTime(),
        // Full label for Tooltip
        fullDate: format(dateObj, 'dd MMM yyyy, HH:mm', { locale: id }),
        // Extra info for tooltip
        rawQty: qty,
        rawTotal: total,
      };
    })
    .filter((v) => v.pricePerUnit !== null) as Array<{
      pricePerUnit: number;
      timestamp: number;
      fullDate: string;
      rawQty: number;
      rawTotal: number;
    }>;

  if (formattedData.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Tidak ada data grafik yang valid.
        </p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={formattedData} margin={{ top: 20, right: 20, left: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--gold)" stopOpacity={0.2} />
            <stop offset="95%" stopColor="var(--gold)" stopOpacity={0} />
          </linearGradient>
        </defs>
        
        <CartesianGrid 
          strokeDasharray="3 3" 
          stroke="var(--border)" 
          vertical={false} 
          style={{ opacity: 0.2 }}
        />
        
        <XAxis
          dataKey="timestamp"
          stroke="transparent"
          tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
          tickLine={false}
          axisLine={false}
          type="number"
          domain={['dataMin', 'dataMax']}
          tickFormatter={(t) => format(new Date(t), 'dd MMM', { locale: id })}
          minTickGap={30}
        />
        
        <YAxis
          stroke="transparent"
          tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
          tickLine={false}
          axisLine={false}
          domain={['auto', 'auto']}
          padding={{ top: 30, bottom: 30 }}
          tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toString()}
        />

        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const d = payload[0].payload;
              return (
                <div 
                  className="p-3 rounded-xl border shadow-2xl" 
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
                >
                  <p className="text-[10px] uppercase tracking-widest mb-2 font-mono" style={{ color: 'var(--text-muted)' }}>
                    {d.fullDate}
                  </p>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-baseline gap-4">
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Harga/{unit ?? 'unit'}</span>
                      <span className="text-sm font-bold" style={{ color: 'var(--gold)' }}>
                        {formatRupiah(d.pricePerUnit)}
                      </span>
                    </div>
                    <div className="pt-1.5 border-t border-dashed" style={{ borderColor: 'var(--border)' }}>
                      <div className="flex justify-between text-[11px]">
                        <span style={{ color: 'var(--text-muted)' }}>Total Belanja</span>
                        <span style={{ color: 'var(--text-primary)' }}>{formatRupiah(d.rawTotal)}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span style={{ color: 'var(--text-muted)' }}>Jumlah</span>
                        <span style={{ color: 'var(--text-primary)' }}>{d.rawQty} {unit ?? ''}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          }}
        />

        <Area
          type="linear" // Changed from monotone to linear for precision
          dataKey="pricePerUnit"
          stroke="var(--gold)"
          strokeWidth={2}
          fill="url(#goldGradient)"
          dot={{ fill: 'var(--gold)', strokeWidth: 0, r: 3 }}
          activeDot={{ r: 5, fill: 'var(--gold)', strokeWidth: 2, stroke: 'var(--bg)' }}
          animationDuration={1000}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}