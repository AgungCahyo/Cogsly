import { supabase } from '@/lib/supabase';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { RecipeBuilderForm } from './RecipeBuilderForm';

export const dynamic = 'force-dynamic';

type IngredientRow = {
  id: string;
  name: string;
  unit: string | null;
  average_price: number | string | null;
};

type SubmitRecipeInput = {
  name: string;
  price: number;
  operational_cost_buffer: number;
  is_percentage_buffer: boolean;
  items: { ingredient_id: string; amount_required: number }[];
};

export default async function NewRecipePage() {
  const { data: ingredients } = await supabase
    .from('ingredients')
    .select('id, name, unit, average_price')
    .returns<IngredientRow[]>()
    .order('name');

  async function submitRecipe(data: SubmitRecipeInput) {
    'use server';

    // 1. Insert product
    const { data: productData, error: productError } = await supabase
      .from('products')
      .insert([{
        name: data.name,
        price: data.price,
        operational_cost_buffer: data.operational_cost_buffer,
        is_percentage_buffer: data.is_percentage_buffer
      }])
      .select()
      .single();

    if (productError || !productData) {
      throw new Error("Failed to create product");
    }

    // 2. Insert recipe items
    const recipeItems = data.items.map((item) => ({
      product_id: productData.id,
      ingredient_id: item.ingredient_id,
      amount_required: item.amount_required
    }));

    const { error: itemsError } = await supabase
      .from('recipe_items')
      .insert(recipeItems);

    if (itemsError) {
      // In a real app we'd rollback product creation or use an RPC/Transaction
      throw new Error("Failed to add recipe items");
    }

  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Link 
          href="/recipes" 
          className="w-10 h-10 rounded-xl bg-[#111] border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Recipe Builder & HPP</h1>
          <p className="text-zinc-500 text-sm">Create a new product by combining ingredients. HPP will calculate automatically.</p>
        </div>
      </div>

      <RecipeBuilderForm ingredients={ingredients || []} submitRecipe={submitRecipe} />
    </div>
  );
}
