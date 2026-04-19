'use server';

import { revalidatePath } from 'next/cache';
import { RecipeInput } from '@/types';
import { requireRoles } from '@/lib/auth/server-auth';

export async function createRecipe(data: RecipeInput) {
  const { supabase } = await requireRoles(['admin']);

  const { data: productData, error: productError } = await supabase
    .from('products')
    .insert([{
      name: data.name,
      price: data.price,
      operational_cost_buffer: data.operational_cost_buffer,
      is_percentage_buffer: data.is_percentage_buffer,
    }])
    .select()
    .single();

  if (productError || !productData) throw new Error('Gagal membuat produk');

  const recipeItems = data.items.map((item) => ({
    product_id: productData.id,
    ingredient_id: item.ingredient_id,
    amount_required: item.amount_required,
  }));

  const { error: itemsError } = await supabase.from('recipe_items').insert(recipeItems);
  if (itemsError) throw new Error('Gagal menambahkan bahan resep');

  revalidatePath('/recipes');
  return { success: true };
}

export async function updateRecipe(id: string, data: RecipeInput) {
  const { supabase } = await requireRoles(['admin']);

  const name = (data.name ?? '').trim();
  if (!name) throw new Error('Nama produk wajib diisi.');
  if (!Number.isFinite(data.price) || data.price < 0) throw new Error('Harga harus angka non-negatif yang valid.');

  const { error: productError } = await supabase
    .from('products')
    .update({
      name,
      price: data.price,
      operational_cost_buffer: data.operational_cost_buffer,
      is_percentage_buffer: data.is_percentage_buffer,
    })
    .eq('id', id);

  if (productError) throw new Error(productError.message);

  // Delete old recipe items and insert new ones
  const { error: deleteError } = await supabase.from('recipe_items').delete().eq('product_id', id);
  if (deleteError) throw new Error(deleteError.message);

  const recipeItems = data.items.map((item) => ({
    product_id: id,
    ingredient_id: item.ingredient_id,
    amount_required: item.amount_required,
  }));

  const { error: insertError } = await supabase.from('recipe_items').insert(recipeItems);
  if (insertError) throw new Error(insertError.message);

  revalidatePath('/recipes');
  revalidatePath(`/recipes/${id}`);
  return { success: true };
}
