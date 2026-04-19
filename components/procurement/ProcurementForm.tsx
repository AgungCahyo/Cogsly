'use client';

import { useState, useRef, useMemo } from 'react';
import { UploadCloud, X, FileText, ChevronDown, Save } from 'lucide-react';
import Link from 'next/link';
import { IngredientOption } from '@/types';
import { StockPreview } from './StockPreview';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

export function ProcurementForm({
  ingredients,
  onSubmit,
}: {
  ingredients: IngredientOption[];
  onSubmit: (formData: FormData) => Promise<void>;
}) {
  const [selectedIngredient, setSelectedIngredient] = useState<IngredientOption | null>(null);
  const [quantity, setQuantity] = useState<number>(0);
  const [purchaseUnit, setPurchaseUnit] = useState('');
  const [conversion, setConversion] = useState<number>(1);
  const [useConversion, setUseConversion] = useState(false);
  const [receipt, setReceipt] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const ingredientOptions = useMemo(() => 
    ingredients.map(ing => ({
      label: `${ing.name} (${ing.unit})`,
      value: ing.id
    })), 
    [ingredients]
  );

  const handleIngredientChange = (id: string) => {
    const ing = ingredients.find(i => i.id === id) ?? null;
    setSelectedIngredient(ing);
    setPurchaseUnit('');
    setConversion(1);
    setUseConversion(false);
  };

  const baseUnit = selectedIngredient?.unit ?? '';

  return (
    <form action={onSubmit} className="space-y-8">
      {/* Ingredient Selection */}
      <Select
        label="Pilih Bahan Baku"
        name="ingredient_id"
        options={ingredientOptions}
        value={selectedIngredient?.id || ''}
        onChange={handleIngredientChange}
        placeholder="— Pilih bahan untuk di-restock —"
        required
      />

      {/* Supplier */}
      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400">
          Pemasok / Toko
        </label>
        <input
          type="text"
          name="supplier"
          required
          placeholder="cth. Toko Makmur, Pasar Induk"
          className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-zinc-950/5 focus:border-zinc-950 transition-all placeholder:text-zinc-200"
        />
      </div>

      {/* Quantity & Units */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400">
            Jumlah & Satuan Pembelian
          </label>
          {selectedIngredient && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">
              Unit Dasar: {baseUnit}
            </span>
          )}
        </div>
        
        <div className="bg-zinc-50 border border-zinc-200 rounded-3xl overflow-hidden divide-y divide-zinc-200 transition-all focus-within:border-zinc-950 focus-within:ring-2 focus-within:ring-zinc-950/5">
          <div className="flex items-stretch divide-x divide-zinc-200">
            <input
              type="number"
              name="quantity"
              required
              min="0.001"
              step="any"
              placeholder="0.00"
              value={quantity || ''}
              onChange={e => setQuantity(Number(e.target.value))}
              className="flex-1 bg-transparent border-none outline-none px-6 py-5 text-2xl font-bold font-mono tracking-tighter text-zinc-950 min-w-0 placeholder:text-zinc-200"
            />

            <div className="flex items-center px-6 bg-white shrink-0 min-w-[120px] justify-center">
              {useConversion ? (
                <input
                  type="text"
                  name="purchase_unit"
                  placeholder="cth. Botol"
                  value={purchaseUnit}
                  onChange={e => setPurchaseUnit(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm font-bold text-center w-full uppercase tracking-widest text-zinc-950 placeholder:text-zinc-200"
                />
              ) : (
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                  {baseUnit || 'Satuan'}
                </span>
              )}
            </div>
          </div>

          {selectedIngredient && (
            <div className="bg-white">
              {!useConversion ? (
                <button
                  type="button"
                  onClick={() => { setUseConversion(true); setPurchaseUnit(''); setConversion(1); }}
                  className="w-full flex items-center gap-2.5 px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-950 hover:bg-zinc-50 transition-all"
                >
                  <span className="text-sm font-normal">＋</span>
                  Ubah Satuan Beli (Dus, Botol, Karung…)
                </button>
              ) : (
                <div className="flex items-center divide-x divide-zinc-100 bg-zinc-50/50">
                  <span className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 shrink-0">
                    Konversi: 1 {purchaseUnit || '…'} =
                  </span>

                  <input
                    type="number"
                    name="unit_conversion"
                    min="0.001"
                    step="any"
                    placeholder="Nilai"
                    value={conversion === 1 ? '' : conversion}
                    onChange={e => setConversion(Number(e.target.value) || 1)}
                    className="flex-1 bg-transparent border-none outline-none py-4 text-sm font-bold font-mono tracking-tighter text-center text-zinc-950"
                  />

                  <span className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 shrink-0">
                    {baseUnit}
                  </span>

                  <button
                    type="button"
                    onClick={() => { setUseConversion(false); setPurchaseUnit(''); setConversion(1); }}
                    className="px-6 py-4 text-zinc-300 hover:text-zinc-950 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {!useConversion && <input type="hidden" name="unit_conversion" value="1" />}
        {!useConversion && <input type="hidden" name="purchase_unit" value="" />}

        {quantity > 0 && selectedIngredient && (
          <div className="pt-2 animate-in fade-in slide-in-from-top-1 duration-300">
            <StockPreview
              quantity={quantity}
              purchaseUnit={purchaseUnit}
              conversion={conversion}
              baseUnit={baseUnit}
            />
          </div>
        )}
      </div>

      {/* Total Price */}
      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400">
          Total Pembayaran (IDR)
        </label>
        <div className="relative group">
          <span className="absolute left-5 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-300 group-focus-within:text-zinc-950 transition-colors">
            Rp
          </span>
          <input
            type="number"
            name="price"
            required
            min="0"
            placeholder="0"
            className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl pl-12 pr-5 py-4 text-lg font-bold font-mono tracking-tighter text-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/5 focus:border-zinc-950 transition-all placeholder:text-zinc-200"
          />
        </div>
      </div>

      {/* Receipt Upload */}
      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400">
          Bukti Nota <span className="font-medium text-zinc-300 lowercase ml-1">(Opsional)</span>
        </label>

        {receipt ? (
          <div className="flex items-center gap-4 px-5 py-4 bg-zinc-950 text-white rounded-2xl shadow-lg border border-zinc-950 animate-in zoom-in-95 duration-200">
            <div className="p-2 bg-white/10 rounded-lg">
              <FileText className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold tracking-tight truncate flex-1">{receipt.name}</span>
            <button
              type="button"
              onClick={() => { setReceipt(null); if (fileRef.current) fileRef.current.value = ''; }}
              className="p-1 px-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <label
            htmlFor="receipt"
            className="flex flex-col items-center justify-center gap-3 px-6 py-8 bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-3xl cursor-pointer hover:border-zinc-950 hover:bg-white transition-all group"
          >
            <div className="p-3 bg-white rounded-xl shadow-sm border border-zinc-100 group-hover:bg-zinc-950 group-hover:text-white transition-colors">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-950">Klik untuk upload nota</p>
              <p className="text-[10px] uppercase tracking-widest text-zinc-300 mt-1">JPEG, PNG, atau PDF · Maks 5MB</p>
            </div>
          </label>
        )}
        <input
          ref={fileRef}
          id="receipt"
          name="receipt"
          type="file"
          className="hidden"
          accept="image/*,.pdf"
          onChange={e => setReceipt(e.target.files?.[0] ?? null)}
        />
      </div>

      {/* Action Buttons */}
      <div className="pt-8 flex justify-between items-center border-t border-zinc-100">
        <Link
          href="/procurement"
          className="text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-950 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/20 focus-visible:ring-offset-2 rounded-lg px-1"
        >
          Batal
        </Link>
        <Button type="submit" variant="primary" size="lg" className="normal-case tracking-tight text-sm font-bold">
          <Save className="w-4 h-4" aria-hidden />
          Simpan & Update Stok
        </Button>
      </div>
    </form>
  );
}
