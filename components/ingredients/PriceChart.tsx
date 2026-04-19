'use client';

import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { format, differenceInDays } from 'date-fns';
import { id } from 'date-fns/locale';

import { PurchasePoint } from '@/types';

function formatRupiah(value: number) {
  return `Rp ${value.toLocaleString('id-ID')}`;
}

export function PriceChart({ data, unit }: { data: PurchasePoint[]; unit?: string }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center py-12">
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-300">
          Grafik akan muncul setelah ada log pembelian
        </p>
      </div>
    );
  }

  const formattedData = data
    .map((d) => {
      const qty = Number(d.quantity);
      const total = Number(d.price);
      const conversion = Number(d.unit_conversion) || 1;
      const qtyInBase = qty * conversion;
      const pricePerUnit = qtyInBase > 0 && Number.isFinite(total) ? total / qtyInBase : null;

      const dateObj = new Date(d.date);

      return {
        pricePerUnit,
        timestamp: dateObj.getTime(),
        fullDate: format(dateObj, 'dd MMM yyyy, HH:mm', { locale: id }),
        rawQty: qty,
        rawTotal: total,
        purchaseUnit: d.purchase_unit || null,
        unitConversion: conversion,
        qtyInBase,
      };
    })
    .filter((v) => v.pricePerUnit !== null)
    .sort((a, b) => a.timestamp - b.timestamp) as Array<{
      pricePerUnit: number;
      timestamp: number;
      fullDate: string;
      rawQty: number;
      rawTotal: number;
      purchaseUnit: string | null;
      unitConversion: number;
      qtyInBase: number;
    }>;

  if (formattedData.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center py-12">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">
          Data tidak valid untuk ditampilkan
        </p>
      </div>
    );
  }

  // Determine X-axis label format based on time span
  const firstPoint = formattedData[0].timestamp;
  const lastPoint = formattedData[formattedData.length - 1].timestamp;
  const daysDiff = differenceInDays(lastPoint, firstPoint);

  const getTickFormat = (t: number) => {
    const d = new Date(t);
    if (daysDiff < 2) {
      return format(d, 'HH:mm', { locale: id });
    }
    return format(d, 'dd MMM', { locale: id });
  };

  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="zincGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#09090b" stopOpacity={0.08} />
            <stop offset="95%" stopColor="#09090b" stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid
          strokeDasharray="6 6"
          stroke="#f4f4f5"
          vertical={false}
        />

        <XAxis
          dataKey="timestamp"
          stroke="transparent"
          tick={{ fill: '#a1a1aa', fontSize: 10, fontWeight: 700, fontFamily: 'DM Mono' }}
          tickLine={false}
          axisLine={false}
          type="number"
          domain={['dataMin', 'dataMax']}
          tickFormatter={getTickFormat}
          minTickGap={40}
        />

        <YAxis
          stroke="transparent"
          tick={{ fill: '#a1a1aa', fontSize: 10, fontWeight: 700, fontFamily: 'DM Mono' }}
          tickLine={false}
          axisLine={false}
          domain={['auto', 'auto']}
          padding={{ top: 20, bottom: 20 }}
          tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toString()}
        />

        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const d = payload[0].payload;
              const hasConversion = d.purchaseUnit && d.unitConversion !== 1;

              return (
                <div className="bg-zinc-950 text-white p-5 rounded-2xl shadow-2xl border border-zinc-800 min-w-[200px] animate-in zoom-in-95 duration-200">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-4 font-mono">
                    {d.fullDate}
                  </p>

                  <div className="flex justify-between items-baseline gap-4 mb-4 pb-4 border-b border-zinc-800">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                      Harga beli / {unit ?? 'gr'}
                    </span>
                    <span className="text-sm font-bold font-mono text-white tracking-widest">
                      {formatRupiah(Math.round(d.pricePerUnit))}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {hasConversion ? (
                      <>
                        <div className="flex justify-between items-baseline">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Dibeli</span>
                          <span className="text-[10px] font-bold text-white uppercase tracking-tighter">
                            {d.rawQty} {d.purchaseUnit}
                          </span>
                        </div>
                        <div className="flex justify-between items-baseline">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Konversi</span>
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">
                            1 {d.purchaseUnit} = {d.unitConversion.toLocaleString('id-ID')} {unit}
                          </span>
                        </div>
                        <div className="flex justify-between items-baseline">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Masuk stok</span>
                          <span className="text-[10px] font-bold text-white uppercase tracking-tighter">
                            {d.qtyInBase.toLocaleString('id-ID')} {unit}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between items-baseline">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Jumlah</span>
                        <span className="text-[10px] font-bold text-white uppercase tracking-tighter">
                          {d.rawQty} {unit}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-baseline pt-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Total bayar</span>
                      <span className="text-[10px] font-bold font-mono text-white tracking-widest">{formatRupiah(d.rawTotal)}</span>
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          }}
        />

        <Area
          type="monotone"
          dataKey="pricePerUnit"
          stroke="#09090b"
          strokeWidth={3}
          fill="url(#zincGradient)"
          dot={{ fill: '#09090b', strokeWidth: 0, r: 3 }}
          activeDot={{ r: 6, fill: '#09090b', strokeWidth: 2, stroke: '#fff' }}
          animationDuration={1000}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
