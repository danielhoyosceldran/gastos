import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/auth.store';
import { supabase } from '../lib/supabase';
import { fetchProfile } from '../lib/auth';
import i18n from '../lib/i18n';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setSession, setProfile, clear } = useAuthStore();
  const initializing = useRef(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session) {
        try {
          const profile = await fetchProfile(session.user.id);
          setProfile(profile);
          i18n.changeLanguage(profile.language);
          const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
          document.documentElement.dataset.theme = savedTheme ?? profile.theme;
          document.documentElement.dataset.color = profile.primary_color;
        } catch {
          clear();
        }
      }
      initializing.current = false;
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (initializing.current) return;
      setSession(session);
      if (session) {
        try {
          const profile = await fetchProfile(session.user.id);
          setProfile(profile);
          i18n.changeLanguage(profile.language);
          const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
          document.documentElement.dataset.theme = savedTheme ?? profile.theme;
          document.documentElement.dataset.color = profile.primary_color;
        } catch {
          clear();
        }
      } else {
        clear();
      }
    });

    return () => subscription.unsubscribe();
  }, [setSession, setProfile, clear]);

  return <>{children}</>;
}
