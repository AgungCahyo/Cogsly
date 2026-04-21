import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { PackagePlus, AlertTriangle, Pencil, Package } from 'lucide-react';
import Link from 'next/link';
import { ErrorBoundary, TableSkeleton } from '@/components/ui/ErrorBoundary';
import { CsvImportButton } from '@/components/ingredients/CsvImportButton';
import { Ingredient } from '@/types';

export const dynamic = 'force-dynamic';

async function IngredientTable() {
  const supabase = await createClient();
  const { data: ingredients, error } = await supabase
    .from('ingredients')
    .select('*')
    .returns<Ingredient[]>()
    .order('name');

  if (error) throw new Error(error.message);

  const totalItems = ingredients?.length ?? 0;
  const lowStockItems = ingredients?.filter(
    (i) => Number(i.stock) <= Number(i.low_stock_threshold)
  ) ?? [];

  if (!ingredients || ingredients.length === 0) {
    return (
      <div className="p-10 flex flex-col items-center justify-center text-center">
        <div className="w-14 h-14 rounded-3xl bg-zinc-50 border border-zinc-100 flex items-center justify-center mb-4 shadow-inner">
          <Package className="w-7 h-7 text-zinc-300" />
        </div>
        <h3 className="text-base font-bold text-zinc-950 mb-1.5 font-serif">Belum ada bahan baku</h3>
        <p className="text-xs text-zinc-500 max-w-xs mb-6 leading-relaxed font-medium">
          Mulai dengan menambahkan bahan pertama Anda.
        </p>
        <Link
          href="/ingredients/new"
          className="bg-zinc-950 text-white px-6 py-2.5 rounded-2xl font-bold text-xs transition-all hover:bg-zinc-800"
        >
          Tambah Bahan
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-3 px-4 pt-4 sm:grid-cols-4 sm:px-6">
        {[
          { label: 'Total Bahan', value: totalItems },
          { label: 'Stok Aman', value: totalItems - lowStockItems.length },
          { label: 'Stok Menipis', value: lowStockItems.length, isDanger: lowStockItems.length > 0 },
          { label: 'Kategori', value: new Set(ingredients.map((i) => i.category)).size },
        ].map((s) => (
          <div key={s.label} className="px-3 py-3 bg-zinc-50/50 border border-zinc-100 rounded-xl">
            <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-0.5">{s.label}</p>
            <p className="text-2xl font-bold font-mono tracking-tighter text-zinc-950">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Low stock banner */}
      {lowStockItems.length > 0 && (
        <div className="mx-4 mt-3 flex items-center gap-2.5 px-4 py-2.5 bg-zinc-950 text-white rounded-xl text-xs font-bold sm:mx-6">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span className="text-[10px]">
            {lowStockItems.length} bahan perlu restock:{' '}
            {lowStockItems.slice(0, 2).map((i) => i.name).join(', ')}
            {lowStockItems.length > 2 && ` +${lowStockItems.length - 2}`}
          </span>
        </div>
      )}

      {/* Mobile card list */}
      <div className="block sm:hidden p-4 space-y-2.5">
        {ingredients.map((item) => {
          const isLowStock = Number(item.stock) <= Number(item.low_stock_threshold);
          return (
            <div key={item.id} className={cn(
              'bg-white rounded-2xl border p-4 flex items-center gap-3',
              isLowStock ? 'border-zinc-950 ring-1 ring-zinc-950' : 'border-zinc-100'
            )}>
              <div className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ring-1 shrink-0',
                isLowStock ? 'bg-zinc-950 text-white ring-zinc-950' : 'bg-zinc-100 text-zinc-400 ring-zinc-200'
              )}>
                {item.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-bold text-xs text-zinc-950 truncate">{item.name}</p>
                  {isLowStock && (
                    <span className="text-[8px] font-bold uppercase tracking-wider text-zinc-950 bg-zinc-100 px-1.5 py-0.5 rounded shrink-0">Low</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-zinc-50 border border-zinc-200 text-zinc-600 uppercase tracking-wider">{item.category}</span>
                  <span className="text-xs font-bold font-mono text-zinc-950">{item.stock} <span className="text-[9px] font-bold text-zinc-400 uppercase">{item.unit}</span></span>
                </div>
              </div>
              <Link
                href={`/ingredients/${item.id}`}
                className="shrink-0 p-2 bg-zinc-50 border border-zinc-200 rounded-xl hover:bg-zinc-950 hover:text-white hover:border-zinc-950 transition-all"
              >
                <Pencil className="w-3 h-3" />
              </Link>
            </div>
          );
        })}
      </div>

      {/* Desktop Table */}
      <div className="hidden sm:block overflow-x-auto mt-3">
        <table className="w-full whitespace-nowrap text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50/50 border-b border-zinc-100">
              {['Bahan Baku', 'Kategori', 'Level Stok', 'Harga Rata-rata', ''].map((h) => (
                <th key={h} className="px-5 py-4 text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {ingredients.map((item) => {
              const isLowStock = Number(item.stock) <= Number(item.low_stock_threshold);
              return (
                <tr key={item.id} className="group hover:bg-zinc-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ring-1 transition-all',
                        isLowStock ? 'bg-zinc-950 text-white ring-zinc-950' : 'bg-zinc-100 text-zinc-400 ring-zinc-200 group-hover:bg-zinc-950 group-hover:text-white group-hover:ring-zinc-950'
                      )}>
                        {item.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-xs text-zinc-950">{item.name}</p>
                        {isLowStock ? (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-950 bg-zinc-100 px-1.5 py-0.5 rounded">Low Stock</span>
                        ) : (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-300">Safe</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-[9px] font-bold px-2 py-1 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-600 uppercase tracking-wider">{item.category}</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-base font-bold font-mono tracking-tighter text-zinc-950">{item.stock}</span>
                      <span className="text-[9px] font-bold uppercase text-zinc-400 tracking-widest">{item.unit}</span>
                    </div>
                    <div className="mt-1.5 h-1 bg-zinc-100 rounded-full w-20 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-700 ${isLowStock ? 'bg-zinc-950' : 'bg-zinc-300'}`}
                        style={{ width: `${Math.min(100, (Number(item.stock) / Math.max(Number(item.low_stock_threshold) * 2.5, 1)) * 100)}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {Number(item.average_price) > 0 ? (
                      <div className="font-mono text-xs font-bold text-zinc-950 tracking-tighter">
                        Rp {Number(item.average_price).toLocaleString('id-ID')}
                        <span className="text-[9px] ml-1 text-zinc-400 font-sans tracking-normal uppercase">/ {item.unit}</span>
                      </div>
                    ) : (
                      <span className="text-[9px] font-bold italic text-zinc-300 uppercase tracking-widest">No Data</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/ingredients/${item.id}`}
                      className="inline-flex items-center gap-1.5 bg-white border border-zinc-200 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:bg-zinc-950 hover:text-white hover:border-zinc-950"
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
    </>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

export default function IngredientsPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-zinc-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-1 font-mono">◆ Inventori</p>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 font-serif sm:text-3xl">Bahan Baku</h1>
          <p className="text-xs mt-1 text-zinc-500 font-medium">Kelola material dan pantau level stok</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <CsvImportButton />
          <Link
            href="/ingredients/new"
            className="inline-flex items-center gap-2 bg-zinc-950 text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-all hover:bg-zinc-800"
          >
            <PackagePlus className="w-3.5 h-3.5" />
            <span>Tambah Bahan</span>
          </Link>
          <Link
            href="/ingredients/waste"
            className="inline-flex items-center gap-2 bg-white border border-zinc-200 text-zinc-950 px-4 py-2.5 rounded-xl font-bold text-xs transition-all hover:bg-zinc-50"
          >
            <PackagePlus className="w-3.5 h-3.5 text-zinc-500" />
            <span>Waste</span>
          </Link>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm shadow-zinc-950/5">
        <div className="px-4 py-4 border-b border-zinc-100 bg-zinc-50/30 sm:px-6">
          <p className="text-xs font-bold text-zinc-950 tracking-tight">Daftar Bahan Baku</p>
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