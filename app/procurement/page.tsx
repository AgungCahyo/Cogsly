import { supabase } from '@/lib/supabase';
import { ShoppingCart, Plus, FileText, ExternalLink, Calendar } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

type PurchaseLogRow = {
  id: string;
  date: string | number | Date;
  supplier: string | null;
  price: number | string;
  quantity: number | string;
  evidence_url: string | null;
  ingredients: { name: string; unit: string | null } | null;
};

export default async function ProcurementPage() {
  const { data: purchases, error } = await supabase
    .from('purchases')
    .select(`
      id,
      date,
      supplier,
      price,
      quantity,
      evidence_url,
      ingredients (
        name,
        unit
      )
    `)
    .returns<PurchaseLogRow[]>()
    .order('date', { ascending: false });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Procurement Logs</h1>
          <p className="text-zinc-400">Track all your material purchases and maintain transparent records.</p>
        </div>
        <Link 
          href="/procurement/new" 
          className="inline-flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium transition-colors cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          Record Purchase
        </Link>
      </div>

      <div className="bg-[#111] border border-zinc-800 rounded-2xl overflow-hidden">
        {error ? (
           <div className="p-8 text-center text-rose-400">Failed to load logs: {error.message}</div>
        ) : !purchases || purchases.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mb-4">
              <ShoppingCart className="w-8 h-8 text-zinc-600" />
            </div>
            <h3 className="text-lg font-medium text-white mb-1">No purchases recorded</h3>
            <p className="text-zinc-500 mb-6 max-w-sm">When you buy materials, record them here. The system will automatically calculate average item costs (HPP) and update your stock.</p>
            <Link 
              href="/procurement/new" 
              className="inline-flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              Record First Purchase
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap text-left text-sm">
              <thead className="bg-[#1a1a1a] text-zinc-400">
                <tr>
                  <th className="px-6 py-4 font-medium rounded-tl-2xl">Date</th>
                  <th className="px-6 py-4 font-medium">Ingredient</th>
                  <th className="px-6 py-4 font-medium">Supplier</th>
                  <th className="px-6 py-4 font-medium text-right">Quantity</th>
                  <th className="px-6 py-4 font-medium text-right">Total Price</th>
                  <th className="px-6 py-4 font-medium rounded-tr-2xl text-center">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {purchases.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-800/20 transition-colors">
                    <td className="px-6 py-4 text-zinc-300">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-zinc-500" />
                        {format(new Date(log.date), 'dd MMM yyyy, HH:mm')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-white">{log.ingredients?.name}</span>
                    </td>
                    <td className="px-6 py-4 text-zinc-400">
                      {log.supplier}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-zinc-100 font-medium">{log.quantity}</span>
                      <span className="text-zinc-500 ml-1">{log.ingredients?.unit}</span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-white">
                      Rp {Number(log.price).toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {log.evidence_url ? (
                        <a 
                          href={log.evidence_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-700 text-indigo-400 transition-colors group"
                          title="View Receipt"
                        >
                          <FileText className="w-4 h-4 group-hover:hidden" />
                          <ExternalLink className="w-4 h-4 hidden group-hover:block" />
                        </a>
                      ) : (
                        <span className="text-zinc-600 italic text-xs">No file</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
