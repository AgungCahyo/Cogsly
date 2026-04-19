'use client';

import { Calculator, Package, TrendingUp, AlertTriangle } from 'lucide-react';
import { Save } from 'lucide-react';

export function HPPProjector({
  rawMaterialHPP,
  opCost,
  totalHPP,
  price,
  margin,
  marginPercent,
  stockWarnings,
  loading,
}: {
  rawMaterialHPP: number;
  opCost: number;
  totalHPP: number;
  price: number;
  margin: number;
  marginPercent: number;
  stockWarnings: { name: string; stock: number; needed: number; unit: string | null }[];
  loading: boolean;
}) {
  const isPositive = margin >= 0;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-zinc-200 rounded-3xl p-8 sticky top-8 shadow-sm shadow-zinc-950/5">
        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-zinc-50">
          <div className="p-2 bg-zinc-950 text-white rounded-lg shadow-md transition-transform hover:scale-110">
            <Calculator className="w-4 h-4" />
          </div>
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-950 font-mono">
            ESTIMASI HPP LANGSUNG
          </h3>
        </div>

        <div className="space-y-4">
          {[
            { label: 'Bahan Baku', value: rawMaterialHPP, icon: Package },
            { label: 'Biaya Operasional', value: opCost, icon: TrendingUp, prefix: '+ ' },
          ].map(({ label, value, icon: Icon, prefix }) => (
            <div key={label} className="flex items-center justify-between pb-3 border-b border-zinc-50 last:border-0 last:pb-0">
              <span className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 text-zinc-400">
                <Icon className="w-3.5 h-3.5" />
                {label}
              </span>
              <span className="text-sm font-bold font-mono tracking-tighter text-zinc-950">
                {prefix}Rp {Math.round(value).toLocaleString('id-ID')}
              </span>
            </div>
          ))}

          <div className="flex items-center justify-between pt-4 pb-6">
            <span className="text-xs font-bold uppercase tracking-widest text-zinc-950">Total HPP</span>
            <span className="text-2xl font-bold font-mono tracking-tighter text-zinc-950">
              Rp {Math.round(totalHPP).toLocaleString('id-ID')}
            </span>
          </div>
        </div>

        {/* Projection Card */}
        <div
          className={`p-6 rounded-2xl border transition-all duration-500 overflow-hidden relative ${
            isPositive ? 'bg-zinc-950 text-white border-zinc-950 shadow-xl shadow-zinc-950/20' : 'bg-white border-zinc-200 text-zinc-400 shadow-inner'
          }`}
        >
          {isPositive && (
            <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-[0.03] rounded-full -translate-y-12 translate-x-12" />
          )}
          
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">
              Proyeksi Margin
            </span>
            <span className={`text-xs font-bold font-mono ${isPositive ? 'text-white' : 'text-zinc-950'}`}>
              {marginPercent.toFixed(1)}%
            </span>
          </div>
          
          <p className={`text-3xl font-bold font-mono tracking-tighter mb-4 ${isPositive ? 'text-white' : 'text-zinc-950'}`}>
            Rp {Math.round(margin).toLocaleString('id-ID')}
          </p>
          
          <div className={`h-1 rounded-full overflow-hidden ${isPositive ? 'bg-white/10' : 'bg-zinc-100'}`}>
            <div
              className={`h-full transition-all duration-1000 ${isPositive ? 'bg-white' : 'bg-zinc-950'}`}
              style={{ width: `${Math.min(100, Math.max(0, marginPercent))}%` }}
            />
          </div>
        </div>

        {/* Stock Warnings */}
        {stockWarnings.length > 0 && (
          <div className="mt-6 p-5 rounded-2xl space-y-3 bg-zinc-50 border border-zinc-100 group">
            <p className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2.5 text-zinc-950">
              <AlertTriangle className="w-4 h-4" />
              Stok Tidak Mencukupi
            </p>
            <div className="space-y-2">
              {stockWarnings.map(w => (
                <div key={w.name} className="flex justify-between items-baseline gap-4">
                  <p className="text-[10px] font-medium text-zinc-500 truncate uppercase tracking-tighter">{w.name}</p>
                  <p className="text-[10px] font-bold font-mono text-zinc-950 shrink-0">
                    Needs {w.needed.toLocaleString('id-ID')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-8 w-full group relative overflow-hidden bg-zinc-950 text-white rounded-2xl py-5 font-bold text-sm tracking-widest uppercase transition-all hover:bg-zinc-800 hover:shadow-2xl hover:shadow-zinc-950/10 active:scale-[0.98] disabled:bg-zinc-100 disabled:text-zinc-300 disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/25 focus-visible:ring-offset-2"
        >
          <div className="flex items-center justify-center gap-3 relative z-10">
            <Save className="w-4.5 h-4.5" />
            {loading ? 'MENYIMPAN...' : 'SIMPAN RESEP'}
          </div>
        </button>
      </div>
    </div>
  );
}
