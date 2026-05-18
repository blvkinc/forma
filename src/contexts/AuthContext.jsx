import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

const SELF_SERVICE_ROLES = new Set(['buyer', 'artist']);
const PROFILE_UPDATE_FIELDS = new Set([
  'display_name',
  'handle',
  'city',
  'bio',
  'avatar_url',
]);

function safeSelfServiceRole(role) {
  return SELF_SERVICE_ROLES.has(role) ? role : 'buyer';
}

function profilePayloadFromUser(authUser) {
  const metadata = authUser?.user_metadata || {};
  const role = safeSelfServiceRole(metadata.role);
  const fallbackName = authUser?.email?.split('@')[0] || 'FORMA user';

  return {
    id: authUser.id,
    email: authUser.email || '',
    display_name: metadata.display_name || fallbackName,
    role,
  };
}

function safeProfileUpdates(updates) {
  const allowed = {};

  Object.entries(updates || {}).forEach(([key, value]) => {
    if (!PROFILE_UPDATE_FIELDS.has(key)) return;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      allowed[key] = key === 'display_name' ? trimmed || 'FORMA user' : trimmed || null;
      return;
    }
    allowed[key] = value;
  });

  return allowed;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);        // Supabase auth user
  const [profile, setProfile] = useState(null);   // public.profiles row
  const [loading, setLoading] = useState(true);   // true while restoring session

  // ------------------------------------------------------------------
  // Fetch profile from public.profiles
  // ------------------------------------------------------------------
  const fetchProfile = useCallback(async (authUser) => {
    if (!authUser?.id) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    if (error) {
      console.error('Failed to fetch profile:', error.message);
      return null;
    }

    if (data) return data;

    const { data: created, error: createError } = await supabase
      .from('profiles')
      .upsert(profilePayloadFromUser(authUser), { onConflict: 'id' })
      .select('*')
      .single();

    if (createError) {
      console.error('Failed to create profile fallback:', createError.message);
      return profilePayloadFromUser(authUser);
    }

    return created;
  }, []);

  // ------------------------------------------------------------------
  // On mount: restore session + listen for auth changes
  // ------------------------------------------------------------------
  useEffect(() => {
    let mounted = true;
    let loadingSettled = false;

    // Safety timeout — if auth takes longer than 8s, stop loading
    const timeout = setTimeout(() => {
      if (mounted && !loadingSettled) {
        console.warn('Auth session check timed out after 8s');
        setLoading(false);
      }
    }, 8000);

    // 1. Check existing session
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        if (!mounted) return;
        if (session?.user) {
          setUser(session.user);
          try {
            const p = await fetchProfile(session.user);
            if (mounted) setProfile(p);
          } catch (err) {
            console.error('Profile fetch failed:', err);
          }
        }
        loadingSettled = true;
        clearTimeout(timeout);
        if (mounted) setLoading(false);
      })
      .catch((err) => {
        console.error('getSession failed:', err);
        loadingSettled = true;
        clearTimeout(timeout);
        if (mounted) setLoading(false);
      });

    // 2. Listen for future changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (session?.user) {
          setUser(session.user);
          try {
            const p = await fetchProfile(session.user);
            if (mounted) setProfile(p);
          } catch (err) {
            console.error('Profile fetch on auth change failed:', err);
          }
        } else {
          setUser(null);
          setProfile(null);
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription?.unsubscribe?.();
    };
  }, [fetchProfile]);

  // ------------------------------------------------------------------
  // Sign Up
  // ------------------------------------------------------------------
  const signUp = async ({ email, password, displayName, role = 'buyer' }) => {
    const safeRole = safeSelfServiceRole(role);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          role: safeRole,
        },
      },
    });

    if (error) throw error;

    if (data.session?.user) {
      setUser(data.session.user);
      setProfile(await fetchProfile(data.session.user));
    }

    // If email confirmation is required, data.user exists but session may be null
    return data;
  };

  // ------------------------------------------------------------------
  // Sign In
  // ------------------------------------------------------------------
  const signIn = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    if (data.user) {
      setUser(data.user);
      setProfile(await fetchProfile(data.user));
    }
    return data;
  };

  // ------------------------------------------------------------------
  // Sign Out
  // ------------------------------------------------------------------
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setProfile(null);
  };

  // ------------------------------------------------------------------
  // Update Profile
  // ------------------------------------------------------------------
  const updateProfile = async (updates) => {
    if (!user) throw new Error('Not authenticated');
    const safeUpdates = safeProfileUpdates(updates);
    if (!Object.keys(safeUpdates).length) return profile;

    const { data, error } = await supabase
      .from('profiles')
      .update({ ...safeUpdates, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    setProfile(data);
    return data;
  };

  // ------------------------------------------------------------------
  // Derived
  // ------------------------------------------------------------------
  const role = profile?.role || 'buyer';
  const isAuthenticated = !!user;  // profile may be null if trigger didn't fire yet

  const value = {
    user,
    profile,
    role,
    loading,
    isAuthenticated,
    signUp,
    signIn,
    signOut,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
