const DEFAULT_RECIPIENTS = ['mello.daniel@gmail.com'];

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getRecipients() {
  const configuredRecipients = process.env.CONTACT_NOTIFICATION_TO;

  if (!configuredRecipients) {
    return DEFAULT_RECIPIENTS;
  }

  return configuredRecipients
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);
}

function buildEmailHtml(contact) {
  const name = escapeHtml(contact.name || 'Sem nome');
  const email = escapeHtml(contact.email || 'Não indicado');
  const subject = escapeHtml(contact.subject || 'Contacto geral');
  const message = escapeHtml(contact.message || '').replace(/\n/g, '<br />');

  return `
    <div style="font-family: Arial, sans-serif; background: #f6f2ec; padding: 32px; color: #1f2937;">
      <div style="max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e5e7eb;">
        <div style="background: linear-gradient(135deg, #24180f, #7f1d1d); padding: 28px 32px; color: #ffffff;">
          <p style="margin: 0 0 8px; letter-spacing: 0.28em; text-transform: uppercase; font-size: 12px; color: #fecaca; font-weight: 700;">GDR Boavista</p>
          <h1 style="margin: 0; font-size: 28px; line-height: 1.2;">Novo contacto recebido no site</h1>
        </div>

        <div style="padding: 28px 32px;">
          <p style="margin: 0 0 22px; font-size: 15px; line-height: 1.6; color: #4b5563;">
            Foi recebida uma nova mensagem através do formulário de contacto do site oficial do GDR Boavista.
          </p>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr>
              <td style="padding: 10px 0; width: 120px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em; color: #991b1b; font-weight: 700;">Nome</td>
              <td style="padding: 10px 0; font-size: 15px; font-weight: 700; color: #111827;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; width: 120px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em; color: #991b1b; font-weight: 700;">Email</td>
              <td style="padding: 10px 0; font-size: 15px; color: #111827;">${email}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; width: 120px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em; color: #991b1b; font-weight: 700;">Assunto</td>
              <td style="padding: 10px 0; font-size: 15px; color: #111827;">${subject}</td>
            </tr>
          </table>

          <div style="background: #f9fafb; border-left: 4px solid #dc2626; border-radius: 12px; padding: 18px 20px; margin-bottom: 26px;">
            <p style="margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em; color: #991b1b; font-weight: 700;">Mensagem</p>
            <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #374151;">${message}</p>
          </div>

          <a href="https://gdrboavista.pt/admin/contactos" style="display: inline-block; background: #dc0000; color: #ffffff; text-decoration: none; padding: 13px 18px; border-radius: 10px; font-weight: 800; font-size: 14px;">
            Abrir painel de contactos
          </a>
        </div>
      </div>
    </div>
  `;
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return response.status(500).json({ error: 'RESEND_API_KEY is not configured' });
  }

  const contact = request.body?.contact ?? request.body;

  if (!contact?.name || !contact?.message) {
    return response.status(400).json({ error: 'Missing required contact fields' });
  }

  const recipients = getRecipients();

  if (recipients.length === 0) {
    return response.status(500).json({ error: 'No contact notification recipients configured' });
  }

  const subjectLabel = contact.subject ? ` - ${contact.subject}` : '';

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.CONTACT_NOTIFICATION_FROM || 'GDR Boavista <onboarding@resend.dev>',
      to: recipients,
      reply_to: contact.email || undefined,
      subject: `Novo contacto recebido no site GDR Boavista${subjectLabel}`,
      html: buildEmailHtml(contact),
    }),
  });

  const result = await resendResponse.json().catch(() => ({}));

  if (!resendResponse.ok) {
    console.error('Erro ao enviar email de contacto:', result);
    return response.status(502).json({ error: 'Failed to send email notification', details: result });
  }

  return response.status(200).json({ ok: true, id: result.id ?? null });
}
