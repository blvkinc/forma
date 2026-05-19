import { supabase } from './supabase';

const AI_REVIEW_TIMEOUT_MS = 12000;

function withTimeout(promise, label = 'Authenticity request') {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out. Please retry after refreshing the app.`));
    }, AI_REVIEW_TIMEOUT_MS);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

function transformVote(row) {
  return {
    id: row.id,
    artworkId: row.artwork_id,
    voterId: row.voter_id,
    reason: row.reason,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformProof(row) {
  return {
    id: row.id,
    artworkId: row.artwork_id,
    artistId: row.artist_id,
    submittedBy: row.submitted_by,
    proofUrl: row.proof_url,
    notes: row.notes,
    status: row.status,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function currentUserId() {
  const { data: { user }, error } = await withTimeout(
    supabase.auth.getUser(),
    'Authentication check'
  );
  if (error) throw error;
  if (!user?.id) throw new Error('Authentication is required.');
  return user.id;
}

export async function fetchArtworkAuthenticity(artworkId) {
  const { data: { user } } = await withTimeout(
    supabase.auth.getUser(),
    'Authentication check'
  );

  const [votesResult, proofsResult] = await Promise.all([
    withTimeout(
      supabase
        .from('artwork_ai_votes')
        .select('*')
        .eq('artwork_id', artworkId)
        .order('created_at', { ascending: false }),
      'AI vote lookup'
    ),
    withTimeout(
      supabase
        .from('artwork_ai_proofs')
        .select('*')
        .eq('artwork_id', artworkId)
        .order('created_at', { ascending: false }),
      'Artist proof lookup'
    ),
  ]);

  if (votesResult.error) throw votesResult.error;
  if (proofsResult.error) throw proofsResult.error;

  const votes = (votesResult.data || []).map(transformVote);
  const proofs = (proofsResult.data || []).map(transformProof);

  return {
    votes,
    proofs,
    ownVote: votes.find(vote => vote.voterId === user?.id) || null,
  };
}

export async function submitAiVote(artworkId, reason = 'suspected_ai', note = '') {
  const userId = await currentUserId();
  const values = {
    artwork_id: artworkId,
    voter_id: userId,
    reason,
    note: String(note || '').trim().slice(0, 800) || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await withTimeout(
    supabase
      .from('artwork_ai_votes')
      .upsert(values, { onConflict: 'artwork_id,voter_id' })
      .select()
      .single(),
    'AI vote save'
  );

  if (error) throw error;
  return transformVote(data);
}

export async function removeAiVote(artworkId) {
  const userId = await currentUserId();
  const { error } = await withTimeout(
    supabase
      .from('artwork_ai_votes')
      .delete()
      .eq('artwork_id', artworkId)
      .eq('voter_id', userId),
    'AI vote removal'
  );

  if (error) throw error;
  return true;
}

export async function submitArtworkProof(artwork, proofUrl, notes) {
  const userId = await currentUserId();
  const cleanNotes = String(notes || '').trim();
  if (cleanNotes.length < 20) {
    throw new Error('Add at least 20 characters of process proof.');
  }

  const { data, error } = await withTimeout(
    supabase
      .from('artwork_ai_proofs')
      .insert({
        artwork_id: artwork.id,
        artist_id: artwork.artist,
        submitted_by: userId,
        proof_url: String(proofUrl || '').trim().slice(0, 500) || null,
        notes: cleanNotes.slice(0, 1600),
      })
      .select()
      .single(),
    'Artist proof submission'
  );

  if (error) throw error;
  return transformProof(data);
}

// -------------------------------------------------
// Rule 2: per-artwork authenticity seal.
// RLS on public.artwork_authenticity_seal returns a row ONLY when
// the caller is the owning artist or a buyer of the artwork.
// Anyone else gets no row → null (hash stays private).
// -------------------------------------------------
export async function fetchArtworkAuthenticitySeal(artworkId) {
  const { data, error } = await supabase
    .from('artwork_authenticity_seal')
    .select('artwork_id, authenticity_hash, issued_at')
    .eq('artwork_id', artworkId)
    .maybeSingle();

  if (error) {
    // A blocked/empty read is expected for non-owner/non-buyer.
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  if (!data) return null;
  return {
    artworkId: data.artwork_id,
    hash: data.authenticity_hash,
    issuedAt: data.issued_at,
  };
}
