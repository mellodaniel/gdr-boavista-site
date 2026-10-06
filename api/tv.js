import { createHash, randomBytes } from 'node:crypto';

const COOKIE = 'gdrb_tv';
const secret = () => randomBytes(32).toString('hex');
export const hashKey = value => createHash('sha256').update(value).digest('hex');
const validKey = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);

export function createTvHandler({ env = process.env, fetcher = fetch, makeSecret = secret } = {}) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const base = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
    const key = env.SUPABASE_SERVICE_ROLE_KEY;
    if (!base || !key) return res.status(503).json({ error: 'Canal temporariamente indisponível.' });
    const request = async (path, options = {}, bearer = key) => {
      const result = await fetcher(`${base}${path}`, { ...options,
        headers: { apikey: key, Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json', ...options.headers },
        signal: AbortSignal.timeout(10000),
      });
      if (!result.ok) throw new Error(`TV data request failed (${result.status})`);
      return result.status === 204 ? null : result.json();
    };
    const rest = (path, options) => request(`/rest/v1/${path}`, options);
    const feed = async () => {
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
      const since = new Date(`${today}T12:00:00Z`); since.setUTCDate(since.getUTCDate()-6);
      const [sponsors, news, matches, tournaments] = await Promise.all([
        rest('gdrb_sponsors?select=id,name,description,logo_url,website_url,tv_message,tv_contact&is_active=eq.true&show_on_tv=eq.true&order=sort_order.asc,name.asc&limit=200'),
        rest(`gdrb_news?select=id,title,summary,image_url,published_at&status=eq.published&is_published=eq.true&published_at=lte.${encodeURIComponent(new Date().toISOString())}&order=published_at.desc&limit=5`),
        rest(`gdrb_matches?select=id,team_name,football_type,competition,opponent,match_date,match_time,location,venue_type,status,home_score,away_score,result_outcome,is_visible,is_archived&is_visible=eq.true&is_archived=eq.false&status=in.(agendado,terminado,adiado)&match_date=gte.${since.toISOString().slice(0,10)}&order=match_date.asc,match_time.asc&limit=500`),
        rest(`gdrb_tournaments?select=id,team_name,football_type,name,start_date,start_time,end_date,location,is_visible,is_archived&is_visible=eq.true&is_archived=eq.false&or=(end_date.gte.${today},and(end_date.is.null,start_date.gte.${today}))&order=start_date.asc&limit=100`),
      ]);
      return { sponsors, news, matches, tournaments, updated_at: new Date().toISOString() };
    };
    try {
      if (req.method === 'GET') {
        // Open viewing during the club's trial. Only published content is returned.
        // Administrative POST actions remain authenticated.
        return res.status(200).json(await feed());
      }
      if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return res.status(405).json({ error: 'Método não permitido.' }); }
      // Mutations only originate from this site; browser requests are JSON, not forms.
      const origin = req.headers.origin;
      if (origin && !['https://gdrboavista.pt','https://www.gdrboavista.pt'].includes(origin) && !(env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin))) return res.status(403).json({ error: 'Origem não permitida.' });
      if (!(req.headers['content-type'] || '').startsWith('application/json')) return res.status(415).json({ error: 'Formato inválido.' });
      const body = req.body || {};
      if (body.action === 'activate') {
        if (!validKey(body.key)) return res.status(400).json({ error: 'Link de ativação inválido.' });
        const token = makeSecret();
        const id = await rest('rpc/gdrb_tv_activate', { method: 'POST', body: JSON.stringify({ key_hash: hashKey(body.key), new_session_hash: hashKey(token) }) });
        if (!id) return res.status(401).json({ error: 'Este link já foi usado, expirou ou foi revogado. Gera outro no backoffice.' });
        res.setHeader('Set-Cookie', `${COOKIE}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/api/tv; Max-Age=31536000`);
        return res.status(200).json({ activated: true });
      }
      const bearer = (req.headers.authorization || '').match(/^Bearer (.+)$/)?.[1];
      if (!bearer) return res.status(401).json({ error: 'Inicia sessão no backoffice.' });
      let user, admin;
      try {
        user = await request('/auth/v1/user', {}, bearer);
        admin = await request('/rest/v1/rpc/gdrb_gallery_is_admin', { method: 'POST', body: '{}' }, bearer);
      } catch { return res.status(403).json({ error: 'Sem permissão para gerir televisões.' }); }
      if (!user?.id || admin !== true) return res.status(403).json({ error: 'Sem permissão para gerir televisões.' });
      if (body.action === 'preview') return res.status(200).json(await feed());
      if (body.action === 'list') return res.status(200).json(await rest('gdrb_tv_devices?select=id,name,created_at,activated_at,revoked_at,activation_expires_at,session_expires_at&order=created_at.desc&limit=100'));
      if (body.action === 'create') {
        const name = String(body.name || '').trim();
        if (!name || name.length > 80) return res.status(400).json({ error: 'Indica um nome até 80 caracteres.' });
        const activation = makeSecret();
        const rows = await rest('gdrb_tv_devices?select=id,name', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ name, activation_hash: hashKey(activation), created_by: user.id }) });
        return res.status(201).json({ ...rows[0], activation_url: `https://gdrboavista.pt/tv#ativar=${activation}` });
      }
      if (body.action === 'revoke' && /^[0-9a-f-]{36}$/i.test(body.id || '')) {
        await rest(`gdrb_tv_devices?id=eq.${body.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ revoked_at: new Date().toISOString(), session_hash: null, activation_hash: null }) });
        return res.status(200).json({ revoked: true });
      }
      return res.status(400).json({ error: 'Pedido inválido.' });
    } catch {
      return res.status(503).json({ error: 'Não foi possível atualizar o canal. Tentaremos novamente.' });
    }
  };
}
export default createTvHandler();
