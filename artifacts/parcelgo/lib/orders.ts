import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { ParcelOrderSummary, SenderParcelDashboard } from '@/types/orders';

function getSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('ParcelGo is missing its Supabase configuration.');
  }
  return supabase;
}

export async function getSenderParcel(senderId: string): Promise<SenderParcelDashboard> {
  const client = getSupabase();
  const { data, error } = await client
    .from('parcel_orders')
    .select(
      'id, title, pickup_address, destination_address, package_size, offered_price, status, created_at, photo_path',
    )
    .eq('sender_id', senderId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  const order = data as ParcelOrderSummary | null;
  if (!order?.photo_path) return { order, photoUrl: null };

  const { data: signedPhoto, error: photoError } = await client.storage
    .from('parcel-photos')
    .createSignedUrl(order.photo_path, 60 * 60);

  if (photoError) {
    console.warn('Could not load the parcel photo.', photoError.message);
    return { order, photoUrl: null };
  }

  return { order, photoUrl: signedPhoto.signedUrl };
}

export async function senderAlreadyHasParcel(senderId: string): Promise<boolean> {
  const { data, error } = await getSupabase()
    .from('parcel_orders')
    .select('id')
    .eq('sender_id', senderId)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

export function isUniqueOrderError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '23505'
  );
}