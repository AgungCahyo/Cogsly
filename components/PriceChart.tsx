'use client';

import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

import { PurchasePoint } from '@/types';

function formatRupiah(value: number) {
  return `Rp ${value.toLocaleString('id-ID')}`;
}

export function PriceChart({ data, unit }: { data: PurchasePoint[]; unit?: string }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center">
        <p className="text-sm text-text-muted">
          Grafik akan muncul setelah ada cukup log pembelian.
        </p>
      </div>
    );
  }

  const formattedData = data
    .map((d) => {
      const qty = Number(d.quantity);
      const total = Number(d.price);
      const conversion = Number(d.unit_conversion) || 1;
      // quantity in base unit (e.g. ml), price per base unit
      const qtyInBase = qty * conversion;
      const pricePerUnit = qtyInBase > 0 && Number.isFinite(total) ? total / qtyInBase : null;

      const dateObj = new Date(d.date);

      return {
        pricePerUnit,
        timestamp: dateObj.getTime(),
        fullDate: format(dateObj, 'dd MMM yyyy, HH:mm', { locale: id }),
        // For tooltip: show original purchase info
        rawQty: qty,
        rawTotal: total,
        purchaseUnit: d.purchase_unit || null,
        unitConversion: conversion,
        qtyInBase,
      };
    })
    .filter((v) => v.pricePerUnit !== null) as Array<{
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
      <div className="h-full flex flex-col items-center justify-center text-center">
        <p className="text-sm text-text-muted">
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
            <stop offset="5%" stopColor="var(--color-gold)" stopOpacity={0.2} />
            <stop offset="95%" stopColor="var(--color-gold)" stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--color-border)"
          vertical={false}
          className="opacity-20"
        />

        <XAxis
          dataKey="timestamp"
          stroke="transparent"
          tick={{ fill: 'var(--color-text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
          tickLine={false}
          axisLine={false}
          type="number"
          domain={['dataMin', 'dataMax']}
          tickFormatter={(t) => format(new Date(t), 'dd MMM', { locale: id })}
          minTickGap={30}
        />

        <YAxis
          stroke="transparent"
          tick={{ fill: 'var(--color-text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
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
              const hasConversion = d.purchaseUnit && d.unitConversion !== 1;

              return (
                <div className="p-3 rounded-xl border border-border bg-bg-card shadow-2xl min-w-[180px]">
                  <p className="text-[10px] uppercase tracking-widest mb-2.5 font-mono text-text-muted">
                    {d.fullDate}
                  </p>

                  {/* Price per base unit — the main metric */}
                  <div className="flex justify-between items-baseline gap-4 mb-2.5">
                    <span className="text-xs text-text-secondary">
                      Harga beli / {unit ?? 'unit'}
                    </span>
                    <span className="text-sm font-bold stat-number text-gold">
                      {formatRupiah(d.pricePerUnit)}
                    </span>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-dashed border-border pt-2 space-y-1.5">
                    {/* Purchase details */}
                    {hasConversion ? (
                      <>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-text-muted">Dibeli</span>
                          <span className="text-text-primary">
                            {d.rawQty} {d.purchaseUnit}
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-text-muted">Konversi</span>
                          <span className="text-text-secondary">
                            1 {d.purchaseUnit} = {d.unitConversion.toLocaleString('id-ID')} {unit}
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-text-muted">Masuk stok</span>
                          <span className="text-text-primary">
                            {d.qtyInBase.toLocaleString('id-ID')} {unit}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between text-[11px]">
                        <span className="text-text-muted">Jumlah</span>
                        <span className="text-text-primary">
                          {d.rawQty} {unit}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-[11px]">
                      <span className="text-text-muted">Total bayar</span>
                      <span className="text-text-primary">{formatRupiah(d.rawTotal)}</span>
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          }}
        />

        <Area
          type="linear"
          dataKey="pricePerUnit"
          stroke="var(--color-gold)"
          strokeWidth={2}
          fill="url(#goldGradient)"
          dot={{ fill: 'var(--color-gold)', strokeWidth: 0, r: 3 }}
          activeDot={{ r: 5, fill: 'var(--color-gold)', strokeWidth: 2, stroke: 'var(--color-bg)' }}
          animationDuration={1000}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}