import { supabase } from '@/lib/supabase';
import { PackagePlus, AlertTriangle, CheckCircle2, Pencil, Package } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function IngredientsPage() {
  const { data: ingredients, error } = await supabase
    .from('ingredients')
    .select('*')
    .order('name');

  const totalItems = ingredients?.length ?? 0;
  const lowStockItems = ingredients?.filter(i => Number(i.stock) <= Number(i.low_stock_threshold)) ?? [];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-2"
            style={{ color: 'var(--gold)', fontFamily: 'var(--font-mono)' }}
          >
            ◆ Inventori
          </p>
          <h1
            className="text-3xl font-bold"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-serif)' }}
          >
            Bahan Baku
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Kelola material dan pantau level stok secara real-time
          </p>
        </div>
        <Link href="/ingredients/new" className="btn-primary">
          <PackagePlus className="w-4 h-4" />
          Tambah Bahan
        </Link>
      </div>

      {/* Summary strip */}
      {!error && ingredients && ingredients.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Bahan', value: totalItems, color: 'var(--text-primary)' },
            { label: 'Stok Aman', value: totalItems - lowStockItems.length, color: 'var(--success)' },
            { label: 'Stok Menipis', value: lowStockItems.length, color: lowStockItems.length > 0 ? 'var(--danger)' : 'var(--text-secondary)' },
            { label: 'Kategori', value: new Set(ingredients.map(i => i.category)).size, color: 'var(--gold)' },
          ].map(s => (
            <div
              key={s.label}
              className="p-4 rounded-xl"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
              <p className="text-2xl font-bold stat-number" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        {/* Table header bar */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Daftar Bahan Baku
          </p>
          {lowStockItems.length > 0 && (
            <span className="badge badge-danger">
              <AlertTriangle className="w-3 h-3" />
              {lowStockItems.length} stok menipis
            </span>
          )}
        </div>

        {error ? (
          <div className="p-12 text-center flex flex-col items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--danger-dim)' }}
            >
              <AlertTriangle className="w-6 h-6" style={{ color: 'var(--danger)' }} />
            </div>
            <p className="font-medium" style={{ color: 'var(--danger)' }}>Gagal memuat data</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{error.message}</p>
          </div>
        ) : !ingredients || ingredients.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
            >
              <Package className="w-7 h-7" style={{ color: 'var(--text-muted)' }} />
            </div>
            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-serif)' }}>
              Belum ada bahan baku
            </h3>
            <p className="text-sm mb-6 max-w-sm" style={{ color: 'var(--text-secondary)' }}>
              Mulai dengan menambahkan bahan pertama Anda. Ini memungkinkan pelacakan stok dan perhitungan HPP resep.
            </p>
            <Link href="/ingredients/new" className="btn-ghost text-sm">
              Tambah Sekarang
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap text-left text-sm">
              <thead>
                <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                  {['Nama Bahan', 'Kategori', 'Level Stok', 'Harga Rata-rata', 'Status', ''].map(h => (
                    <th
                      key={h}
                      className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ingredients.map((item, idx) => {
                  const isLowStock = Number(item.stock) <= Number(item.low_stock_threshold);
                  return (
                    <tr
                      key={item.id}
                      className="table-row-hover transition-colors"
                      style={{ borderBottom: idx < ingredients.length - 1 ? '1px solid var(--border)' : 'none' }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0"
                            style={{
                              background: isLowStock ? 'var(--danger-dim)' : 'var(--gold-muted)',
                              color: isLowStock ? 'var(--danger)' : 'var(--gold)',
                            }}
                          >
                            {item.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                            {item.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="text-xs px-2.5 py-1 rounded-md font-medium"
                          style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                        >
                          {item.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-baseline gap-1">
                          <span
                            className="text-lg font-bold stat-number"
                            style={{ color: isLowStock ? 'var(--danger)' : 'var(--text-primary)' }}
                          >
                            {item.stock}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.unit}</span>
                        </div>
                        {/* Mini progress bar */}
                        <div
                          className="mt-1.5 h-1 rounded-full overflow-hidden w-24"
                          style={{ background: 'var(--bg-elevated)' }}
                        >
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, (Number(item.stock) / Math.max(Number(item.low_stock_threshold) * 3, 1)) * 100)}%`,
                              background: isLowStock ? 'var(--danger)' : 'var(--success)',
                            }}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>
                        {item.average_price > 0 ? (
                          <span className="stat-number text-sm">
                            Rp {Number(item.average_price).toLocaleString('id-ID')}
                            <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>/ {item.unit}</span>
                          </span>
                        ) : (
                          <span className="text-xs italic" style={{ color: 'var(--text-muted)' }}>Belum ada pembelian</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {isLowStock ? (
                          <span className="badge badge-danger">
                            <AlertTriangle className="w-3 h-3" />
                            Stok Menipis
                          </span>
                        ) : (
                          <span className="badge badge-success">
                            <CheckCircle2 className="w-3 h-3" />
                            Aman
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/ingredients/${item.id}`}
                          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg item-interactive"
                        >
                          <Pencil className="w-3 h-3" />
                          Edit
                        </Link>
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