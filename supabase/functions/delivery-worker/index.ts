import { createClient } from 'npm:@supabase/supabase-js@2';

type DeliveryJob = {
  id: string;
  event_type: string;
  channel: 'email' | 'webhook';
  recipient_user_id: string | null;
  recipient_email: string | null;
  webhook_url: string | null;
  payload: Record<string, unknown>;
  attempts: number;
};

const jsonHeaders = {
  'Content-Type': 'application/json',
};

function getSecretKey() {
  const direct =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ||
    Deno.env.get('SUPABASE_SECRET_KEY');
  if (direct) return direct;

  const secretKeys = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (!secretKeys) return null;

  try {
    const parsed = JSON.parse(secretKeys);
    return parsed.default || Object.values(parsed)[0] || null;
  } catch {
    return null;
  }
}

function getWorkerSecret() {
  return Deno.env.get('FORMA_DELIVERY_WORKER_SECRET') || '';
}

function isAuthorized(req: Request) {
  const workerSecret = getWorkerSecret();
  if (!workerSecret) return false;

  const bearer = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '').trim();
  const headerSecret = req.headers.get('X-Forma-Worker-Secret') || '';
  return bearer === workerSecret || headerSecret === workerSecret;
}

function clampBatchSize(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 25;
  return Math.max(1, Math.min(100, Math.floor(parsed)));
}

async function hmacSha256(secret: string, body: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function sendWebhook(job: DeliveryJob) {
  if (!job.webhook_url) throw new Error('Webhook URL is missing.');

  const body = JSON.stringify({
    id: job.id,
    event_type: job.event_type,
    channel: job.channel,
    payload: job.payload,
    attempt: job.attempts,
  });

  const headers = new Headers(jsonHeaders);
  headers.set('X-Forma-Event', job.event_type);
  headers.set('X-Forma-Delivery-Id', job.id);

  const signingSecret = Deno.env.get('FORMA_WEBHOOK_SIGNING_SECRET');
  if (signingSecret) {
    headers.set('X-Forma-Signature', `sha256=${await hmacSha256(signingSecret, body)}`);
  }

  const response = await fetch(job.webhook_url, {
    method: 'POST',
    headers,
    body,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Webhook ${response.status}: ${detail.slice(0, 500)}`);
  }
}

async function sendEmail(job: DeliveryJob) {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('FORMA_EMAIL_FROM');
  if (!apiKey || !from) {
    throw new Error('Email provider is not configured. Set RESEND_API_KEY and FORMA_EMAIL_FROM.');
  }
  if (!job.recipient_email) throw new Error('Recipient email is missing.');

  const payload = job.payload || {};
  const title = String(payload.title || 'FORMA notification');
  const body = String(payload.body || payload.type || job.event_type);

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      ...jsonHeaders,
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to: [job.recipient_email],
      subject: title,
      text: `${title}\n\n${body}`,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Email ${response.status}: ${detail.slice(0, 500)}`);
  }
}

async function deliver(job: DeliveryJob) {
  if (job.channel === 'webhook') {
    await sendWebhook(job);
    return;
  }
  if (job.channel === 'email') {
    await sendEmail(job);
    return;
  }
  throw new Error(`Unsupported delivery channel: ${job.channel}`);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Use POST.' }, { status: 405, headers: jsonHeaders });
  }

  if (!isAuthorized(req)) {
    return Response.json(
      { error: 'Delivery worker secret is missing or invalid.' },
      { status: 401, headers: jsonHeaders },
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const secretKey = getSecretKey();
  if (!supabaseUrl || !secretKey) {
    return Response.json(
      { error: 'Missing SUPABASE_URL and service-role secret.' },
      { status: 500, headers: jsonHeaders },
    );
  }

  const requestBody = await req.json().catch(() => ({}));
  const limit = clampBatchSize(requestBody.limit);
  const supabase = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: jobs, error: claimError } = await supabase.rpc('claim_delivery_outbox_batch', {
    p_limit: limit,
  });
  if (claimError) {
    return Response.json({ error: claimError.message }, { status: 500, headers: jsonHeaders });
  }

  const results = [];
  for (const job of (jobs || []) as DeliveryJob[]) {
    try {
      await deliver(job);
      await supabase.rpc('complete_delivery_outbox', {
        p_delivery_id: job.id,
        p_success: true,
        p_error: null,
      });
      results.push({ id: job.id, channel: job.channel, status: 'sent' });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await supabase.rpc('complete_delivery_outbox', {
        p_delivery_id: job.id,
        p_success: false,
        p_error: message,
      });
      results.push({ id: job.id, channel: job.channel, status: 'failed', error: message });
    }
  }

  return Response.json(
    {
      claimed: jobs?.length || 0,
      sent: results.filter((row) => row.status === 'sent').length,
      failed: results.filter((row) => row.status === 'failed').length,
      results,
    },
    { headers: jsonHeaders },
  );
});
