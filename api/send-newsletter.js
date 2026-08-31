function getSupabaseConfig() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) return null;

  return {
    supabaseUrl: supabaseUrl.replace(/\/$/, ''),
    serviceRoleKey,
  };
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function renderBodyHtml(body) {
  return escapeHtml(body)
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => (line.trim() ? line : '&nbsp;'))
    .join('<br />');
}

function buildNewsletterHtml({ communication, subscriber }) {
  const siteUrl = (process.env.PUBLIC_SITE_URL || 'https://gdrboavista.pt').replace(/\/$/, '');
  const unsubscribeUrl = subscriber?.unsubscribe_token
    ? `${siteUrl}/newsletter/cancelar/${encodeURIComponent(subscriber.unsubscribe_token)}`
    : `${siteUrl}/`;

  const title = escapeHtml(communication.subject || communication.title || 'Comunicação GDR Boavista');
  const previewText = communication.preview_text
    ? `<p style="margin: 0 0 18px; font-size: 14px; line-height: 1.6; color: #6b7280;">${escapeHtml(communication.preview_text)}</p>`
    : '';
  const bodyHtml = renderBodyHtml(communication.body || '');

  return `
    <div style="font-family: Arial, sans-serif; background: #f6f2ec; padding: 32px; color: #1f2937;">
      <div style="display:none; visibility:hidden; opacity:0; color:transparent; height:0; width:0; overflow:hidden;">
        ${escapeHtml(communication.preview_text || communication.subject || communication.title || 'Comunicação GDR Boavista')}
      </div>

      <div style="max-width: 720px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e5e7eb;">
        <div style="background: linear-gradient(135deg, #24180f, #7f1d1d); padding: 30px 34px; color: #ffffff;">
          <p style="margin: 0 0 8px; letter-spacing: 0.28em; text-transform: uppercase; font-size: 12px; color: #fecaca; font-weight: 700;">GDR Boavista</p>
          <h1 style="margin: 0; font-size: 30px; line-height: 1.22;">${title}</h1>
        </div>

        <div style="padding: 30px 34px;">
          ${previewText}

          <div style="font-size: 16px; line-height: 1.75; color: #374151;">
            ${bodyHtml}
          </div>

          <div style="margin-top: 30px; padding-top: 22px; border-top: 1px solid #e5e7eb; font-size: 12px; line-height: 1.6; color: #6b7280;">
            <p style="margin: 0 0 10px;">
              Recebeste este e-mail porque autorizaste comunicações do GDR Boavista.
            </p>
            <p style="margin: 0;">
              Podes cancelar a subscrição a qualquer momento aqui:
              <a href="${unsubscribeUrl}" style="color: #b91c1c; font-weight: 700;">Cancelar subscrição</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  `;
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

async function getSubscriberGroups() {
  const data = await supabaseRequest('gdrb_subscriber_groups?select=subscriber_id,group_id', {
    method: 'GET',
  });

  return Array.isArray(data) ? data : [];
}

async function getAllSubscribers() {
  const data = await supabaseRequest(
    'gdrb_subscribers?select=id,name,email,unsubscribe_token,contact_type,communication_scope,consent_email,consent_email_newsletter,consent_email_club,is_active,unsubscribed_at',
    { method: 'GET' },
  );

  return Array.isArray(data) ? data : [];
}

function subscriberHasConsent(subscriber, communicationType) {
  if (communicationType === 'newsletter') {
    return Boolean(subscriber.consent_email_newsletter || subscriber.consent_email);
  }

  if (communicationType === 'geral') {
    return Boolean(subscriber.consent_email_club || subscriber.consent_email_newsletter || subscriber.consent_email);
  }

  return Boolean(subscriber.consent_email_club || subscriber.consent_email);
}

function subscriberMatchesType(subscriber, communicationType) {
  if (communicationType === 'newsletter') {
    return subscriber.communication_scope === 'newsletter' || subscriber.contact_type === 'newsletter';
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

function filterRecipients({ communication, subscribers, subscriberGroups, targetGroupIds }) {
  const selectedGroups = new Set(targetGroupIds);
  const subscriberGroupsMap = new Map();
  const communicationType = communication.communication_type || 'newsletter';

  subscriberGroups.forEach((entry) => {
    if (!subscriberGroupsMap.has(entry.subscriber_id)) {
      subscriberGroupsMap.set(entry.subscriber_id, new Set());
    }

    subscriberGroupsMap.get(entry.subscriber_id).add(entry.group_id);
  });

  const recipients = [];
  let excludedNoConsent = 0;
  let excludedInactive = 0;
  let excludedNoEmail = 0;

  subscribers.forEach((subscriber) => {
    if (!subscriberMatchesType(subscriber, communicationType)) return;

    if (selectedGroups.size > 0) {
      const groupsForSubscriber = subscriberGroupsMap.get(subscriber.id);
      const inSelectedGroup = groupsForSubscriber
        ? Array.from(selectedGroups).some((groupId) => groupsForSubscriber.has(groupId))
        : false;

      if (!inSelectedGroup) return;
    }

    if (!subscriber.is_active || subscriber.unsubscribed_at) {
      excludedInactive += 1;
      return;
    }

    const recipientEmail = normalizeEmail(subscriber.email);

    if (!recipientEmail || !isValidEmail(recipientEmail)) {
      excludedNoEmail += 1;
      return;
    }

    if (!subscriberHasConsent(subscriber, communicationType)) {
      excludedNoConsent += 1;
      return;
    }

    recipients.push({
      ...subscriber,
      email: recipientEmail,
    });
  });

  return {
    recipients,
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

async function sendEmail({ communication, subscriber, recipientEmail }) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  const subject = communication.subject || communication.title;
  const fromName = communication.from_name || 'GDR Boavista';
  const fromEmail = communication.from_email || 'notificacoes@send.gdrboavista.pt';

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
      html: buildNewsletterHtml({ communication, subscriber }),
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

  const mode = request.body?.mode === 'send' ? 'send' : 'test';
  const communicationId = String(request.body?.communicationId ?? '').trim();
  const testEmail = normalizeEmail(request.body?.testEmail);

  if (!communicationId) {
    return response.status(400).json({ error: 'Comunicação inválida.' });
  }

  try {
    const communication = await getCommunication(communicationId);

    if (!communication) {
      return response.status(404).json({ error: 'Comunicação não encontrada.' });
    }

    if (!communication.subject || !communication.body) {
      return response.status(400).json({ error: 'A comunicação precisa ter assunto e mensagem.' });
    }

    if (mode === 'test') {
      if (!testEmail || !isValidEmail(testEmail)) {
        return response.status(400).json({ error: 'Indica um email de teste válido.' });
      }

      await sendEmail({
        communication,
        recipientEmail: testEmail,
        subscriber: {
          name: 'Teste',
          email: testEmail,
          unsubscribe_token: 'teste-newsletter',
        },
      });

      await updateCommunication(communicationId, {
        test_sent_at: new Date().toISOString(),
        last_error: null,
      });

      return response.status(200).json({ ok: true, mode: 'test' });
    }

    const [targetGroupIds, subscriberGroups, subscribers] = await Promise.all([
      getTargetGroupIds(communicationId),
      getSubscriberGroups(),
      getAllSubscribers(),
    ]);

    const groupedTypes = ['escalao', 'interno', 'socios', 'parceiros'];

    if (groupedTypes.includes(communication.communication_type || 'newsletter') && targetGroupIds.length === 0) {
      return response.status(400).json({ error: 'Seleciona pelo menos um grupo para este tipo de comunicação.' });
    }

    const audience = filterRecipients({
      communication,
      subscribers,
      subscriberGroups,
      targetGroupIds,
    });

    if (audience.recipients.length === 0) {
      await updateCommunication(communicationId, {
        estimated_recipients: 0,
        excluded_no_consent: audience.excludedNoConsent,
        excluded_inactive: audience.excludedInactive,
        excluded_no_email: audience.excludedNoEmail,
      });

      return response.status(400).json({ error: 'Não existem destinatários ativos com consentimento para esta comunicação.' });
    }

    let sentCount = 0;
    let failedCount = 0;
    let lastError = null;

    for (const subscriber of audience.recipients) {
      const recipientEmail = normalizeEmail(subscriber.email);

      const delivery = await createDelivery({
        communication_id: communicationId,
        subscriber_id: subscriber.id,
        recipient_email: recipientEmail,
        recipient_name: subscriber.name || null,
        status: 'pending',
      });

      try {
        const result = await sendEmail({ communication, subscriber, recipientEmail });
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
