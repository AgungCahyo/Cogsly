import { createClient } from '@/lib/supabase/server';
import { PackagePlus } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { InternalProductionForm } from '@/components/procurement/InternalProductionForm';
import { submitInternalProduction } from '@/lib/actions/procurement';
import { IngredientOption } from '@/types';

export const dynamic = 'force-dynamic';

export default async function InternalProductionPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const errorParam = params.error;
  const errorMessage = Array.isArray(errorParam) ? errorParam[0] : errorParam;

  const supabase = await createClient();
  const { data: ingredients } = await supabase
    .from('ingredients')
    .select('id, name, unit, average_price, stock')
    .returns<IngredientOption[]>()
    .order('name');

  return (
    <div className="p-6 lg:p-10 max-w-3xl mx-auto space-y-10">
      <PageHeader
        eyebrow="◆ Pengadaan"
        title="Produksi Internal"
        backHref="/procurement"
        icon={<PackagePlus className="h-6 w-6" aria-hidden />}
      />

      <div className="bg-white border border-zinc-200 rounded-3xl p-8 md:p-10 shadow-sm shadow-zinc-950/5">
        <InternalProductionForm
          ingredients={ingredients || []}
          onSubmit={submitInternalProduction}
          serverError={errorMessage ?? null}
        />
      </div>
    </div>
  );
}
