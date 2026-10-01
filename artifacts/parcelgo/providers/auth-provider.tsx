import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { Profile, ProfileInput, UserRole } from '@/types/profile';

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isProfileLoading: boolean;
  profileIssue: string | null;
  authError: string | null;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: ProfileInput, email: string, password: string) => Promise<boolean>;
  saveProfile: (input: ProfileInput) => Promise<void>;
  updateRole: (role: UserRole) => Promise<void>;
  signOut: () => Promise<void>;
  retryProfile: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function getClient(): SupabaseClient {
  if (!supabase) {
    throw new Error('ParcelGo is missing its Supabase configuration.');
  }
  return supabase;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [profileIssue, setProfileIssue] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const loadProfile = useCallback(async (userId: string) => {
    const client = getClient();
    setIsProfileLoading(true);
    setProfileIssue(null);
    try {
      const { data, error } = await client
        .from('profiles')
        .select('id, name, phone, role, expo_push_token, created_at')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      setProfile((data as Profile | null) ?? null);
    } catch (error) {
      setProfile(null);
      setProfileIssue(
        error instanceof Error ? error.message : 'Could not load your profile.',
      );
    } finally {
      setIsProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setIsLoading(false);
      return;
    }

    let mounted = true;
    const client = supabase;
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setAuthError(null);

      if (nextSession) {
        // Defer database work until Supabase finishes notifying auth listeners.
        setTimeout(() => {
          if (mounted) void loadProfile(nextSession.user.id);
        }, 0);
      } else {
        setProfile(null);
        setProfileIssue(null);
        setIsProfileLoading(false);
      }
    });

    void client.auth
      .getSession()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) setAuthError(error.message);
        setSession(data.session);
        setIsLoading(false);
        if (data.session) void loadProfile(data.session.user.id);
      })
      .catch((error: unknown) => {
        if (!mounted) return;
        setAuthError(
          error instanceof Error ? error.message : 'Could not restore your session.',
        );
        setIsLoading(false);
      });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    const { error } = await getClient().auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      setAuthError(error.message);
      throw error;
    }
  }, []);

  const signUp = useCallback(
    async (input: ProfileInput, email: string, password: string) => {
      setAuthError(null);
      const { data, error } = await getClient().auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            name: input.name.trim(),
            phone: input.phone.trim(),
            role: input.role,
          },
        },
      });
      if (error) {
        setAuthError(error.message);
        throw error;
      }
      return Boolean(data.session);
    },
    [],
  );

  const saveProfile = useCallback(
    async (input: ProfileInput) => {
      if (!session) throw new Error('Sign in before saving your profile.');
      setAuthError(null);
      const { data, error } = await getClient()
        .from('profiles')
        .upsert(
          {
            id: session.user.id,
            name: input.name.trim(),
            phone: input.phone.trim() || null,
            role: input.role,
          },
          { onConflict: 'id' },
        )
        .select('id, name, phone, role, expo_push_token, created_at')
        .single();
      if (error) {
        setAuthError(error.message);
        throw error;
      }
      setProfile(data as Profile);
      setProfileIssue(null);
    },
    [session],
  );

  const updateRole = useCallback(
    async (role: UserRole) => {
      if (!session) throw new Error('Sign in before changing your role.');
      setAuthError(null);
      const { data, error } = await getClient()
        .from('profiles')
        .update({ role })
        .eq('id', session.user.id)
        .select('id, name, phone, role, expo_push_token, created_at')
        .single();
      if (error) {
        setAuthError(error.message);
        throw error;
      }
      setProfile(data as Profile);
      setProfileIssue(null);
    },
    [session],
  );

  const signOut = useCallback(async () => {
    setAuthError(null);
    const { error } = await getClient().auth.signOut();
    if (error) {
      setAuthError(error.message);
      throw error;
    }
  }, []);

  const retryProfile = useCallback(async () => {
    if (session) await loadProfile(session.user.id);
  }, [loadProfile, session]);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      isLoading,
      isProfileLoading,
      profileIssue,
      authError,
      isConfigured: isSupabaseConfigured,
      signIn,
      signUp,
      saveProfile,
      updateRole,
      signOut,
      retryProfile,
      clearAuthError,
    }),
    [
      session,
      profile,
      isLoading,
      isProfileLoading,
      profileIssue,
      authError,
      signIn,
      signUp,
      saveProfile,
      updateRole,
      signOut,
      retryProfile,
      clearAuthError,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }
  return context;
}