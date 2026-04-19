'use server';

import { revalidatePath } from 'next/cache';
import { requireRoles } from '@/lib/auth/server-auth';

const RESERVATION_ROLES = ['admin', 'cashier', 'waiter'] as const;

export async function getReservations() {
  const { supabase } = await requireRoles([...RESERVATION_ROLES]);
  const { data, error } = await supabase
    .from('reservations')
    .select('*, tables(name)')
    .order('reservation_time', { ascending: true });

  if (error) return [];
  return data;
}

export async function createReservation(formData: FormData) {
  const { supabase } = await requireRoles([...RESERVATION_ROLES]);
  
  const customer_name = formData.get('customer_name') as string;
  const phone_number = formData.get('phone_number') as string;
  const reservation_time = formData.get('reservation_time') as string;
  const table_id = formData.get('table_id') as string;
  const number_of_people = Number(formData.get('number_of_people'));
  const notes = formData.get('notes') as string;

  const { error } = await supabase
    .from('reservations')
    .insert([{
      customer_name,
      phone_number,
      reservation_time,
      table_id: table_id || null,
      number_of_people,
      notes,
      status: 'pending'
    }]);

  if (error) throw new Error(error.message);

  revalidatePath('/reservations');
  return true;
}

export async function updateReservationStatus(id: string, status: string, tableId?: string) {
  const { supabase } = await requireRoles([...RESERVATION_ROLES]);
  
  await supabase.from('reservations').update({ status }).eq('id', id);

  if (status === 'checked_in' && tableId) {
    await supabase.from('tables').update({ status: 'occupied' }).eq('id', tableId);
  }

  revalidatePath('/reservations');
  revalidatePath('/pos');
  return true;
}
