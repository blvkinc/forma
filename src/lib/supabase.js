import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL and Supabase publishable/anon key in .env.local'
  );
}

// Snapshot the URL fragment BEFORE Supabase consumes it, so the app can tell
// whether this page load came from an email-verification callback.
export const initialAuthCallback = (() => {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash || '';
  if (!hash.includes('access_token=')) return null;
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  return { type: params.get('type') || null };
})();

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    detectSessionInUrl: true,
    persistSession: true,
  },
});
