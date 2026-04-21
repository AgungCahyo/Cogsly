'use client';

import { Calculator, Package, TrendingUp, AlertTriangle, Save } from 'lucide-react';

export function HPPProjector({
  rawMaterialHPP, opCost, totalHPP, price, margin, marginPercent, stockWarnings, loading,
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
    <div className="space-y-4">
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 sticky top-4 shadow-sm shadow-zinc-950/5 sm:p-6 sm:top-6">
        <div className="flex items-center gap-2.5 mb-5 pb-3.5 border-b border-zinc-50">
          <div className="p-2 bg-zinc-950 text-white rounded-lg shadow-md">
            <Calculator className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-950 font-mono">ESTIMASI HPP</h3>
        </div>

        <div className="space-y-3">
          {[
            { label: 'Bahan Baku', value: rawMaterialHPP, icon: Package },
            { label: 'Biaya Operasional', value: opCost, icon: TrendingUp, prefix: '+ ' },
          ].map(({ label, value, icon: Icon, prefix }) => (
            <div key={label} className="flex items-center justify-between pb-2.5 border-b border-zinc-50">
              <span className="text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 text-zinc-400">
                <Icon className="w-3 h-3" />{label}
              </span>
              <span className="text-xs font-bold font-mono tracking-tighter text-zinc-950">
                {prefix}Rp {Math.round(value).toLocaleString('id-ID')}
              </span>
            </div>
          ))}

          <div className="flex items-center justify-between pt-2 pb-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-950">Total HPP</span>
            <span className="text-xl font-bold font-mono tracking-tighter text-zinc-950">Rp {Math.round(totalHPP).toLocaleString('id-ID')}</span>
          </div>
        </div>

        {/* Projection Card */}
        <div className={`p-4 rounded-xl border transition-all duration-500 overflow-hidden relative ${isPositive ? 'bg-zinc-950 text-white border-zinc-950 shadow-lg shadow-zinc-950/20' : 'bg-white border-zinc-200 text-zinc-400 shadow-inner'}`}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] opacity-60">Proyeksi Margin</span>
            <span className={`text-[10px] font-bold font-mono ${isPositive ? 'text-white' : 'text-zinc-950'}`}>{marginPercent.toFixed(1)}%</span>
          </div>
          <p className={`text-2xl font-bold font-mono tracking-tighter mb-3 ${isPositive ? 'text-white' : 'text-zinc-950'}`}>
            Rp {Math.round(margin).toLocaleString('id-ID')}
          </p>
          <div className={`h-1 rounded-full overflow-hidden ${isPositive ? 'bg-white/10' : 'bg-zinc-100'}`}>
            <div className={`h-full transition-all duration-1000 ${isPositive ? 'bg-white' : 'bg-zinc-950'}`} style={{ width: `${Math.min(100, Math.max(0, marginPercent))}%` }} />
          </div>
        </div>

        {/* Stock Warnings */}
        {stockWarnings.length > 0 && (
          <div className="mt-4 p-4 rounded-xl space-y-2.5 bg-zinc-50 border border-zinc-100">
            <p className="text-[9px] font-bold uppercase tracking-widest flex items-center gap-2 text-zinc-950">
              <AlertTriangle className="w-3.5 h-3.5" />
              Stok Tidak Mencukupi
            </p>
            {stockWarnings.map(w => (
              <div key={w.name} className="flex justify-between items-baseline gap-3">
                <p className="text-[9px] font-medium text-zinc-500 truncate uppercase tracking-tighter">{w.name}</p>
                <p className="text-[9px] font-bold font-mono text-zinc-950 shrink-0">Butuh {w.needed.toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}

        <button type="submit" disabled={loading}
          className="mt-5 w-full bg-zinc-950 text-white rounded-xl py-4 font-bold text-xs tracking-widest uppercase transition-all hover:bg-zinc-800 active:scale-[0.98] disabled:bg-zinc-100 disabled:text-zinc-300">
          <div className="flex items-center justify-center gap-2.5">
            <Save className="w-4 h-4" />
            {loading ? 'Menyimpan...' : 'Simpan Resep'}
          </div>
        </button>
      </div>
    </div>
  );
}