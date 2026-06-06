import { supabase } from './supabase';

const AVATAR_BUCKET = 'avatars';
const AVATAR_MAX_BYTES = 4 * 1024 * 1024;

function extensionFor(file) {
  const fromType = String(file.type || '').split('/')[1];
  if (fromType) return fromType.replace('jpeg', 'jpg');
  const fromName = String(file.name || '').split('.').pop();
  return fromName || 'jpg';
}

/**
 * Upload an avatar image for the signed-in user and return its public URL.
 */
export async function uploadAvatar(file) {
  if (!file) return '';
  if (!String(file.type || '').startsWith('image/')) {
    throw new Error('Upload an image file for your avatar.');
  }
  if (file.size > AVATAR_MAX_BYTES) {
    throw new Error('Avatars must be 4MB or smaller.');
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) throw new Error('Authentication is required.');

  const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extensionFor(file)}`;
  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      contentType: file.type || 'image/jpeg',
      upsert: false,
    });

  if (error) throw new Error(error.message || 'Avatar upload failed.');

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return data?.publicUrl || '';
}
