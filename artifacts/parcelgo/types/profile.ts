export type UserRole = 'sender' | 'courier';

export interface Profile {
  id: string;
  name: string;
  phone: string | null;
  role: UserRole;
  expo_push_token: string | null;
  created_at: string;
}

export interface ProfileInput {
  name: string;
  phone: string;
  role: UserRole;
}