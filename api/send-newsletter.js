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

function renderBodyParagraphs(body) {
  return escapeHtml(body)
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) =>
      `<p style="margin:0 0 18px;font-size:16px;line-height:1.75;color:#27272a;">${paragraph.replace(/\n/g, '<br />')}</p>`,
    )
    .join('');
}

function normalizeEmailTemplate(value) {
  return value === 'season_opening_2026_27' ? value : 'standard';
}

function getSubscriberFirstName(subscriber) {
  const name = String(subscriber?.name || '').trim();
  return name ? name.split(/\s+/)[0] : '';
}

function getSiteUrl() {
  return (process.env.PUBLIC_SITE_URL || 'https://gdrboavista.pt').replace(/\/$/, '');
}

function getUnsubscribeUrl(subscriber) {
  if (!subscriber?.unsubscribe_token) return null;
  return `${getSiteUrl()}/newsletter/cancelar/${encodeURIComponent(subscriber.unsubscribe_token)}`;
}

function buildStandardNewsletterHtml({ communication, subscriber }) {
  const unsubscribeUrl = getUnsubscribeUrl(subscriber);

  if (!unsubscribeUrl) {
    throw new Error('Destinatário sem token de cancelamento de subscrição.');
  }

  const recipientNotice =
    communication.audience_mode === 'manual'
      ? 'Recebeste este e-mail no âmbito de uma comunicação direta do GDR Boavista.'
      : 'Recebeste este e-mail porque autorizaste comunicações do GDR Boavista.';
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
                  ${recipientNotice}
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


function buildSeasonOpeningNewsletterHtml({ communication, subscriber }) {
  const unsubscribeUrl = getUnsubscribeUrl(subscriber);

  if (!unsubscribeUrl) {
    throw new Error('Destinatário sem token de cancelamento de subscrição.');
  }

  const recipientNotice =
    communication.audience_mode === 'manual'
      ? 'Recebeste este e-mail no âmbito de uma comunicação direta do GDR Boavista.'
      : 'Recebeste este e-mail porque autorizaste comunicações do GDR Boavista.';
  const siteUrl = getSiteUrl();
  const campaignQuery = 'utm_source=newsletter&utm_medium=email&utm_campaign=inicio_epoca_2026_27';
  const homeUrl = `${siteUrl}/?${campaignQuery}`;
  const scheduleUrl = `${siteUrl}/horarios-de-treino?${campaignQuery}`;
  const logoUrl = `${siteUrl}/logo-gdr-boavista-header-256.png`;
  // Fotografia de Eric MASENGESHO via Pexels (Licença Pexels).
  const heroImageUrl = 'https://images.pexels.com/photos/33471345/pexels-photo-33471345/free-photo-of-sprinklers-watering-soccer-stadium-field-at-night.jpeg?auto=compress&dpr=1&h=750&w=1260';
  const homeUrlHtml = escapeHtml(homeUrl);
  const scheduleUrlHtml = escapeHtml(scheduleUrl);
  const logoUrlHtml = escapeHtml(logoUrl);
  const heroImageUrlHtml = escapeHtml(heroImageUrl);
  const title = escapeHtml(communication.subject || communication.title || 'A época 2026/27 começa agora');
  const preview = escapeHtml(
    communication.preview_text ||
      'Novos desafios, a mesma paixão. Consulta os horários de treino de todos os escalões.',
  );
  const firstName = escapeHtml(getSubscriberFirstName(subscriber));
  const greeting = firstName ? `Olá, ${firstName}!` : 'Olá!';
  const bodyHtml = renderBodyParagraphs(communication.body || '');

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
      img { border: 0; display: block; height: auto; }
      a { text-decoration: none; }
      .email-shell { width: 100%; background: #f3f0eb; }
      .email-card { width: 100%; max-width: 640px; background: #ffffff; }
      .content-pad { padding: 34px 42px; }
      .footer-pad { padding: 24px 42px 30px; }
      .button-cell { display: inline-block; }
      @media screen and (max-width: 640px) {
        .outer-pad { padding: 10px !important; }
        .content-pad { padding: 28px 22px !important; }
        .footer-pad { padding: 22px !important; }
        .brand-pad { padding: 18px 20px !important; }
        .email-title { font-size: 28px !important; line-height: 1.16 !important; }
        .email-greeting { font-size: 27px !important; }
        .stat-cell { display: block !important; width: 100% !important; padding: 0 0 8px !important; }
        .button-row, .button-cell { display: block !important; width: 100% !important; }
        .button-cell { padding: 0 0 10px !important; }
        .button-link { display: block !important; text-align: center !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#f3f0eb;color:#18181b;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;max-height:0;max-width:0;">
      ${preview}
    </div>

    <table role="presentation" width="100%" class="email-shell" bgcolor="#f3f0eb" style="width:100%;background:#f3f0eb;margin:0;padding:0;">
      <tr>
        <td align="center" class="outer-pad" style="padding:24px 14px;">
          <table role="presentation" width="100%" class="email-card" bgcolor="#ffffff" style="width:100%;max-width:640px;background:#ffffff;border:1px solid #e7e2dc;border-radius:18px;overflow:hidden;">
            <tr>
              <td class="brand-pad" bgcolor="#ffffff" style="background:#ffffff;padding:20px 28px;border-bottom:4px solid #c90012;">
                <table role="presentation" width="100%" style="width:100%;">
                  <tr>
                    <td width="58" valign="middle" style="width:58px;">
                      <a href="${homeUrlHtml}" target="_blank" aria-label="Visitar o site do GDR Boavista">
                        <img src="${logoUrlHtml}" width="46" alt="GDR Boavista" style="width:46px;max-width:46px;height:auto;" />
                      </a>
                    </td>
                    <td valign="middle" style="padding-left:12px;">
                      <p style="margin:0;color:#17120f;font-size:16px;line-height:1.2;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;">GDR Boavista</p>
                      <p style="margin:5px 0 0;color:#c90012;font-size:11px;line-height:1.2;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;">Época 2026/27</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:0;background:#17120f;" bgcolor="#17120f">
                <a href="${scheduleUrlHtml}" target="_blank" style="display:block;">
                  <img src="${heroImageUrlHtml}" width="640" alt="Campo de futebol iluminado no início de uma nova época" style="width:100%;max-width:640px;height:auto;display:block;" />
                </a>
              </td>
            </tr>

            <tr>
              <td bgcolor="#21150f" style="background:#21150f;padding:26px 42px 28px;border-top:4px solid #c90012;">
                <p style="margin:0 0 8px;color:#ffb4bb;font-size:11px;line-height:1.3;font-weight:800;letter-spacing:0.24em;text-transform:uppercase;">Início da época</p>
                <h1 class="email-title" style="margin:0;color:#ffffff;font-family:Georgia,'Times New Roman',serif;font-size:36px;line-height:1.12;font-weight:400;letter-spacing:-0.02em;">
                  Uma nova época.<br />A mesma paixão.
                </h1>
                <p style="margin:14px 0 0;color:#f6d6d8;font-size:14px;line-height:1.6;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">Juntos, mais fortes.</p>
              </td>
            </tr>

            <tr>
              <td class="content-pad" bgcolor="#ffffff" style="background:#ffffff;padding:34px 42px;">
                <h2 class="email-greeting" style="margin:0 0 22px;color:#17120f;font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:1.2;font-weight:400;">
                  ${greeting}
                </h2>

                <div style="color:#27272a;">
                  ${bodyHtml}
                </div>

                <table role="presentation" width="100%" style="width:100%;margin:26px 0 22px;">
                  <tr>
                    <td class="stat-cell" width="33.33%" style="width:33.33%;padding-right:6px;" valign="top">
                      <div style="border:1px solid #e7e2dc;border-radius:12px;background:#faf8f5;padding:15px 12px;text-align:center;">
                        <p style="margin:0;color:#c90012;font-size:21px;line-height:1;font-weight:800;">14</p>
                        <p style="margin:7px 0 0;color:#52525b;font-size:10px;line-height:1.3;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;">Escalões</p>
                      </div>
                    </td>
                    <td class="stat-cell" width="33.33%" style="width:33.33%;padding:0 3px;" valign="top">
                      <div style="border:1px solid #e7e2dc;border-radius:12px;background:#faf8f5;padding:15px 12px;text-align:center;">
                        <p style="margin:0;color:#17120f;font-size:15px;line-height:1;font-weight:800;">SEG–SÁB</p>
                        <p style="margin:7px 0 0;color:#52525b;font-size:10px;line-height:1.3;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;">Treinos</p>
                      </div>
                    </td>
                    <td class="stat-cell" width="33.33%" style="width:33.33%;padding-left:6px;" valign="top">
                      <div style="border:1px solid #e7e2dc;border-radius:12px;background:#faf8f5;padding:15px 12px;text-align:center;">
                        <p style="margin:0;color:#17120f;font-size:15px;line-height:1;font-weight:800;">F5–F11</p>
                        <p style="margin:7px 0 0;color:#52525b;font-size:10px;line-height:1.3;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;">Formação</p>
                      </div>
                    </td>
                  </tr>
                </table>

                <table role="presentation" class="button-row" style="margin:0;">
                  <tr>
                    <td class="button-cell" style="padding-right:10px;">
                      <table role="presentation" width="100%" style="width:100%;">
                        <tr>
                          <td align="center" bgcolor="#c90012" style="background:#c90012;border-radius:10px;">
                            <a class="button-link" href="${scheduleUrlHtml}" target="_blank" style="display:inline-block;padding:15px 20px;color:#ffffff;font-size:13px;line-height:1.2;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;">
                              Consultar horários de treino
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td class="button-cell">
                      <table role="presentation" width="100%" style="width:100%;">
                        <tr>
                          <td align="center" bgcolor="#ffffff" style="background:#ffffff;border:1px solid #d6d3d1;border-radius:10px;">
                            <a class="button-link" href="${homeUrlHtml}" target="_blank" style="display:inline-block;padding:14px 20px;color:#17120f;font-size:13px;line-height:1.2;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;">
                              Visitar o site
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <p style="margin:26px 0 0;padding-top:22px;border-top:1px solid #e7e2dc;color:#991b1b;font-size:12px;line-height:1.6;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;text-align:center;">
                  Trabalho · Ambição · Respeito · União
                </p>
              </td>
            </tr>

            <tr>
              <td class="footer-pad" bgcolor="#f8f5f1" style="background:#f8f5f1;padding:24px 42px 30px;border-top:1px solid #e7e2dc;">
                <table role="presentation" width="100%" style="width:100%;">
                  <tr>
                    <td width="44" valign="top" style="width:44px;">
                      <img src="${logoUrlHtml}" width="34" alt="" style="width:34px;max-width:34px;height:auto;" />
                    </td>
                    <td valign="top" style="padding-left:10px;">
                      <p style="margin:0;color:#17120f;font-size:12px;line-height:1.5;font-weight:800;">Grupo Desportivo e Recreativo Boavista</p>
                      <p style="margin:4px 0 0;font-size:12px;line-height:1.6;">
                        <a href="${homeUrlHtml}" style="color:#991b1b;font-weight:700;text-decoration:underline;">gdrboavista.pt</a>
                      </p>
                    </td>
                  </tr>
                </table>

                <p style="margin:18px 0 7px;font-size:12px;line-height:1.6;color:#52525b;">
                  ${recipientNotice}
                </p>
                <p style="margin:0;font-size:12px;line-height:1.6;color:#52525b;">
                  Se não pretendes receber mais comunicações,
                  <a href="${unsubscribeUrl}" style="color:#991b1b;font-weight:800;text-decoration:underline;">Cancelar subscrição</a>.
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

function buildNewsletterHtml({ communication, subscriber, emailTemplate = 'standard' }) {
  const normalizedTemplate = normalizeEmailTemplate(emailTemplate);

  if (normalizedTemplate === 'season_opening_2026_27') {
    return buildSeasonOpeningNewsletterHtml({ communication, subscriber });
  }

  return buildStandardNewsletterHtml({ communication, subscriber });
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
  const usedEmails = new Set();
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

    if (!subscriberHasConsent(subscriber, communicationType)) {
      excludedNoConsent += 1;
      if (!isManual) return;
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

async function sendEmail({ communication, subscriber, recipientEmail, emailTemplate }) {
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
      html: buildNewsletterHtml({ communication, subscriber, emailTemplate }),
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
  const emailTemplate = normalizeEmailTemplate(request.body?.emailTemplate);

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

      return response.status(400).json({ error: communication.audience_mode === 'manual' ? 'Não existem destinatários específicos válidos para esta comunicação.' : 'Não existem destinatários ativos com consentimento para esta comunicação.' });
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
        const result = await sendEmail({ communication, subscriber: subscriberWithToken, recipientEmail, emailTemplate });
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
