import { escapeHtml, normalizeEmail, isValidEmail, normalizeEmailTemplate, getUnsubscribeUrl, buildNewsletterHtml } from '../src/lib/newsletterTemplate.js';
import { randomUUID } from 'node:crypto';

function getSupabaseConfig() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) return null;

  return {
    supabaseUrl: supabaseUrl.replace(/\/$/, ''),
    serviceRoleKey,
  };
}

async function getNewsletterPartners() {
  const data = await supabaseRequest(
    'gdrb_sponsors?select=name,logo_url,website_url&is_active=eq.true&order=sort_order.asc,name.asc',
    { method: 'GET' },
  );
  return Array.isArray(data) ? data : [];
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

async function getCommunication(communicationId) {
  const data = await supabaseRequest(
    `gdrb_communications?id=eq.${encodeURIComponent(communicationId)}&select=*`,
    { method: 'GET' },
  );

  return Array.isArray(data) ? data[0] ?? null : null;
}

async function getTargetGroupIds(communicationId) {
  const data = await supabaseRequest(
    `gdrb_communication_targets?communication_id=eq.${encodeURIComponent(communicationId)}&select=group_id`,
    { method: 'GET' },
  );

  return Array.isArray(data) ? data.map((item) => item.group_id).filter(Boolean) : [];
}

async function getManualRecipientIds(communicationId) {
  const data = await supabaseRequest(
    `gdrb_communication_manual_recipients?communication_id=eq.${encodeURIComponent(communicationId)}&select=subscriber_id`,
    { method: 'GET' },
  );

  return Array.isArray(data) ? data.map((item) => item.subscriber_id).filter(Boolean) : [];
}

async function getSubscriberGroups() {
  const data = await supabaseRequest('gdrb_subscriber_groups?select=subscriber_id,group_id', {
    method: 'GET',
  });

  return Array.isArray(data) ? data : [];
}

async function getAllSubscribers() {
  const data = await supabaseRequest(
    'gdrb_subscribers?select=id,name,email,unsubscribe_token,source,contact_type,communication_scope,consent_email,consent_email_newsletter,consent_email_club,is_active,unsubscribed_at',
    { method: 'GET' },
  );

  return Array.isArray(data) ? data : [];
}


async function ensureUnsubscribeToken(subscriber) {
  if (subscriber?.unsubscribe_token) return subscriber;

  const unsubscribeToken = randomUUID();

  await supabaseRequest(`gdrb_subscribers?id=eq.${encodeURIComponent(subscriber.id)}`, {
    method: 'PATCH',
    headers: {
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ unsubscribe_token: unsubscribeToken }),
  });

  return {
    ...subscriber,
    unsubscribe_token: unsubscribeToken,
  };
}

function subscriberMatchesType(subscriber, communicationType) {
  if (communicationType === 'newsletter') {
    return true;
  }

  if (communicationType === 'escalao') {
    return subscriber.communication_scope === 'escalao' || subscriber.contact_type === 'encarregado' || subscriber.contact_type === 'atleta';
  }

  if (communicationType === 'interno') {
    return subscriber.communication_scope === 'interno' || ['treinador', 'direcao', 'staff'].includes(subscriber.contact_type);
  }

  if (communicationType === 'socios') {
    return subscriber.communication_scope === 'socios' || subscriber.contact_type === 'socio';
  }

  if (communicationType === 'parceiros') {
    return subscriber.communication_scope === 'parceiros' || subscriber.contact_type === 'parceiro';
  }

  return true;
}

function filterRecipients({ communication, subscribers, subscriberGroups, targetGroupIds, manualRecipientIds = [] }) {
  const selectedGroups = new Set(targetGroupIds);
  const manualRecipients = new Set(manualRecipientIds);
  const subscriberGroupsMap = new Map();
  const communicationType = communication.communication_type || 'newsletter';
  const isManual = communication.audience_mode === 'manual';
  const usesAllActiveAudience =
    communicationType === 'newsletter' || communicationType === 'geral';

  subscriberGroups.forEach((entry) => {
    if (!subscriberGroupsMap.has(entry.subscriber_id)) {
      subscriberGroupsMap.set(entry.subscriber_id, new Set());
    }

    subscriberGroupsMap.get(entry.subscriber_id).add(entry.group_id);
  });

  const optedOutEmails = new Set(subscribers.filter((item) => item.unsubscribed_at).map((item) => normalizeEmail(item.email)));
  const recipients = [];
  const usedEmails = new Set();
  let includedWithoutConsent = 0;
  let excludedNoConsent = 0;
  let excludedInactive = 0;
  let excludedNoEmail = 0;

  subscribers.forEach((subscriber) => {
    if (isManual) {
      if (!manualRecipients.has(subscriber.id)) return;
    } else if (!subscriberMatchesType(subscriber, communicationType)) return;

    if (!isManual && !usesAllActiveAudience && selectedGroups.size > 0) {
      const groupsForSubscriber = subscriberGroupsMap.get(subscriber.id);
      const inSelectedGroup = groupsForSubscriber
        ? Array.from(selectedGroups).some((groupId) => groupsForSubscriber.has(groupId))
        : false;

      if (!inSelectedGroup) return;
    }

    if (subscriber.unsubscribed_at || optedOutEmails.has(normalizeEmail(subscriber.email))) {
      excludedInactive += 1;
      return;
    }

    const recipientEmail = normalizeEmail(subscriber.email);

    if (!recipientEmail || !isValidEmail(recipientEmail)) {
      excludedNoEmail += 1;
      return;
    }

    if (usedEmails.has(recipientEmail)) return;
    usedEmails.add(recipientEmail);


    recipients.push({
      ...subscriber,
      email: recipientEmail,
    });
  });

  return {
    recipients,
    includedWithoutConsent,
    excludedNoConsent,
    excludedInactive,
    excludedNoEmail,
  };
}

async function createDelivery(delivery) {
  const data = await supabaseRequest('gdrb_communication_deliveries?select=id', {
    method: 'POST',
    headers: {
      Prefer: 'return=representation',
    },
    body: JSON.stringify(delivery),
  });

  return Array.isArray(data) ? data[0] ?? null : null;
}

async function updateDelivery(deliveryId, payload) {
  if (!deliveryId) return;

  await supabaseRequest(`gdrb_communication_deliveries?id=eq.${encodeURIComponent(deliveryId)}`, {
    method: 'PATCH',
    headers: {
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(payload),
  });
}

async function updateCommunication(communicationId, payload) {
  await supabaseRequest(`gdrb_communications?id=eq.${encodeURIComponent(communicationId)}`, {
    method: 'PATCH',
    headers: {
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(payload),
  });
}

async function sendEmail({ communication, subscriber, recipientEmail, emailTemplate, partners }) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  const subject = communication.subject || communication.title;
  const fromName = communication.from_name || 'GDR Boavista';
  const fromEmail = communication.from_email || 'notificacoes@send.gdrboavista.pt';
  const unsubscribeUrl = getUnsubscribeUrl(subscriber);

  if (!unsubscribeUrl) {
    throw new Error('Destinatário sem token de cancelamento de subscrição.');
  }

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${fromName} <${fromEmail}>`,
      to: [recipientEmail],
      subject,
      html: buildNewsletterHtml({ communication, subscriber, emailTemplate, partners }),
      headers: {
        'List-Unsubscribe': `<${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    }),
  });

  const result = await resendResponse.json().catch(() => ({}));

  if (!resendResponse.ok) {
    const error = new Error(result?.message || result?.error || 'Resend request failed');
    error.details = result;
    throw error;
  }

  return result;
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  if (!getSupabaseConfig()) {
    return response.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not configured' });
  }

  const mode = request.body?.mode || 'send';
  if (!['send', 'preview'].includes(mode)) {
    return response.status(400).json({ error: 'Modo inválido.' });
  }
  const communicationId = String(request.body?.communicationId ?? '').trim();
  const emailTemplate = normalizeEmailTemplate(request.body?.emailTemplate);

  if (mode === 'send' && !communicationId) {
    return response.status(400).json({ error: 'Comunicação inválida.' });
  }

  try {
    if (mode === 'preview') {
      const draft = request.body?.communication || {};
      const communication = {
        subject: String(draft.subject || 'Pré-visualização da newsletter'),
        preview_text: String(draft.preview_text || ''),
        body: String(draft.body || ''),
        images: draft.images,
      };
      const partners = await getNewsletterPartners();
      const subscriber = { name: '', unsubscribe_token: 'preview-only' };
      const html = buildNewsletterHtml({ communication, subscriber, emailTemplate, partners })
        .replaceAll(escapeHtml(getUnsubscribeUrl(subscriber)), '#');
      response.setHeader('Cache-Control', 'no-store');
      return response.status(200).json({ ok: true, mode: 'preview', html });
    }

    let communication = await getCommunication(communicationId);

    if (!communication) {
      return response.status(404).json({ error: 'Comunicação não encontrada.' });
    }

    if (!communication.subject || !communication.body) {
      return response.status(400).json({ error: 'A comunicação precisa ter assunto e mensagem.' });
    }

    const [targetGroupIds, manualRecipientIds, subscriberGroups, subscribers] = await Promise.all([
      getTargetGroupIds(communicationId),
      getManualRecipientIds(communicationId),
      getSubscriberGroups(),
      getAllSubscribers(),
    ]);

    const groupedTypes = ['escalao', 'interno', 'socios', 'parceiros'];

    if (communication.audience_mode !== 'manual' && groupedTypes.includes(communication.communication_type || 'newsletter') && targetGroupIds.length === 0) {
      return response.status(400).json({ error: 'Seleciona pelo menos um grupo para este tipo de comunicação.' });
    }

    if (communication.audience_mode === 'manual' && manualRecipientIds.length === 0) {
      return response.status(400).json({ error: 'Seleciona pelo menos um destinatário específico para esta comunicação.' });
    }

    const audience = filterRecipients({
      communication,
      subscribers,
      subscriberGroups,
      targetGroupIds,
      manualRecipientIds,
    });

    if (audience.recipients.length === 0) {
      await updateCommunication(communicationId, {
        estimated_recipients: 0,
        excluded_no_consent: audience.excludedNoConsent,
        excluded_inactive: audience.excludedInactive,
        excluded_no_email: audience.excludedNoEmail,
      });

      return response.status(400).json({
        error:
          communication.audience_mode === 'manual'
            ? 'Não existem destinatários específicos válidos para esta comunicação.'
            : (communication.communication_type || 'newsletter') === 'newsletter'
              ? 'Não existem contactos ativos com um endereço de email válido para esta newsletter.'
              : 'Não existem destinatários com email válido e sem cancelamento para esta comunicação.',
      });
    }

    // Load once before sending so every recipient gets the same partner section.
    const partners = await getNewsletterPartners();

    const editions = await supabaseRequest('rpc/reserve_newsletter_edition', {
      method: 'POST',
      body: JSON.stringify({ p_communication_id: communicationId }),
    });
    if (!editions?.[0]?.newsletter_edition) throw new Error('Não foi possível atribuir a edição.');
    communication = { ...communication, ...editions[0] };

    let sentCount = 0;
    let failedCount = 0;
    let lastError = null;

    for (const subscriber of audience.recipients) {
      const subscriberWithToken = await ensureUnsubscribeToken(subscriber);
      const recipientEmail = normalizeEmail(subscriberWithToken.email);

      const delivery = await createDelivery({
        communication_id: communicationId,
        subscriber_id: subscriber.id,
        recipient_email: recipientEmail,
        recipient_name: subscriber.name || null,
        status: 'pending',
      });

      try {
        const result = await sendEmail({ communication, subscriber: subscriberWithToken, recipientEmail, emailTemplate, partners });
        sentCount += 1;

        await updateDelivery(delivery?.id, {
          status: 'sent',
          resend_email_id: result.id || null,
          sent_at: new Date().toISOString(),
        });
      } catch (error) {
        failedCount += 1;
        lastError = error?.message || 'Erro ao enviar email';

        await updateDelivery(delivery?.id, {
          status: 'failed',
          error_message: lastError,
        });
      }
    }

    await updateCommunication(communicationId, {
      status: failedCount > 0 && sentCount === 0 ? 'ready' : 'sent',
      sent_at: sentCount > 0 ? new Date().toISOString() : null,
      sent_count: sentCount,
      failed_count: failedCount,
      last_error: lastError,
      estimated_recipients: audience.recipients.length,
      excluded_no_consent: audience.excludedNoConsent,
      excluded_inactive: audience.excludedInactive,
      excluded_no_email: audience.excludedNoEmail,
    });

    return response.status(200).json({
      ok: true,
      mode: 'send',
      sentCount,
      failedCount,
      excludedNoConsent: audience.excludedNoConsent,
      excludedInactive: audience.excludedInactive,
      excludedNoEmail: audience.excludedNoEmail,
    });
  } catch (error) {
    console.error('Erro ao enviar newsletter:', error);
    return response.status(error.status || 500).json({
      error: error.message || 'Não foi possível enviar a comunicação.',
      details: error.details || null,
    });
  }
}
