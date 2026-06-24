import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type RequestBody = {
  tournament_id?: string;
  username?: string;
  password?: string;
  display_name?: string;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function normalizeUsername(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

function usernameToEmail(username: string) {
  if (username.includes('@')) return username.toLowerCase();
  return `${username}@gdrboavista.local`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método não permitido.' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Configuração da função incompleta.' }, 500);
  }

  const authorization = req.headers.get('Authorization') || '';
  const accessToken = authorization.replace('Bearer ', '').trim();

  if (!accessToken) {
    return jsonResponse({ error: 'Sessão inválida. Faça login novamente.' }, 401);
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(accessToken);

  if (userError || !userData.user) {
    return jsonResponse({ error: 'Utilizador não autenticado.' }, 401);
  }

  let body: RequestBody;

  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Pedido inválido.' }, 400);
  }

  const tournamentId = String(body.tournament_id || '').trim();
  const username = normalizeUsername(String(body.username || ''));
  const password = String(body.password || '').trim();
  const displayName = String(body.display_name || 'Lançamento de resultados').trim();

  if (!tournamentId) {
    return jsonResponse({ error: 'ID do torneio em falta.' }, 400);
  }

  if (!username) {
    return jsonResponse({ error: 'Nome do utilizador em falta.' }, 400);
  }

  if (password.length < 6) {
    return jsonResponse({ error: 'A palavra-passe deve ter pelo menos 6 caracteres.' }, 400);
  }

  const email = usernameToEmail(username);

  const { data: tournament, error: tournamentError } = await supabaseAdmin
    .from('tournaments')
    .select('id, name')
    .eq('id', tournamentId)
    .single();

  if (tournamentError || !tournament) {
    return jsonResponse({ error: 'Torneio não encontrado.' }, 404);
  }

  const { data: usersList, error: listError } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listError) {
    return jsonResponse({ error: listError.message }, 500);
  }

  const existingUser = usersList.users.find((user) => user.email?.toLowerCase() === email);
  let resultUserId = existingUser?.id;

  if (existingUser) {
    const { error: updateUserError } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
      password,
      email_confirm: true,
      user_metadata: {
        ...existingUser.user_metadata,
        display_name: displayName,
        role: 'tournament_results',
        tournament_id: tournamentId,
      },
    });

    if (updateUserError) {
      return jsonResponse({ error: updateUserError.message }, 500);
    }
  } else {
    const { data: createdUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: displayName,
        role: 'tournament_results',
        tournament_id: tournamentId,
      },
    });

    if (createUserError || !createdUser.user) {
      return jsonResponse({ error: createUserError?.message || 'Não foi possível criar o utilizador.' }, 500);
    }

    resultUserId = createdUser.user.id;
  }

  const { error: accessError } = await supabaseAdmin
    .from('tournament_result_access')
    .upsert(
      {
        tournament_id: tournamentId,
        user_email: email,
        display_name: displayName,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'tournament_id,user_email',
      },
    );

  if (accessError) {
    return jsonResponse({ error: accessError.message }, 500);
  }

  return jsonResponse({
    id: resultUserId,
    username,
    email,
    tournament_id: tournamentId,
    display_name: displayName,
  });
});
