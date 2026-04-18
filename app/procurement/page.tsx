import { supabase } from '@/lib/supabase';
import { ShoppingCart, Plus, FileText, ExternalLink, Calendar } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export const dynamic = 'force-dynamic';

type PurchaseLogRow = {
  id: string;
  date: string | number | Date;
  supplier: string | null;
  price: number | string;
  quantity: number | string;
  evidence_url: string | null;
  ingredients: { name: string; unit: string | null } | null;
};

export default async function ProcurementPage() {
  const { data: purchases, error } = await supabase
    .from('purchases')
    .select(`id, date, supplier, price, quantity, evidence_url, ingredients(name, unit)`)
    .returns<PurchaseLogRow[]>()
    .order('date', { ascending: false });

  const totalSpend = purchases?.reduce((s, p) => s + Number(p.price), 0) ?? 0;
  const totalTransaksi = purchases?.length ?? 0;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--gold)', fontFamily: 'DM Mono, monospace' }}>
            ◆ Pengadaan
          </p>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'DM Serif Display, serif' }}>
            Log Pembelian
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Catat semua pengadaan material dan pertahankan transparansi pengeluaran
          </p>
        </div>
        <Link href="/procurement/new" className="btn-primary">
          <Plus className="w-4 h-4" />
          Catat Pembelian
        </Link>
      </div>

      {/* Summary */}
      {!error && purchases && purchases.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Total Transaksi</p>
            <p className="text-2xl font-bold stat-number" style={{ color: 'var(--text-primary)' }}>{totalTransaksi}</p>
          </div>
          <div className="p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Total Pengeluaran</p>
            <p className="text-2xl font-bold stat-number" style={{ color: 'var(--gold)' }}>
              Rp {totalSpend.toLocaleString('id-ID')}
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Riwayat Pengadaan</p>
        </div>

        {error ? (
          <div className="p-8 text-center" style={{ color: 'var(--danger)' }}>Gagal memuat data: {error.message}</div>
        ) : !purchases || purchases.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <ShoppingCart className="w-7 h-7" style={{ color: 'var(--text-muted)' }} />
            </div>
            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)', fontFamily: 'DM Serif Display, serif' }}>
              Belum ada pembelian
            </h3>
            <p className="text-sm mb-6 max-w-sm" style={{ color: 'var(--text-secondary)' }}>
              Catat setiap pembelian material di sini. Sistem akan otomatis menghitung HPP rata-rata dan memperbarui stok.
            </p>
            <Link href="/procurement/new" className="btn-ghost text-sm">
              Catat Pertama
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap text-left text-sm">
              <thead>
                <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                  {['Tanggal', 'Bahan', 'Pemasok', 'Jumlah', 'Total Harga', 'Bukti'].map(h => (
                    <th key={h} className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {purchases.map((log, idx) => (
                  <tr
                    key={log.id}
                    className="table-row-hover transition-colors"
                    style={{ borderBottom: idx < purchases.length - 1 ? '1px solid var(--border)' : 'none' }}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                        <Calendar className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
                        <span className="text-sm">{format(new Date(log.date), 'dd MMM yyyy', { locale: id })}</span>
                      </div>
                      <p className="text-xs mt-0.5 ml-5.5" style={{ color: 'var(--text-muted)' }}>
                        {format(new Date(log.date), 'HH:mm')}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {log.ingredients?.name}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className="text-xs px-2.5 py-1 rounded-md"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                      >
                        {log.supplier ?? '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold stat-number" style={{ color: 'var(--text-primary)' }}>{log.quantity}</span>
                      <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>{log.ingredients?.unit}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold stat-number" style={{ color: 'var(--gold)' }}>
                        Rp {Number(log.price).toLocaleString('id-ID')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {log.evidence_url ? (
                        <a
                          href={log.evidence_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg transition-all"
                          style={{ background: 'var(--gold-muted)', color: 'var(--gold)', border: '1px solid rgba(212,170,60,0.2)' }}
                          title="Lihat Bukti"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </a>
                      ) : (
                        <span className="text-xs italic" style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}