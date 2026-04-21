import { createClient } from '@/lib/supabase/server';
import { ShoppingCart, Plus, FileText, Calendar, ArrowRight, FlaskConical } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export const dynamic = 'force-dynamic';

import { PurchaseLogRow } from '@/types';

export default async function ProcurementPage() {
  const supabase = await createClient();
  const { data: purchases, error } = await supabase
    .from('purchases')
    .select(`id, date, supplier, price, quantity, evidence_url, purchase_unit, unit_conversion, ingredients(name, unit)`)
    .returns<PurchaseLogRow[]>()
    .order('date', { ascending: false });

  const totalSpend = purchases?.reduce((s, p) => s + Number(p.price), 0) ?? 0;
  const totalTransaksi = purchases?.length ?? 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-zinc-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-1 font-mono">◆ Pengadaan</p>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 font-serif sm:text-3xl">Log Stok Masuk</h1>
          <p className="text-xs mt-1 text-zinc-500 font-medium">Pelacakan pengadaan material dan riwayat transaksi</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/procurement/internal" className="inline-flex items-center gap-1.5 bg-white border border-zinc-200 text-zinc-950 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all hover:bg-zinc-50">
            <FlaskConical className="w-3.5 h-3.5" />
            Internal
          </Link>
          <Link href="/procurement/new" className="inline-flex items-center gap-1.5 bg-zinc-950 text-white px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all hover:bg-zinc-800">
            <Plus className="w-3.5 h-3.5" />
            Catat Stok
          </Link>
        </div>
      </div>

      {/* Summary */}
      {!error && purchases && purchases.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-zinc-200 rounded-xl px-4 py-3.5 shadow-sm">
            <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-0.5">Total Transaksi</p>
            <p className="text-2xl font-bold font-mono tracking-tighter text-zinc-950">{totalTransaksi}</p>
          </div>
          <div className="bg-white border border-zinc-200 rounded-xl px-4 py-3.5 shadow-sm">
            <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-0.5">Total Pengeluaran</p>
            <p className="text-xl font-bold font-mono tracking-tighter text-zinc-950 truncate">Rp {totalSpend.toLocaleString('id-ID')}</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-4 py-4 border-b border-zinc-100 bg-zinc-50/30 sm:px-6">
          <p className="text-xs font-bold text-zinc-950">Riwayat Pengadaan</p>
        </div>

        {error ? (
          <div className="p-10 text-center text-xs font-bold text-zinc-950">Gagal memuat: {error.message}</div>
        ) : !purchases || purchases.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-3xl bg-zinc-50 border border-zinc-100 flex items-center justify-center mb-4">
              <ShoppingCart className="w-7 h-7 text-zinc-300" />
            </div>
            <h3 className="text-base font-bold text-zinc-950 mb-1.5 font-serif">Belum ada pembelian</h3>
            <p className="text-xs text-zinc-500 max-w-xs mb-6 leading-relaxed">HPP rata-rata dihitung otomatis setiap Anda mencatat pembelian.</p>
            <Link href="/procurement/new" className="bg-zinc-950 text-white px-6 py-2.5 rounded-xl font-bold text-xs hover:bg-zinc-800">Catat Pertama</Link>
          </div>
        ) : (
          <>
            {/* Mobile card list */}
            <div className="block sm:hidden p-4 space-y-2.5">
              {purchases.map((log) => {
                const hasConversion = log.purchase_unit && Number(log.unit_conversion) > 1;
                const stockAdded = Number(log.quantity) * (hasConversion ? Number(log.unit_conversion) : 1);
                return (
                  <div key={log.id} className="bg-zinc-50/50 rounded-xl border border-zinc-100 p-3.5 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-xs text-zinc-950">{log.ingredients?.name}</p>
                        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                          {log.supplier === 'Produksi Internal' ? 'Produksi Internal' : `Supplier: ${log.supplier ?? '—'}`}
                        </p>
                      </div>
                      <p className="font-bold font-mono text-xs text-zinc-950 shrink-0">Rp {Number(log.price).toLocaleString('id-ID')}</p>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-200">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3 text-zinc-400" />
                        <span className="text-[9px] font-bold text-zinc-500">{format(new Date(log.date), 'dd MMM yyyy', { locale: id })}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-zinc-950" />
                        <span className="text-[9px] font-bold text-zinc-950 uppercase">+{stockAdded.toLocaleString('id-ID')} {log.ingredients?.unit}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full whitespace-nowrap text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50/50 border-b border-zinc-100">
                    {['Tanggal', 'Bahan Baku', 'Tujuan / Unit', 'Status Log', 'Total Harga', 'Bukti'].map(h => (
                      <th key={h} className="px-5 py-4 text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {purchases.map((log) => {
                    const hasConversion = log.purchase_unit && Number(log.unit_conversion) > 1;
                    const stockAdded = Number(log.quantity) * (hasConversion ? Number(log.unit_conversion) : 1);
                    return (
                      <tr key={log.id} className="group hover:bg-zinc-50/50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 bg-zinc-50 rounded-lg group-hover:bg-zinc-950 group-hover:text-white transition-colors">
                              <Calendar className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-zinc-950">{format(new Date(log.date), 'dd MMM yyyy', { locale: id })}</p>
                              <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{format(new Date(log.date), 'HH:mm')}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-bold text-xs text-zinc-950">{log.ingredients?.name}</p>
                          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{log.supplier ?? '—'}</p>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-baseline gap-1">
                            <span className="text-sm font-bold font-mono tracking-tighter text-zinc-950">{log.quantity}</span>
                            <span className="text-[9px] font-bold uppercase text-zinc-400 tracking-widest">{log.purchase_unit || log.ingredients?.unit}</span>
                          </div>
                          {hasConversion && (
                            <div className="flex items-center gap-1 mt-1 text-[9px] font-bold text-zinc-300">
                              <span>1 {log.purchase_unit}</span>
                              <ArrowRight className="w-2 h-2" />
                              <span>{Number(log.unit_conversion).toLocaleString('id-ID')} {log.ingredients?.unit}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-zinc-950" />
                            <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-950">+{stockAdded.toLocaleString('id-ID')} {log.ingredients?.unit}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-bold font-mono text-xs text-zinc-950 tracking-tighter">Rp {Number(log.price).toLocaleString('id-ID')}</span>
                        </td>
                        <td className="px-5 py-4">
                          {log.evidence_url ? (
                            <a href={log.evidence_url} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 bg-white border border-zinc-200 px-2.5 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all hover:bg-zinc-950 hover:text-white hover:border-zinc-950">
                              <FileText className="w-3 h-3" />Nota
                            </a>
                          ) : (
                            <span className="text-[9px] font-bold italic text-zinc-300 uppercase tracking-widest">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}