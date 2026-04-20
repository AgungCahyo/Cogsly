'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Save } from 'lucide-react';
import { IngredientOption } from '@/types';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';

type ComponentRow = {
  ingredient_id: string;
  amount_required: number;
};

export function InternalProductionForm({
  ingredients,
  onSubmit,
  serverError,
}: {
  ingredients: IngredientOption[];
  onSubmit: (formData: FormData) => Promise<void>;
  serverError?: string | null;
}) {
  const [outputIngredientId, setOutputIngredientId] = useState('');
  const [outputQuantity, setOutputQuantity] = useState<number>(0);
  const [extraCost, setExtraCost] = useState<number>(0);
  const [sourceDetail, setSourceDetail] = useState('');
  const [componentRows, setComponentRows] = useState<ComponentRow[]>([
    { ingredient_id: '', amount_required: 0 },
  ]);

  const ingredientOptions = useMemo(
    () =>
      ingredients.map((ing) => ({
        value: ing.id,
        label: `${ing.name} (${ing.unit ?? '-'})`,
      })),
    [ingredients]
  );

  const outputIngredient = useMemo(
    () => ingredients.find((ing) => ing.id === outputIngredientId) ?? null,
    [ingredients, outputIngredientId]
  );

  const rowsPayload = JSON.stringify(
    componentRows
      .filter((row) => row.ingredient_id && Number(row.amount_required) > 0)
      .map((row) => ({
        ingredient_id: row.ingredient_id,
        amount_required: Number(row.amount_required),
      }))
  );

  const rowChecks = componentRows.map((row) => {
    const ing = ingredients.find((item) => item.id === row.ingredient_id);
    const required = Number(row.amount_required) || 0;
    const available = Number(ing?.stock) || 0;
    const isSelected = Boolean(row.ingredient_id);
    const isInvalidQty = isSelected && required <= 0;
    const isInsufficient = isSelected && required > 0 && required > available;
    return {
      ingredient: ing,
      required,
      available,
      isSelected,
      isInvalidQty,
      isInsufficient,
    };
  });

  const hasInvalidComponent = rowChecks.some((row) => row.isInvalidQty || row.isInsufficient);
  const hasAtLeastOneValidComponent = rowChecks.some(
    (row) => row.isSelected && row.required > 0 && !row.isInsufficient
  );
  const canSubmit =
    Boolean(outputIngredientId) &&
    Number(outputQuantity) > 0 &&
    hasAtLeastOneValidComponent &&
    !hasInvalidComponent;

  const addRow = () => {
    setComponentRows((rows) => [...rows, { ingredient_id: '', amount_required: 0 }]);
  };

  const removeRow = (idx: number) => {
    setComponentRows((rows) => rows.filter((_, rowIdx) => rowIdx !== idx));
  };

  const updateRow = (idx: number, patch: Partial<ComponentRow>) => {
    setComponentRows((rows) =>
      rows.map((row, rowIdx) => (rowIdx === idx ? { ...row, ...patch } : row))
    );
  };

  return (
    <form action={onSubmit} className="space-y-8">
      {serverError && (
        <div className="p-4 rounded-2xl border border-red-200 bg-red-50">
          <p className="text-xs font-semibold text-red-700 leading-relaxed">{serverError}</p>
        </div>
      )}

      <input type="hidden" name="stock_source" value="internal" />
      <input type="hidden" name="components_json" value={rowsPayload} />

      <Select
        label="Bahan Hasil Produksi"
        name="ingredient_id"
        value={outputIngredientId}
        onChange={setOutputIngredientId}
        options={ingredientOptions}
        placeholder="— Pilih bahan hasil —"
        required
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400">
            Jumlah Hasil
          </label>
          <div className="relative">
            <input
              type="number"
              name="quantity"
              required
              min="0.001"
              step="any"
              value={outputQuantity || ''}
              onChange={(e) => setOutputQuantity(Number(e.target.value))}
              placeholder="0.00"
              className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-5 py-4 text-base font-bold font-mono tracking-tight text-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/5 focus:border-zinc-950"
            />
            {outputIngredient?.unit && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                {outputIngredient.unit}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400">
            Biaya Tambahan (Opsional)
          </label>
          <div className="relative">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-300">
              Rp
            </span>
            <input
              type="number"
              name="extra_cost"
              min="0"
              step="any"
              value={extraCost || ''}
              onChange={(e) => setExtraCost(Number(e.target.value))}
              placeholder="0"
              className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl pl-12 pr-5 py-4 text-base font-bold font-mono tracking-tight text-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/5 focus:border-zinc-950"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400">
          Catatan / Sumber Produksi
        </label>
        <input
          type="text"
          name="supplier"
          value={sourceDetail}
          onChange={(e) => setSourceDetail(e.target.value)}
          placeholder="cth. Shift Pagi - Kitchen Batch A"
          className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-zinc-950/5 focus:border-zinc-950 transition-all placeholder:text-zinc-200"
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400">
            Komponen yang Dipakai
          </label>
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-200 text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:bg-zinc-50 hover:border-zinc-950 hover:text-zinc-950 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah Komponen
          </button>
        </div>

        <div className="space-y-3">
          {componentRows.map((row, idx) => {
            const selected = ingredients.find((ing) => ing.id === row.ingredient_id);
            const check = rowChecks[idx];
            return (
              <div
                key={`component-${idx}`}
                className="grid grid-cols-1 md:grid-cols-[1fr_180px_auto] gap-3 items-start"
              >
                <div className="space-y-2">
                  <Select
                    options={ingredientOptions.filter((opt) => opt.value !== outputIngredientId)}
                    value={row.ingredient_id}
                    onChange={(value) => updateRow(idx, { ingredient_id: value })}
                    placeholder="Pilih bahan komponen"
                    searchable
                    required={idx === 0}
                  />
                  {check?.isSelected && (
                    <p
                      className={`text-[10px] font-bold uppercase tracking-widest ${
                        check.isInsufficient ? 'text-red-500' : 'text-zinc-400'
                      }`}
                    >
                      Stok: {check.available.toLocaleString('id-ID')} {check.ingredient?.unit ?? ''}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type="number"
                      min="0.001"
                      step="any"
                      value={row.amount_required || ''}
                      onChange={(e) =>
                        updateRow(idx, { amount_required: Number(e.target.value) || 0 })
                      }
                      placeholder="0.00"
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-5 py-3.5 text-sm font-bold font-mono tracking-tight text-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/5 focus:border-zinc-950"
                    />
                    {selected?.unit && (
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                        {selected.unit}
                      </span>
                    )}
                  </div>
                  {check?.isSelected && check.isInvalidQty && (
                    <p className="text-[10px] font-bold uppercase tracking-widest text-red-500">
                      Qty komponen harus lebih dari 0
                    </p>
                  )}
                  {check?.isSelected && !check.isInvalidQty && check.isInsufficient && (
                    <p className="text-[10px] font-bold uppercase tracking-widest text-red-500">
                      Kurang {Math.max(0, check.required - check.available).toLocaleString('id-ID')} {check.ingredient?.unit ?? ''}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeRow(idx)}
                  disabled={componentRows.length === 1}
                  className="h-[46px] w-[46px] inline-flex items-center justify-center rounded-2xl border border-zinc-200 text-zinc-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  aria-label="Hapus komponen"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
        <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
          Submit produksi akan langsung mengurangi stok komponen dan menambah stok bahan hasil.
          Pastikan formulasi sudah benar.
        </p>
      </div>
      {hasInvalidComponent && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
          <p className="text-[10px] text-red-700 font-semibold leading-relaxed">
            Masih ada komponen dengan stok tidak cukup atau qty tidak valid. Perbaiki dulu sebelum proses produksi.
          </p>
        </div>
      )}

      <div className="pt-8 flex justify-between items-center border-t border-zinc-100">
        <Link
          href="/procurement"
          className="text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-950 transition-all"
        >
          Batal
        </Link>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={!canSubmit}
          className="normal-case tracking-tight text-sm font-bold"
        >
          <Save className="w-4 h-4" aria-hidden />
          Proses Produksi
        </Button>
      </div>
    </form>
  );
}
