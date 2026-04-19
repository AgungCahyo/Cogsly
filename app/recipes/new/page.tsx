import { createClient } from '@/lib/supabase/server';
import { UtensilsCrossed } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { RecipeBuilderForm } from '@/components/recipes/RecipeBuilderForm';
import { createRecipe } from '@/lib/actions/recipes';

export const dynamic = 'force-dynamic';

import { IngredientOption } from '@/types';

export default async function NewRecipePage() {
  const supabase = await createClient();
  const { data: ingredients } = await supabase
    .from('ingredients')
    .select('id, name, unit, average_price, stock')
    .returns<IngredientOption[]>()
    .order('name');

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-10">
      <PageHeader
        eyebrow="◆ Resep & HPP"
        title="Buat Resep Baru"
        description="Kombinasikan bahan baku dan hitung HPP secara otomatis"
        backHref="/recipes"
        icon={<UtensilsCrossed className="h-6 w-6" aria-hidden />}
      />
      <RecipeBuilderForm ingredients={ingredients || []} submitRecipe={createRecipe} />
    </div>
  );
}
