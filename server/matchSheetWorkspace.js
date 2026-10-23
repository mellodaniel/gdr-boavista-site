import { sharedSheetAccess, serviceHeaders } from './matchSheetAccess.js';
import { validateSheet } from '../src/features/match-sheet/model.js';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function createMatchSheetWorkspace({ fetcher = fetch, env = process.env } = {}) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Referrer-Policy', 'no-referrer');
    const fail = (status, message, code) => res.status(status).json({ error: message, code });
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return fail(405, 'Método não permitido.'); }
    try {
      if (!sharedSheetAccess(req, env)) return fail(401, 'Abre o link completo partilhado pelo clube.');
      const base = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
      if (!base) return fail(503, 'O módulo ainda não está configurado.');
      const headers = serviceHeaders(env);
      let input = req.body;
      if (typeof input === 'string') {
        if (Buffer.byteLength(input) > 1048576) return fail(413, 'Pedido demasiado grande.');
        try { input = JSON.parse(input); } catch { return fail(400, 'Pedido inválido.'); }
      }
      if (!input || Buffer.byteLength(JSON.stringify(input)) > 1048576) return fail(413, 'Pedido demasiado grande.');
      const db = async (path, body) => {
        const response = await fetcher(`${base}/rest/v1/${path}`, { method: body ? 'POST' : 'GET', headers, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(10000) });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw Object.assign(new Error(data.code === '40001' ? 'Esta ficha mudou noutro dispositivo. Atualiza antes de continuar.' : data.code === 'P0001' ? data.message : 'Não foi possível concluir a operação.'), { status: data.code === '40001' ? 409 : data.code === '42501' ? 403 : 400, code: data.code });
        return data;
      };
      const columns = 'id,age_group,revision,document,updated_at,archived_at,deleted_at';
      const row = value => ({ ...value, recorder_id: 'shared' });
      if (input.action === 'context') {
        const teams = await db('gdrb_match_sheet_teams?select=*&order=age_group');
        return res.json({ teams, admin: false, access: teams.map(t => ({ age_group: t.age_group, can_edit: true })) });
      }
      if (input.action === 'list') {
        if (!Number.isSafeInteger(input.offset) || input.offset < 0) return fail(400, 'Página inválida.');
        const rows = await db(`gdrb_match_sheets?select=${columns}&order=id&limit=200&offset=${input.offset}`);
        return res.json(rows.map(row));
      }
      if (input.action === 'roster') {
        if (typeof input.group !== 'string' || input.group.length > 100) return fail(400, 'Escalão inválido.');
        const [players, calendar] = await Promise.all([
          db('rpc/gdrb_sheet_roster', { p_group: input.group }),
          db(`gdrb_matches?select=id,team_name,opponent,match_date,match_time,location,competition,venue_type&team_name=eq.${encodeURIComponent(input.group)}&order=match_date.desc&limit=50`),
        ]);
        return res.json({ players, calendar });
      }
      if (input.action === 'save') {
        const issue = validateSheet(input.document);
        if (issue || !uuid.test(input.document.id) || !Number.isSafeInteger(input.revision) || input.revision < 0) return fail(400, issue || 'Versão inválida.', 'P0001');
        const revision = await db('rpc/gdrb_save_match_sheet', { p_document: input.document, p_revision: input.revision });
        return res.json({ revision });
      }
      if (!uuid.test(input.id)) return fail(400, 'Ficha inválida.');
      if (input.action === 'get') {
        const rows = await db(`gdrb_match_sheets?id=eq.${input.id}&select=${columns}`);
        return rows.length ? res.json(row(rows[0])) : fail(404, 'Ficha não encontrada.');
      }
      if (input.action === 'deliveries') return res.json(await db(`gdrb_match_sheet_deliveries?sheet_id=eq.${input.id}&select=id,revision,recipients,status,created_at&order=created_at.desc&limit=20`));
      if (input.action === 'manage') {
        if (!['archive', 'unarchive', 'trash', 'restore'].includes(input.operation) || !Number.isSafeInteger(input.revision) || input.revision < 1) return fail(400, 'Ação ou versão inválida.');
        const result = await db('rpc/gdrb_manage_match_sheet', { p_id: input.id, p_revision: input.revision, p_action: input.operation });
        return res.json(row(result));
      }
      return fail(400, 'Ação inválida.');
    } catch (error) { return fail(error.status || 503, error.status ? error.message : 'Verifica a ligação e tenta novamente.', error.code); }
  };
}
