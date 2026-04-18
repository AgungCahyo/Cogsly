'use client';

import { useState } from 'react';
import { Save, Plus, Trash2, Calculator, TrendingUp, Package } from 'lucide-react';
import { useRouter } from 'next/navigation';

type IngredientOption = {
  id: string;
  name: string;
  unit: string | null;
  average_price: number | string | null;
};

type SubmitRecipeInput = {
  name: string;
  price: number;
  operational_cost_buffer: number;
  is_percentage_buffer: boolean;
  items: { ingredient_id: string; amount_required: number }[];
};

type InitialRecipe = {
  name: string;
  price: number;
  operational_cost_buffer: number;
  is_percentage_buffer: boolean;
  items: { ingredient_id: string; amount_required: number }[];
};

export function RecipeBuilderForm({
  ingredients,
  submitRecipe,
  initialRecipe,
}: {
  ingredients: IngredientOption[];
  submitRecipe: (data: SubmitRecipeInput) => Promise<void>;
  initialRecipe?: InitialRecipe;
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
        <div className="rounded-2xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h2 className="font-bold mb-5 text-sm uppercase tracking-wider" style={{ color: 'var(--gold)', fontFamily: 'DM Mono, monospace' }}>
            Detail Produk
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Nama Produk</label>
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
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Harga Jual (Rp)</label>
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
        <div className="rounded-2xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-sm uppercase tracking-wider" style={{ color: 'var(--gold)', fontFamily: 'DM Mono, monospace' }}>
              Komposisi Resep
            </h2>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{items.filter(i => i.ingredient_id).length} bahan dipilih</span>
          </div>

          <div className="space-y-2.5">
            {items.map((item, itemIdx) => {
              const selectedIng = ingredients.find(i => i.id === item.ingredient_id);
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
                    style={{ background: 'var(--gold-muted)', color: 'var(--gold)' }}
                  >
                    {itemIdx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <select
                      value={item.ingredient_id}
                      onChange={e => updateItem(item.id, 'ingredient_id', e.target.value)}
                      required
                      className="w-full text-sm font-medium bg-transparent border-none outline-none"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <option value="" disabled>Pilih bahan...</option>
                      {ingredients.map(ing => (
                        <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                      ))}
                    </select>
                    {selectedIng && Number(selectedIng.average_price) > 0 && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        Rp {Number(selectedIng.average_price).toLocaleString('id-ID')} / {selectedIng.unit}
                      </p>
                    )}
                  </div>
                  <div
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                  >
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={item.amount}
                      onChange={e => updateItem(item.id, 'amount', e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="0"
                      className="w-16 text-right text-sm bg-transparent border-none outline-none"
                      style={{ color: 'var(--text-primary)' }}
                    />
                    {selectedIng && (
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{selectedIng.unit}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="p-1.5 rounded-lg transition-colors shrink-0"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={addItem}
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium transition-colors"
            style={{ color: 'var(--gold)' }}
          >
            <Plus className="w-4 h-4" />
            Tambah Bahan
          </button>
        </div>

        {/* Operational cost */}
        <div className="rounded-2xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h2 className="font-bold text-sm uppercase tracking-wider mb-1" style={{ color: 'var(--gold)', fontFamily: 'DM Mono, monospace' }}>
            Biaya Operasional
          </h2>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
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
                <div
                  className="flex items-center p-1 rounded-lg"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                >
                  <button
                    type="button"
                    onClick={() => setIsPercent(true)}
                    className="px-2 py-1 text-xs font-bold rounded-md transition-colors"
                    style={{
                      background: isPercent ? 'var(--gold)' : 'transparent',
                      color: isPercent ? '#0a0905' : 'var(--text-muted)',
                    }}
                  >%</button>
                  <button
                    type="button"
                    onClick={() => setIsPercent(false)}
                    className="px-2 py-1 text-xs font-bold rounded-md transition-colors"
                    style={{
                      background: !isPercent ? 'var(--gold)' : 'transparent',
                      color: !isPercent ? '#0a0905' : 'var(--text-muted)',
                    }}
                  >Rp</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right: live calculator */}
      <div className="space-y-5">
        <div
          className="rounded-2xl p-6 sticky top-8"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2 mb-6">
            <Calculator className="w-4 h-4" style={{ color: 'var(--gold)' }} />
            <h3 className="font-bold text-sm" style={{ color: 'var(--gold)', fontFamily: 'DM Mono, monospace' }}>
              ESTIMASI HPP LANGSUNG
            </h3>
          </div>

          <div className="space-y-3">
            {[
              { label: 'Bahan Baku', value: rawMaterialHPP, icon: Package },
              { label: 'Biaya Operasional', value: opCost, icon: TrendingUp, prefix: '+ ' },
            ].map(({ label, value, icon: Icon, prefix }) => (
              <div key={label} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                <span className="text-xs flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                  <Icon className="w-3 h-3" />
                  {label}
                </span>
                <span className="text-sm font-medium stat-number" style={{ color: 'var(--text-secondary)' }}>
                  {prefix}Rp {Math.round(value).toLocaleString('id-ID')}
                </span>
              </div>
            ))}

            <div className="flex items-center justify-between pt-2">
              <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Total HPP</span>
              <span className="text-xl font-bold stat-number" style={{ color: 'var(--text-primary)' }}>
                Rp {Math.round(totalHPP).toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          {/* Margin */}
          <div
            className="mt-5 p-4 rounded-xl"
            style={{
              background: margin >= 0 ? 'var(--success-dim)' : 'var(--danger-dim)',
              border: `1px solid ${margin >= 0 ? 'rgba(74,158,107,0.2)' : 'rgba(196,92,58,0.2)'}`,
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium" style={{ color: margin >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                Proyeksi Margin
              </span>
              <span
                className="text-sm font-bold"
                style={{ color: margin >= 0 ? 'var(--success)' : 'var(--danger)' }}
              >
                {marginPercent.toFixed(1)}%
              </span>
            </div>
            <p
              className="text-2xl font-bold stat-number"
              style={{ color: margin >= 0 ? 'var(--success)' : 'var(--danger)' }}
            >
              Rp {Math.round(margin).toLocaleString('id-ID')}
            </p>
            {/* Margin bar */}
            <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.2)' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, Math.max(0, marginPercent))}%`,
                  background: margin >= 0 ? 'var(--success)' : 'var(--danger)',
                }}
              />
            </div>
          </div>

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