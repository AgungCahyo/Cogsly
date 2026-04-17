'use client';

import { useState } from 'react';
import { ShoppingBag, Minus, Plus, CreditCard } from 'lucide-react';
import { processSale } from './actions';

type POSRecipeItem = {
  ingredient_id: string;
  amount_required: number;
};

export type POSProduct = {
  id: string;
  name: string;
  price: number;
  hpp: number;
  recipe_items?: POSRecipeItem[] | null;
};

type CartItem = POSProduct & { qty: number };

export function POSClient({ products }: { products: POSProduct[] }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

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
      cart
        .map((item) => {
          if (item.id === id) {
            const newQty = item.qty + delta;
            return newQty > 0 ? { ...item, qty: newQty } : null;
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null)
    );
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    
    try {
      const success = await processSale(cart);
      if (success) {
        alert("Sale processed successfully! Stock deducted.");
        setCart([]);
      } else {
         alert("Failed to process sale.");
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      alert("Error: " + message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Products Grid */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map(product => (
            <button
              key={product.id}
              onClick={() => addToCart(product)}
              className="bg-[#111] border border-zinc-800 rounded-2xl p-6 flex flex-col items-start gap-4 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all text-left text-white group"
            >
               <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-xl group-hover:scale-110 transition-transform">
                 {product.name.charAt(0)}
               </div>
               <div>
                 <h3 className="font-bold leading-tight line-clamp-2">{product.name}</h3>
                 <p className="text-zinc-500 text-sm mt-1">Rp {Number(product.price).toLocaleString('id-ID')}</p>
               </div>
            </button>
          ))}
        </div>
      </div>

      {/* Cart Sidebar */}
      <div className="w-96 bg-[#111] border-l border-zinc-800 flex flex-col">
        <div className="p-6 border-b border-zinc-800 flex items-center gap-3">
          <ShoppingBag className="w-5 h-5 text-zinc-400" />
          <h2 className="font-bold text-white text-lg">Current Order</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-2">
              <ShoppingBag className="w-12 h-12 opacity-20" />
              <p>Cart is empty</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex gap-3 p-3 bg-[#1a1a1a] rounded-xl border border-zinc-800">
                 <div className="flex-1">
                   <h4 className="font-medium text-white text-sm line-clamp-1">{item.name}</h4>
                   <p className="text-zinc-500 text-xs">Rp {Number(item.price).toLocaleString('id-ID')}</p>
                 </div>
                 <div className="flex items-center gap-2">
                   <button onClick={() => updateQty(item.id, -1)} className="w-7 h-7 rounded bg-zinc-800 flex items-center justify-center text-white hover:bg-zinc-700">
                     <Minus className="w-3 h-3" />
                   </button>
                   <span className="w-6 text-center text-white text-sm font-medium">{item.qty}</span>
                   <button onClick={() => updateQty(item.id, 1)} className="w-7 h-7 rounded bg-zinc-800 flex items-center justify-center text-white hover:bg-zinc-700">
                     <Plus className="w-3 h-3" />
                   </button>
                 </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 border-t border-zinc-800 bg-[#111]">
          <div className="flex justify-between items-center mb-6">
            <span className="text-zinc-400">Subtotal</span>
            <span className="text-2xl font-bold text-white">Rp {subtotal.toLocaleString('id-ID')}</span>
          </div>
          <button 
            onClick={handleCheckout}
            disabled={cart.length === 0 || loading}
            className="w-full py-4 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <CreditCard className="w-5 h-5" />
            {loading ? 'Processing...' : 'Checkout & Pay'}
          </button>
        </div>
      </div>
    </div>
  );
}
