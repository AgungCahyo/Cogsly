'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/ToastProvider';
import {
  ShoppingBag, Minus, Plus, Trash2, Receipt, Printer, CheckCircle2,
  History, X, User, LayoutGrid, Loader2, ChefHat, Wallet, AlertTriangle, Ban
} from 'lucide-react';
import { saveOrder, finalizePayment, getRecentSales, getOrderByTable, voidOrder } from './actions';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { POSProduct, CartItem, Table, UserRole, Order } from '@/types';

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

type POSView = 'TABLES' | 'ORDERING' | 'HISTORY';

export function POSClient({
  products, tables, userRole,
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
  const [showCart, setShowCart] = useState(false);

  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris' | 'debit'>('cash');
  const submittingRef = useRef(false);

  const [showVoid, setShowVoid] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [voidLoading, setVoidLoading] = useState(false);

  const getStockBlockingReason = (product: POSProduct, targetQty: number) => {
    for (const recipeItem of product.recipe_items ?? []) {
      const perPortion = Number(recipeItem.amount_required) || 0;
      if (perPortion <= 0) continue;
      const available = Number(recipeItem.ingredient_stock);
      if (!Number.isFinite(available)) continue;
      const needed = perPortion * targetQty;
      if (needed > available) {
        const ingredientName = recipeItem.ingredient_name ?? 'Bahan';
        const unit = recipeItem.ingredient_unit ?? '';
        return `${ingredientName} (butuh ${needed.toLocaleString('id-ID')}${unit ? ` ${unit}` : ''}, stok ${available.toLocaleString('id-ID')}${unit ? ` ${unit}` : ''})`;
      }
    }
    return null;
  };

  const selectTable = async (table: Table) => {
    setLoading(true);
    setSelectedTable(table);
    if (table.status === 'occupied') {
      const data = await getOrderByTable(table.id);
      if (data) { setCart(data.cart); setCustomerName(data.order.customer_name || ''); setActiveOrderId(data.order.id); }
    } else {
      setCart([]); setCustomerName(''); setActiveOrderId(null);
    }
    setView('ORDERING');
    setLoading(false);
  };

  const addToCart = (product: POSProduct) => {
    const currentQty = cart.find((item) => item.id === product.id)?.qty ?? 0;
    const stockBlockReason = getStockBlockingReason(product, currentQty + 1);
    if (stockBlockReason) { showToast(`Stok tidak cukup: ${stockBlockReason}`, 'error'); return; }
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) return prev.map((item) => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    if (delta > 0) {
      const item = cart.find((cartItem) => cartItem.id === id);
      if (item) {
        const stockBlockReason = getStockBlockingReason(item, item.qty + delta);
        if (stockBlockReason) { showToast(`Stok tidak cukup: ${stockBlockReason}`, 'error'); return; }
      }
    }
    setCart((prev) => prev.map((item) => {
      if (item.id !== id) return item;
      const newQty = item.qty + delta;
      return newQty > 0 ? { ...item, qty: newQty } : null;
    }).filter((item): item is CartItem => item !== null));
  };

  const removeFromCart = (id: string) => setCart((prev) => prev.filter((item) => item.id !== id));
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  const handleSaveOrder = async () => {
    if (!selectedTable || cart.length === 0 || loading) return;
    setLoading(true);
    try {
      const orderId = await saveOrder(cart, selectedTable.id, customerName);
      if (orderId) {
        setActiveOrderId(orderId);
        setPrintMode('KITCHEN');
        setLastOrder({ items: cart, table: selectedTable.name, customer: customerName || 'Umum', date: new Date() });
        setTimeout(() => { window.print(); setView('TABLES'); setShowCart(false); }, 100);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Terjadi kesalahan.';
      if (msg.includes('Sesi tidak valid')) { showToast('Sesi habis. Silakan login ulang.', 'error'); router.push('/login'); return; }
      showToast(msg, 'error');
    } finally { setLoading(false); }
  };

  const handleFinalize = async () => {
    if (!activeOrderId || submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    try {
      const ok = await finalizePayment(activeOrderId, paymentMethod);
      if (ok) {
        setPrintMode('RECEIPT');
        setLastOrder({ items: cart, total: subtotal, table: selectedTable?.name, customer: customerName || 'Umum', date: new Date(), method: paymentMethod });
        setSuccess(true); setShowPayment(false); setCart([]); setActiveOrderId(null); setView('TABLES'); setShowCart(false);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Terjadi kesalahan.';
      if (msg.includes('Sesi tidak valid')) { showToast('Sesi habis. Silakan login ulang.', 'error'); router.push('/login'); return; }
      showToast(msg, 'error');
    } finally { setLoading(false); submittingRef.current = false; }
  };

  const handleVoid = async () => {
    if (!activeOrderId || !voidReason.trim() || voidLoading) return;
    setVoidLoading(true);
    try {
      await voidOrder(activeOrderId, voidReason);
      setShowVoid(false); setVoidReason(''); setCart([]); setActiveOrderId(null);
      showToast('Pesanan berhasil dibatalkan.', 'success'); setView('TABLES'); setShowCart(false);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Gagal membatalkan.', 'error');
    } finally { setVoidLoading(false); }
  };

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try { const data = await getRecentSales(); setHistory(data); }
    catch (e: unknown) { showToast(e instanceof Error ? e.message : 'Gagal memuat.', 'error'); }
    finally { setHistoryLoading(false); }
  }, [showToast]);

  useEffect(() => { if (view === 'HISTORY') fetchHistory(); }, [view, fetchHistory]);

  return (
    <div className="flex-1 flex overflow-hidden relative">
      {/* Print Templates */}
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
                <div key={i} className="flex justify-between text-xs font-bold"><span>{item.qty}x {item.name}</span></div>
              ))}
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
                <div key={i} className="flex justify-between"><span>{item.name} ({item.qty})</span><span>{(item.qty * item.price).toLocaleString()}</span></div>
              ))}
            </div>
            <div className="border-t border-black pt-2">
              <div className="flex justify-between font-bold"><span>TOTAL</span><span>Rp {lastOrder?.total?.toLocaleString()}</span></div>
              <p className="text-[8px] text-center mt-2">{lastOrder?.method?.toUpperCase()}</p>
              <p className="text-[8px] text-center mt-4">TERIMA KASIH</p>
            </div>
          </div>
        )}
      </div>

      {/* Main UI */}
      <div className="flex-1 flex flex-col min-w-0 print:hidden">
        {/* Nav */}
        <div className="px-3 py-3 bg-white border-b border-zinc-100 flex items-center justify-between shrink-0 sm:px-6">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => { setView('TABLES'); setShowCart(false); }}
              className={cn('p-2 rounded-xl transition-all', view === 'TABLES' ? 'bg-zinc-950 text-white' : 'bg-zinc-50 text-zinc-400')}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            {view === 'ORDERING' && (
              <div className="flex items-center gap-2 animate-in slide-in-from-left-2">
                <div className="w-px h-5 bg-zinc-200" />
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-950 text-white rounded-lg text-[10px] font-bold">
                  <ShoppingBag className="w-3 h-3" />
                  {selectedTable?.name}
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Cart toggle button - mobile only */}
            {view === 'ORDERING' && (
              <button
                onClick={() => setShowCart(!showCart)}
                className="lg:hidden relative flex items-center gap-1.5 px-3 py-2 bg-zinc-950 text-white rounded-xl text-[10px] font-bold"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                {cart.length > 0 && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white text-zinc-950 rounded-full text-[9px] font-bold flex items-center justify-center">{cart.reduce((s,i)=>s+i.qty,0)}</span>}
                Keranjang
              </button>
            )}
            <button
              onClick={() => setView(view === 'HISTORY' ? 'TABLES' : 'HISTORY')}
              className={cn('flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all', view === 'HISTORY' ? 'bg-zinc-950 text-white' : 'bg-zinc-50 text-zinc-500')}
            >
              <History className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Hari Ini</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 bg-zinc-50/50 sm:p-5">
          {view === 'TABLES' ? (
            <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-6">
                {tables.map((table) => (
                  <button
                    key={table.id}
                    onClick={() => selectTable(table)}
                    className={cn(
                      'aspect-square rounded-2xl p-3 border-2 transition-all flex flex-col justify-between items-start text-left group sm:rounded-3xl sm:p-5',
                      table.status === 'occupied' ? 'bg-zinc-950 border-zinc-950 text-white shadow-lg shadow-zinc-950/20' : 'bg-white border-zinc-100 text-zinc-950 hover:border-zinc-950'
                    )}
                  >
                    <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center transition-all sm:w-10 sm:h-10', table.status === 'occupied' ? 'bg-white/10' : 'bg-zinc-50')}>
                      <LayoutGrid className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm sm:text-base">{table.name}</h3>
                      <p className={cn('text-[8px] font-bold uppercase tracking-widest sm:text-[10px]', table.status === 'occupied' ? 'text-zinc-400' : 'text-zinc-300')}>
                        {table.status === 'occupied' ? 'Terisi' : 'Tersedia'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : view === 'ORDERING' ? (
            <div className="grid grid-cols-2 gap-2.5 animate-in slide-in-from-right-4 duration-500 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => {
                const inCart = cart.find((c) => c.id === product.id);
                const isOutOfStock = Boolean(getStockBlockingReason(product, 1));
                const addMoreBlocked = getStockBlockingReason(product, (inCart?.qty ?? 0) + 1);
                return (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    disabled={isOutOfStock}
                    className={cn(
                      'group relative text-left bg-white rounded-2xl p-3.5 border transition-all duration-300 flex flex-col gap-3 disabled:cursor-not-allowed sm:p-5',
                      inCart ? 'border-zinc-950 ring-2 ring-zinc-950 shadow-lg' : 'border-zinc-100 hover:border-zinc-950',
                      isOutOfStock && 'opacity-50 border-zinc-200 bg-zinc-50 hover:border-zinc-200'
                    )}
                  >
                    {inCart && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-zinc-950 text-white rounded-lg flex items-center justify-center text-[10px] font-bold animate-in zoom-in-50">
                        {inCart.qty}
                      </div>
                    )}
                    <div className="w-9 h-9 rounded-xl bg-zinc-50 flex items-center justify-center font-bold text-zinc-300 group-hover:bg-zinc-950 group-hover:text-white transition-all text-sm">
                      {product.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-zinc-950 mb-0.5 line-clamp-2">{product.name}</h4>
                      <p className="text-[10px] font-bold text-zinc-400 font-mono">Rp {product.price.toLocaleString()}</p>
                      {isOutOfStock ? (
                        <p className="text-[9px] font-bold uppercase tracking-widest text-red-500 mt-1">Stok habis</p>
                      ) : addMoreBlocked && inCart ? (
                        <p className="text-[9px] font-bold uppercase tracking-widest text-amber-500 mt-1">Batas stok</p>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-2.5 animate-in slide-in-from-bottom-4">
              {historyLoading ? (
                <div className="text-center py-16"><Loader2 className="w-6 h-6 animate-spin mx-auto text-zinc-200" /></div>
              ) : history.length === 0 ? (
                <div className="text-center py-16 text-zinc-300">
                  <Receipt className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-[9px] font-bold uppercase tracking-widest">Belum ada transaksi</p>
                </div>
              ) : history.map((sale) => (
                <div key={sale.id} className="bg-white p-3.5 rounded-2xl border border-zinc-100 flex items-center justify-between sm:p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-300">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-zinc-950 text-xs uppercase">{sale.customer_name || 'Umum'}</p>
                      <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">
                        {sale.tables?.name} · {format(new Date(sale.completed_at), 'HH:mm')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-xs">Rp {Number(sale.total_price).toLocaleString()}</p>
                    <p className="text-[9px] text-zinc-300 font-bold uppercase">{sale.payment_method}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cart Sidebar - desktop always visible, mobile slide-over */}
      {view === 'ORDERING' && (
        <>
          {/* Mobile overlay */}
          {showCart && (
            <div className="fixed inset-0 z-30 bg-zinc-950/30 backdrop-blur-sm lg:hidden" onClick={() => setShowCart(false)} />
          )}
          <div className={cn(
            'flex flex-col bg-white border-l border-zinc-200 shadow-2xl z-40 print:hidden',
            'fixed right-0 top-0 bottom-0 w-80 transition-transform duration-300 lg:static lg:translate-x-0 lg:w-80 lg:z-30',
            showCart ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
          )}>
            <div className="p-4 border-b border-zinc-100 flex items-center justify-between sm:p-5">
              <h2 className="text-[10px] font-bold uppercase tracking-widest">
                {selectedTable?.name} — Pesanan
              </h2>
              <button onClick={() => { setView('TABLES'); setShowCart(false); }} className="p-1.5 rounded-lg bg-zinc-50 text-zinc-400 hover:text-zinc-950">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-200">
                  <ShoppingBag className="w-10 h-10 mb-3" />
                  <p className="text-[9px] font-bold uppercase tracking-widest">Kosong</p>
                </div>
              ) : cart.map((item) => (
                <div key={item.id} className="p-3 rounded-xl bg-zinc-50 border border-zinc-100 space-y-2.5 hover:border-zinc-950 transition-all">
                  <div className="flex justify-between items-start">
                    <h4 className="text-[10px] font-bold text-zinc-950 flex-1 pr-2">{item.name}</h4>
                    <button onClick={() => removeFromCart(item.id)} className="text-zinc-200 hover:text-red-500 shrink-0">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-200/50">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 bg-white rounded-lg flex items-center justify-center border border-zinc-100">
                        <Minus className="w-2.5 h-2.5" />
                      </button>
                      <span className="text-[10px] font-bold w-5 text-center">{item.qty}</span>
                      <button
                        onClick={() => updateQty(item.id, 1)}
                        disabled={Boolean(getStockBlockingReason(item, item.qty + 1))}
                        className="w-6 h-6 bg-white rounded-lg flex items-center justify-center border border-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                    </div>
                    <p className="text-[10px] font-bold">{(item.qty * item.price).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-zinc-100 bg-zinc-50/50 space-y-3">
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold uppercase text-zinc-400 tracking-widest ml-1">Nama Customer</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="cth. Pak Agung"
                  className="w-full bg-white border border-zinc-200 rounded-xl px-3.5 py-2.5 text-[10px] font-bold focus:border-zinc-950 outline-none"
                />
              </div>

              <div className="pt-3 border-t border-zinc-200 flex flex-col gap-2">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[9px] font-bold uppercase text-zinc-400">Total</p>
                  <p className="text-lg font-bold font-mono">Rp {subtotal.toLocaleString()}</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleSaveOrder}
                    disabled={loading || cart.length === 0}
                    className="flex items-center justify-center gap-1.5 py-3 bg-zinc-100 text-zinc-950 rounded-xl font-bold text-[9px] uppercase tracking-widest hover:bg-zinc-200 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChefHat className="w-3.5 h-3.5" />}
                    Dapur
                  </button>

                  {(userRole === 'admin' || userRole === 'cashier') && (
                    <button
                      type="button"
                      onClick={() => setShowPayment(true)}
                      disabled={loading || cart.length === 0 || !activeOrderId}
                      className="flex items-center justify-center gap-1.5 py-3 bg-zinc-950 text-white rounded-xl font-bold text-[9px] uppercase tracking-widest hover:bg-zinc-800 shadow-lg shadow-zinc-950/20 disabled:opacity-50"
                    >
                      <Wallet className="w-3.5 h-3.5" />
                      Bayar
                    </button>
                  )}
                </div>

                {activeOrderId && (userRole === 'admin' || userRole === 'cashier') && (
                  <button
                    type="button"
                    onClick={() => setShowVoid(true)}
                    disabled={loading}
                    className="flex items-center justify-center gap-1.5 py-2.5 border border-zinc-200 text-zinc-400 rounded-xl font-bold text-[9px] uppercase tracking-widest hover:border-red-200 hover:text-red-500 hover:bg-red-50 transition-all"
                  >
                    <Ban className="w-3 h-3" />
                    Batalkan
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-zinc-950/60 backdrop-blur-sm p-0 animate-in fade-in duration-300 sm:items-center sm:p-6">
          <div className="bg-white w-full max-w-sm rounded-t-[2rem] p-7 shadow-2xl space-y-6 animate-in slide-in-from-bottom duration-300 sm:rounded-[2.5rem] sm:p-8">
            <div className="text-center space-y-1.5">
              <h3 className="text-xl font-serif font-bold italic">Metode Pembayaran</h3>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total: Rp {subtotal.toLocaleString()}</p>
            </div>
            <div className="grid grid-cols-1 gap-2.5">
              {(['cash', 'qris', 'debit'] as const).map((method) => (
                <button key={method} type="button" onClick={() => setPaymentMethod(method)}
                  className={cn('flex items-center justify-between p-4 rounded-2xl border-2 transition-all', paymentMethod === method ? 'border-zinc-950 bg-zinc-950 text-white' : 'border-zinc-100 hover:border-zinc-950')}>
                  <span className="font-bold uppercase tracking-widest text-xs">{method}</span>
                  {paymentMethod === method && <CheckCircle2 className="w-4 h-4" />}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <button type="button" onClick={handleFinalize} disabled={loading || submittingRef.current}
                className="w-full py-4 bg-zinc-950 text-white rounded-2xl font-bold text-xs tracking-widest uppercase hover:bg-zinc-800 disabled:opacity-50">
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : 'Selesaikan Pembayaran'}
              </button>
              <button type="button" onClick={() => { if (!loading) setShowPayment(false); }} disabled={loading}
                className="w-full py-3 text-zinc-400 font-bold text-[10px] uppercase tracking-widest hover:text-zinc-950">Batal</button>
            </div>
          </div>
        </div>
      )}

      {/* Void Modal */}
      {showVoid && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-zinc-950/60 backdrop-blur-sm p-0 animate-in fade-in duration-300 sm:items-center sm:p-6">
          <div className="bg-white w-full max-w-sm rounded-t-[2rem] p-7 shadow-2xl space-y-6 animate-in slide-in-from-bottom duration-300 sm:rounded-[2.5rem] sm:p-8">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto"><AlertTriangle className="w-6 h-6" /></div>
              <h3 className="text-lg font-serif font-bold italic">Batalkan Pesanan?</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">Pesanan akan dibatalkan. Tindakan ini tidak bisa diurungkan.</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold uppercase text-zinc-400 tracking-widest">Alasan <span className="text-red-500">*</span></label>
              <textarea value={voidReason} onChange={(e) => setVoidReason(e.target.value)} placeholder="cth. Pelanggan membatalkan..."
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-xs font-medium focus:border-zinc-950 outline-none min-h-[80px] resize-none" />
            </div>
            <div className="flex flex-col gap-2">
              <button type="button" onClick={handleVoid} disabled={voidLoading || !voidReason.trim()}
                className="w-full py-3.5 bg-red-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-600 disabled:opacity-50">
                {voidLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : 'Ya, Batalkan'}
              </button>
              <button type="button" onClick={() => { setShowVoid(false); setVoidReason(''); }} disabled={voidLoading}
                className="w-full py-3 text-zinc-400 font-bold text-[10px] uppercase tracking-widest hover:text-zinc-950">Tidak, Kembali</button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {success && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-zinc-950/60 backdrop-blur-md p-0 animate-in fade-in duration-300 sm:items-center sm:p-6">
          <div className="bg-white p-7 rounded-t-[2rem] shadow-2xl border border-zinc-100 max-w-sm w-full text-center space-y-6 animate-in slide-in-from-bottom duration-300 sm:rounded-[2.5rem] sm:p-8">
            <div className="w-16 h-16 bg-emerald-500 text-white rounded-[1.5rem] flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold font-serif mb-1.5 italic">Pembayaran Sukses</h3>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Meja {lastOrder?.table} kembali tersedia.</p>
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={() => { window.print(); setSuccess(false); }}
                className="flex items-center justify-center gap-2 w-full py-3.5 bg-zinc-950 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-zinc-800">
                <Printer className="w-3.5 h-3.5" />Cetak Struk
              </button>
              <button onClick={() => setSuccess(false)}
                className="w-full py-3 text-zinc-400 font-bold text-[10px] uppercase tracking-widest hover:text-zinc-950">Lanjut</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}