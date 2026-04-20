'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/ToastProvider';
import {
  ShoppingBag, Minus, Plus, Trash2,
  Receipt, Printer, CheckCircle2, History, X,
  User, LayoutGrid, Loader2, ChefHat, Wallet,
  AlertTriangle, Ban
} from 'lucide-react';
import { saveOrder, finalizePayment, getRecentSales, getOrderByTable, voidOrder } from './actions';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { POSProduct, CartItem, Table, UserRole, Order } from '@/types';

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

type POSView = 'TABLES' | 'ORDERING' | 'HISTORY';

export function POSClient({
  products,
  tables,
  userRole,
}: {
  products: POSProduct[];
  tables: Table[];
  userRole: UserRole;
}) {
  const router = useRouter();
  const { showToast } = useToast();

  const [view, setView] = useState<POSView>('TABLES');
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [printMode, setPrintMode] = useState<'KITCHEN' | 'RECEIPT'>('RECEIPT');
  const [lastOrder, setLastOrder] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Payment modal
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris' | 'debit'>('cash');
  // Prevent double-submit
  const submittingRef = useRef(false);

  // Void modal
  const [showVoid, setShowVoid] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [voidLoading, setVoidLoading] = useState(false);

  const selectTable = async (table: Table) => {
    setLoading(true);
    setSelectedTable(table);
    if (table.status === 'occupied') {
      const data = await getOrderByTable(table.id);
      if (data) {
        setCart(data.cart);
        setCustomerName(data.order.customer_name || '');
        setActiveOrderId(data.order.id);
      }
    } else {
      setCart([]);
      setCustomerName('');
      setActiveOrderId(null);
    }
    setView('ORDERING');
    setLoading(false);
  };

  const addToCart = (product: POSProduct) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id !== id) return item;
          const newQty = item.qty + delta;
          return newQty > 0 ? { ...item, qty: newQty } : null;
        })
        .filter((item): item is CartItem => item !== null)
    );
  };

  const removeFromCart = (id: string) =>
    setCart((prev) => prev.filter((item) => item.id !== id));

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  // ── Save to kitchen ────────────────────────────────────────────────────────
  const handleSaveOrder = async () => {
    if (!selectedTable || cart.length === 0 || loading) return;
    setLoading(true);
    try {
      const orderId = await saveOrder(cart, selectedTable.id, customerName);
      if (orderId) {
        setActiveOrderId(orderId);
        setPrintMode('KITCHEN');
        setLastOrder({
          items: cart,
          table: selectedTable.name,
          customer: customerName || 'Umum',
          date: new Date(),
        });
        setTimeout(() => {
          window.print();
          setView('TABLES');
        }, 100);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Terjadi kesalahan.';
      // Session expired — redirect to login
      if (msg.includes('Sesi tidak valid')) {
        showToast('Sesi habis. Silakan login ulang.', 'error');
        router.push('/login');
        return;
      }
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ── Finalize payment — double-submit protected ─────────────────────────────
  const handleFinalize = async () => {
    if (!activeOrderId || submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    try {
      const ok = await finalizePayment(activeOrderId, paymentMethod);
      if (ok) {
        setPrintMode('RECEIPT');
        setLastOrder({
          items: cart,
          total: subtotal,
          table: selectedTable?.name,
          customer: customerName || 'Umum',
          date: new Date(),
          method: paymentMethod,
        });
        setSuccess(true);
        setShowPayment(false);
        setCart([]);
        setActiveOrderId(null);
        setView('TABLES');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Terjadi kesalahan.';
      if (msg.includes('Sesi tidak valid')) {
        showToast('Sesi habis. Silakan login ulang.', 'error');
        router.push('/login');
        return;
      }
      showToast(msg, 'error');
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  // ── Void order ─────────────────────────────────────────────────────────────
  const handleVoid = async () => {
    if (!activeOrderId || !voidReason.trim() || voidLoading) return;
    setVoidLoading(true);
    try {
      await voidOrder(activeOrderId, voidReason);
      setShowVoid(false);
      setVoidReason('');
      setCart([]);
      setActiveOrderId(null);
      showToast('Pesanan berhasil dibatalkan.', 'success');
      setView('TABLES');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Gagal membatalkan pesanan.';
      showToast(msg, 'error');
    } finally {
      setVoidLoading(false);
    }
  };

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const data = await getRecentSales();
      setHistory(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Gagal memuat riwayat.';
      showToast(msg, 'error');
    } finally {
      setHistoryLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (view === 'HISTORY') fetchHistory();
  }, [view, fetchHistory]);

  return (
    <div className="flex-1 flex overflow-hidden relative">

      {/* ── Print Templates ─────────────────────────────────────────────── */}
      <div className="hidden print:block bg-white text-black p-4 font-mono text-[10px] leading-tight w-[58mm]">
        {printMode === 'KITCHEN' ? (
          <div className="space-y-4">
            <div className="text-center border-b border-black pb-2">
              <h2 className="text-sm font-bold">KITCHEN TICKET</h2>
              <p>Meja: {lastOrder?.table}</p>
              <p>{lastOrder ? format(lastOrder.date, 'HH:mm') : ''}</p>
            </div>
            <div className="space-y-2">
              {lastOrder?.items.map((item: any, i: number) => (
                <div key={i} className="flex justify-between text-xs font-bold">
                  <span>{item.qty}x {item.name}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-black pt-2 text-[8px] text-center">
              {lastOrder?.customer !== 'Umum' && <p>Cust: {lastOrder?.customer}</p>}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center border-b border-black pb-2">
              <h2 className="text-sm font-bold">COGSLY RECEIPT</h2>
              <p className="text-[8px]">Meja: {lastOrder?.table} | {lastOrder?.customer}</p>
              <p>{lastOrder ? format(lastOrder.date, 'dd/MM/yy HH:mm') : ''}</p>
            </div>
            <div className="space-y-1">
              {lastOrder?.items.map((item: any, i: number) => (
                <div key={i} className="flex justify-between">
                  <span>{item.name} ({item.qty})</span>
                  <span>{(item.qty * item.price).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-black pt-2">
              <div className="flex justify-between font-bold">
                <span>TOTAL</span>
                <span>Rp {lastOrder?.total?.toLocaleString()}</span>
              </div>
              <p className="text-[8px] text-center mt-2">
                {lastOrder?.method?.toUpperCase()}
              </p>
              <p className="text-[8px] text-center mt-4">TERIMA KASIH</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Main UI ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 print:hidden">
        {/* Nav */}
        <div className="px-8 py-4 bg-white border-b border-zinc-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setView('TABLES')}
              className={cn(
                'p-2 rounded-xl transition-all',
                view === 'TABLES' ? 'bg-zinc-950 text-white' : 'bg-zinc-50 text-zinc-400'
              )}
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            {view === 'ORDERING' && (
              <div className="flex items-center gap-3 animate-in slide-in-from-left-2">
                <div className="w-px h-6 bg-zinc-200" />
                <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-950 text-white rounded-lg text-xs font-bold">
                  <ShoppingBag className="w-3.5 h-3.5" />
                  {selectedTable?.name}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => setView(view === 'HISTORY' ? 'TABLES' : 'HISTORY')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all',
              view === 'HISTORY' ? 'bg-zinc-950 text-white' : 'bg-zinc-50 text-zinc-500'
            )}
          >
            <History className="w-4 h-4" />
            Hari Ini
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 bg-zinc-50/50">
          {view === 'TABLES' ? (
            <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {tables.map((table) => (
                  <button
                    key={table.id}
                    onClick={() => selectTable(table)}
                    className={cn(
                      'aspect-square rounded-[2.5rem] p-6 border-2 transition-all flex flex-col justify-between items-start text-left group',
                      table.status === 'occupied'
                        ? 'bg-zinc-950 border-zinc-950 text-white shadow-xl shadow-zinc-950/20'
                        : 'bg-white border-zinc-100 text-zinc-950 hover:border-zinc-950'
                    )}
                  >
                    <div className={cn(
                      'w-12 h-12 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110',
                      table.status === 'occupied' ? 'bg-white/10' : 'bg-zinc-50'
                    )}>
                      <LayoutGrid className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg mb-1">{table.name}</h3>
                      <p className={cn(
                        'text-[10px] font-bold uppercase tracking-widest',
                        table.status === 'occupied' ? 'text-zinc-400' : 'text-zinc-300'
                      )}>
                        {table.status === 'occupied' ? 'Terisi' : 'Tersedia'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : view === 'ORDERING' ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in slide-in-from-right-4 duration-500">
              {products.map((product) => {
                const inCart = cart.find((c) => c.id === product.id);
                return (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className={cn(
                      'group relative text-left bg-white rounded-[2rem] p-6 border transition-all duration-300 flex flex-col gap-5',
                      inCart
                        ? 'border-zinc-950 ring-2 ring-zinc-950 shadow-xl'
                        : 'border-zinc-100 hover:border-zinc-950'
                    )}
                  >
                    {inCart && (
                      <div className="absolute -top-2 -right-2 w-8 h-8 bg-zinc-950 text-white rounded-xl flex items-center justify-center text-xs font-bold animate-in zoom-in-50">
                        {inCart.qty}
                      </div>
                    )}
                    <div className="w-12 h-12 rounded-xl bg-zinc-50 flex items-center justify-center font-bold text-zinc-300 group-hover:bg-zinc-950 group-hover:text-white transition-all">
                      {product.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-zinc-950 mb-1">{product.name}</h4>
                      <p className="text-xs font-bold text-zinc-400 font-mono">
                        Rp {product.price.toLocaleString()}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-4 animate-in slide-in-from-bottom-4">
              {historyLoading ? (
                <div className="text-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-zinc-200" />
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-20 text-zinc-300">
                  <Receipt className="w-10 h-10 mx-auto mb-3" />
                  <p className="text-[10px] font-bold uppercase tracking-widest">Belum ada transaksi hari ini</p>
                </div>
              ) : history.map((sale) => (
                <div
                  key={sale.id}
                  className="bg-white p-6 rounded-3xl border border-zinc-100 flex items-center justify-between"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-300">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-zinc-950 uppercase">
                        {sale.customer_name || 'Umum'}
                      </p>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                        {sale.tables?.name} · {format(new Date(sale.completed_at), 'HH:mm')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">
                      Rp {Number(sale.total_price).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-zinc-300 font-bold uppercase">
                      {sale.payment_method}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Cart Sidebar ─────────────────────────────────────────────────── */}
      {view === 'ORDERING' && (
        <div className="w-96 flex flex-col bg-white border-l border-zinc-200 shadow-2xl z-30 print:hidden animate-in slide-in-from-right-4">
          <div className="p-8 border-b border-zinc-100 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-widest font-serif">
              {selectedTable?.name} — Pesanan
            </h2>
            <button
              onClick={() => setView('TABLES')}
              className="p-2 rounded-lg bg-zinc-50 text-zinc-400 hover:text-zinc-950"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-4">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-200">
                <ShoppingBag className="w-12 h-12 mb-4" />
                <p className="text-[10px] font-bold uppercase tracking-widest">Kosong</p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-zinc-50 border border-zinc-100 space-y-3 hover:border-zinc-950 transition-all"
                >
                  <div className="flex justify-between items-start">
                    <h4 className="text-xs font-bold text-zinc-950">{item.name}</h4>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-zinc-200 hover:text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-zinc-200/50">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQty(item.id, -1)}
                        className="w-7 h-7 bg-white rounded-lg flex items-center justify-center border border-zinc-100"
                      >
                        <Minus className="w-3" />
                      </button>
                      <span className="text-xs font-bold w-6 text-center">{item.qty}</span>
                      <button
                        onClick={() => updateQty(item.id, 1)}
                        className="w-7 h-7 bg-white rounded-lg flex items-center justify-center border border-zinc-100"
                      >
                        <Plus className="w-3" />
                      </button>
                    </div>
                    <p className="text-xs font-bold">
                      {(item.qty * item.price).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-8 border-t border-zinc-100 bg-zinc-50/50 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest ml-1">
                Nama Customer
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="cth. Pak Agung"
                className="w-full bg-white border border-zinc-200 rounded-2xl px-5 py-3 text-xs font-bold focus:border-zinc-950 outline-none"
              />
            </div>

            <div className="pt-4 border-t border-zinc-200 flex flex-col gap-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold uppercase text-zinc-400">Total Tagihan</p>
                <p className="text-2xl font-bold font-mono">Rp {subtotal.toLocaleString()}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleSaveOrder}
                  disabled={loading || cart.length === 0}
                  className="flex items-center justify-center gap-2 py-4 bg-zinc-100 text-zinc-950 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-zinc-200 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChefHat className="w-4 h-4" />}
                  Ke Dapur
                </button>

                {(userRole === 'admin' || userRole === 'cashier') && (
                  <button
                    type="button"
                    onClick={() => setShowPayment(true)}
                    disabled={loading || cart.length === 0 || !activeOrderId}
                    className="flex items-center justify-center gap-2 py-4 bg-zinc-950 text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-zinc-800 shadow-xl shadow-zinc-950/20 disabled:opacity-50"
                  >
                    <Wallet className="w-4 h-4" />
                    Bayar
                  </button>
                )}
              </div>

              {/* Void button — only if order exists */}
              {activeOrderId && (userRole === 'admin' || userRole === 'cashier') && (
                <button
                  type="button"
                  onClick={() => setShowVoid(true)}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 py-3 border border-zinc-200 text-zinc-400 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:border-red-200 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-50"
                >
                  <Ban className="w-3.5 h-3.5" />
                  Batalkan Pesanan
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Payment Modal ────────────────────────────────────────────────── */}
      {showPayment && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/60 backdrop-blur-sm p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-2xl space-y-8 animate-in zoom-in-95 duration-500">
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-serif font-bold italic tracking-tight">
                Metode Pembayaran
              </h3>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                Total: Rp {subtotal.toLocaleString()}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {(['cash', 'qris', 'debit'] as const).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={cn(
                    'flex items-center justify-between p-6 rounded-[2rem] border-2 transition-all',
                    paymentMethod === method
                      ? 'border-zinc-950 bg-zinc-950 text-white'
                      : 'border-zinc-100 hover:border-zinc-950'
                  )}
                >
                  <span className="font-bold uppercase tracking-widest text-xs">{method}</span>
                  {paymentMethod === method && <CheckCircle2 className="w-4 h-4" />}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3 pt-4">
              <button
                type="button"
                onClick={handleFinalize}
                disabled={loading || submittingRef.current}
                className="w-full py-5 bg-zinc-950 text-white rounded-3xl font-bold text-xs tracking-widest uppercase hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading
                  ? <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  : 'Selesaikan Pembayaran'
                }
              </button>
              <button
                type="button"
                onClick={() => { if (!loading) setShowPayment(false); }}
                disabled={loading}
                className="w-full py-4 text-zinc-400 font-bold text-[10px] uppercase tracking-widest hover:text-zinc-950 disabled:opacity-50"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Void Modal ───────────────────────────────────────────────────── */}
      {showVoid && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/60 backdrop-blur-sm p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-2xl space-y-8 animate-in zoom-in-95 duration-500">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-[2rem] flex items-center justify-center mx-auto">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-serif font-bold italic">Batalkan Pesanan?</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Pesanan akan dibatalkan dan meja dikosongkan. Tindakan ini tidak bisa diurungkan.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">
                Alasan Pembatalan <span className="text-red-500">*</span>
              </label>
              <textarea
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="cth. Pelanggan membatalkan, salah input, dll."
                className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-5 py-3.5 text-sm font-medium focus:border-zinc-950 outline-none min-h-[100px] resize-none"
              />
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleVoid}
                disabled={voidLoading || !voidReason.trim()}
                className="w-full py-4 bg-red-500 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {voidLoading
                  ? <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  : 'Ya, Batalkan Pesanan'
                }
              </button>
              <button
                type="button"
                onClick={() => { setShowVoid(false); setVoidReason(''); }}
                disabled={voidLoading}
                className="w-full py-4 text-zinc-400 font-bold text-[10px] uppercase tracking-widest hover:text-zinc-950"
              >
                Tidak, Kembali
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Success Modal ────────────────────────────────────────────────── */}
      {success && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-zinc-950/60 backdrop-blur-md p-6 animate-in fade-in duration-300">
          <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-zinc-100 max-w-sm w-full text-center space-y-8 animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-emerald-500 text-white rounded-[2.5rem] flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-2xl font-bold font-serif mb-2 italic">Pembayaran Sukses</h3>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                Meja {lastOrder?.table} kembali tersedia.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => { window.print(); setSuccess(false); }}
                className="flex items-center justify-center gap-3 w-full py-4 bg-zinc-950 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-zinc-800"
              >
                <Printer className="w-4 h-4" />
                Cetak Struk
              </button>
              <button
                onClick={() => setSuccess(false)}
                className="w-full py-4 text-zinc-400 font-bold text-[10px] uppercase tracking-widest hover:text-zinc-950"
              >
                Lanjut Transaksi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}