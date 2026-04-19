'use server';

import { revalidatePath } from 'next/cache';
import { requireRoles } from '@/lib/auth/server-auth';

export async function saveOrder(cart: any[], tableId: string, customerName: string) {
  const { supabase } = await requireRoles(['admin', 'cashier', 'waiter']);
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Calculate totals
  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const totalHPP = cart.reduce((sum, item) => sum + (item.hpp * item.qty), 0);

  // 2. Check for existing pending order for this table
  const { data: existingOrder } = await supabase
    .from('orders')
    .select('id')
    .eq('table_id', tableId)
    .eq('status', 'pending')
    .single();

  let orderId = existingOrder?.id;

  if (!orderId) {
    // Insert new order
    const { data: newOrder, error: orderError } = await supabase
      .from('orders')
      .insert([{
        table_id: tableId,
        waiter_id: user?.id,
        customer_name: customerName,
        status: 'pending',
        total_price: totalPrice,
        total_hpp: totalHPP
      }])
      .select()
      .single();

    if (orderError) throw new Error("Gagal membuat pesanan: " + orderError.message);
    orderId = newOrder.id;

    // Update table status
    await supabase.from('tables').update({ status: 'occupied' }).eq('id', tableId);
  } else {
    // Update existing order totals
    await supabase.from('orders').update({
      total_price: totalPrice,
      total_hpp: totalHPP,
      customer_name: customerName
    }).eq('id', orderId);

    // Delete existing items to replace (simple sync)
    await supabase.from('order_items').delete().eq('order_id', orderId);
  }

  // 3. Insert items
  const orderItems = cart.map(item => ({
    order_id: orderId,
    product_id: item.id,
    quantity: item.qty,
    price: item.price,
    hpp: item.hpp
  }));

  const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
  if (itemsError) throw new Error("Gagal menyimpan detail pesanan");

  revalidatePath('/pos');
  return orderId;
}

export async function finalizePayment(orderId: string, paymentMethod: string) {
  const { supabase } = await requireRoles(['admin', 'cashier']);

  // 1. Get Order with Items and Recipes
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (
        *,
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

  if (orderError || !order) throw new Error("Pesanan tidak ditemukan");

  // 2. Deduct Ingredients
  const ingredientMap: Record<string, number> = {};
  order.order_items.forEach((item: any) => {
    item.products?.recipe_items?.forEach((recipe: any) => {
      const needed = recipe.amount_required * item.quantity;
      ingredientMap[recipe.ingredient_id] = (ingredientMap[recipe.ingredient_id] || 0) + needed;
    });
  });

  for (const [ingId, amount] of Object.entries(ingredientMap)) {
    const { data: ing } = await supabase.from('ingredients').select('stock').eq('id', ingId).single();
    if (ing) {
      const newStock = Number(ing.stock) - amount;
      await supabase.from('ingredients').update({ stock: newStock }).eq('id', ingId);
    }
  }

  // 3. Finalize Order
  await supabase.from('orders').update({
    status: 'paid',
    payment_method: paymentMethod,
    completed_at: new Date().toISOString()
  }).eq('id', orderId);

  // 4. Free Table
  if (order.table_id) {
    await supabase.from('tables').update({ status: 'available' }).eq('id', order.table_id);
  }

  revalidatePath('/pos');
  revalidatePath('/recap');
  revalidatePath('/');
  return true;
}

export async function getRecentSales() {
  const { supabase } = await requireRoles(['admin', 'cashier', 'waiter']);
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (
        *,
        products (name)
      )
    `)
    .eq('status', 'paid')
    .order('completed_at', { ascending: false })
    .limit(20);

  return data || [];
}

export async function getOrderByTable(tableId: string) {
  const { supabase } = await requireRoles(['admin', 'cashier', 'waiter']);
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (
        *,
        products (
          id, name, price, recipe_items (ingredient_id, amount_required)
        )
      )
    `)
    .eq('table_id', tableId)
    .eq('status', 'pending')
    .single();

  if (error || !data) return null;

  const cart = data.order_items.map((item: any) => ({
    id: item.product_id,
    name: item.products.name,
    price: Number(item.price),
    hpp: Number(item.hpp),
    qty: Number(item.quantity),
    recipe_items: item.products.recipe_items
  }));

  return { order: data, cart };
}
