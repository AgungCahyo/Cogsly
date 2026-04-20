'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import {
  logWaste, getWasteLogs, getWasteStats,
} from './actions';
import { WASTE_CATEGORY_LABELS, type WasteCategory } from './constant';
import {
  Trash2, AlertTriangle, Plus, History,
  Loader2, XCircle, Archive, TrendingDown, Tag
} from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

const CATEGORY_OPTIONS: { value: WasteCategory; label: string }[] = [
  { value: 'expired',      label: 'Kadaluarsa' },
  { value: 'spoiled',      label: 'Busuk / Rusak' },
  { value: 'contaminated', label: 'Terkontaminasi' },
  { value: 'overcooked',   label: 'Gosong / Salah Masak' },
  { value: 'spilled',      label: 'Tumpah' },
  { value: 'other',        label: 'Lainnya' },
];

export default function WastePage() {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalEvents: 0, totalLoss: 0, byCategory: {} as Record<string, number> });
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const [logsData, statsData] = await Promise.all([getWasteLogs(), getWasteStats()]);
    setLogs(logsData);
    setStats(statsData);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    (async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data } = await supabase
        .from('ingredients')
        .select('id, name, unit, stock')
        .order('name');
      setIngredients(data || []);
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    try {
      await logWaste(formData);
      showToast('Waste berhasil dicatat.', 'success');
      setShowModal(false);
      // Re-fetch ingredients to get updated stock
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data } = await supabase.from('ingredients').select('id, name, unit, stock').order('name');
      setIngredients(data || []);
      fetchAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mencatat waste.';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const topCategory = Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="p-10 space-y-10 max-w-7xl mx-auto animate-in fade-in duration-700">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 pb-8">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-[2rem] flex items-center justify-center shadow-inner">
            <Trash2 className="w-8 h-8" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-1 font-mono">
              ◆ Manajemen Inventori
            </p>
            <h1 className="text-4xl font-bold font-serif tracking-tight text-zinc-950">
              Laporan Waste & Kerusakan
            </h1>
            <p className="text-sm text-zinc-500 mt-1 font-medium">
              Catat bahan rusak, kadaluarsa, atau tidak layak pakai
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-3 px-8 py-4 bg-zinc-950 text-white rounded-[1.5rem] font-bold text-xs uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-950/20"
        >
          <Plus className="w-5 h-5" />
          Catat Waste
        </button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white border border-zinc-200 rounded-3xl p-7 space-y-3">
          <div className="flex items-center gap-3 text-zinc-400">
            <Archive className="w-5 h-5" />
            <p className="text-[10px] font-bold uppercase tracking-widest">Kejadian Bulan Ini</p>
          </div>
          <p className="text-4xl font-bold font-serif italic text-zinc-950">{stats.totalEvents}</p>
        </div>

        <div className="bg-zinc-950 text-white rounded-3xl p-7 space-y-3 shadow-xl shadow-zinc-950/20">
          <div className="flex items-center gap-3 text-zinc-400">
            <TrendingDown className="w-5 h-5" />
            <p className="text-[10px] font-bold uppercase tracking-widest">Estimasi Kerugian</p>
          </div>
          <p className="text-4xl font-bold font-mono tracking-tighter">
            Rp {Math.round(stats.totalLoss).toLocaleString('id-ID')}
          </p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
            Berdasarkan avg. price bahan
          </p>
        </div>

        <div className="bg-white border border-zinc-200 rounded-3xl p-7 space-y-3">
          <div className="flex items-center gap-3 text-zinc-400">
            <Tag className="w-5 h-5" />
            <p className="text-[10px] font-bold uppercase tracking-widest">Kategori Terbanyak</p>
          </div>
          <p className="text-2xl font-bold text-zinc-950">
            {topCategory
              ? WASTE_CATEGORY_LABELS[topCategory[0] as WasteCategory] ?? topCategory[0]
              : '—'}
          </p>
          {topCategory && (
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
              {topCategory[1]} kejadian
            </p>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="px-8 py-6 flex items-center gap-3 border-b border-zinc-100 bg-zinc-50/30">
          <History className="w-4 h-4 text-zinc-400" />
          <p className="text-sm font-bold text-zinc-950">Riwayat Bulan Ini</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/50 border-b border-zinc-100">
                {['Bahan Baku', 'Jumlah', 'Kategori', 'Keterangan', 'Tanggal'].map((h) => (
                  <th key={h} className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-zinc-200" />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-[10px] font-bold uppercase text-zinc-300">
                    Tidak ada catatan waste bulan ini
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-8 py-5 font-bold text-sm text-zinc-950">
                      {log.ingredients?.name}
                    </td>
                    <td className="px-8 py-5">
                      <span className="bg-red-50 text-red-500 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest">
                        -{log.quantity} {log.ingredients?.unit}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <span className="px-3 py-1 rounded-lg bg-zinc-100 text-zinc-600 text-[10px] font-bold uppercase tracking-wider">
                        {WASTE_CATEGORY_LABELS[log.category as WasteCategory] ?? log.category ?? '—'}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-sm text-zinc-500 max-w-[200px] truncate">
                      {log.reason}
                    </td>
                    <td className="px-8 py-5 text-[10px] font-bold uppercase text-zinc-400">
                      {format(new Date(log.created_at), 'dd MMM, HH:mm', { locale: id })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 backdrop-blur-md p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[3rem] p-10 shadow-2xl border border-zinc-100 space-y-8 animate-in zoom-in-95 duration-500 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-serif font-bold italic">Catat Bahan Rusak / Waste</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-zinc-50 rounded-full"
              >
                <XCircle className="w-6 h-6 text-zinc-300" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Ingredient */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">
                  Pilih Bahan Baku <span className="text-red-500">*</span>
                </label>
                <select
                  name="ingredient_id"
                  required
                  className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-5 py-3.5 text-sm font-semibold focus:border-zinc-950 outline-none appearance-none"
                >
                  <option value="">Pilih Bahan...</option>
                  {ingredients.map((ing) => (
                    <option key={ing.id} value={ing.id}>
                      {ing.name} — Stok: {ing.stock} {ing.unit}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">
                  Kategori Kerusakan <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORY_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className="flex items-center gap-3 p-3 rounded-2xl border border-zinc-100 bg-zinc-50 cursor-pointer hover:border-zinc-950 has-[:checked]:border-zinc-950 has-[:checked]:bg-zinc-950 has-[:checked]:text-white transition-all"
                    >
                      <input
                        type="radio"
                        name="category"
                        value={opt.value}
                        className="sr-only"
                        required
                      />
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        {opt.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Quantity */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">
                  Jumlah Terbuang <span className="text-red-500">*</span>
                </label>
                <input
                  name="quantity"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-5 py-3.5 text-sm font-semibold focus:border-zinc-950 outline-none"
                />
              </div>

              {/* Reason / detail */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">
                  Keterangan Detail <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="reason"
                  required
                  placeholder="cth. Ditemukan jamur saat persiapan shift pagi, susu dari batch 14 Apr sudah berubah bau..."
                  className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-5 py-3.5 text-sm font-semibold focus:border-zinc-950 outline-none min-h-[100px] resize-none"
                />
              </div>

              {/* Warning */}
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
                  Pencatatan waste akan langsung mengurangi stok. Pastikan jumlah yang dimasukkan sudah benar sebelum submit.
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-5 bg-red-500 text-white rounded-3xl font-bold text-xs tracking-[0.2em] uppercase hover:bg-red-600 transition-all shadow-xl shadow-red-500/20 disabled:opacity-50"
              >
                {submitting
                  ? <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                  : 'Catat Pembuangan'
                }
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}