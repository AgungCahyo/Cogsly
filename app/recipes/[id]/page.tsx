import { supabase } from '@/lib/supabase';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { RecipeBuilderForm } from '../new/RecipeBuilderForm';

export const dynamic = 'force-dynamic';

type IngredientRow = {
  id: string;
  name: string;
  unit: string | null;
  average_price: number | string | null;
  stock: number | string | null;
};

type RecipeItemRow = {
  ingredient_id: string;
  amount_required: number | string;
};

type ProductRow = {
  id: string;
  name: string;
  price: number | string;
  operational_cost_buffer: number | string | null;
  is_percentage_buffer: boolean | null;
  recipe_items: RecipeItemRow[] | null;
};

type SubmitRecipeInput = {
  name: string;
  price: number;
  operational_cost_buffer: number;
  is_percentage_buffer: boolean;
  items: { ingredient_id: string; amount_required: number }[];
};

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: ingredients } = await supabase
    .from('ingredients')
    .select('id, name, unit, average_price, stock')
    .returns<IngredientRow[]>()
    .order('name');

  const { data: product, error } = await supabase
    .from('products')
    .select(`id, name, price, operational_cost_buffer, is_percentage_buffer, recipe_items(ingredient_id, amount_required)`)
    .eq('id', id)
    .single()
    .returns<ProductRow>();

  if (error || !product) notFound();

  const initialRecipe = {
    name: product.name,
    price: Number(product.price) || 0,
    operational_cost_buffer: Number(product.operational_cost_buffer) || 0,
    is_percentage_buffer: Boolean(product.is_percentage_buffer),
    items: (product.recipe_items ?? []).map((i) => ({
      ingredient_id: i.ingredient_id,
      amount_required: Number(i.amount_required) || 0,
    })),
  };

  async function submitRecipe(data: SubmitRecipeInput) {
    'use server';

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

    const { error: deleteError } = await supabase.from('recipe_items').delete().eq('product_id', id);
    if (deleteError) throw new Error(deleteError.message);

    const recipeItems = data.items.map((item) => ({
      product_id: id,
      ingredient_id: item.ingredient_id,
      amount_required: item.amount_required,
    }));

    const { error: insertError } = await supabase.from('recipe_items').insert(recipeItems);
    if (insertError) throw new Error(insertError.message);

    redirect('/recipes');
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/recipes" className="btn-ghost" style={{ padding: '0.5rem', borderRadius: '10px' }}>
          <ArrowLeft style={{ width: '18px', height: '18px' }} />
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--gold)', fontFamily: 'var(--font-mono)' }}>
            ◆ Resep & HPP
          </p>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-serif)' }}>
            Edit Resep
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Update komposisi bahan dan perhitungan HPP
          </p>
        </div>
      </div>

      <RecipeBuilderForm
        ingredients={ingredients || []}
        submitRecipe={submitRecipe}
        initialRecipe={initialRecipe}
      />
    </div>
  );
}