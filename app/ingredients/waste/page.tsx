'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import { logWaste, getWasteLogs } from './actions';
import { 
  Trash2, AlertTriangle, List, Plus, 
  History, Loader2, Package, XCircle,
  Archive
} from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export default function WastePage() {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const data = await getWasteLogs();
    setLogs(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    const fetchIngredients = async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data } = await supabase.from('ingredients').select('id, name, unit, stock').order('name');
      setIngredients(data || []);
    };
    fetchIngredients();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    try {
      await logWaste(formData);
      setShowModal(false);
      fetchAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mencatat waste.';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-10 space-y-10 max-w-7xl mx-auto animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-[2rem] flex items-center justify-center shadow-inner">
            <Trash2 className="w-8 h-8" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-400 mb-1 font-mono">◆ Manajemen Inventori</p>
            <h1 className="text-4xl font-bold font-serif tracking-tight text-zinc-950">Laporan Waste / Rusak</h1>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-3 px-8 py-4 bg-zinc-950 text-white rounded-[1.5rem] font-bold text-xs uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-950/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/25 focus-visible:ring-offset-2"
        >
          <Plus className="w-5 h-5" />
          Catat Waste
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left Column: Recent Logs */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <History className="w-4 h-4 text-zinc-400" />
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Riwayat Terakhir</h2>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-zinc-100 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50/50 border-b border-zinc-100">
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Bahan Baku</th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Jumlah</th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Alasan</th>
                  <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Tanggal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {loading ? (
                  <tr><td colSpan={4} className="py-20 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-zinc-200" /></td></tr>
                ) : logs.length === 0 ? (
                  <tr><td colSpan={4} className="py-20 text-center text-[10px] font-bold uppercase text-zinc-300">Belum ada catatan waste</td></tr>
                ) : logs.map((log) => (
                  <tr key={log.id} className="group hover:bg-zinc-50 transition-colors">
                    <td className="px-8 py-6 font-bold text-zinc-950">{log.ingredients?.name}</td>
                    <td className="px-8 py-6">
                      <span className="bg-red-50 text-red-500 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest">
                        -{log.quantity} {log.ingredients?.unit}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-sm text-zinc-500">{log.reason}</td>
                    <td className="px-8 py-6 text-[10px] font-bold uppercase text-zinc-400">
                      {format(new Date(log.created_at), 'dd MMM, HH:mm', { locale: id })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Alerts/Summary */}
        <div className="space-y-8">
           <div className="bg-amber-50 rounded-[2.5rem] p-8 space-y-4 border border-amber-100">
              <div className="flex items-center gap-3 text-amber-600">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="font-bold text-lg">Peringatan Waste</h3>
              </div>
              <p className="text-sm text-amber-700 leading-relaxed font-medium">
                Pencatatan waste akan langsung mengurangi stok di sistem. Gunakan modul ini hanya untuk pembuangan riil agar HPP tidak bias.
              </p>
           </div>
           
           <div className="bg-zinc-950 rounded-[2.5rem] p-10 text-white space-y-6 shadow-2xl shadow-zinc-950/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-10 opacity-10"><Archive className="w-24 h-24" /></div>
              <div className="relative z-10">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Total Kejadian</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold font-serif italic">{logs.length}</span>
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Bulan Ini</span>
                </div>
              </div>
           </div>
        </div>
      </div>

      {/* Modal Catat Waste */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 backdrop-blur-md p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[3rem] p-10 shadow-2xl border border-zinc-100 space-y-8 animate-in zoom-in-95 duration-500">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-serif font-bold italic">Catat Bahan Rusak</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-zinc-50 rounded-full"><XCircle className="w-6 h-6 text-zinc-300" /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Pilih Bahan Baku</label>
                <select name="ingredient_id" required className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-5 py-3.5 text-sm font-semibold focus:border-zinc-950 outline-none appearance-none">
                  <option value="">Pilih Bahan...</option>
                  {ingredients.map(ing => (
                    <option key={ing.id} value={ing.id}>{ing.name} (Stok: {ing.stock} {ing.unit})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Jumlah Terbuang</label>
                <input name="quantity" type="number" step="0.01" required placeholder="0.00" className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-5 py-3.5 text-sm font-semibold focus:border-zinc-950 outline-none" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Alasan</label>
                <textarea name="reason" required placeholder="cth. Busuk, tumpah, expired..." className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-5 py-3.5 text-sm font-semibold focus:border-zinc-950 outline-none min-h-[100px]" />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-5 bg-red-500 text-white rounded-3xl font-bold text-xs tracking-[0.2em] uppercase hover:bg-red-600 transition-all shadow-xl shadow-red-500/20 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Catat Pembuangan'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
