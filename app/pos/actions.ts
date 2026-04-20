'use server';

import { revalidatePath } from 'next/cache';
import { requireRoles } from '@/lib/auth/server-auth';

type RecipeItem = {
  ingredient_id: string | null;
  amount_required: number | null;
};

type OrderItemWithRecipe = {
  quantity: number;
  products: {
    recipe_items: RecipeItem[];
  } | null;
};

type OrderWithItems = {
  id: string;
  table_id: string | null;
  status: string;
  order_items: OrderItemWithRecipe[];
};

export async function saveOrder(cart: any[], tableId: string, customerName: string) {
  const { supabase } = await requireRoles(['admin', 'cashier', 'waiter']);
  const { data: { user } } = await supabase.auth.getUser();

  if (!cart || cart.length === 0) throw new Error('Keranjang kosong.');
  if (!tableId) throw new Error('Meja belum dipilih.');

  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const totalHPP = cart.reduce((sum, item) => sum + item.hpp * item.qty, 0);

  const { data: existingOrder } = await supabase
    .from('orders')
    .select('id')
    .eq('table_id', tableId)
    .eq('status', 'pending')
    .maybeSingle();

  let orderId = existingOrder?.id as string | undefined;

  if (!orderId) {
    const { data: newOrder, error: orderError } = await supabase
      .from('orders')
      .insert([{
        table_id: tableId,
        waiter_id: user?.id,
        customer_name: customerName || null,
        status: 'pending',
        total_price: totalPrice,
        total_hpp: totalHPP,
      }])
      .select('id')
      .single();

    if (orderError || !newOrder) {
      if (orderError?.message?.toLowerCase().includes('duplicate') || orderError?.message?.toLowerCase().includes('unique')) {
        throw new Error('Meja ini sedang diproses pengguna lain. Coba refresh lalu ulangi.');
      }
      throw new Error('Gagal membuat pesanan: ' + (orderError?.message ?? 'Unknown error'));
    }

    orderId = newOrder.id;

    const { error: tableError } = await supabase
      .from('tables')
      .update({ status: 'occupied' })
      .eq('id', tableId);

    if (tableError) {
      await supabase.from('orders').delete().eq('id', orderId);
      throw new Error('Gagal mengupdate status meja.');
    }
  } else {
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        total_price: totalPrice,
        total_hpp: totalHPP,
        customer_name: customerName || null,
      })
      .eq('id', orderId);

    if (updateError) throw new Error('Gagal mengupdate pesanan: ' + updateError.message);

    const { error: deleteError } = await supabase
      .from('order_items')
      .delete()
      .eq('order_id', orderId);

    if (deleteError) throw new Error('Gagal memperbarui item pesanan.');
  }

  const orderItems = cart.map((item) => ({
    order_id: orderId,
    product_id: item.id,
    quantity: item.qty,
    price: item.price,
    hpp: item.hpp,
  }));

  const { error: itemsError } = await supabase.from('order_items').insert(orderItems);

  if (itemsError) {
    if (!existingOrder?.id) {
      await supabase.from('orders').delete().eq('id', orderId);
      await supabase.from('tables').update({ status: 'available' }).eq('id', tableId);
    }
    throw new Error('Gagal menyimpan detail pesanan: ' + itemsError.message);
  }

  revalidatePath('/pos');
  return orderId;
}

export async function finalizePayment(orderId: string, paymentMethod: string) {
  const { supabase } = await requireRoles(['admin', 'cashier']);
  const { data: { user } } = await supabase.auth.getUser();
  const paymentRequestId = crypto.randomUUID();

  const { data: rawOrder, error: orderError } = await supabase
    .from('orders')
    .select(`
      id,
      table_id,
      status,
      order_items (
        quantity,
        products (
          recipe_items (
            ingredient_id,
            amount_required
          )
        )
      )
    `)
    .eq('id', orderId)
    .single();

  if (orderError || !rawOrder) throw new Error('Pesanan tidak ditemukan.');

  const order = rawOrder as unknown as OrderWithItems;

  if (order.status === 'paid') throw new Error('Pesanan ini sudah dibayar.');
  if (order.status === 'cancelled') throw new Error('Pesanan ini sudah dibatalkan.');

  // Aggregate ingredient deductions
  const ingredientDeductions: Record<string, number> = {};
  for (const item of order.order_items) {
    const recipeItems = item.products?.recipe_items ?? [];
    for (const recipe of recipeItems) {
      if (!recipe.ingredient_id) continue;
      const needed = Number(recipe.amount_required) * Number(item.quantity);
      ingredientDeductions[recipe.ingredient_id] =
        (ingredientDeductions[recipe.ingredient_id] ?? 0) + needed;
    }
  }

  // ── GUARD: check stock sufficiency before deducting ──────────────────────
  const insufficientItems: string[] = [];
  for (const [ingId, needed] of Object.entries(ingredientDeductions)) {
    const { data: ing } = await supabase
      .from('ingredients')
      .select('stock, name')
      .eq('id', ingId)
      .single();

    if (!ing) continue;
    if (Number(ing.stock) < needed) {
      insufficientItems.push(`${ing.name} (butuh ${needed}, tersedia ${Number(ing.stock)})`);
    }
  }

  if (insufficientItems.length > 0) {
    throw new Error(
      `Stok tidak mencukupi untuk menyelesaikan transaksi:\n${insufficientItems.join('\n')}`
    );
  }

  const restoreDeductedStocks = async () => {
    for (const [ingId, amount] of Object.entries(ingredientDeductions)) {
      const { data: ing } = await supabase
        .from('ingredients')
        .select('stock')
        .eq('id', ingId)
        .single();
      if (!ing) continue;
      await supabase
        .from('ingredients')
        .update({ stock: Number(ing.stock) + amount })
        .eq('id', ingId);
    }
  };

  // Deduct stock atomically via RPC
  for (const [ingId, amount] of Object.entries(ingredientDeductions)) {
    const { error: rpcError } = await supabase.rpc('deduct_ingredient_stock', {
      p_ingredient_id: ingId,
      p_amount: amount,
    });

    if (rpcError) {
      console.warn(`RPC unavailable for ${ingId}, falling back:`, rpcError.message);
      const { data: ing } = await supabase
        .from('ingredients')
        .select('stock')
        .eq('id', ingId)
        .single();
      if (ing) {
        await supabase
          .from('ingredients')
          .update({ stock: Math.max(0, Number(ing.stock) - amount) })
          .eq('id', ingId);
      }
    }
  }

  // Mark as paid — idempotency guard
  let { error: orderUpdateError } = await supabase
    .from('orders')
    .update({
      status: 'paid',
      payment_method: paymentMethod,
      completed_at: new Date().toISOString(),
      paid_by: user?.id ?? null,
      payment_request_id: paymentRequestId,
    })
    .eq('id', orderId)
    .eq('status', 'pending');

  if (
    orderUpdateError &&
    orderUpdateError.message.toLowerCase().includes('column') &&
    (orderUpdateError.message.includes('paid_by') ||
      orderUpdateError.message.includes('payment_request_id'))
  ) {
    const fallbackUpdate = await supabase
      .from('orders')
      .update({
        status: 'paid',
        payment_method: paymentMethod,
        completed_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .eq('status', 'pending');
    orderUpdateError = fallbackUpdate.error;
  }

  if (orderUpdateError) {
    // Best-effort compensation: restore deducted stock if order status update fails.
    await restoreDeductedStocks();
    throw new Error('Gagal menyelesaikan pembayaran: ' + orderUpdateError.message);
  }

  if (order.table_id) {
    await supabase.from('tables').update({ status: 'available' }).eq('id', order.table_id);
  }

  revalidatePath('/pos');
  revalidatePath('/recap');
  revalidatePath('/');
  return true;
}

// ── Void/cancel a pending order ──────────────────────────────────────────────
export async function voidOrder(orderId: string, reason: string) {
  const { supabase } = await requireRoles(['admin', 'cashier']);
  const { data: { user } } = await supabase.auth.getUser();

  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('id, table_id, status')
    .eq('id', orderId)
    .single();

  if (fetchError || !order) throw new Error('Pesanan tidak ditemukan.');
  if (order.status === 'paid') throw new Error('Pesanan yang sudah dibayar tidak bisa dibatalkan. Hubungi admin.');
  if (order.status === 'cancelled') throw new Error('Pesanan ini sudah dibatalkan sebelumnya.');

  if (!reason?.trim()) throw new Error('Alasan pembatalan wajib diisi.');

  let { error: voidError } = await supabase
    .from('orders')
    .update({
      status: 'cancelled',
      void_reason: reason.trim(),
      void_at: new Date().toISOString(),
      void_by: user?.id ?? null,
    })
    .eq('id', orderId)
    .eq('status', 'pending');

  if (
    voidError &&
    voidError.message.toLowerCase().includes('column') &&
    voidError.message.includes('void_by')
  ) {
    const fallbackVoid = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        void_reason: reason.trim(),
        void_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .eq('status', 'pending');
    voidError = fallbackVoid.error;
  }

  if (voidError) throw new Error('Gagal membatalkan pesanan: ' + voidError.message);

  // Free the table
  if (order.table_id) {
    await supabase.from('tables').update({ status: 'available' }).eq('id', order.table_id);
  }

  revalidatePath('/pos');
  return true;
}

export async function getRecentSales() {
  const { supabase } = await requireRoles(['admin', 'cashier', 'waiter']);

  // Filter to current shift (today) by default
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('orders')
    .select(`
      id,
      customer_name,
      total_price,
      payment_method,
      completed_at,
      tables (name),
      order_items (
        quantity,
        price,
        products (name)
      )
    `)
    .eq('status', 'paid')
    .gte('completed_at', todayStart.toISOString())
    .order('completed_at', { ascending: false })
    .limit(50);

  if (error) throw new Error('Gagal memuat riwayat penjualan: ' + error.message);
  return data ?? [];
}

export async function getOrderByTable(tableId: string) {
  const { supabase } = await requireRoles(['admin', 'cashier', 'waiter']);

  const { data, error } = await supabase
    .from('orders')
    .select(`
      id,
      customer_name,
      order_items (
        product_id,
        quantity,
        price,
        hpp,
        products (
          id,
          name,
          price,
          recipe_items (ingredient_id, amount_required)
        )
      )
    `)
    .eq('table_id', tableId)
    .eq('status', 'pending')
    .maybeSingle();

  if (error || !data) return null;

  const cart = (data.order_items as any[]).map((item) => ({
    id: item.product_id,
    name: item.products?.name ?? '',
    price: Number(item.price),
    hpp: Number(item.hpp),
    qty: Number(item.quantity),
    recipe_items: item.products?.recipe_items ?? [],
  }));

  return { order: data, cart };
}