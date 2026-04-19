'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import { 
  getReservations, createReservation, updateReservationStatus 
} from './actions';
import { 
  Calendar, Clock, User, Phone, Users, 
  Plus, CheckCircle2, XCircle, Loader2,
  LayoutGrid
} from 'lucide-react';
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
    // Re-fetch tables periodically or on load
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
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan reservasi.';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatus = async (id: string, status: string, tableId?: string) => {
    await updateReservationStatus(id, status, tableId);
    fetchAll();
  };

  return (
    <div className="p-10 space-y-10 max-w-7xl mx-auto animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-1 font-mono">◆ Booking Meja</p>
          <h1 className="text-4xl font-bold font-serif tracking-tight text-zinc-950">Management Reservasi</h1>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-3 px-8 py-4 bg-zinc-950 text-white rounded-3xl font-bold text-xs uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-950/20 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/25 focus-visible:ring-offset-2"
        >
          <Plus className="w-5 h-5" />
          Tambah Reservasi
        </button>
      </div>

      {loading ? (
        <div className="py-24 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-zinc-200" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {reservations.map((res) => (
            <div 
              key={res.id} 
              className={`group bg-white p-8 rounded-[2.5rem] border transition-all duration-300 ${
                res.status === 'pending' ? 'border-zinc-100 hover:border-zinc-950 hover:shadow-2xl' : 'opacity-60 border-zinc-50'
              }`}
            >
              <div className="flex justify-between items-start mb-6">
                <div className="w-14 h-14 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-300 group-hover:bg-zinc-950 group-hover:text-white transition-all">
                  <User className="w-6 h-6" />
                </div>
                <div className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                  res.status === 'pending' ? 'bg-amber-100 text-amber-700' : 
                  res.status === 'checked_in' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                }`}>
                  {res.status}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-zinc-950 tracking-tight">{res.customer_name}</h3>
                  <div className="flex items-center gap-2 text-zinc-400 mt-1">
                    <Phone className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{res.phone_number || '-'}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-50 grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Waktu</p>
                    <div className="flex items-center gap-2 text-zinc-950">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="text-xs font-bold">{format(new Date(res.reservation_time), 'dd MMM, HH:mm', { locale: id })}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Meja</p>
                    <div className="flex items-center gap-2 text-zinc-950">
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span className="text-xs font-bold">{res.tables?.name || 'Any'}</span>
                    </div>
                  </div>
                </div>

                {res.status === 'pending' && (
                  <div className="pt-6 flex gap-3">
                    <button
                      type="button"
                      onClick={() => handleStatus(res.id, 'checked_in', res.table_id)}
                      className="flex-1 py-3 bg-zinc-950 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/25 focus-visible:ring-offset-2"
                    >
                      Check-in
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatus(res.id, 'cancelled')}
                      className="p-3 bg-zinc-50 text-zinc-400 rounded-xl hover:text-red-500 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/25 focus-visible:ring-offset-2"
                      aria-label="Batalkan reservasi"
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

      {/* Modal Tambah Reservasi */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 backdrop-blur-md p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[3rem] p-10 shadow-2xl border border-zinc-100 space-y-8 animate-in zoom-in-95 duration-500">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-serif font-bold italic">Tambah Reservasi</h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-zinc-50 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/20 focus-visible:ring-offset-2"
                aria-label="Tutup"
              >
                <XCircle className="w-6 h-6 text-zinc-300" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label htmlFor="reservation-customer-name" className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">
                    Nama Pelanggan
                  </label>
                  <input
                    id="reservation-customer-name"
                    name="customer_name"
                    required
                    autoComplete="name"
                    className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-5 py-3.5 text-sm font-semibold focus:border-zinc-950 outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/15 focus-visible:ring-offset-2"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="reservation-phone" className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">
                    No. Handphone
                  </label>
                  <input
                    id="reservation-phone"
                    name="phone_number"
                    type="tel"
                    autoComplete="tel"
                    className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-5 py-3.5 text-sm font-semibold focus:border-zinc-950 outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/15 focus-visible:ring-offset-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label htmlFor="reservation-time" className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">
                    Waktu Booking
                  </label>
                  <input
                    id="reservation-time"
                    name="reservation_time"
                    type="datetime-local"
                    required
                    className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-5 py-3.5 text-sm font-semibold focus:border-zinc-950 outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/15 focus-visible:ring-offset-2"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="reservation-table" className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">
                    Pilih Meja
                  </label>
                  <select
                    id="reservation-table"
                    name="table_id"
                    className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-5 py-3.5 text-sm font-semibold focus:border-zinc-950 outline-none appearance-none focus-visible:ring-2 focus-visible:ring-zinc-950/15 focus-visible:ring-offset-2"
                  >
                    <option value="">Pilih Meja (Opsional)</option>
                    {tables.map(t => <option key={t.id} value={t.id}>{t.name} ({t.status})</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label htmlFor="reservation-party-size" className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">
                    Jumlah Orang
                  </label>
                  <input
                    id="reservation-party-size"
                    name="number_of_people"
                    type="number"
                    min={1}
                    defaultValue={2}
                    className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-5 py-3.5 text-sm font-semibold focus:border-zinc-950 outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/15 focus-visible:ring-offset-2"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="reservation-notes" className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">
                  Catatan
                </label>
                <textarea
                  id="reservation-notes"
                  name="notes"
                  className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-5 py-3.5 text-sm font-semibold focus:border-zinc-950 outline-none min-h-[100px] focus-visible:ring-2 focus-visible:ring-zinc-950/15 focus-visible:ring-offset-2"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-5 bg-zinc-950 text-white rounded-3xl font-bold text-xs tracking-[0.2em] uppercase hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-950/20 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/25 focus-visible:ring-offset-2"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Simpan Reservasi'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
