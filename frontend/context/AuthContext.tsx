import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ProfilesAPI, Profile } from '@/lib/api';
import type { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  localAvatarUri: string | null;
  setLocalAvatarUri: (uri: string | null) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser]       = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);

  const fetchProfile = async () => {
    try {
      // 5-second safety timeout so we don't hang the app if the backend is slow
      const result = await Promise.race([
        ProfilesAPI.me(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
        )
      ]) as { profile: Profile };
      
      setProfile(result.profile);
    } catch (err) {
      console.warn('[AUTH] Error fetching profile:', err);
      // Ensure we don't block the app; we can still show the UI with null profile
    }
  };

  useEffect(() => {
    // Initial session load
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s) fetchProfile().finally(() => setLoading(false));
      else setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s) fetchProfile();
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshProfile = fetchProfile;

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signIn, signUp, signOut, refreshProfile, localAvatarUri, setLocalAvatarUri }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
