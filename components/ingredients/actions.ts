'use server';

import { authorizeApiRequest } from '@/lib/auth/server-auth';
import { PurchasePoint } from '@/types';

export async function getPurchaseTrends(ingredientId: string): Promise<{ data?: PurchasePoint[], error?: string }> {
  try {
    const auth = await authorizeApiRequest(['admin', 'warehouse', 'cashier']);
    if (!auth.ok) return { error: 'Unauthorized' };

    if (!ingredientId) {
      return { error: 'ingredient_id is required' };
    }

    const { data, error } = await auth.supabase
      .from('purchases')
      .select('date, price, quantity, purchase_unit, unit_conversion')
      .eq('ingredient_id', ingredientId)
      .order('date', { ascending: true })
      .limit(30)
      .returns<PurchasePoint[]>();

    if (error) {
      return { error: error.message };
    }

    return { data: data ?? [] };
  } catch (err: any) {
    return { error: err.message ?? 'Unknown error' };
  }
}
