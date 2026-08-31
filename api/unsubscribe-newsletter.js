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

  const token = String(request.body?.token ?? '').trim();

  if (!token || token.length < 20) {
    return response.status(400).json({ error: 'Link de cancelamento inválido.' });
  }

  try {
    const updatedSubscribers = await supabaseRequest(
      `gdrb_subscribers?unsubscribe_token=eq.${encodeURIComponent(token)}&select=id,email`,
      {
        method: 'PATCH',
        headers: {
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          is_active: false,
          consent_email: false,
          unsubscribed_at: new Date().toISOString(),
          unsubscribe_reason:
            String(request.body?.reason ?? '').trim() || 'Cancelamento pelo link público da newsletter',
        }),
      },
    );

    if (!Array.isArray(updatedSubscribers) || updatedSubscribers.length === 0) {
      return response.status(404).json({ error: 'Subscrição não encontrada ou link inválido.' });
    }

    return response.status(200).json({ ok: true });
  } catch (error) {
    console.error('Erro ao cancelar newsletter:', error);
    return response.status(error.status || 500).json({
      error: 'Não foi possível cancelar a subscrição. Tenta novamente.',
      details: error.details || null,
    });
  }
}
