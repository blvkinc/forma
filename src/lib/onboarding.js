import { supabase } from './supabase';

const APPLICATION_SELECT = `
  *,
  profiles:profiles!seller_applications_profile_id_fkey (
    id,
    email,
    display_name,
    handle,
    role,
    verified,
    created_at,
    city,
    bio
  )
`;

function cleanText(value, max = 900) {
  return String(value || '').trim().slice(0, max);
}

function cleanUrl(value) {
  const url = cleanText(value, 500);
  if (!url) return null;
  return url;
}

function cleanSamples(samples) {
  const rows = Array.isArray(samples) ? samples : [];
  return rows
    .map(sample => ({
      title: cleanText(sample?.title, 140),
      imageUrl: cleanUrl(sample?.imageUrl),
      notes: cleanText(sample?.notes, 500),
    }))
    .filter(sample => sample.title || sample.imageUrl || sample.notes)
    .slice(0, 6);
}

export function transformSellerApplication(row) {
  if (!row) return null;
  const profile = row.profiles || {};
  return {
    id: row.id,
    profileId: row.profile_id,
    studioName: row.studio_name,
    handle: row.handle,
    city: row.city,
    bio: row.bio,
    portfolioUrl: row.portfolio_url,
    processNotes: row.process_notes,
    sampleWorks: Array.isArray(row.sample_works) ? row.sample_works : [],
    status: row.status,
    reviewNote: row.review_note,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    profile: {
      id: profile.id || row.profile_id,
      email: profile.email,
      displayName: profile.display_name,
      handle: profile.handle,
      role: profile.role,
      verified: profile.verified === true,
      city: profile.city,
      bio: profile.bio,
      createdAt: profile.created_at,
    },
  };
}

function applicationPayload(profileId, payload) {
  const sampleWorks = cleanSamples(payload.sampleWorks);
  const portfolioUrl = cleanUrl(payload.portfolioUrl);
  const status = payload.status === 'draft' ? 'draft' : 'pending';

  if (!profileId) throw new Error('Authentication is required.');
  if (!cleanText(payload.studioName, 120)) throw new Error('Enter a studio name.');
  if (status === 'pending' && !portfolioUrl && sampleWorks.length === 0) {
    throw new Error('Add a portfolio URL or at least one sample work.');
  }

  return {
    profile_id: profileId,
    studio_name: cleanText(payload.studioName, 120),
    handle: cleanText(payload.handle, 48) || null,
    city: cleanText(payload.city, 120) || null,
    bio: cleanText(payload.bio, 900) || null,
    portfolio_url: portfolioUrl,
    process_notes: cleanText(payload.processNotes, 1200) || null,
    sample_works: sampleWorks,
    status,
  };
}

export async function fetchMySellerApplication(profileId) {
  if (!profileId) return null;
  const { data, error } = await supabase
    .from('seller_applications')
    .select(APPLICATION_SELECT)
    .eq('profile_id', profileId)
    .maybeSingle();
  if (error) throw error;
  return transformSellerApplication(data);
}

export async function submitSellerApplication(profileId, payload) {
  const values = applicationPayload(profileId, payload);
  const existing = await fetchMySellerApplication(profileId);
  const query = existing?.id
    ? supabase
      .from('seller_applications')
      .update(values)
      .eq('id', existing.id)
    : supabase
      .from('seller_applications')
      .insert(values);

  const { data, error } = await query
    .select(APPLICATION_SELECT)
    .single();
  if (error) throw error;
  return transformSellerApplication(data);
}

export async function fetchSellerApplications() {
  const { data, error } = await supabase
    .from('seller_applications')
    .select(APPLICATION_SELECT)
    .order('status', { ascending: false })
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(transformSellerApplication);
}

export async function reviewSellerApplication(applicationId, decision, reviewNote = '') {
  const status = decision === 'approved' ? 'approved' : 'rejected';
  const { data, error } = await supabase
    .from('seller_applications')
    .update({
      status,
      review_note: cleanText(reviewNote, 900) || null,
    })
    .eq('id', applicationId)
    .select(APPLICATION_SELECT)
    .single();
  if (error) throw error;
  return transformSellerApplication(data);
}
