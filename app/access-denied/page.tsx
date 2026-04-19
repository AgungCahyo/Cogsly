import Link from 'next/link';
import { ShieldOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import type { UserRole } from '@/types';
import { effectiveRole } from '@/lib/auth/access-policy';

const HOME_BY_ROLE: Record<UserRole, string> = {
  admin: '/',
  warehouse: '/ingredients',
  cashier: '/pos',
  waiter: '/pos',
};

export default async function AccessDeniedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let href = '/pos';
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    const role = effectiveRole(profile?.role as UserRole | undefined);
    href = HOME_BY_ROLE[role];
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 p-8 font-sans">
      <div className="max-w-md text-center space-y-8">
        <div className="w-20 h-20 mx-auto rounded-[2rem] bg-zinc-100 flex items-center justify-center text-zinc-400">
          <ShieldOff className="w-9 h-9" />
        </div>
        <div className="space-y-3">
          <h1 className="text-2xl font-serif font-bold italic text-zinc-950 tracking-tight">Akses ditolak</h1>
          <p className="text-sm text-zinc-500 leading-relaxed">
            Peran akun Anda tidak mencakup halaman ini. Hubungi administrator jika menurut Anda ini kesalahan.
          </p>
        </div>
        <Link
          href={href}
          className="inline-flex items-center justify-center rounded-2xl bg-zinc-950 text-white px-8 py-4 text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 transition-colors"
        >
          Kembali ke area kerja
        </Link>
      </div>
    </div>
  );
}
