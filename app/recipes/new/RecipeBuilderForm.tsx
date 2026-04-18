'use client';

import { useState } from 'react';
import { Save, Plus, Trash2, Calculator, TrendingUp, Package, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { IngredientOption, RecipeInput } from '@/types';

export function RecipeBuilderForm({
  ingredients,
  submitRecipe,
  initialRecipe,
}: {
  ingredients: IngredientOption[];
  submitRecipe: (data: RecipeInput) => Promise<void>;
  initialRecipe?: RecipeInput;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialRecipe?.name ?? '');
  const [price, setPrice] = useState<number | ''>(initialRecipe?.price ?? '');
  const [buffer, setBuffer] = useState<number | ''>(initialRecipe?.operational_cost_buffer ?? 0);
  const [isPercent, setIsPercent] = useState(initialRecipe?.is_percentage_buffer ?? true);
  const [items, setItems] = useState<{ id: string; ingredient_id: string; amount: number | '' }[]>(() =>
    (initialRecipe?.items?.length ? initialRecipe.items : [{ ingredient_id: '', amount_required: 0 }]).map(
      (i, idx) => ({
        id: `${i.ingredient_id || 'item'}-${idx}`,
        ingredient_id: i.ingredient_id,
        amount: i.amount_required || '',
      })
    )
  );
  const [loading, setLoading] = useState(false);

  const addItem = () => setItems([...items, { id: Date.now().toString(), ingredient_id: '', amount: '' }]);
  const removeItem = (id: string) => { if (items.length > 1) setItems(items.filter(i => i.id !== id)); };
  const updateItem = (id: string, field: 'ingredient_id' | 'amount', value: string | number) =>
    setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));

  const rawMaterialHPP = items.reduce((sum, item) => {
    if (!item.ingredient_id || !item.amount) return sum;
    const ing = ingredients.find(i => i.id === item.ingredient_id);
    if (!ing) return sum;
    return sum + (Number(item.amount) * Number(ing.average_price));
  }, 0);

  const opCost = isPercent ? (Number(buffer) / 100) * rawMaterialHPP : Number(buffer);
  const totalHPP = rawMaterialHPP + opCost;
  const margin = Number(price) - totalHPP;
  const marginPercent = Number(price) > 0 ? (margin / Number(price)) * 100 : 0;

  // Check if any ingredient has insufficient stock
  const stockWarnings = items
    .filter(item => item.ingredient_id && item.amount)
    .map(item => {
      const ing = ingredients.find(i => i.id === item.ingredient_id);
      if (!ing) return null;
      const stock = Number(ing.stock) || 0;
      const needed = Number(item.amount) || 0;
      if (needed > stock) return { name: ing.name, stock, needed, unit: ing.unit };
      return null;
    })
    .filter(Boolean) as { name: string; stock: number; needed: number; unit: string | null }[];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const validItems = items.filter(i => i.ingredient_id && i.amount);
    if (validItems.length === 0) {
      alert('Tambahkan minimal satu bahan yang valid.');
      setLoading(false);
      return;
    }
    try {
      await submitRecipe({
        name, price: Number(price),
        operational_cost_buffer: Number(buffer),
        is_percentage_buffer: isPercent,
        items: validItems.map(i => ({ ingredient_id: i.ingredient_id, amount_required: Number(i.amount) }))
      });
      router.push('/recipes');
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan resep.');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: builder */}
      <div className="lg:col-span-2 space-y-5">
        {/* Product info */}
        <div className="rounded-2xl p-6 bg-bg-card border border-border">
          <h2 className="font-bold mb-5 text-sm uppercase tracking-wider text-gold font-mono">
            Detail Produk
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-text-secondary">Nama Produk</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="cth. Iced Cafe Latte"
                className="input-base"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-text-secondary">Harga Jual (Rp)</label>
              <input
                type="number"
                required
                min="0"
                value={price}
                onChange={e => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0"
                className="input-base"
              />
            </div>
          </div>
        </div>

        {/* Recipe composition */}
        <div className="rounded-2xl p-6 bg-bg-card border border-border">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-sm uppercase tracking-wider text-gold font-mono">
              Komposisi Resep
            </h2>
            <span className="text-xs text-text-muted">{items.filter(i => i.ingredient_id).length} bahan dipilih</span>
          </div>

          <div className="space-y-2.5">
            {items.map((item, itemIdx) => {
              const selectedIng = ingredients.find(i => i.id === item.ingredient_id);
              const stock = Number(selectedIng?.stock) || 0;
              const needed = Number(item.amount) || 0;
              const isLowStock = selectedIng && needed > 0 && needed > stock;
              const hasStock = selectedIng && stock > 0;

              return (
                <div
                  key={item.id}
                  className={`rounded-xl overflow-hidden border ${
                    isLowStock ? 'border-danger/30 bg-danger/5' : 'border-border bg-bg-elevated'
                  }`}
                >
                  <div className="flex items-center gap-3 p-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold bg-gold-muted text-gold">
                      {itemIdx + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <select
                        value={item.ingredient_id}
                        onChange={e => updateItem(item.id, 'ingredient_id', e.target.value)}
                        required
                        className="w-full text-sm font-medium bg-transparent border-none outline-none text-text-primary"
                      >
                        <option value="" disabled>Pilih bahan...</option>
                        {ingredients.map(ing => (
                          <option key={ing.id} value={ing.id}>
                            {ing.name} ({ing.unit})
                          </option>
                        ))}
                      </select>

                      {/* Stock info row */}
                      {selectedIng && (
                        <div className="flex items-center gap-3 mt-1">
                          {Number(selectedIng.average_price) > 0 && (
                            <span className="text-xs text-text-muted">
                              Rp {Number(selectedIng.average_price).toLocaleString('id-ID')} / {selectedIng.unit}
                            </span>
                          )}
                          <span
                            className={`text-xs flex items-center gap-1 ${
                              isLowStock ? 'text-danger' : hasStock ? 'text-success' : 'text-text-muted'
                            }`}
                          >
                            {isLowStock
                              ? <AlertTriangle className="w-3 h-3" />
                              : hasStock
                              ? <CheckCircle2 className="w-3 h-3" />
                              : null
                            }
                            Stok: {stock.toLocaleString('id-ID')} {selectedIng.unit}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Amount input */}
                    <div
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg shrink-0 bg-bg-card border ${
                        isLowStock ? 'border-danger/40' : 'border-border'
                      }`}
                    >
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={item.amount}
                        onChange={e => updateItem(item.id, 'amount', e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="0"
                        className={`w-16 text-right text-sm bg-transparent border-none outline-none ${
                          isLowStock ? 'text-danger' : 'text-text-primary'
                        }`}
                      />
                      {selectedIng && (
                        <span className="text-xs font-medium text-text-muted min-w-[24px]">
                          {selectedIng.unit}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="p-1.5 rounded-lg transition-colors shrink-0 text-text-muted hover:text-danger"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Low stock warning bar */}
                  {isLowStock && (
                    <div className="px-3 py-2 flex items-center gap-2 text-xs bg-danger-dim border-t border-danger/20">
                      <AlertTriangle className="w-3 h-3 shrink-0 text-danger" />
                      <span className="text-danger">
                        Stok tidak cukup — dibutuhkan {needed.toLocaleString('id-ID')} {selectedIng?.unit}, tersedia {stock.toLocaleString('id-ID')} {selectedIng?.unit}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={addItem}
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium transition-colors text-gold"
          >
            <Plus className="w-4 h-4" />
            Tambah Bahan
          </button>
        </div>

        {/* Operational cost */}
        <div className="rounded-2xl p-6 bg-bg-card border border-border">
          <h2 className="font-bold text-sm uppercase tracking-wider mb-1 text-gold font-mono">
            Biaya Operasional
          </h2>
          <p className="text-xs mb-4 text-text-muted">
            Buffer untuk kemasan, listrik, tenaga kerja, dll.
          </p>
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <input
                type="number"
                min="0"
                step="0.01"
                value={buffer}
                onChange={e => setBuffer(e.target.value === '' ? '' : Number(e.target.value))}
                className="input-base"
                style={{ paddingRight: '6rem' }}
              />
              <div className="absolute inset-y-0 right-1 flex items-center">
                <div className="flex items-center p-1 rounded-lg bg-bg-elevated border border-border">
                  <button
                    type="button"
                    onClick={() => setIsPercent(true)}
                    className={`px-2 py-1 text-xs font-bold rounded-md transition-colors ${
                      isPercent ? 'bg-gold text-[#0a0905]' : 'bg-transparent text-text-muted'
                    }`}
                  >%</button>
                  <button
                    type="button"
                    onClick={() => setIsPercent(false)}
                    className={`px-2 py-1 text-xs font-bold rounded-md transition-colors ${
                      !isPercent ? 'bg-gold text-[#0a0905]' : 'bg-transparent text-text-muted'
                    }`}
                  >Rp</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right: live calculator */}
      <div className="space-y-5">
        <div className="rounded-2xl p-6 sticky top-8 bg-bg-card border border-border">
          <div className="flex items-center gap-2 mb-6">
            <Calculator className="w-4 h-4 text-gold" />
            <h3 className="font-bold text-sm text-gold font-mono">
              ESTIMASI HPP LANGSUNG
            </h3>
          </div>

          <div className="space-y-3">
            {[
              { label: 'Bahan Baku', value: rawMaterialHPP, icon: Package },
              { label: 'Biaya Operasional', value: opCost, icon: TrendingUp, prefix: '+ ' },
            ].map(({ label, value, icon: Icon, prefix }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-xs flex items-center gap-1.5 text-text-secondary">
                  <Icon className="w-3 h-3" />
                  {label}
                </span>
                <span className="text-sm font-medium stat-number text-text-secondary">
                  {prefix}Rp {Math.round(value).toLocaleString('id-ID')}
                </span>
              </div>
            ))}

            <div className="flex items-center justify-between pt-2">
              <span className="text-sm font-bold text-text-primary">Total HPP</span>
              <span className="text-xl font-bold stat-number text-text-primary">
                Rp {Math.round(totalHPP).toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          {/* Margin */}
          <div
            className={`mt-5 p-4 rounded-xl border ${
              margin >= 0 ? 'bg-success-dim border-success/20' : 'bg-danger-dim border-danger/20'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`text-xs font-medium ${margin >= 0 ? 'text-success' : 'text-danger'}`}>
                Proyeksi Margin
              </span>
              <span className={`text-sm font-bold ${margin >= 0 ? 'text-success' : 'text-danger'}`}>
                {marginPercent.toFixed(1)}%
              </span>
            </div>
            <p className={`text-2xl font-bold stat-number ${margin >= 0 ? 'text-success' : 'text-danger'}`}>
              Rp {Math.round(margin).toLocaleString('id-ID')}
            </p>
            <div className="mt-2 h-1.5 rounded-full overflow-hidden bg-black/20">
              <div
                className={`h-full rounded-full ${margin >= 0 ? 'bg-success' : 'bg-danger'}`}
                style={{ width: `${Math.min(100, Math.max(0, marginPercent))}%` }}
              />
            </div>
          </div>

          {/* Stock warnings summary */}
          {stockWarnings.length > 0 && (
            <div className="mt-4 p-3 rounded-xl space-y-1.5 bg-danger-dim border border-danger/20">
              <p className="text-xs font-semibold flex items-center gap-1.5 text-danger">
                <AlertTriangle className="w-3 h-3" />
                Stok tidak mencukupi
              </p>
              {stockWarnings.map(w => (
                <p key={w.name} className="text-xs text-danger opacity-80">
                  {w.name}: butuh {w.needed.toLocaleString('id-ID')}, ada {w.stock.toLocaleString('id-ID')} {w.unit}
                </p>
              ))}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary mt-5 w-full justify-center py-3"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Menyimpan...' : 'Simpan Resep'}
          </button>
        </div>
      </div>
    </form>
  );
}