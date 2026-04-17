import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getProjectRef(url: string | undefined) {
  try {
    if (!url) return null;
    const host = new URL(url).host;
    const ref = host.split('.')[0] || null;
    return { host, ref };
  } catch {
    return null;
  }
}

export async function GET() {
  const project = getProjectRef(process.env.NEXT_PUBLIC_SUPABASE_URL);

  const [ingredients, products, purchases] = await Promise.all([
    supabase.from('ingredients').select('id', { count: 'exact', head: true }),
    supabase.from('products').select('id', { count: 'exact', head: true }),
    supabase.from('purchases').select('id', { count: 'exact', head: true }),
  ]);

  return NextResponse.json({
    supabaseProject: project,
    counts: {
      ingredients: ingredients.count ?? null,
      products: products.count ?? null,
      purchases: purchases.count ?? null,
    },
    errors: {
      ingredients: ingredients.error?.message ?? null,
      products: products.error?.message ?? null,
      purchases: purchases.error?.message ?? null,
    },
  });
}

