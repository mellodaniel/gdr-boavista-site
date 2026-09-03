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

function getSiteUrl() {
  return (process.env.PUBLIC_SITE_URL || 'https://gdrboavista.pt').replace(/\/$/, '');
}

function getUnsubscribeUrl(subscriber) {
  if (!subscriber?.unsubscribe_token) return null;
  return `${getSiteUrl()}/newsletter/cancelar/${encodeURIComponent(subscriber.unsubscribe_token)}`;
}

function buildNewsletterHtml({ communication, subscriber }) {
  const unsubscribeUrl = getUnsubscribeUrl(subscriber);

  if (!unsubscribeUrl) {
    throw new Error('Destinatário sem token de cancelamento de subscrição.');
  }

  const title = escapeHtml(communication.subject || communication.title || 'Comunicação GDR Boavista');
  const preview = escapeHtml(
    communication.preview_text || communication.subject || communication.title || 'Comunicação GDR Boavista',
  );
  const previewText = communication.preview_text
    ? `<p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#52525b;">${escapeHtml(communication.preview_text)}</p>`
    : '';
  const bodyHtml = renderBodyHtml(communication.body || '');

  return `<!doctype html>
<html lang="pt">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
    <title>${title}</title>
    <style>
      html, body { margin: 0 !important; padding: 0 !important; width: 100% !important; }
      table { border-collapse: collapse !important; border-spacing: 0 !important; }
      img { border: 0; display: block; }
      a { text-decoration: underline; }
      .email-shell { width: 100%; background: #f4f4f5; }
      .email-card { width: 100%; max-width: 640px; background: #ffffff; }
      .email-pad { padding: 34px 38px; }
      .email-footer { padding: 24px 38px 30px; }
      @media screen and (max-width: 640px) {
        .email-outer { padding: 10px !important; }
        .email-pad { padding: 26px 22px !important; }
        .email-footer { padding: 20px 22px 26px !important; }
        .email-title { font-size: 27px !important; line-height: 1.2 !important; }
        .email-body { font-size: 16px !important; line-height: 1.7 !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#f4f4f5;color:#18181b;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;max-height:0;max-width:0;">
      ${preview}
    </div>

    <table role="presentation" width="100%" class="email-shell" bgcolor="#f4f4f5" style="width:100%;background:#f4f4f5;margin:0;padding:0;">
      <tr>
        <td align="center" class="email-outer" style="padding:24px 14px;">
          <table role="presentation" width="100%" class="email-card" bgcolor="#ffffff" style="width:100%;max-width:640px;background:#ffffff;border:1px solid #e4e4e7;border-radius:14px;overflow:hidden;">
            <tr>
              <td style="height:5px;line-height:5px;font-size:0;background:#b91c1c;" bgcolor="#b91c1c">&nbsp;</td>
            </tr>
            <tr>
              <td class="email-pad" bgcolor="#ffffff" style="background:#ffffff;padding:34px 38px;">
                <p style="margin:0 0 12px;font-size:12px;line-height:1.4;letter-spacing:0.22em;text-transform:uppercase;font-weight:700;color:#b91c1c;">
                  GDR Boavista
                </p>
                <h1 class="email-title" style="margin:0;color:#18181b;font-family:Georgia,'Times New Roman',serif;font-size:34px;line-height:1.18;font-weight:400;letter-spacing:-0.02em;">
                  ${title}
                </h1>

                <table role="presentation" width="100%" style="width:100%;margin-top:26px;">
                  <tr>
                    <td style="height:1px;line-height:1px;font-size:0;background:#e4e4e7;" bgcolor="#e4e4e7">&nbsp;</td>
                  </tr>
                </table>

                <div style="padding-top:26px;">
                  ${previewText}
                  <div class="email-body" style="font-size:16px;line-height:1.75;color:#27272a;">
                    ${bodyHtml}
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td class="email-footer" bgcolor="#fafafa" style="background:#fafafa;padding:24px 38px 30px;border-top:1px solid #e4e4e7;">
                <p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:#52525b;">
                  Recebeste este e-mail porque autorizaste comunicações do GDR Boavista.
                </p>
                <p style="margin:0;font-size:12px;line-height:1.6;color:#52525b;">
                  Se não pretendes receber mais comunicações,
                  <a href="${unsubscribeUrl}" style="color:#991b1b;font-weight:700;text-decoration:underline;">Cancelar subscrição</a>.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
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
    'gdrb_subscribers?select=id,name,email,unsubscribe_token,contact_type,communication_scope,consent_email,consent_email_newsletter,consent_email_club,is_active,unsubscribed_at',
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

function filterRecipients({ communication, subscribers, subscriberGroups, targetGroupIds, manualRecipientIds = [] }) {
  const selectedGroups = new Set(targetGroupIds);
  const manualRecipients = new Set(manualRecipientIds);
  const subscriberGroupsMap = new Map();
  const communicationType = communication.communication_type || 'newsletter';
  const isManual = communication.audience_mode === 'manual';

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
    if (isManual) {
      if (!manualRecipients.has(subscriber.id)) return;
    } else if (!subscriberMatchesType(subscriber, communicationType)) return;

    if (!isManual && selectedGroups.size > 0) {
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

    if (!isManual && !subscriberHasConsent(subscriber, communicationType)) {
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
      html: buildNewsletterHtml({ communication, subscriber }),
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

  const mode = 'send';
  const communicationId = String(request.body?.communicationId ?? '').trim();

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
      return response.status(400).json({ error: 'Seleciona um contacto individual para esta comunicação.' });
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

      return response.status(400).json({ error: 'Não existem destinatários ativos com consentimento para esta comunicação.' });
    }

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
        const result = await sendEmail({ communication, subscriber: subscriberWithToken, recipientEmail });
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
