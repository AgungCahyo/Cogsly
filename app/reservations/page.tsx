'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import { getReservations, createReservation, updateReservationStatus } from './actions';
import { Calendar, Clock, User, Phone, Plus, XCircle, Loader2, LayoutGrid } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export default function ReservationsPage() {
  const { showToast } = useToast();
  const [reservations, setReservations] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const res = await getReservations();
    setReservations(res);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    const fetchTables = async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data } = await supabase.from('tables').select('*').order('name');
      setTables(data || []);
    };
    fetchTables();
  }, []);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    try {
      await createReservation(formData);
      setShowModal(false);
      fetchAll();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Gagal menyimpan.', 'error');
    } finally { setSubmitting(false); }
  };

  const handleStatus = async (id: string, status: string, tableId?: string) => {
    await updateReservationStatus(id, status, tableId);
    fetchAll();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-7xl mx-auto animate-in fade-in duration-700">
      <div className="flex items-center justify-between border-b border-zinc-200 pb-5">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-0.5 font-mono">◆ Booking Meja</p>
          <h1 className="text-xl font-bold font-serif tracking-tight text-zinc-950 sm:text-2xl">Manajemen Reservasi</h1>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-zinc-950 text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-950/20"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Tambah Reservasi</span>
          <span className="sm:hidden">Tambah</span>
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-zinc-200" /></div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
          {reservations.map((res) => (
            <div key={res.id} className={`group bg-white p-5 rounded-2xl border transition-all duration-300 ${res.status === 'pending' ? 'border-zinc-100 hover:border-zinc-950 hover:shadow-xl' : 'opacity-60 border-zinc-50'}`}>
              <div className="flex justify-between items-start mb-4">
                <div className="w-11 h-11 bg-zinc-50 rounded-xl flex items-center justify-center text-zinc-300 group-hover:bg-zinc-950 group-hover:text-white transition-all">
                  <User className="w-5 h-5" />
                </div>
                <div className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest ${res.status === 'pending' ? 'bg-amber-100 text-amber-700' : res.status === 'checked_in' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {res.status}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <h3 className="text-base font-bold text-zinc-950 tracking-tight">{res.customer_name}</h3>
                  <div className="flex items-center gap-1.5 text-zinc-400 mt-0.5">
                    <Phone className="w-3 h-3" />
                    <span className="text-[9px] font-bold uppercase tracking-widest">{res.phone_number || '-'}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-50 grid grid-cols-2 gap-3">
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest">Waktu</p>
                    <div className="flex items-center gap-1.5 text-zinc-950">
                      <Clock className="w-3 h-3" />
                      <span className="text-[10px] font-bold">{format(new Date(res.reservation_time), 'dd MMM, HH:mm', { locale: id })}</span>
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest">Meja</p>
                    <div className="flex items-center gap-1.5 text-zinc-950">
                      <LayoutGrid className="w-3 h-3" />
                      <span className="text-[10px] font-bold">{res.tables?.name || 'Any'}</span>
                    </div>
                  </div>
                </div>

                {res.status === 'pending' && (
                  <div className="pt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleStatus(res.id, 'checked_in', res.table_id)}
                      className="flex-1 py-2.5 bg-zinc-950 text-white rounded-xl font-bold text-[9px] uppercase tracking-widest hover:bg-zinc-800"
                    >
                      Check-in
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatus(res.id, 'cancelled')}
                      className="p-2.5 bg-zinc-50 text-zinc-400 rounded-xl hover:text-red-500 hover:bg-red-50"
                      aria-label="Batalkan"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/40 backdrop-blur-md p-0 animate-in fade-in duration-300 sm:items-center sm:p-6">
          <div className="bg-white w-full max-w-lg rounded-t-[2rem] p-6 shadow-2xl border border-zinc-100 space-y-5 max-h-[90vh] overflow-y-auto sm:rounded-[2.5rem] sm:p-8">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-serif font-bold italic">Tambah Reservasi</h2>
              <button type="button" onClick={() => setShowModal(false)} className="p-2 hover:bg-zinc-50 rounded-full">
                <XCircle className="w-5 h-5 text-zinc-300" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Nama Pelanggan</label>
                  <input name="customer_name" required autoComplete="name"
                    className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3 text-xs font-semibold focus:border-zinc-950 outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest ml-1">No. HP</label>
                  <input name="phone_number" type="tel" autoComplete="tel"
                    className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3 text-xs font-semibold focus:border-zinc-950 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Waktu Booking</label>
                  <input name="reservation_time" type="datetime-local" required
                    className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3 text-xs font-semibold focus:border-zinc-950 outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Pilih Meja</label>
                  <select name="table_id" className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3 text-xs font-semibold focus:border-zinc-950 outline-none appearance-none">
                    <option value="">Opsional</option>
                    {tables.map(t => <option key={t.id} value={t.id}>{t.name} ({t.status})</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Jumlah Orang</label>
                <input name="number_of_people" type="number" min={1} defaultValue={2}
                  className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3 text-xs font-semibold focus:border-zinc-950 outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Catatan</label>
                <textarea name="notes"
                  className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3 text-xs font-semibold focus:border-zinc-950 outline-none min-h-[80px]" />
              </div>
              <button type="submit" disabled={submitting}
                className="w-full py-4 bg-zinc-950 text-white rounded-2xl font-bold text-[10px] tracking-[0.2em] uppercase hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-950/20 disabled:opacity-50">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Simpan Reservasi'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}