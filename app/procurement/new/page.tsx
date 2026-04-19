import { createClient } from '@/lib/supabase/server';
import { PackagePlus } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { ProcurementForm } from '@/components/procurement/ProcurementForm';
import { submitPurchase } from '@/lib/actions/procurement';
import { IngredientOption } from '@/types';

export const dynamic = 'force-dynamic';

export default async function AddPurchasePage() {
  const supabase = await createClient();
  const { data: ingredients } = await supabase
    .from('ingredients')
    .select('id, name, unit')
    .returns<IngredientOption[]>()
    .order('name');

  return (
    <div className="p-6 lg:p-10 max-w-2xl mx-auto space-y-10">
      <PageHeader
        eyebrow="◆ Pengadaan"
        title="Catat Pembelian"
        backHref="/procurement"
        icon={<PackagePlus className="h-6 w-6" aria-hidden />}
      />

      <div className="bg-white border border-zinc-200 rounded-3xl p-8 md:p-10 shadow-sm shadow-zinc-950/5">
        <ProcurementForm ingredients={ingredients || []} onSubmit={submitPurchase} />
      </div>
    </div>
  );
}
