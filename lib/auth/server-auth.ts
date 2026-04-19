import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { UserRole } from '@/types';
import { effectiveRole } from './access-policy';

export async function getServerAuthContext() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Sesi tidak valid. Silakan masuk kembali.');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', user.id)
    .maybeSingle();

  const role = effectiveRole(profile?.role as UserRole | undefined);

  return { supabase, user, profile, role };
}

export async function requireRoles(allowed: UserRole[]) {
  const ctx = await getServerAuthContext();
  if (!allowed.includes(ctx.role)) {
    throw new Error('Anda tidak memiliki izin untuk tindakan ini.');
  }
  return ctx;
}

export type ApiAuthSuccess = { ok: true; supabase: Awaited<ReturnType<typeof createClient>>; role: UserRole };
export type ApiAuthFailure = { ok: false; response: NextResponse };

export async function authorizeApiRequest(allowed: UserRole[]): Promise<ApiAuthSuccess | ApiAuthFailure> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const role = effectiveRole(profile?.role as UserRole | undefined);

  if (!allowed.includes(role)) {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { ok: true, supabase, role };
}
