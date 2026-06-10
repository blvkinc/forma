import { supabase } from './supabase';

const APPLICATION_MEDIA_BUCKET = 'seller-application-media';
const APPLICATION_MEDIA_MAX_BYTES = 10 * 1024 * 1024;

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

function cleanHttpsUrl(value) {
  const url = cleanUrl(value);
  if (!url) return null;
  if (!/^https:\/\/[^\s]+$/i.test(url)) {
    throw new Error('Profile links must use HTTPS URLs.');
  }
  return url;
}

function cleanStoragePath(value) {
  const path = cleanText(value, 700);
  if (!path) return null;
  return path.replace(/^\/+/, '');
}

function imageExtension(file) {
  const byType = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  const extension = String(file?.name || '').split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '');
  return byType[file?.type] || extension || 'jpg';
}

function makeId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function cleanSamples(samples) {
  const rows = Array.isArray(samples) ? samples : [];
  return rows
    .map(sample => {
      const storagePath = cleanStoragePath(sample?.storagePath || sample?.imagePath);
      return {
        title: cleanText(sample?.title, 140),
        imageUrl: storagePath ? null : cleanUrl(sample?.imageUrl),
        storagePath,
        notes: cleanText(sample?.notes, 500),
      };
    })
    .filter(sample => sample.title || sample.imageUrl || sample.storagePath || sample.notes)
    .slice(0, 8);
}

function cleanProfileLinks(links) {
  const rows = Array.isArray(links) ? links : [];
  return rows
    .map(link => ({
      label: cleanText(link?.label, 80) || 'Profile',
      url: cleanHttpsUrl(link?.url),
    }))
    .filter(link => link.url)
    .slice(0, 8);
}

async function signedApplicationMediaUrl(storagePath) {
  if (!storagePath) return '';
  const { data, error } = await supabase
    .storage
    .from(APPLICATION_MEDIA_BUCKET)
    .createSignedUrl(storagePath, 60 * 60);
  if (error) {
    console.warn('Seller application media signing failed:', error.message);
    return '';
  }
  return data?.signedUrl || '';
}

async function hydrateApplicationMedia(application) {
  if (!application?.sampleWorks?.length) return application;
  const sampleWorks = await Promise.all(application.sampleWorks.map(async (sample) => {
    if (!sample.storagePath) return sample;
    const signedUrl = await signedApplicationMediaUrl(sample.storagePath);
    return {
      ...sample,
      imageUrl: signedUrl || sample.imageUrl || '',
    };
  }));
  return { ...application, sampleWorks };
}

export function transformSellerApplication(row) {
  if (!row) return null;
  const profile = row.profiles || {};
  const sampleWorks = Array.isArray(row.sample_works) ? row.sample_works : [];
  const profileLinks = Array.isArray(row.profile_links) ? row.profile_links : [];
  return {
    id: row.id,
    profileId: row.profile_id,
    studioName: row.studio_name,
    handle: row.handle,
    city: row.city,
    bio: row.bio,
    portfolioUrl: row.portfolio_url,
    artistStatement: row.artist_statement,
    profileLinks,
    processNotes: row.process_notes,
    sampleWorks,
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
  const profileLinks = cleanProfileLinks(payload.profileLinks);
  const portfolioUrl = cleanHttpsUrl(payload.portfolioUrl);
  const status = payload.status === 'draft' ? 'draft' : 'pending';
  const completeSamples = sampleWorks.filter(sample =>
    sample.title.length >= 2
    && sample.notes.length >= 20
    && (sample.storagePath || cleanHttpsUrl(sample.imageUrl))
  );

  if (!profileId) throw new Error('Authentication is required.');
  if (cleanText(payload.studioName, 120).length < 2) throw new Error('Enter a studio name.');
  if (status === 'pending') {
    if (cleanText(payload.artistStatement, 1200).length < 40) {
      throw new Error('Add an artist statement of at least 40 characters.');
    }
    if (cleanText(payload.processNotes, 1200).length < 40) {
      throw new Error('Add process notes or proof of work of at least 40 characters.');
    }
    if (!portfolioUrl && profileLinks.length === 0 && completeSamples.length === 0) {
      throw new Error('Add an HTTPS portfolio/profile link or a completed sample with image and process notes.');
    }
  }

  return {
    profile_id: profileId,
    studio_name: cleanText(payload.studioName, 120),
    handle: cleanText(payload.handle, 48) || null,
    city: cleanText(payload.city, 120) || null,
    bio: cleanText(payload.bio, 900) || null,
    portfolio_url: portfolioUrl,
    artist_statement: cleanText(payload.artistStatement, 1200) || null,
    profile_links: profileLinks,
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
  return hydrateApplicationMedia(transformSellerApplication(data));
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
  return hydrateApplicationMedia(transformSellerApplication(data));
}

export async function fetchSellerApplications() {
  const { data, error } = await supabase
    .from('seller_applications')
    .select(APPLICATION_SELECT)
    .order('status', { ascending: false })
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return Promise.all((data || []).map(row => hydrateApplicationMedia(transformSellerApplication(row))));
}

export async function reviewSellerApplication(applicationId, decision, reviewNote = '') {
  const status = decision === 'approved' ? 'approved' : 'rejected';
  const { error: rpcError } = await supabase.rpc('admin_review_seller_application', {
    p_application_id: applicationId,
    p_decision: status,
    p_review_note: cleanText(reviewNote, 900) || null,
  });

  if (rpcError) {
    if (!/admin_review_seller_application|schema cache|function .* does not exist/i.test(rpcError.message || '')) {
      throw rpcError;
    }

    const { error: fallbackError } = await supabase
      .from('seller_applications')
      .update({
        status,
        review_note: cleanText(reviewNote, 900) || null,
      })
      .eq('id', applicationId);
    if (fallbackError) throw fallbackError;
  }

  const { data, error } = await supabase
    .from('seller_applications')
    .select(APPLICATION_SELECT)
    .eq('id', applicationId)
    .single();
  if (error) throw error;
  return hydrateApplicationMedia(transformSellerApplication(data));
}

export async function uploadSellerApplicationImage(file) {
  if (!file) throw new Error('Choose an image to upload.');
  if (!String(file.type || '').startsWith('image/')) {
    throw new Error('Upload an image file for the seller application.');
  }
  if (file.size > APPLICATION_MEDIA_MAX_BYTES) {
    throw new Error('Application images must be 10MB or smaller.');
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) throw new Error('Authentication is required.');

  const path = `${user.id}/samples/${Date.now()}-${makeId('sample')}.${imageExtension(file)}`;
  const { error } = await supabase
    .storage
    .from(APPLICATION_MEDIA_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      contentType: file.type || 'image/jpeg',
      upsert: false,
    });

  if (error) throw error;

  return {
    storagePath: path,
    imageUrl: await signedApplicationMediaUrl(path),
  };
}
