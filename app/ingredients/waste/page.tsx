'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import { logWaste, getWasteLogs, getWasteStats } from './actions';
import { WASTE_CATEGORY_LABELS, type WasteCategory } from './constant';
import { Trash2, AlertTriangle, Plus, History, Loader2, XCircle, Archive, TrendingDown, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

const CATEGORY_OPTIONS: { value: WasteCategory; label: string }[] = [
  { value: 'expired', label: 'Kadaluarsa' },
  { value: 'spoiled', label: 'Busuk / Rusak' },
  { value: 'contaminated', label: 'Terkontaminasi' },
  { value: 'overcooked', label: 'Gosong / Salah Masak' },
  { value: 'spilled', label: 'Tumpah' },
  { value: 'other', label: 'Lainnya' },
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
      const { data } = await supabase.from('ingredients').select('id, name, unit, stock').order('name');
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
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data } = await supabase.from('ingredients').select('id, name, unit, stock').order('name');
      setIngredients(data || []);
      fetchAll();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Gagal mencatat waste.', 'error');
    } finally { setSubmitting(false); }
  };

  const topCategory = Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-7xl mx-auto animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 pb-5">
        <div className="flex items-center gap-3 sm:gap-5">
          <div className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center shadow-inner sm:w-14 sm:h-14 sm:rounded-[1.5rem]">
            <Trash2 className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-0.5 font-mono">◆ Manajemen Inventori</p>
            <h1 className="text-xl font-bold font-serif tracking-tight text-zinc-950 sm:text-2xl">Laporan Waste</h1>
            <p className="text-[10px] text-zinc-500 mt-0.5 hidden sm:block">Catat bahan rusak, kadaluarsa, atau tidak layak pakai</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-zinc-950 text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-950/20"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Catat Waste</span>
          <span className="sm:hidden">Catat</span>
        </button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="bg-white border border-zinc-200 rounded-2xl p-4 space-y-2 sm:p-5">
          <div className="flex items-center gap-2 text-zinc-400">
            <Archive className="w-4 h-4" />
            <p className="text-[9px] font-bold uppercase tracking-widest">Bulan Ini</p>
          </div>
          <p className="text-3xl font-bold font-serif italic text-zinc-950">{stats.totalEvents}</p>
        </div>

        <div className="bg-zinc-950 text-white rounded-2xl p-4 space-y-2 shadow-xl shadow-zinc-950/20 sm:p-5">
          <div className="flex items-center gap-2 text-zinc-400">
            <TrendingDown className="w-4 h-4" />
            <p className="text-[9px] font-bold uppercase tracking-widest">Est. Rugi</p>
          </div>
          <p className="text-xl font-bold font-mono tracking-tighter sm:text-2xl">
            Rp {Math.round(stats.totalLoss).toLocaleString('id-ID')}
          </p>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl p-4 space-y-2 col-span-2 sm:col-span-1 sm:p-5">
          <div className="flex items-center gap-2 text-zinc-400">
            <Tag className="w-4 h-4" />
            <p className="text-[9px] font-bold uppercase tracking-widest">Terbanyak</p>
          </div>
          <p className="text-base font-bold text-zinc-950">
            {topCategory ? WASTE_CATEGORY_LABELS[topCategory[0] as WasteCategory] ?? topCategory[0] : '—'}
          </p>
          {topCategory && <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">{topCategory[1]} kejadian</p>}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-4 py-4 flex items-center gap-2.5 border-b border-zinc-100 bg-zinc-50/30 sm:px-6">
          <History className="w-3.5 h-3.5 text-zinc-400" />
          <p className="text-xs font-bold text-zinc-950">Riwayat Bulan Ini</p>
        </div>

        {/* Mobile cards */}
        <div className="block sm:hidden p-4 space-y-2.5">
          {loading ? (
            <div className="py-12 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-zinc-200" /></div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-[9px] font-bold uppercase text-zinc-300">Tidak ada catatan waste</div>
          ) : logs.map((log) => (
            <div key={log.id} className="bg-zinc-50/50 rounded-xl border border-zinc-100 p-3.5 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold text-xs text-zinc-950">{log.ingredients?.name}</p>
                <span className="bg-red-50 text-red-500 px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-widest shrink-0">
                  -{log.quantity} {log.ingredients?.unit}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-lg bg-zinc-100 text-zinc-600 text-[9px] font-bold uppercase tracking-wider">
                  {WASTE_CATEGORY_LABELS[log.category as WasteCategory] ?? log.category ?? '—'}
                </span>
                <span className="text-[9px] font-bold uppercase text-zinc-400">{format(new Date(log.created_at), 'dd MMM, HH:mm', { locale: id })}</span>
              </div>
              {log.reason && <p className="text-[10px] text-zinc-500 truncate">{log.reason}</p>}
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/50 border-b border-zinc-100">
                {['Bahan Baku', 'Jumlah', 'Kategori', 'Keterangan', 'Tanggal'].map((h) => (
                  <th key={h} className="px-5 py-4 text-[9px] font-bold uppercase tracking-widest text-zinc-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {loading ? (
                <tr><td colSpan={5} className="py-16 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-zinc-200" /></td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} className="py-16 text-center text-[9px] font-bold uppercase text-zinc-300">Tidak ada catatan waste bulan ini</td></tr>
              ) : logs.map((log) => (
                <tr key={log.id} className="hover:bg-zinc-50/50 transition-colors">
                  <td className="px-5 py-4 font-bold text-xs text-zinc-950">{log.ingredients?.name}</td>
                  <td className="px-5 py-4">
                    <span className="bg-red-50 text-red-500 px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest">
                      -{log.quantity} {log.ingredients?.unit}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-600 text-[9px] font-bold uppercase tracking-wider">
                      {WASTE_CATEGORY_LABELS[log.category as WasteCategory] ?? log.category ?? '—'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs text-zinc-500 max-w-[160px] truncate">{log.reason}</td>
                  <td className="px-5 py-4 text-[9px] font-bold uppercase text-zinc-400">{format(new Date(log.created_at), 'dd MMM, HH:mm', { locale: id })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/40 backdrop-blur-md p-0 animate-in fade-in duration-300 sm:items-center sm:p-6">
          <div className="bg-white w-full max-w-lg rounded-t-[2rem] p-6 shadow-2xl border border-zinc-100 space-y-5 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300 sm:rounded-[2.5rem] sm:p-8">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-serif font-bold italic">Catat Bahan Waste</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-zinc-50 rounded-full">
                <XCircle className="w-5 h-5 text-zinc-300" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Bahan Baku <span className="text-red-500">*</span></label>
                <select name="ingredient_id" required
                  className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3 text-xs font-semibold focus:border-zinc-950 outline-none appearance-none">
                  <option value="">Pilih Bahan...</option>
                  {ingredients.map((ing) => (
                    <option key={ing.id} value={ing.id}>{ing.name} — Stok: {ing.stock} {ing.unit}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Kategori <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 gap-1.5">
                  {CATEGORY_OPTIONS.map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 p-2.5 rounded-xl border border-zinc-100 bg-zinc-50 cursor-pointer hover:border-zinc-950 has-[:checked]:border-zinc-950 has-[:checked]:bg-zinc-950 has-[:checked]:text-white transition-all">
                      <input type="radio" name="category" value={opt.value} className="sr-only" required />
                      <span className="text-[9px] font-bold uppercase tracking-wider">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Jumlah <span className="text-red-500">*</span></label>
                <input name="quantity" type="number" step="0.01" min="0.01" required placeholder="0.00"
                  className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3 text-xs font-semibold focus:border-zinc-950 outline-none" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Keterangan <span className="text-red-500">*</span></label>
                <textarea name="reason" required placeholder="Jelaskan alasan waste..."
                  className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3 text-xs font-semibold focus:border-zinc-950 outline-none min-h-[80px] resize-none" />
              </div>

              <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-100 rounded-xl">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[9px] text-amber-700 font-medium leading-relaxed">Pencatatan waste akan langsung mengurangi stok.</p>
              </div>

              <button type="submit" disabled={submitting}
                className="w-full py-4 bg-red-500 text-white rounded-2xl font-bold text-[10px] tracking-[0.2em] uppercase hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Catat Pembuangan'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}