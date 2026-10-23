import { createHash, timingSafeEqual } from 'node:crypto';

// A shared URL is a capability, scoped to this module. Never ship the key in a VITE variable.
export function sharedSheetAccess(req, env) {
  const supplied = req.headers['x-match-sheet-key'];
  if (supplied === undefined) return false;
  const expected = env.MATCH_SHEET_LINK_KEY;
  if (typeof expected !== 'string' || !/^[A-Za-z0-9_-]{43,128}$/.test(expected)) {
    throw Object.assign(new Error('O acesso por link ainda não está configurado.'), { status: 503 });
  }
  if (typeof supplied !== 'string' || !/^[A-Za-z0-9_-]{43,128}$/.test(supplied) ||
      !timingSafeEqual(createHash('sha256').update(supplied).digest(), createHash('sha256').update(expected).digest())) {
    throw Object.assign(new Error('Este link não é válido. Abre o link completo partilhado pelo clube.'), { status: 401 });
  }
  return true;
}

export function serviceHeaders(env) {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) throw Object.assign(new Error('O módulo ainda não está configurado.'), { status: 503 });
  return { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' };
}
