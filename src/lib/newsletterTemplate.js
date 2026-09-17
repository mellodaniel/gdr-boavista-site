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
  return ((typeof process !== 'undefined' && process.env?.PUBLIC_SITE_URL) || 'https://gdrboavista.pt').replace(/\/$/, '');
}

function getUnsubscribeUrl(subscriber) {
  if (!subscriber?.unsubscribe_token) return null;
  return `${getSiteUrl()}/newsletter/cancelar/${encodeURIComponent(subscriber.unsubscribe_token)}`;
}

// Only public web URLs may appear in email links and images.
function partnerUrl(value, allowRelative = false) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  try {
    const url = new URL(allowRelative && raw.startsWith('/') ? raw :
      (/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`), getSiteUrl());
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function renderPartnersHtml(partners = []) {
  const cards = partners.flatMap((partner) => {
    const logo = partnerUrl(partner.logo_url, true);
    if (!logo) return [];
    const website = partnerUrl(partner.website_url);
    const name = escapeHtml(partner.name || 'Parceiro do GDR Boavista');
    const img = `<img src="${escapeHtml(logo)}" width="88" alt="${name}" style="display:block;width:auto;max-width:100%;height:auto;max-height:48px;margin:0 auto;border:0;" />`;
    return [website ? `<a href="${escapeHtml(website)}" target="_blank" style="text-decoration:none;">${img}</a>` : img];
  });
  if (!cards.length) return '';
  const rows = [];
  for (let i = 0; i < cards.length; i += 3) {
    const cells = cards.slice(i, i + 3);
    while (cells.length < 3) cells.push('&nbsp;');
    rows.push(`<tr>${cells.map((card) => `<td width="33.33%" align="center" valign="middle" style="width:33.33%;padding:12px 8px;">${card}</td>`).join('')}</tr>`);
  }
  return `<tr><td style="padding:22px;background:#ffffff;border-top:1px solid #e7e2dc;">
    <p style="margin:0 0 8px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.5;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#71717a;">Parceiros</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;table-layout:fixed;">${rows.join('')}</table>
  </td></tr>`;
}

function renderNewsletterImages(images) {
  if (!Array.isArray(images)) return '';
  return images.slice(0, 10).map((photo) => {
    if (!photo || typeof photo.url !== 'string') return '';
    let url;
    try { url = new URL(photo.url); } catch { return ''; }
    if (url.protocol !== 'https:' || url.username || url.password) return '';
    const caption = escapeHtml(String(photo.caption || '').slice(0, 300));
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:20px 0;"><tr><td>
      <img src="${escapeHtml(url.href)}" width="556" alt="${caption || 'Fotografia do GDR Boavista'}" style="display:block;width:100%;max-width:556px;height:auto;border:0;" />
      ${caption ? `<p style="margin:8px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#52525b;">${caption}</p>` : ''}
    </td></tr></table>`;
  }).join('');
}

function buildStandardNewsletterHtml({ communication, subscriber, partners = [] }) {
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
                  ${renderNewsletterImages(communication.images)}
                  </div>
                </div>
              </td>
            </tr>
            ${renderPartnersHtml(partners)}
            <tr>
              <td class="email-footer" bgcolor="#fafafa" style="background:#fafafa;padding:24px 38px 30px;border-top:1px solid #e4e4e7;">
                <p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:#52525b;">
                  Esta é uma comunicação do GDR Boavista.
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


function buildSeasonOpeningNewsletterHtml({ communication, subscriber, partners = [] }) {
  const unsubscribeUrl = getUnsubscribeUrl(subscriber);

  if (!unsubscribeUrl) {
    throw new Error('Destinatário sem token de cancelamento de subscrição.');
  }

  const siteUrl = getSiteUrl();
  const campaignQuery = 'utm_source=newsletter&utm_medium=email&utm_campaign=clube';
  const homeUrl = `${siteUrl}/?${campaignQuery}`;
  const logoUrl = `${siteUrl}/logo-gdr-boavista-header-256.png`;
  // Imagem oficial da campanha, alojada no próprio domínio do GDR Boavista.
  const heroImageUrl = `${siteUrl}/newsletter/inicio-epoca-2026-27.jpg?v=20260904-3`;
  const homeUrlHtml = escapeHtml(homeUrl);
  const logoUrlHtml = escapeHtml(logoUrl);
  const heroImageUrlHtml = escapeHtml(heroImageUrl);
  const unsubscribeUrlHtml = escapeHtml(unsubscribeUrl);
  const title = escapeHtml(communication.subject || communication.title || 'Novidades do GDR Boavista');
  const preview = escapeHtml(
    communication.preview_text ||
      'O nosso clube. A nossa paixão. Juntos, mais fortes!',
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
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        -webkit-text-size-adjust: 100% !important;
        -ms-text-size-adjust: 100% !important;
      }
      table {
        border-collapse: collapse !important;
        border-spacing: 0 !important;
        mso-table-lspace: 0pt !important;
        mso-table-rspace: 0pt !important;
      }
      img {
        border: 0;
        display: block;
        height: auto;
        line-height: 100%;
        outline: none;
        text-decoration: none;
      }
      a { text-decoration: none; }
      .email-shell { width: 100%; background: #f3f0eb; }
      .email-card {
        width: 100%;
        max-width: 640px;
        background: #ffffff;
        border-collapse: separate !important;
        border-spacing: 0 !important;
      }
      .content-pad { padding: 34px 42px 30px; }
      .footer-pad { padding: 22px 42px 52px; }
      .cta-link { display: block !important; }
      @media screen and (max-width: 640px) {
        .outer-pad { padding: 10px 10px 76px !important; }
        .content-pad { padding: 27px 22px 24px !important; }
        .footer-pad { padding: 21px 22px 68px !important; }
        .brand-pad { padding: 17px 20px !important; }
        .campaign-pad { padding: 23px 22px 25px !important; }
        .email-title { font-size: 28px !important; line-height: 1.16 !important; }
        .email-greeting { font-size: 27px !important; }
        .cta-link { padding-left: 14px !important; padding-right: 14px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#f3f0eb;color:#18181b;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;max-height:0;max-width:0;">
      ${preview}
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="email-shell" bgcolor="#f3f0eb" style="width:100%;background:#f3f0eb;margin:0;padding:0;">
      <tr>
        <td align="center" class="outer-pad" style="padding:24px 14px 72px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="email-card" bgcolor="#ffffff" style="width:100%;max-width:640px;background:#ffffff;border:1px solid #e7e2dc;border-radius:18px;border-collapse:separate !important;border-spacing:0 !important;">
            <tr>
              <td class="brand-pad" bgcolor="#ffffff" style="background:#ffffff;padding:20px 28px;border-bottom:4px solid #c90012;border-radius:18px 18px 0 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;">
                  <tr>
                    <td width="58" valign="middle" style="width:58px;">
                      <a href="${homeUrlHtml}" target="_blank" aria-label="Visitar o site do GDR Boavista">
                        <img src="${logoUrlHtml}" width="46" alt="GDR Boavista" style="width:46px;max-width:46px;height:auto;" />
                      </a>
                    </td>
                    <td valign="middle" style="padding-left:12px;">
                      <p style="margin:0;color:#17120f;font-size:16px;line-height:1.2;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;">GDR Boavista</p>
                      <p style="margin:5px 0 0;color:#c90012;font-size:11px;line-height:1.2;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;">O nosso clube</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td bgcolor="#17120f" style="padding:0;background:#17120f;">
                <a href="${homeUrlHtml}" target="_blank" style="display:block;">
                  <img src="${heroImageUrlHtml}" width="640" alt="Campo do GDR Boavista" style="width:100%;max-width:640px;height:auto;display:block;" />
                </a>
              </td>
            </tr>

            <tr>
              <td class="campaign-pad" bgcolor="#21150f" style="background:#21150f;padding:26px 42px 28px;border-top:4px solid #c90012;">
                <h1 class="email-title" style="margin:0;color:#ffffff;font-family:Georgia,'Times New Roman',serif;font-size:36px;line-height:1.12;font-weight:400;letter-spacing:-0.02em;">
                  O nosso clube.<br />A nossa paixão.
                </h1>
                <p style="margin:14px 0 0;color:#f6d6d8;font-size:14px;line-height:1.6;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">Juntos, mais fortes. Força, Boavista!</p>
              </td>
            </tr>

            <tr>
              <td class="content-pad" bgcolor="#ffffff" style="background:#ffffff;padding:34px 42px 30px;">
                <h2 class="email-greeting" style="margin:0 0 22px;color:#17120f;font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:1.2;font-weight:400;">
                  ${greeting}
                </h2>

                <div style="color:#27272a;">
                  ${bodyHtml}
                  ${renderNewsletterImages(communication.images)}
                </div>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;">
                  <tr>
                    <td align="center" bgcolor="#ffffff" style="background:#ffffff;border:1px solid #d6d3d1;border-radius:10px;mso-padding-alt:14px 18px;">
                      <a class="cta-link" href="${homeUrlHtml}" target="_blank" style="display:block;padding:14px 18px;color:#17120f;font-size:13px;line-height:1.2;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;text-align:center;">
                        Visitar o site
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            ${renderPartnersHtml(partners)}
            <tr>
              <td class="footer-pad" bgcolor="#f8f5f1" style="background:#f8f5f1;padding:22px 42px 52px;border-top:1px solid #e7e2dc;border-radius:0 0 18px 18px;">
                <p style="margin:0 0 18px;color:#991b1b;font-size:11px;line-height:1.5;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;text-align:center;">
                  Trabalho · Ambição · Respeito · União
                </p>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;">
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
                  Esta é uma comunicação do GDR Boavista.
                </p>
                <p style="margin:0;font-size:12px;line-height:1.6;color:#52525b;">
                  Se não pretendes receber mais comunicações,
                  <a href="${unsubscribeUrlHtml}" style="color:#991b1b;font-weight:800;text-decoration:underline;">Cancelar subscrição</a>.
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

function buildNewsletterHtml({ communication, subscriber, emailTemplate = 'standard', partners = [] }) {
  const normalizedTemplate = normalizeEmailTemplate(emailTemplate);

  if (normalizedTemplate === 'season_opening_2026_27') {
    return buildSeasonOpeningNewsletterHtml({ communication, subscriber, partners });
  }

  return buildStandardNewsletterHtml({ communication, subscriber, partners });
}


export { escapeHtml, normalizeEmail, isValidEmail, normalizeEmailTemplate, getUnsubscribeUrl, buildNewsletterHtml };
