'use client';

import { useState, useRef } from 'react';
import { UploadCloud, X, FileText, ChevronDown, Save } from 'lucide-react';
import Link from 'next/link';

import { IngredientOption } from '@/types';

// Live preview of what will be added to stock
function StockPreview({
  quantity,
  purchaseUnit,
  conversion,
  baseUnit,
}: {
  quantity: number;
  purchaseUnit: string;
  conversion: number;
  baseUnit: string;
}) {
  if (!quantity || quantity <= 0) return null;
  const stockAdded = quantity * (conversion > 0 ? conversion : 1);
  const hasConversion = purchaseUnit && conversion !== 1;

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs bg-gold-glow border border-gold-muted/30">
      <span className="text-text-muted">Stok bertambah:</span>
      {hasConversion && (
        <>
          <span className="stat-number font-semibold text-text-secondary">
            {quantity} {purchaseUnit}
          </span>
          <span className="text-text-muted">×</span>
          <span className="stat-number font-semibold text-text-secondary">
            {conversion} {baseUnit}
          </span>
          <span className="text-text-muted">=</span>
        </>
      )}
      <span className="stat-number font-bold text-gold">
        +{stockAdded.toLocaleString('id-ID')} {baseUnit}
      </span>
    </div>
  );
}

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

  const baseUnit = selectedIngredient?.unit ?? '';
  const effectiveUnit = useConversion && purchaseUnit ? purchaseUnit : baseUnit;

  return (
    <form action={onSubmit} className="space-y-5">
      {/* Ingredient */}
      <div>
        <label className="block text-sm font-medium mb-1.5 text-text-secondary">
          Bahan Baku
        </label>
        <div className="relative">
          <select
            name="ingredient_id"
            required
            className="input-base !appearance-none pr-10"
            onChange={e => {
              const ing = ingredients.find(i => i.id === e.target.value) ?? null;
              setSelectedIngredient(ing);
              setPurchaseUnit('');
              setConversion(1);
              setUseConversion(false);
            }}
          >
            <option value="">— Pilih bahan —</option>
            {ingredients.map(ing => (
              <option key={ing.id} value={ing.id}>
                {ing.name} ({ing.unit})
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-text-muted" />
        </div>
      </div>

      {/* Supplier */}
      <div>
        <label className="block text-sm font-medium mb-1.5 text-text-secondary">
          Pemasok / Toko
        </label>
        <input
          type="text"
          name="supplier"
          required
          placeholder="cth. Toko Makmur, Pasar Induk"
          className="input-base"
        />
      </div>

      {/* Quantity block — the key redesigned section */}
      <div>
        <label className="block text-sm font-medium mb-1.5 text-text-secondary">
          Jumlah & Satuan Pembelian
        </label>
        {selectedIngredient && (
          <p className="text-xs mb-3 text-text-muted">
            Masukkan jumlah dalam satuan pembelian. Jika satuan pembelian berbeda dari satuan dasar ({baseUnit}), gunakan konversi untuk menghitung stok yang bertambah.
          </p>
        )}

        {/* Main quantity row */}
        <div className="rounded-xl overflow-hidden border border-border bg-bg-elevated">
          {/* Row 1: quantity + unit */}
          <div className="flex items-stretch">
            {/* Quantity input */}
            <input
              type="number"
              name="quantity"
              required
              min="0.001"
              step="any"
              placeholder="0"
              value={quantity || ''}
              onChange={e => setQuantity(Number(e.target.value))}
              className="flex-1 bg-transparent border-none outline-none px-4 py-3 text-lg font-bold stat-number text-text-primary min-w-0"
            />

            {/* Unit pill — shows effective unit */}
            <div className="flex items-center px-4 shrink-0 border-l border-border bg-bg-card">
              {useConversion ? (
                <input
                  type="text"
                  name="purchase_unit"
                  placeholder="botol"
                  value={purchaseUnit}
                  onChange={e => setPurchaseUnit(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm font-semibold text-center w-20 text-gold"
                />
              ) : (
                <span className="text-sm font-semibold text-text-secondary">
                  {baseUnit || 'satuan'}
                </span>
              )}
            </div>
          </div>

          {/* Row 2: conversion toggle + fields (only if ingredient selected) */}
          {selectedIngredient && (
            <div className="border-t border-border">
              {!useConversion ? (
                <button
                  type="button"
                  onClick={() => { setUseConversion(true); setPurchaseUnit(''); setConversion(1); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-xs transition-colors text-text-muted bg-transparent hover:text-gold"
                >
                  <span className="text-base leading-none">＋</span>
                  Beli per kemasan? (botol, karung, dus…)
                </button>
              ) : (
                <div className="flex items-center gap-0 bg-bg-elevated">
                  {/* Conversion label */}
                  <span className="px-4 py-2.5 text-xs shrink-0 text-text-muted">
                    1 {purchaseUnit || '…'} =
                  </span>

                  {/* Conversion value */}
                  <input
                    type="number"
                    name="unit_conversion"
                    min="0.001"
                    step="any"
                    placeholder="750"
                    value={conversion === 1 ? '' : conversion}
                    onChange={e => setConversion(Number(e.target.value) || 1)}
                    className="flex-1 bg-transparent border-none outline-none py-2.5 text-sm font-bold stat-number text-center text-text-primary min-w-0"
                  />

                  {/* Base unit label */}
                  <span className="px-3 py-2.5 text-xs shrink-0 text-text-secondary">
                    {baseUnit}
                  </span>

                  {/* Remove conversion */}
                  <button
                    type="button"
                    onClick={() => { setUseConversion(false); setPurchaseUnit(''); setConversion(1); }}
                    className="px-3 py-2.5 transition-colors text-text-muted border-l border-border hover:text-danger"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Hidden field for unit_conversion when not using conversion */}
        {!useConversion && <input type="hidden" name="unit_conversion" value="1" />}
        {!useConversion && <input type="hidden" name="purchase_unit" value="" />}

        {/* Live preview */}
        {quantity > 0 && selectedIngredient && (
          <div className="mt-2">
            <StockPreview
              quantity={quantity}
              purchaseUnit={purchaseUnit}
              conversion={conversion}
              baseUnit={baseUnit}
            />
          </div>
        )}
      </div>

      {/* Total price */}
      <div>
        <label className="block text-sm font-medium mb-1.5 text-text-secondary">
          Total Harga (Rp)
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-text-muted">
            Rp
          </span>
          <input
            type="number"
            name="price"
            required
            min="0"
            placeholder="150.000"
            className="input-base stat-number pl-11"
          />
        </div>
      </div>

      {/* Receipt upload */}
      <div>
        <label className="block text-sm font-medium mb-1.5 text-text-secondary">
          Bukti Nota <span className="font-normal text-text-muted">(opsional)</span>
        </label>

        {receipt ? (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-bg-elevated border border-border">
            <FileText className="w-4 h-4 shrink-0 text-gold" />
            <span className="text-sm flex-1 truncate text-text-primary">{receipt.name}</span>
            <button
              type="button"
              onClick={() => { setReceipt(null); if (fileRef.current) fileRef.current.value = ''; }}
              className="text-text-muted hover:text-danger"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <label
            htmlFor="receipt"
            className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer upload-interactive"
          >
            <UploadCloud className="w-4 h-4 shrink-0 text-text-muted" />
            <span className="text-sm text-text-secondary">
              <span className="font-medium text-gold">Klik untuk upload</span> atau seret file · JPEG, PNG, PDF
            </span>
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

      {/* Footer */}
      <div className="pt-4 flex justify-between items-center border-t border-border">
        <Link href="/procurement" className="btn-ghost text-sm">Batal</Link>
        <button type="submit" className="btn-primary">
          <Save className="w-4 h-4" />
          Simpan & Update Stok
        </button>
      </div>
    </form>
  );
}