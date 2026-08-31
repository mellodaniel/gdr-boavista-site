import crypto from 'node:crypto';

const NEWSLETTER_GROUP_SLUG = 'newsletter-geral';

function getSupabaseConfig() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return {
    supabaseUrl: supabaseUrl.replace(/\/$/, ''),
    serviceRoleKey,
  };
}

function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function createUnsubscribeToken() {
  return crypto.randomBytes(24).toString('hex');
}

function getClientIp(request) {
  const forwardedFor = request.headers['x-forwarded-for'];

  if (Array.isArray(forwardedFor)) {
    return forwardedFor[0] ?? null;
  }

  if (typeof forwardedFor === 'string') {
    return forwardedFor.split(',')[0]?.trim() || null;
  }

  return request.socket?.remoteAddress ?? null;
}

async function supabaseRequest(path, options = {}) {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error('Supabase service configuration is missing');
  }

  const response = await fetch(`${config.supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error = new Error(data?.message || data?.error || 'Supabase request failed');
    error.status = response.status;
    error.details = data;
    throw error;
  }

  return data;
}

async function findSubscriberByEmail(email) {
  const encodedEmail = encodeURIComponent(email);

  const subscribers = await supabaseRequest(
    `gdrb_subscribers?email=eq.${encodedEmail}&select=id,unsubscribe_token`,
    { method: 'GET' },
  );

  return Array.isArray(subscribers) ? subscribers[0] ?? null : null;
}

async function findNewsletterGroup() {
  const groups = await supabaseRequest(
    `gdrb_communication_groups?slug=eq.${NEWSLETTER_GROUP_SLUG}&select=id`,
    { method: 'GET' },
  );

  return Array.isArray(groups) ? groups[0] ?? null : null;
}

async function addSubscriberToNewsletterGroup(subscriberId) {
  const group = await findNewsletterGroup();

  if (!group?.id) {
    return;
  }

  await supabaseRequest(
    'gdrb_subscriber_groups?on_conflict=subscriber_id,group_id',
    {
      method: 'POST',
      headers: {
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({
        subscriber_id: subscriberId,
        group_id: group.id,
      }),
    },
  );
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  if (!getSupabaseConfig()) {
    return response.status(500).json({
      error: 'SUPABASE_SERVICE_ROLE_KEY is not configured',
    });
  }

  const email = normalizeEmail(request.body?.email);
  const name = String(request.body?.name ?? '').trim() || null;
  const consentEmail = request.body?.consentEmail === true;
  const privacyPolicyAccepted = request.body?.privacyPolicyAccepted === true;

  if (!email || !isValidEmail(email)) {
    return response.status(400).json({ error: 'Indica um email válido.' });
  }

  if (!consentEmail || !privacyPolicyAccepted) {
    return response.status(400).json({
      error: 'É necessário aceitar receber comunicações para subscrever a newsletter.',
    });
  }

  const now = new Date().toISOString();
  const existingSubscriber = await findSubscriberByEmail(email);

  const subscriberPayload = {
    name,
    email,
    source: 'site',
    consent_email: true,
    consent_email_at: now,
    privacy_policy_accepted: true,
    privacy_policy_accepted_at: now,
    is_active: true,
    unsubscribed_at: null,
    unsubscribe_reason: null,
    subscription_ip: getClientIp(request),
    user_agent: request.headers['user-agent'] || null,
  };

  try {
    let subscriberId;

    if (existingSubscriber?.id) {
      const updatedSubscribers = await supabaseRequest(
        `gdrb_subscribers?id=eq.${existingSubscriber.id}&select=id`,
        {
          method: 'PATCH',
          headers: {
            Prefer: 'return=representation',
          },
          body: JSON.stringify({
            ...subscriberPayload,
            unsubscribe_token: existingSubscriber.unsubscribe_token || createUnsubscribeToken(),
          }),
        },
      );

      subscriberId = updatedSubscribers?.[0]?.id;
    } else {
      const insertedSubscribers = await supabaseRequest('gdrb_subscribers?select=id', {
        method: 'POST',
        headers: {
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          ...subscriberPayload,
          unsubscribe_token: createUnsubscribeToken(),
        }),
      });

      subscriberId = insertedSubscribers?.[0]?.id;
    }

    if (subscriberId) {
      await addSubscriberToNewsletterGroup(subscriberId);
    }

    return response.status(200).json({ ok: true });
  } catch (error) {
    console.error('Erro ao subscrever newsletter:', error);
    return response.status(error.status || 500).json({
      error: 'Não foi possível concluir a subscrição. Tenta novamente.',
      details: error.details || null,
    });
  }
}
