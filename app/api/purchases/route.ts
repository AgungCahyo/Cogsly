import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type PurchaseRow = {
  date: string;
  price: number | string;
  quantity: number | string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ingredientId = searchParams.get('ingredient_id');

  if (!ingredientId) {
    return NextResponse.json({ error: 'ingredient_id is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('purchases')
    .select('date, price, quantity')
    .eq('ingredient_id', ingredientId)
    .order('date', { ascending: true })
    .limit(30)
    .returns<PurchaseRow[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}

