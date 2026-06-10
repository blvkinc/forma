// Probes the live Supabase database (anon key) for the schema objects added
// by later migrations, so you can tell at a glance which migrations still
// need to be applied. Read-only — never writes.
//
//   npm run qa:migrations
//
import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'node:fs';

function loadEnv() {
  const out = {};
  for (const file of ['.env.local', '.env']) {
    if (!existsSync(file)) continue;
    for (const row of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const line = row.trim();
      if (!line || line.startsWith('#')) continue;
      const i = line.indexOf('=');
      if (i === -1) continue;
      const k = line.slice(0, i).trim();
      if (!(k in out)) out[k] = line.slice(i + 1).trim();
    }
  }
  return out;
}

const env = loadEnv();
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY in .env(.local)');
  process.exit(2);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

const missingFn = (error) =>
  error?.code === 'PGRST202' || /could not find the function|function .* does not exist/i.test(error?.message || '');
const missingCol = (error) => /column .* does not exist/i.test(error?.message || '');
const missingRel = (error) =>
  error?.code === '42P01' || /relation .* does not exist|could not find the table/i.test(error?.message || '');

// Each check ties a concrete schema object to the migration that introduces it.
const checks = [
  { mig: '033_automatic_auction_closeout', kind: 'fn', name: 'close_ended_auction', args: { p_artwork_id: '__probe__' } },
  { mig: '034_seller_onboarding_applications', kind: 'col', table: 'seller_applications', column: 'process_notes' },
  { mig: '041_delivery_worker_claims', kind: 'fn', name: 'claim_delivery_outbox_batch', args: { p_limit: 1 } },
  { mig: '046_profile_privacy_cards', kind: 'col', table: 'profile_cards', column: 'display_name' },
  { mig: '048_seller_application_media_and_links', kind: 'col', table: 'seller_applications', column: 'profile_links' },
  { mig: '050_seller_approval_workflow_enforcement', kind: 'fn', name: 'admin_review_seller_application',
    args: { p_application_id: '00000000-0000-0000-0000-000000000000', p_decision: 'approved', p_review_note: null } },
];

const pending = [];

for (const check of checks) {
  let present = true;
  let note = '';
  if (check.kind === 'fn') {
    const { error } = await sb.rpc(check.name, check.args);
    if (missingFn(error)) { present = false; note = `function ${check.name}() missing`; }
    else note = `function ${check.name}() present`;
  } else {
    const { error } = await sb.from(check.table).select(check.column).limit(1);
    if (missingCol(error) || missingRel(error)) { present = false; note = `${check.table}.${check.column} missing`; }
    else note = `${check.table}.${check.column} present`;
  }
  console.log(`${present ? 'OK     ' : 'PENDING'} ${check.mig}  (${note})`);
  if (!present) pending.push(check.mig);
}

console.log('');
if (pending.length === 0) {
  console.log('All probed migrations are applied.');
  process.exit(0);
}
console.log(`${pending.length} migration(s) appear UNAPPLIED:`);
pending.forEach(m => console.log(`  - supabase/migrations/${m}.sql`));
console.log('\nApply the full migration set in order via the Supabase SQL editor or:');
console.log('  supabase db push        # Supabase CLI, linked project');
console.log('Migration 050 is the one that enforces seller approval before verification.');
process.exit(1);
