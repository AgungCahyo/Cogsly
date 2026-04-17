'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

type PurchasePoint = {
  date: string | number | Date;
  price: number | string;
  quantity: number | string;
};

function formatRupiah(value: unknown) {
  const raw = Array.isArray(value) ? value[0] : value;
  const asNumber = Number(raw);
  return `Rp ${Number.isFinite(asNumber) ? asNumber.toLocaleString('id-ID') : '0'}`;
}

export function PriceChart({ data, unit }: { data: PurchasePoint[]; unit?: string }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center">
        <p className="text-zinc-500 text-sm mt-2">Charts will appear once you have enough purchase logs.</p>
      </div>
    );
  }

  // Format data for Recharts
  const formattedData = data
    .map((d) => {
      const qty = Number(d.quantity);
      const price = Number(d.price);
      const pricePerUnit = qty > 0 && Number.isFinite(price) ? price / qty : null;
      return {
        ...d,
        dateValue: format(new Date(d.date), 'dd MMM'),
        pricePerUnit,
      };
    })
    .filter((d) => d.pricePerUnit !== null);

  if (formattedData.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center">
        <p className="text-zinc-500 text-sm mt-2">No valid chart points (check quantity/price values).</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart
        data={formattedData}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
        <XAxis 
          dataKey="dateValue" 
          stroke="#71717a" 
          fontSize={12} 
          tickLine={false}
          axisLine={false}
        />
        <YAxis 
          stroke="#71717a" 
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `Rp ${value.toLocaleString('id-ID')}`}
        />
        <Tooltip 
           contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', color: '#fff' }}
           itemStyle={{ color: '#818cf8' }}
           formatter={(value: unknown) => [formatRupiah(value), `Price/${unit ?? 'unit'}`]}
        />
        <Line 
          type="monotone" 
          dataKey="pricePerUnit" 
          stroke="#6366f1" 
          strokeWidth={3}
          dot={{ fill: '#6366f1', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, fill: '#818cf8' }} 
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
