'use client';

import { useState } from 'react';
import { ShoppingBag, Minus, Plus, CreditCard, Trash2, Receipt } from 'lucide-react';
import { processSale } from './actions';

import { POSProduct, CartItem } from '@/types';

export function POSClient({ products }: { products: POSProduct[] }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const addToCart = (product: POSProduct) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      setCart(cart.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }
  };

  const updateQty = (id: string, delta: number) => {
    setCart(
      cart.map(item => {
        if (item.id === id) {
          const newQty = item.qty + delta;
          return newQty > 0 ? { ...item, qty: newQty } : null;
        }
        return item;
      }).filter((item): item is CartItem => item !== null)
    );
  };

  const removeFromCart = (id: string) => setCart(cart.filter(item => item.id !== id));

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    try {
      const success = await processSale(cart);
      if (success) {
        setSuccess(true);
        setCart([]);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        alert('Gagal memproses transaksi.');
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      alert('Error: ' + message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Products */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Success toast */}
        {success && (
          <div
            className="fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl"
            style={{ background: 'var(--success-dim)', border: '1px solid rgba(74,158,107,0.3)', color: 'var(--success)' }}
          >
            <Receipt className="w-4 h-4" />
            <span className="text-sm font-semibold">Transaksi berhasil! Stok diperbarui.</span>
          </div>
        )}

        {products.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <ShoppingBag className="w-7 h-7" style={{ color: 'var(--text-muted)' }} />
            </div>
            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)', fontFamily: 'DM Serif Display, serif' }}>
              Belum ada produk
            </h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Tambahkan resep produk terlebih dahulu untuk mulai berjualan.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map(product => {
              const inCart = cart.find(c => c.id === product.id);
              return (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="group text-left rounded-2xl p-5 flex flex-col gap-3 transition-all relative overflow-hidden"
                  style={{
                    background: 'var(--bg-card)',
                    border: `1px solid ${inCart ? 'var(--gold-dim)' : 'var(--border)'}`,
                  }}
                  onMouseEnter={e => {
                    if (!inCart) (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-hover)';
                  }}
                  onMouseLeave={e => {
                    if (!inCart) (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                  }}
                >
                  {/* In cart badge */}
                  {inCart && (
                    <div
                      className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: 'var(--gold)', color: '#0a0905' }}
                    >
                      {inCart.qty}
                    </div>
                  )}
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl transition-transform group-hover:scale-110"
                    style={{ background: 'var(--gold-muted)', color: 'var(--gold)' }}
                  >
                    {product.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm leading-tight line-clamp-2" style={{ color: 'var(--text-primary)' }}>
                      {product.name}
                    </h3>
                    <p className="text-sm font-bold stat-number mt-1" style={{ color: 'var(--gold)' }}>
                      Rp {Number(product.price).toLocaleString('id-ID')}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Cart sidebar */}
      <div
        className="w-80 flex flex-col shrink-0"
        style={{ background: 'var(--bg-card)', borderLeft: '1px solid var(--border)' }}
      >
        {/* Cart header */}
        <div className="p-5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-4 h-4" style={{ color: 'var(--gold)' }} />
            <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Pesanan</span>
          </div>
          {totalItems > 0 && (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-bold stat-number"
              style={{ background: 'var(--gold-muted)', color: 'var(--gold)' }}
            >
              {totalItems} item
            </span>
          )}
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4" style={{ color: 'var(--text-muted)' }}>
              <ShoppingBag className="w-10 h-10 mb-2 opacity-20" />
              <p className="text-sm">Keranjang kosong</p>
              <p className="text-xs mt-1">Pilih produk untuk mulai</p>
            </div>
          ) : (
            cart.map(item => (
              <div
                key={item.id}
                className="flex gap-3 p-3 rounded-xl"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
              >
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold line-clamp-1" style={{ color: 'var(--text-primary)' }}>{item.name}</h4>
                  <p className="text-xs stat-number mt-0.5" style={{ color: 'var(--gold)' }}>
                    Rp {Number(item.price).toLocaleString('id-ID')}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => updateQty(item.id, -1)}
                    className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-5 text-center text-sm font-bold stat-number" style={{ color: 'var(--text-primary)' }}>
                    {item.qty}
                  </span>
                  <button
                    onClick={() => updateQty(item.id, 1)}
                    className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors"
                    style={{ background: 'var(--gold-muted)', border: '1px solid rgba(212,170,60,0.2)', color: 'var(--gold)' }}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="p-1 transition-colors self-center"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Checkout */}
        <div className="p-5 space-y-4" style={{ borderTop: '1px solid var(--border)' }}>
          {/* Subtotal */}
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
            <span className="text-xl font-bold stat-number" style={{ color: 'var(--text-primary)' }}>
              Rp {subtotal.toLocaleString('id-ID')}
            </span>
          </div>

          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || loading}
            className="btn-primary w-full justify-center py-3.5"
          >
            <CreditCard className="w-4 h-4" />
            {loading ? 'Memproses...' : 'Bayar Sekarang'}
          </button>
        </div>
      </div>
    </div>
  );
}