import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { IngredientForm } from '@/components/ingredients/IngredientForm';
import { updateIngredient } from '@/lib/actions/ingredients';
import { Ingredient } from '@/types';

export const dynamic = 'force-dynamic';

export default async function EditIngredientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: ingredient, error } = await supabase
    .from('ingredients')
    .select('id, name, category, unit, low_stock_threshold')
    .eq('id', id)
    .single()
    .returns<Ingredient>();

  if (error || !ingredient) notFound();

  const updateAction = updateIngredient.bind(null, id);

  const defaultValues = {
    name: ingredient.name,
    category: ingredient.category ?? '',
    unit: ingredient.unit ?? '',
    low_stock_threshold: String(ingredient.low_stock_threshold ?? 0),
  };

  return (
    <IngredientForm 
      action={updateAction} 
      mode="edit" 
      defaultValues={defaultValues} 
    />
  );
}