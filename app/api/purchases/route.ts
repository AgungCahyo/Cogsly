import { NextResponse } from 'next/server';
import { authorizeApiRequest } from '@/lib/auth/server-auth';
import { PurchasePoint } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await authorizeApiRequest(['admin', 'warehouse', 'cashier']);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const ingredientId = searchParams.get('ingredient_id');

  if (!ingredientId) {
    return NextResponse.json({ error: 'ingredient_id is required' }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from('purchases')
    .select('date, price, quantity, purchase_unit, unit_conversion')
    .eq('ingredient_id', ingredientId)
    .order('date', { ascending: true })
    .limit(30)
    .returns<PurchasePoint[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}