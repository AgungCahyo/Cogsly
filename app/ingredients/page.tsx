import { supabase } from '@/lib/supabase';
import { PackagePlus, Search, AlertCircle, CheckCircle2, Pencil } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function IngredientsPage() {
  const { data: ingredients, error } = await supabase
    .from('ingredients')
    .select('*')
    .order('name');

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Ingredients Master</h1>
          <p className="text-zinc-400">Manage your raw materials and track stock levels in real-time.</p>
        </div>
        <Link 
          href="/ingredients/new" 
          className="inline-flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium transition-colors"
        >
          <PackagePlus className="w-5 h-5" />
          Add Ingredient
        </Link>
      </div>

      <div className="bg-[#111] border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search ingredients..." 
              className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>
        </div>

        {error ? (
           <div className="p-8 text-center text-rose-400 flex flex-col items-center gap-2">
             <AlertCircle className="w-8 h-8" />
             <p>Failed to load ingredients. Did you run the database setup script?</p>
             <p className="text-sm opacity-80">{error.message}</p>
           </div>
        ) : !ingredients || ingredients.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mb-4">
              <PackagePlus className="w-8 h-8 text-zinc-600" />
            </div>
            <h3 className="text-lg font-medium text-white mb-1">No ingredients yet</h3>
            <p className="text-zinc-500 mb-6 max-w-sm">Start by adding your first raw material. This will allow you to track stock and calculate recipe costs.</p>
            <Link 
              href="/ingredients/new" 
              className="inline-flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              Add New
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap text-left text-sm">
              <thead className="bg-[#1a1a1a] text-zinc-400">
                <tr>
                  <th className="px-6 py-4 font-medium rounded-tl-2xl">Name</th>
                  <th className="px-6 py-4 font-medium">Category</th>
                  <th className="px-6 py-4 font-medium">Stock Level</th>
                  <th className="px-6 py-4 font-medium">Avg. Price</th>
                  <th className="px-6 py-4 font-medium rounded-tr-2xl">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {ingredients.map((item) => {
                  const isLowStock = Number(item.stock) <= Number(item.low_stock_threshold);
                  return (
                    <tr key={item.id} className="hover:bg-zinc-800/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={/* Smart styling for initial */ `w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                            isLowStock ? 'bg-rose-500/10 text-rose-400' : 'bg-indigo-500/10 text-indigo-400'
                          }`}>
                            {item.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-zinc-100">{item.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-zinc-400">
                         <span className="bg-[#1a1a1a] px-2 py-1 rounded-md text-xs">{item.category}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-baseline gap-1">
                          <span className={`text-lg font-bold ${isLowStock ? 'text-rose-400' : 'text-zinc-100'}`}>
                            {item.stock}
                          </span>
                          <span className="text-zinc-500">{item.unit}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-zinc-400">
                        {item.average_price > 0 ? (
                           <span>Rp {Number(item.average_price).toLocaleString('id-ID')} / {item.unit}</span>
                        ) : (
                           <span className="text-zinc-600 italic">No purchases yet</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-between gap-3">
                          {isLowStock ? (
                            <div className="flex items-center gap-1.5 text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full text-xs font-medium w-fit border border-rose-500/20">
                              <AlertCircle className="w-3.5 h-3.5" />
                              Low Stock
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full text-xs font-medium w-fit border border-emerald-500/20">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Good
                            </div>
                          )}

                          <Link
                            href={`/ingredients/${item.id}`}
                            className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white"
                            title="Edit ingredient"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Edit
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
