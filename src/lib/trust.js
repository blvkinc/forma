import { supabase } from './supabase';

async function trustApi(path, options = {}) {
  if (!import.meta.env.DEV) return null;

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('Authentication is required.');

  const response = await fetch(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Trust and safety request failed.');
  }

  return payload.data;
}

function transformReport(row) {
  return {
    id: row.id,
    reporterId: row.reporter_id,
    targetType: row.target_type,
    targetId: row.target_id,
    reason: row.reason,
    details: row.details,
    status: row.status,
    priority: row.priority,
    resolutionNote: row.resolution_note,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function reportPriority(reason) {
  if (reason === 'fraud' || reason === 'copyright' || reason === 'prohibited') return 'high';
  if (reason === 'abuse') return 'normal';
  return 'low';
}

export async function createReport(payload) {
  const apiData = await trustApi('/api/reports', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (apiData) return transformReport(apiData);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) throw new Error('Authentication is required.');

  const { data, error } = await supabase
    .from('reports')
    .insert({
      reporter_id: user.id,
      target_type: payload.targetType,
      target_id: payload.targetId,
      reason: payload.reason,
      details: payload.details,
      priority: payload.priority || reportPriority(payload.reason),
    })
    .select()
    .single();

  if (error) throw error;
  return transformReport(data);
}

export async function fetchReports() {
  const apiData = await trustApi('/api/reports');
  if (apiData) return (apiData || []).map(transformReport);

  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(transformReport);
}

export async function updateReport(reportId, updates) {
  const apiData = await trustApi('/api/reports', {
    method: 'PATCH',
    body: JSON.stringify({ reportId, ...updates }),
  });
  if (apiData) return transformReport(apiData);

  const { data, error } = await supabase
    .from('reports')
    .update({
      status: updates.status,
      resolution_note: updates.resolutionNote || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reportId)
    .select()
    .single();

  if (error) throw error;
  return transformReport(data);
}
