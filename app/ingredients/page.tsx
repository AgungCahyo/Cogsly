import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { PackagePlus, AlertTriangle, Pencil, Package } from 'lucide-react';
import Link from 'next/link';
import { ErrorBoundary, TableSkeleton } from '@/components/ui/ErrorBoundary';
import { Ingredient } from '@/types';

export const dynamic = 'force-dynamic';

// ─── Async data component — isolated so errors don't crash the whole page ────
async function IngredientTable() {
  const supabase = await createClient();
  const { data: ingredients, error } = await supabase
    .from('ingredients')
    .select('*')
    .returns<Ingredient[]>()
    .order('name');

  if (error) {
    throw new Error(error.message);
  }

  const totalItems = ingredients?.length ?? 0;
  const lowStockItems = ingredients?.filter(
    (i) => Number(i.stock) <= Number(i.low_stock_threshold)
  ) ?? [];

  if (!ingredients || ingredients.length === 0) {
    return (
      <div className="p-20 flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 rounded-[2.5rem] bg-zinc-50 border border-zinc-100 flex items-center justify-center mb-6 shadow-inner">
          <Package className="w-10 h-10 text-zinc-300" />
        </div>
        <h3 className="text-xl font-bold text-zinc-950 mb-2 font-serif">Belum ada bahan baku</h3>
        <p className="text-sm text-zinc-500 max-w-sm mb-8 leading-relaxed font-medium">
          Mulai dengan menambahkan bahan pertama Anda untuk pelacakan stok dan perhitungan HPP.
        </p>
        <Link
          href="/ingredients/new"
          className="bg-zinc-950 text-white px-8 py-3.5 rounded-2xl font-bold text-sm transition-all hover:bg-zinc-800"
        >
          Tambah Bahan Sekarang
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Summary strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-8 pt-8">
        {[
          { label: 'Total Bahan', value: totalItems },
          { label: 'Stok Aman', value: totalItems - lowStockItems.length },
          {
            label: 'Stok Menipis',
            value: lowStockItems.length,
            isDanger: lowStockItems.length > 0,
          },
          { label: 'Kategori', value: new Set(ingredients.map((i) => i.category)).size },
        ].map((s) => (
          <div
            key={s.label}
            className="px-6 py-5 bg-zinc-50/50 border border-zinc-100 rounded-2xl"
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
              {s.label}
            </p>
            <p className="text-3xl font-bold font-mono tracking-tighter text-zinc-950">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Low stock banner */}
      {lowStockItems.length > 0 && (
        <div className="mx-8 mt-4 flex items-center gap-3 px-5 py-3 bg-zinc-950 text-white rounded-2xl text-xs font-bold">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            {lowStockItems.length} bahan perlu restock:{' '}
            {lowStockItems
              .slice(0, 3)
              .map((i) => i.name)
              .join(', ')}
            {lowStockItems.length > 3 && ` +${lowStockItems.length - 3} lainnya`}
          </span>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto mt-4">
        <table className="w-full whitespace-nowrap text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50/50 border-b border-zinc-100">
              {['Bahan Baku', 'Kategori', 'Level Stok', 'Harga Rata-rata', ''].map((h) => (
                <th
                  key={h}
                  className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {ingredients.map((item) => {
              const isLowStock =
                Number(item.stock) <= Number(item.low_stock_threshold);
              return (
                <tr
                  key={item.id}
                  className="group hover:bg-zinc-50/50 transition-colors"
                >
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ring-1 transition-all ${
                          isLowStock
                            ? 'bg-zinc-950 text-white ring-zinc-950'
                            : 'bg-zinc-100 text-zinc-400 ring-zinc-200 group-hover:bg-zinc-950 group-hover:text-white group-hover:ring-zinc-950'
                        }`}
                      >
                        {item.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-zinc-950">{item.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {isLowStock ? (
                            <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-950 bg-zinc-100 px-1.5 py-0.5 rounded">
                              Low Stock
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-300">
                              Safe
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-600 uppercase tracking-wider">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-bold font-mono tracking-tighter text-zinc-950">
                        {item.stock}
                      </span>
                      <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">
                        {item.unit}
                      </span>
                    </div>
                    <div className="mt-2 h-1 bg-zinc-100 rounded-full w-28 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-700 ${
                          isLowStock ? 'bg-zinc-950' : 'bg-zinc-300'
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            (Number(item.stock) /
                              Math.max(Number(item.low_stock_threshold) * 2.5, 1)) *
                              100
                          )}%`,
                        }}
                      />
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    {Number(item.average_price) > 0 ? (
                      <div className="font-mono text-sm font-bold text-zinc-950 tracking-tighter">
                        Rp {Number(item.average_price).toLocaleString('id-ID')}
                        <span className="text-[10px] ml-1.5 text-zinc-400 font-sans tracking-normal uppercase">
                          / {item.unit}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[10px] font-bold italic text-zinc-300 uppercase tracking-widest">
                        No Data
                      </span>
                    )}
                  </td>
                  <td className="px-8 py-6 text-right">
                    <Link
                      href={`/ingredients/${item.id}`}
                      className="inline-flex items-center gap-2 bg-white border border-zinc-200 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:bg-zinc-950 hover:text-white hover:border-zinc-950"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ─── Page Shell ───────────────────────────────────────────────────────────────
export default function IngredientsPage() {
  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-end sm:items-center justify-between gap-6 border-b border-zinc-200 pb-8">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-2 font-mono">
            ◆ Inventori
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-zinc-950 font-serif">
            Bahan Baku
          </h1>
          <p className="text-sm mt-1.5 text-zinc-500 font-medium tracking-tight">
            Kelola material dan pantau level stok secara real-time
          </p>
        </div>
        <div className='flex gap-8'>

        <Link
          href="/ingredients/new"
          className="inline-flex items-center gap-2.5 bg-zinc-950 text-white px-6 py-3 rounded-2xl font-bold text-sm transition-all hover:bg-zinc-800 hover:shadow-xl hover:shadow-zinc-950/10"
          >
          <PackagePlus className="w-4 h-4" />
          Tambah Bahan
        </Link>
        <Link
          href="/ingredients/waste"
          className="inline-flex items-center gap-2.5 bg-zinc-950 text-white px-6 py-3 rounded-2xl font-bold text-sm transition-all hover:bg-zinc-800 hover:shadow-xl hover:shadow-zinc-950/10"
          >
          <PackagePlus className="w-4 h-4" />
          Laporan Waste
        </Link>
          </div>
      </div>

      {/* Table — isolated with Suspense + ErrorBoundary */}
      <div className="bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-sm shadow-zinc-950/5">
        <div className="px-8 py-6 border-b border-zinc-100 bg-zinc-50/30">
          <p className="text-sm font-bold text-zinc-950 tracking-tight">Daftar Bahan Baku</p>
        </div>

        <ErrorBoundary>
          <Suspense fallback={<TableSkeleton rows={6} cols={5} />}>
            <IngredientTable />
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  );
}