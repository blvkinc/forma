import { submitSellerApplication, uploadSellerApplicationImage } from './onboarding';

const DB_NAME = 'forma-seller-application';
const DB_VERSION = 1;
const IMAGE_STORE = 'images';
const STORAGE_PREFIX = 'forma.pendingSellerApplication.';
const IMAGE_MAX_BYTES = 10 * 1024 * 1024;

function isBrowser() {
  return typeof window !== 'undefined' && typeof indexedDB !== 'undefined';
}

function cleanText(value, max = 1200) {
  return String(value || '').trim().slice(0, max);
}

function cleanHttpsUrl(value) {
  const url = cleanText(value, 500);
  if (!url) return '';
  if (!/^https:\/\/[^\s]+$/i.test(url)) {
    throw new Error('Profile links must use HTTPS URLs.');
  }
  return url;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function storageKey(email) {
  return `${STORAGE_PREFIX}${normalizeEmail(email)}`;
}

function openDatabase() {
  if (!isBrowser()) return Promise.resolve(null);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IMAGE_STORE)) {
        db.createObjectStore(IMAGE_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open application image storage.'));
  });
}

async function writeImageRecord(record) {
  const db = await openDatabase();
  if (!db) return false;

  return new Promise((resolve, reject) => {
    const tx = db.transaction(IMAGE_STORE, 'readwrite');
    tx.objectStore(IMAGE_STORE).put(record);
    tx.oncomplete = () => {
      db.close();
      resolve(true);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error('Could not save application image.'));
    };
  });
}

async function readImageRecord(id) {
  const db = await openDatabase();
  if (!db || !id) return null;

  return new Promise((resolve, reject) => {
    const tx = db.transaction(IMAGE_STORE, 'readonly');
    const request = tx.objectStore(IMAGE_STORE).get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error || new Error('Could not load application image.'));
    tx.oncomplete = () => db.close();
    tx.onerror = () => db.close();
  });
}

async function deleteImageRecord(id) {
  const db = await openDatabase();
  if (!db || !id) return false;

  return new Promise((resolve) => {
    const tx = db.transaction(IMAGE_STORE, 'readwrite');
    tx.objectStore(IMAGE_STORE).delete(id);
    tx.oncomplete = () => {
      db.close();
      resolve(true);
    };
    tx.onerror = () => {
      db.close();
      resolve(false);
    };
  });
}

function sanitizeSample(sample) {
  const localFileId = cleanText(sample?.localFileId, 260);
  const storagePath = cleanText(sample?.storagePath || sample?.imagePath, 700);
  return {
    title: cleanText(sample?.title, 140),
    imageUrl: localFileId || storagePath ? '' : cleanHttpsUrl(sample?.imageUrl),
    storagePath,
    localFileId,
    notes: cleanText(sample?.notes, 500),
  };
}

function sanitizePayload(payload) {
  const profileLinks = Array.isArray(payload?.profileLinks) ? payload.profileLinks : [];
  const sampleWorks = Array.isArray(payload?.sampleWorks) ? payload.sampleWorks : [];

  return {
    studioName: cleanText(payload?.studioName, 120),
    handle: cleanText(payload?.handle, 48),
    city: cleanText(payload?.city, 120),
    bio: cleanText(payload?.bio, 900),
    artistStatement: cleanText(payload?.artistStatement, 1200),
    portfolioUrl: cleanHttpsUrl(payload?.portfolioUrl),
    profileLinks: profileLinks
      .map(link => ({
        label: cleanText(link?.label, 80),
        url: cleanHttpsUrl(link?.url),
      }))
      .filter(link => link.label || link.url)
      .slice(0, 8),
    processNotes: cleanText(payload?.processNotes, 1200),
    sampleWorks: sampleWorks
      .map(sanitizeSample)
      .filter(sample => sample.title || sample.imageUrl || sample.storagePath || sample.localFileId || sample.notes)
      .slice(0, 8),
    status: payload?.status === 'draft' ? 'draft' : 'pending',
  };
}

export async function stagePendingSellerApplicationImage(email, file) {
  if (!file) throw new Error('Choose an image to upload.');
  if (!normalizeEmail(email)) throw new Error('Enter your email before adding images.');
  if (!String(file.type || '').startsWith('image/')) {
    throw new Error('Choose a PNG, JPG, GIF, or WEBP image.');
  }
  if (file.size > IMAGE_MAX_BYTES) {
    throw new Error('Application images must be 10MB or smaller.');
  }
  if (!isBrowser()) throw new Error('Application image staging is only available in the browser.');

  const id = `${normalizeEmail(email)}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 10)}`;
  await writeImageRecord({
    id,
    email: normalizeEmail(email),
    file,
    name: file.name,
    type: file.type,
    size: file.size,
    createdAt: new Date().toISOString(),
  });

  return {
    localFileId: id,
    imageUrl: URL.createObjectURL(file),
  };
}

export function savePendingSellerApplication(email, payload) {
  if (typeof window === 'undefined') return null;
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail) throw new Error('Email is required before saving the seller application.');

  const record = {
    email: cleanEmail,
    savedAt: new Date().toISOString(),
    payload: sanitizePayload(payload),
  };
  window.localStorage.setItem(storageKey(cleanEmail), JSON.stringify(record));
  return record;
}

export function loadPendingSellerApplication(email) {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(storageKey(email));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function clearPendingSellerApplication(email, payload = null) {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(storageKey(email));
  }

  const samples = payload?.sampleWorks || payload?.payload?.sampleWorks || [];
  await Promise.all(
    (Array.isArray(samples) ? samples : [])
      .map(sample => sample?.localFileId)
      .filter(Boolean)
      .map(deleteImageRecord)
  );
}

export async function submitPendingSellerApplication(profileId, email) {
  const pending = loadPendingSellerApplication(email);
  if (!pending?.payload || !profileId) return null;

  const sampleWorks = await Promise.all((pending.payload.sampleWorks || []).map(async (sample) => {
    if (!sample.localFileId || sample.storagePath) {
      const { localFileId, ...rest } = sample;
      return rest;
    }

    const record = await readImageRecord(sample.localFileId);
    if (!record?.file) {
      const { localFileId, ...rest } = sample;
      return rest;
    }

    const uploaded = await uploadSellerApplicationImage(record.file);
    return {
      title: sample.title,
      imageUrl: '',
      storagePath: uploaded.storagePath,
      notes: sample.notes,
    };
  }));

  const saved = await submitSellerApplication(profileId, {
    ...pending.payload,
    sampleWorks,
    status: 'pending',
  });

  await clearPendingSellerApplication(email, pending);
  return saved;
}
