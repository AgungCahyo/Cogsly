import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  ShoppingCart,
  Calendar,
  Package,
  ArrowRight,
  FileText,
  Building2,
  Hash,
  Banknote,
  Scale,
  RefreshCcw,
  TrendingUp,
  ExternalLink,
} from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface PurchaseDetail {
  id: string;
  date: string;
  supplier: string | null;
  quantity: number | string;
  price: number | string;
  purchase_unit: string | null;
  unit_conversion: number | string | null;
  evidence_url: string | null;
  created_by: string | null;
  ingredients: {
    id: string;
    name: string;
    unit: string | null;
    stock: number | string;
    average_price: number | string | null;
    category: string | null;
  } | null;
}

function DetailCard({
  icon: Icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-4 flex items-start gap-4 border transition-all sm:p-5 ${
        highlight
          ? 'bg-zinc-950 text-white border-zinc-950 shadow-lg shadow-zinc-950/20'
          : 'bg-white text-zinc-950 border-zinc-200'
      }`}
    >
      <div
        className={`shrink-0 p-2.5 rounded-xl ${
          highlight ? 'bg-white/10' : 'bg-zinc-50 text-zinc-400'
        }`}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p
          className={`text-[9px] font-bold uppercase tracking-[0.2em] mb-1 ${
            highlight ? 'text-zinc-400' : 'text-zinc-400'
          }`}
        >
          {label}
        </p>
        <p
          className={`text-sm font-bold font-mono tracking-tighter leading-tight truncate ${
            highlight ? 'text-white' : 'text-zinc-950'
          }`}
        >
          {value}
        </p>
        {sub && (
          <p
            className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${
              highlight ? 'text-zinc-500' : 'text-zinc-300'
            }`}
          >
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

export default async function ProcurementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: purchaseId } = await params;

  const supabase = await createClient();
  const { data: purchase, error } = await supabase
    .from('purchases')
    .select(
      `id, date, supplier, quantity, price, purchase_unit, unit_conversion, evidence_url, created_by,
       ingredients(id, name, unit, stock, average_price, category)`
    )
    .eq('id', purchaseId)
    .single<PurchaseDetail>();

  if (error || !purchase) notFound();

  const hasConversion =
    purchase.purchase_unit && Number(purchase.unit_conversion) > 1;
  const stockAdded =
    Number(purchase.quantity) *
    (hasConversion ? Number(purchase.unit_conversion) : 1);
  const pricePerBase =
    stockAdded > 0 ? Number(purchase.price) / stockAdded : 0;
  const isInternal =
    purchase.supplier?.toLowerCase().includes('produksi internal') ?? false;

  // Fetch nearby purchases of same ingredient for trend context (last 5)
  const { data: recentPurchases } = await supabase
    .from('purchases')
    .select('id, date, price, quantity, unit_conversion')
    .eq('ingredient_id', purchase.ingredients?.id ?? '')
    .neq('id', purchaseId)
    .order('date', { ascending: false })
    .limit(4);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <PageHeader
        eyebrow="◆ Pengadaan"
        title="Detail Transaksi"
        description="Rincian log stok masuk dan kalkulasi harga"
        backHref="/procurement"
        icon={<ShoppingCart className="h-5 w-5" aria-hidden />}
      />

      {/* Top meta strip */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest border ${
            isInternal
              ? 'bg-zinc-100 text-zinc-600 border-zinc-200'
              : 'bg-zinc-950 text-white border-zinc-950'
          }`}
        >
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              isInternal ? 'bg-zinc-400' : 'bg-white'
            }`}
          />
          {isInternal ? 'Produksi Internal' : 'Pembelian Supplier'}
        </span>
        <span className="px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-white border border-zinc-200 text-zinc-500">
          {format(new Date(purchase.date), 'EEEE, dd MMMM yyyy', { locale: id })}
        </span>
        <span className="px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-white border border-zinc-200 text-zinc-500 font-mono">
          #{purchaseId.slice(0, 8).toUpperCase()}
        </span>
      </div>

      {/* Main stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <DetailCard
          icon={Banknote}
          label="Total Bayar"
          value={`Rp ${Number(purchase.price).toLocaleString('id-ID')}`}
          highlight
        />
        <DetailCard
          icon={Package}
          label="Stok Masuk"
          value={`+${stockAdded.toLocaleString('id-ID')}`}
          sub={purchase.ingredients?.unit ?? '—'}
        />
        <DetailCard
          icon={TrendingUp}
          label="Harga / Satuan"
          value={`Rp ${Math.round(pricePerBase).toLocaleString('id-ID')}`}
          sub={`per ${purchase.ingredients?.unit ?? 'unit'}`}
        />
        <DetailCard
          icon={Calendar}
          label="Waktu"
          value={format(new Date(purchase.date), 'HH:mm')}
          sub={format(new Date(purchase.date), 'dd MMM yyyy')}
        />
      </div>

      {/* Detail panels */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Ingredient info */}
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-zinc-100 bg-zinc-50/30 flex items-center gap-2.5">
            <Package className="w-3.5 h-3.5 text-zinc-400" />
            <p className="text-xs font-bold text-zinc-950">Info Bahan Baku</p>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-950 text-white flex items-center justify-center font-bold text-sm font-serif shrink-0">
                {purchase.ingredients?.name?.charAt(0).toUpperCase() ?? '?'}
              </div>
              <div>
                <p className="font-bold text-sm text-zinc-950">
                  {purchase.ingredients?.name ?? '—'}
                </p>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-500 uppercase tracking-wider">
                  {purchase.ingredients?.category ?? 'Uncategorized'}
                </span>
              </div>
              {purchase.ingredients?.id && (
                <Link
                  href={`/ingredients/${purchase.ingredients.id}`}
                  className="ml-auto p-2 bg-zinc-50 border border-zinc-200 rounded-xl hover:bg-zinc-950 hover:text-white hover:border-zinc-950 transition-all"
                >
                  <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </div>

            <div className="space-y-3 pt-2 border-t border-zinc-100">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">
                  Stok Saat Ini
                </span>
                <span className="text-xs font-bold font-mono text-zinc-950">
                  {Number(purchase.ingredients?.stock ?? 0).toLocaleString('id-ID')}{' '}
                  {purchase.ingredients?.unit}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">
                  Harga Rata-rata
                </span>
                <span className="text-xs font-bold font-mono text-zinc-950">
                  {Number(purchase.ingredients?.average_price ?? 0) > 0
                    ? `Rp ${Number(purchase.ingredients?.average_price).toLocaleString('id-ID')} / ${purchase.ingredients?.unit}`
                    : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction info */}
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-zinc-100 bg-zinc-50/30 flex items-center gap-2.5">
            <Hash className="w-3.5 h-3.5 text-zinc-400" />
            <p className="text-xs font-bold text-zinc-950">Rincian Transaksi</p>
          </div>
          <div className="p-5 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                <Building2 className="w-3 h-3" />
                Pemasok
              </span>
              <span className="text-xs font-bold text-zinc-950 text-right max-w-[60%] truncate">
                {purchase.supplier ?? '—'}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                <Scale className="w-3 h-3" />
                Jumlah Dibeli
              </span>
              <span className="text-xs font-bold font-mono text-zinc-950">
                {Number(purchase.quantity).toLocaleString('id-ID')}{' '}
                {purchase.purchase_unit || purchase.ingredients?.unit}
              </span>
            </div>

            {hasConversion && (
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                  <RefreshCcw className="w-3 h-3" />
                  Konversi
                </span>
                <div className="flex items-center gap-1.5 text-[9px] font-bold text-zinc-500">
                  <span>1 {purchase.purchase_unit}</span>
                  <ArrowRight className="w-3 h-3" />
                  <span>
                    {Number(purchase.unit_conversion).toLocaleString('id-ID')}{' '}
                    {purchase.ingredients?.unit}
                  </span>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center">
              <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">
                Masuk ke Stok
              </span>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-950" />
                <span className="text-xs font-bold text-zinc-950">
                  +{stockAdded.toLocaleString('id-ID')} {purchase.ingredients?.unit}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-100 flex justify-between items-center">
              <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">
                Harga Efektif
              </span>
              <span className="text-sm font-bold font-mono text-zinc-950">
                Rp {Math.round(pricePerBase).toLocaleString('id-ID')}{' '}
                <span className="text-[9px] text-zinc-400 font-sans">
                  / {purchase.ingredients?.unit}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Receipt / Evidence */}
      {purchase.evidence_url && (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-zinc-100 bg-zinc-50/30 flex items-center gap-2.5">
            <FileText className="w-3.5 h-3.5 text-zinc-400" />
            <p className="text-xs font-bold text-zinc-950">Bukti Nota</p>
          </div>
          <div className="p-5">
            <a
              href={purchase.evidence_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 bg-zinc-950 text-white px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-950/20"
            >
              <FileText className="w-3.5 h-3.5" />
              Lihat Nota / Bukti
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
          </div>
        </div>
      )}

      {/* Recent purchases of same ingredient */}
      {recentPurchases && recentPurchases.length > 0 && (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-zinc-100 bg-zinc-50/30 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <TrendingUp className="w-3.5 h-3.5 text-zinc-400" />
              <p className="text-xs font-bold text-zinc-950">
                Riwayat Pembelian — {purchase.ingredients?.name}
              </p>
            </div>
            {purchase.ingredients?.id && (
              <Link
                href={`/procurement?ingredient=${purchase.ingredients.id}`}
                className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-950 transition-colors"
              >
                Lihat Semua
              </Link>
            )}
          </div>
          <div className="divide-y divide-zinc-50">
            {recentPurchases.map((p) => {
              const conv = Number(p.unit_conversion) || 1;
              const added = Number(p.quantity) * conv;
              const ppu = added > 0 ? Number(p.price) / added : 0;
              return (
                <Link
                  key={p.id}
                  href={`/procurement/${p.id}`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-zinc-50/50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-zinc-50 rounded-lg group-hover:bg-zinc-950 group-hover:text-white transition-colors">
                      <Calendar className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-zinc-950">
                        {format(new Date(p.date), 'dd MMM yyyy', { locale: id })}
                      </p>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">
                        +{added.toLocaleString('id-ID')} {purchase.ingredients?.unit}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold font-mono text-zinc-950">
                      Rp {Number(p.price).toLocaleString('id-ID')}
                    </p>
                    <p className="text-[9px] font-bold text-zinc-400">
                      Rp {Math.round(ppu).toLocaleString('id-ID')} /{' '}
                      {purchase.ingredients?.unit}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}