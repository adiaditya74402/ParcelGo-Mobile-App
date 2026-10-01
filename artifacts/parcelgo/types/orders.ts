export interface ParcelOrderSummary {
  id: string;
  title: string;
  pickup_address: string;
  destination_address: string;
  package_size: 'small' | 'medium' | 'large';
  offered_price: number | string;
  status: 'pending' | 'accepted' | 'picked_up' | 'delivered' | 'cancelled';
  created_at: string;
  photo_path: string | null;
}

export interface SenderParcelDashboard {
  order: ParcelOrderSummary | null;
  photoUrl: string | null;
}