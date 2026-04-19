// app/ingredients/new/page.tsx
import { createIngredient } from '@/lib/actions/ingredients';
import { IngredientForm } from '@/components/ingredients/IngredientForm';

export default function AddIngredientPage() {
  return <IngredientForm action={createIngredient} mode="create" />;
}