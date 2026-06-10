// Reproduction: can a fresh, UNAPPROVED seller account create studio/listings?
// Uses only the public anon key — exactly what the browser has.
import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'node:fs';

for (const file of ['.env.local', '.env']) {
  if (!existsSync(file)) continue;
  for (const row of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = row.trim().match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key, { auth: { persistSession: false } });

const stamp = Date.now().toString(36);
const email = `forma.qa.bypass.${stamp}@gmail.com`;
const password = `Qa-bypass-${stamp}-123456`;

const log = (name, detail) => console.log(`${name.padEnd(46)} ${detail}`);

// 1. Seller signup (role artist via metadata, like the app does)
const { data: signup, error: signupError } = await supabase.auth.signUp({
  email,
  password,
  options: { data: { display_name: 'QA Bypass Seller', role: 'artist' } },
});
if (signupError) { log('signup', `ERROR: ${signupError.message}`); process.exit(1); }
log('signup returns immediate session', signup.session ? 'YES (email confirmation DISABLED)' : 'no (confirmation required)');

let session = signup.session;
if (!session) {
  const { data: si, error: siErr } = await supabase.auth.signInWithPassword({ email, password });
  log('sign-in before email confirmation', siErr ? `blocked: ${siErr.message}` : 'ALLOWED');
  session = si?.session || null;
  if (!session) { console.log('\nCannot proceed without a session — sellers cannot even log in unconfirmed.'); process.exit(0); }
}

const authed = createClient(url, key, {
  auth: { persistSession: false },
  global: { headers: { Authorization: `Bearer ${session.access_token}` } },
});
const uid = session.user.id;

// 2. Own profile row state
const { data: profile, error: profErr } = await authed.from('profiles').select('id, role, verified').eq('id', uid).maybeSingle();
if (profErr) log('read own profile', `ERROR: ${profErr.message}`);
else if (!profile) {
  log('read own profile', 'missing — creating via client upsert fallback (like AuthContext does)');
  const { data: created, error: upErr } = await authed.from('profiles').upsert({ id: uid, email, display_name: 'QA Bypass Seller', role: 'artist' }).select('id, role, verified').single();
  log('profile upsert fallback', upErr ? `blocked: ${upErr.message}` : `created role=${created.role} verified=${created.verified}`);
} else {
  log('own profile state', `role=${profile.role} verified=${profile.verified}`);
}

// 3. Try to create a studio (artists row) without approval
const { error: artistErr } = await authed.from('artists').insert({
  id: `seller-qa-bypass-${stamp}`,
  handle: `qa-bypass-${stamp}`,
  name: 'QA Bypass Studio',
  joined: '2026',
  followers: 0,
  verified: false,
  accent: '#0E0E0C',
  profile_id: uid,
}).select().single();
log('UNAPPROVED studio creation', artistErr ? `blocked: ${artistErr.message}` : '*** ALLOWED — RLS GATE MISSING ***');

// 4. Try to self-verify the profile
const { data: selfVerify, error: verErr } = await authed.from('profiles').update({ verified: true }).eq('id', uid).select('verified').maybeSingle();
log('self-set profiles.verified=true', verErr ? `blocked: ${verErr.message}` : (selfVerify?.verified === true ? '*** ALLOWED — SELF-VERIFY POSSIBLE ***' : `no-op (verified=${selfVerify?.verified})`));

// 5. Try to list an artwork without approval (if studio insert succeeded)
if (!artistErr) {
  const { error: artErr } = await authed.from('artworks').insert({
    id: `art_qa_bypass_${stamp}`,
    title: 'QA bypass artwork',
    visual: 'v1',
    artist_id: `seller-qa-bypass-${stamp}`,
    year: 2026,
    dimensions: 'Dig