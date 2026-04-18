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
    const { data: productData, error: productError } = await supabase
      .from('products')
      .insert([{ name: data.name, price: data.price, operational_cost_buffer: data.operational_cost_buffer, is_percentage_buffer: data.is_percentage_buffer }])
      .select()
      .single();

    if (productError || !productData) throw new Error('Gagal membuat produk');

    const recipeItems = data.items.map((item) => ({
      product_id: productData.id,
      ingredient_id: item.ingredient_id,
      amount_required: item.amount_required
    }));

    const { error: itemsError } = await supabase.from('recipe_items').insert(recipeItems);
    if (itemsError) throw new Error('Gagal menambahkan bahan resep');
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/recipes" className="btn-ghost" style={{ padding: '0.5rem', borderRadius: '10px' }}>
          <ArrowLeft style={{ width: '18px', height: '18px' }} />
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--gold)', fontFamily: 'DM Mono, monospace' }}>
            ◆ Resep & HPP
          </p>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'DM Serif Display, serif' }}>
            Buat Resep Baru
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Kombinasikan bahan baku dan hitung HPP secara otomatis
          </p>
        </div>
      </div>
      <RecipeBuilderForm ingredients={ingredients || []} submitRecipe={submitRecipe} />
    </div>
  );
}