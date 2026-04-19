import { createClient } from '@/lib/supabase/server';
import { ShoppingCart, Plus, FileText, Calendar, ArrowRight } from 'lucide-react';
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
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-end sm:items-center justify-between gap-6 border-b border-zinc-200 pb-8">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-2 font-mono">
            ◆ Pengadaan
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-zinc-950 font-serif">
            Log Pembelian
          </h1>
          <p className="text-sm mt-1.5 text-zinc-500 font-medium tracking-tight">
            Pelacakan pengadaan material dan riwayat transaksi inventori
          </p>
        </div>
        <Link 
          href="/procurement/new" 
          className="inline-flex items-center gap-2.5 bg-zinc-950 text-white px-6 py-3 rounded-2xl font-bold text-sm transition-all hover:bg-zinc-800 hover:shadow-xl hover:shadow-zinc-950/10"
        >
          <Plus className="w-4 h-4" />
          Catat Pembelian
        </Link>
      </div>

      {/* Summary strips */}
      {!error && purchases && purchases.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-zinc-200 rounded-2xl px-6 py-5 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Total Transaksi</p>
            <p className="text-3xl font-bold font-mono tracking-tighter text-zinc-950">{totalTransaksi}</p>
          </div>
          <div className="bg-white border border-zinc-200 rounded-2xl px-6 py-5 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Total Pengeluaran</p>
            <p className="text-3xl font-bold font-mono tracking-tighter text-zinc-950">
              Rp {totalSpend.toLocaleString('id-ID')}
            </p>
          </div>
        </div>
      )}

      {/* Table Section */}
      <div className="bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-sm shadow-zinc-950/5">
        <div className="px-8 py-6 border-b border-zinc-100 bg-zinc-50/30">
          <p className="text-sm font-bold text-zinc-950 tracking-tight">Riwayat Pengadaan</p>
        </div>

        {error ? (
          <div className="p-16 text-center text-sm font-bold text-zinc-950">
            Gagal memuat data: {error.message}
          </div>
        ) : !purchases || purchases.length === 0 ? (
          <div className="p-20 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-[2.5rem] bg-zinc-50 border border-zinc-100 flex items-center justify-center mb-6 shadow-inner">
              <ShoppingCart className="w-10 h-10 text-zinc-300" />
            </div>
            <h3 className="text-xl font-bold text-zinc-950 mb-2 font-serif">Belum ada pembelian</h3>
            <p className="text-sm text-zinc-500 max-w-sm mb-8 leading-relaxed font-medium">
              Sistem akan menghitung HPP rata-rata dan stok otomatis setiap Anda mencatat pembelian.
            </p>
            <Link 
              href="/procurement/new" 
              className="bg-zinc-950 text-white px-8 py-3.5 rounded-2xl font-bold text-sm transition-all hover:bg-zinc-800"
            >
              Catat Pertama
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50/50 border-b border-zinc-100">
                  {['Tanggal', 'Bahan Baku', 'Tujuan / Unit', 'Status Log', 'Total Harga', 'Bukti'].map(h => (
                    <th key={h} className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {purchases.map((log) => {
                  const hasConversion = log.purchase_unit && Number(log.unit_conversion) > 1;
                  const stockAdded = Number(log.quantity) * (hasConversion ? Number(log.unit_conversion) : 1);

                  return (
                    <tr key={log.id} className="group hover:bg-zinc-50/50 transition-colors">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-zinc-50 rounded-lg group-hover:bg-zinc-950 group-hover:text-white transition-colors">
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-zinc-950">
                              {format(new Date(log.date), 'dd MMM yyyy', { locale: id })}
                            </p>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">
                              {format(new Date(log.date), 'HH:mm')}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <p className="font-bold text-sm text-zinc-950">{log.ingredients?.name}</p>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                          Supplier: {log.supplier ?? '—'}
                        </p>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-base font-bold font-mono tracking-tighter text-zinc-950">
                            {log.quantity}
                          </span>
                          <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">
                            {log.purchase_unit || log.ingredients?.unit}
                          </span>
                        </div>
                        {hasConversion && (
                          <div className="flex items-center gap-1.5 mt-1 text-[10px] font-bold text-zinc-300 italic">
                            <span>1 {log.purchase_unit}</span>
                            <ArrowRight className="w-2.5 h-2.5" />
                            <span>{Number(log.unit_conversion).toLocaleString('id-ID')} {log.ingredients?.unit}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-zinc-950" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-950">
                            +{stockAdded.toLocaleString('id-ID')} {log.ingredients?.unit}
                          </span>
                        </div>
                        <p className="text-[9px] font-medium text-zinc-400 uppercase mt-1">Masuk ke Stok</p>
                      </td>
                      <td className="px-8 py-6">
                        <span className="font-bold font-mono text-sm text-zinc-950 tracking-tighter">
                          Rp {Number(log.price).toLocaleString('id-ID')}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        {log.evidence_url ? (
                          <a
                            href={log.evidence_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 bg-white border border-zinc-200 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all hover:bg-zinc-950 hover:text-white hover:border-zinc-950"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Nota
                          </a>
                        ) : (
                          <span className="text-[10px] font-bold italic text-zinc-300 uppercase tracking-widest">No Evidence</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}