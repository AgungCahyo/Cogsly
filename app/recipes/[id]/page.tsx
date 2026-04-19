import { createClient } from '@/lib/supabase/server';
import { UtensilsCrossed } from 'lucide-react';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { RecipeBuilderForm } from '@/components/recipes/RecipeBuilderForm';
import { updateRecipe } from '@/lib/actions/recipes';

export const dynamic = 'force-dynamic';

import { IngredientOption, ProductRow, RecipeItemRow } from '@/types';

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: ingredients } = await supabase
    .from('ingredients')
    .select('id, name, unit, average_price, stock')
    .returns<IngredientOption[]>()
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
    items: (product.recipe_items ?? []).map((i: RecipeItemRow) => ({
      ingredient_id: i.ingredient_id || '',
      amount_required: Number(i.amount_required) || 0,
    })),
  };

  const updateAction = updateRecipe.bind(null, id);

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-10">
      <PageHeader
        eyebrow="◆ Resep & HPP"
        title="Edit Resep Produk"
        description="Update komposisi bahan dan penyesuaian perhitungan biaya"
        backHref="/recipes"
        icon={<UtensilsCrossed className="h-6 w-6" aria-hidden />}
      />

      <RecipeBuilderForm
        ingredients={ingredients || []}
        submitRecipe={updateAction}
        initialRecipe={initialRecipe}
      />
    </div>
  );
}
