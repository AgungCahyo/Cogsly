'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

type SaleCartRecipeItem = {
  ingredient_id: string;
  amount_required: number;
};

export type SaleCartItem = {
  id: string;
  price: number;
  hpp: number;
  qty: number;
  recipe_items?: SaleCartRecipeItem[] | null;
};

export async function processSale(cart: SaleCartItem[]) {
  // 1. Calculate totals
  let totalPrice = 0;
  let totalHPP = 0;
  
  cart.forEach(item => {
    totalPrice += (item.price * item.qty);
    totalHPP += (item.hpp * item.qty);
  });

  // 2. Insert Sale
  const { data: saleData, error: saleError } = await supabase
    .from('sales')
    .insert([{ total_price: totalPrice, total_hpp: totalHPP }])
    .select()
    .single();

  if (saleError || !saleData) {
    console.error("Sale insert error", saleError);
    throw new Error("Failed to create sale record");
  }

  // 3. Insert Sale Items
  const saleItems = cart.map(item => ({
    sale_id: saleData.id,
    product_id: item.id,
    quantity: item.qty,
    price: item.price,
    hpp: item.hpp
  }));

  const { error: itemsError } = await supabase
    .from('sale_items')
    .insert(saleItems);

  if (itemsError) {
    console.error("Sale items insert error", itemsError);
    throw new Error("Failed to save sale items");
  }

  // 4. Deduct Ingredients
  // Group all ingredient needs
  const ingredientMap: Record<string, number> = {};
  
  cart.forEach(item => {
    item.recipe_items?.forEach((recipeItem) => {
      const ingId = recipeItem.ingredient_id;
      const amountNeeded = recipeItem.amount_required * item.qty;
      if (ingredientMap[ingId]) {
        ingredientMap[ingId] += amountNeeded;
      } else {
        ingredientMap[ingId] = amountNeeded;
      }
    });
  });

  // Fetch current stock for these ingredients
  const ingredientIds = Object.keys(ingredientMap);
  if (ingredientIds.length > 0) {
    const { data: currentIngredients } = await supabase
      .from('ingredients')
      .select('id, stock')
      .in('id', ingredientIds);

    if (currentIngredients) {
      // Prepare updates
      // In a real production app we'd want to use a stored procedure / RPC for atomic deduction.
      // But standard updates are ok for this demo.
      const updates = currentIngredients.map((ing: { id: string; stock: number | string | null }) => {
        const needed = ingredientMap[ing.id] || 0;
        const newStock = Number(ing.stock) - needed;
        return {
          id: ing.id,
          stock: newStock
        };
      });

      // Execute updates one by one (or upsert if setup properly)
      for (const update of updates) {
         await supabase
           .from('ingredients')
           .update({ stock: update.stock })
           .eq('id', update.id);
      }
    }
  }

  revalidatePath('/pos');
  revalidatePath('/ingredients');
  revalidatePath('/');
  
  return true;
}
