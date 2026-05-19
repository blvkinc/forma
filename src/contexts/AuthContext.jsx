import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);
const AUTH_RESTORE_TIMEOUT_MS = 8000;
const SIGN_OUT_TIMEOUT_MS = 5000;

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

function withTimeout(promise, timeoutMs, message) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([
    promise.finally(() => window.clearTimeout(timeoutId)),
    timeout,
  ]);
}

function clearStoredSupabaseSession() {
  if (typeof window === 'undefined') return;

  const clearFromStorage = (storage) => {
    if (!storage) return;

    const keys = [];
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (
        key === 'supabase.auth.token' ||
        key?.includes('supabase.auth.token') ||
        (key?.startsWith('sb-') && key.endsWith('-auth-token'))
      ) {
        keys.push(key);
      }
    }

    keys.forEach(key => storage.removeItem(key));
  };

  clearFromStorage(window.localStorage);
  clearFromStorage(window.sessionStorage);
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
  const profileRequestRef = useRef(0);
  const activeUserIdRef = useRef(null);

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

  const loadProfile = useCallback(async (authUser) => {
    if (!authUser?.id) return null;
    if (activeUserIdRef.current !== authUser.id) return null;

    const requestId = profileRequestRef.current + 1;
    profileRequestRef.current = requestId;
    const fallback = profilePayloadFromUser(authUser);
    if (activeUserIdRef.current === authUser.id) setProfile(fallback);

    try {
      const p = await fetchProfile(authUser);
      const nextProfile = p || fallback;
      if (profileRequestRef.current === requestId && activeUserIdRef.current === authUser.id) {
        setProfile(nextProfile);
      }
      return nextProfile;
    } catch (err) {
      console.error('Profile fetch failed:', err);
      if (profileRequestRef.current === requestId && activeUserIdRef.current === authUser.id) {
        setProfile(fallback);
      }
      return fallback;
    }
  }, [fetchProfile]);

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
    }, AUTH_RESTORE_TIMEOUT_MS);

    // 1. Check existing session
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        if (!mounted) return;
        if (session?.user) {
          activeUserIdRef.current = session.user.id;
          setUser(session.user);
          setProfile(profilePayloadFromUser(session.user));
          window.setTimeout(() => {
            if (mounted && activeUserIdRef.current === session.user.id) void loadProfile(session.user);
          }, 0);
        } else {
          activeUserIdRef.current = null;
          profileRequestRef.current += 1;
          setUser(null);
          setProfile(null);
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
      (event, session) => {
        if (!mounted) return;

        if (session?.user) {
          activeUserIdRef.current = session.user.id;
          setUser(session.user);
          setProfile(profilePayloadFromUser(session.user));
          window.setTimeout(() => {
            if (mounted && activeUserIdRef.current === session.user.id) void loadProfile(session.user);
          }, 0);
        } else {
          activeUserIdRef.current = null;
          profileRequestRef.current += 1;
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
  }, [loadProfile]);

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
      activeUserIdRef.current = data.session.user.id;
      setUser(data.session.user);
      setProfile(profilePayloadFromUser(data.session.user));
      void loadProfile(data.session.user);
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
      activeUserIdRef.current = data.user.id;
      setUser(data.user);
      setProfile(profilePayloadFromUser(data.user));
      void loadProfile(data.user);
    }
    return data;
  };

  // ------------------------------------------------------------------
  // Sign Out
  // ------------------------------------------------------------------
  const signOut = async () => {
    activeUserIdRef.current = null;
    profileRequestRef.current += 1;
    setUser(null);
    setProfile(null);

    try {
      const { error } = await withTimeout(
        supabase.auth.signOut({ scope: 'local' }),
        SIGN_OUT_TIMEOUT_MS,
        'Sign out timed out locally.'
      );
      if (error) throw error;
    } catch (err) {
      console.warn('Supabase sign out did not finish cleanly; clearing local session.', err);
      clearStoredSupabaseSession();
    }
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
  const effectiveProfile = profile || (user ? profilePayloadFromUser(user) : null);
  const role = effectiveProfile?.role || 'buyer';
  const isAuthenticated = !!user;  // profile may be null if trigger didn't fire yet

  const value = {
    user,
    profile: effectiveProfile,
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
