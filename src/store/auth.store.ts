import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import type { SupportedLanguage } from '../lib/i18n';

interface Profile {
  id: string;
  email: string;
  language: SupportedLanguage;
  currency: string;
  primary_color: 'blue' | 'green' | 'red';
  theme: 'light' | 'dark';
  is_admin: boolean;
  approved: boolean;
}

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  profile: null,
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  clear: () => set({ session: null, profile: null }),
}));
