'use server';

import { revalidatePath } from 'next/cache';
import { requireRoles } from '@/lib/auth/server-auth';

const WASTE_ROLES = ['admin', 'warehouse'] as const;

export async function logWaste(formData: FormData) {
  const { supabase } = await requireRoles([...WASTE_ROLES]);
  const { data: { user } } = await supabase.auth.getUser();

  const ingredient_id = formData.get('ingredient_id') as string;
  const quantity = Number(formData.get('quantity'));
  const reason = formData.get('reason') as string;

  // 1. Log the waste
  const { error: logError } = await supabase
    .from('waste_logs')
    .insert([{
      ingredient_id,
      quantity,
      reason,
      logged_by: user?.id
    }]);

  if (logError) throw new Error(logError.message);

  // 2. Deduct from stock
  const { data: ing } = await supabase
    .from('ingredients')
    .select('stock')
    .eq('id', ingredient_id)
    .single();

  if (ing) {
    const newStock = Number(ing.stock) - quantity;
    await supabase
      .from('ingredients')
      .update({ stock: newStock })
      .eq('id', ingredient_id);
  }

  revalidatePath('/ingredients');
  revalidatePath('/ingredients/waste');
  revalidatePath('/');
  
  return true;
}

export async function getWasteLogs() {
  const { supabase } = await requireRoles([...WASTE_ROLES]);
  const { data } = await supabase
    .from('waste_logs')
    .select('*, ingredients(name, unit)')
    .order('created_at', { ascending: false })
    .limit(50);

  return data || [];
}
