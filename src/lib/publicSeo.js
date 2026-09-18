export const SITE = 'https://gdrboavista.pt';
export const pages = {
  '/': ['GDR Boavista — Futebol e Formação em Leiria', 'Conhece o GDR Boavista, em Leiria. Equipas, formação, horários de treino, jogos, notícias e informações para atletas, famílias e sócios.'],
  '/clube': ['O Clube — GDR Boavista, Leiria', 'Conhece a história, os valores e a comunidade do Grupo Desportivo e Recreativo Boavista, em Leiria.'],
  '/equipas': ['Equipas e Futebol de Formação — GDR Boavista, Leiria', 'Conhece as equipas e os escalões do GDR Boavista, em Leiria. Consulta os horários e contacta o clube para informações sobre inscrições.'],
  '/noticias': ['Notícias do GDR Boavista — Futebol em Leiria', 'Acompanha as notícias, conquistas, jogos e atividades do GDR Boavista e da sua comunidade em Leiria.'],
  '/socios': ['Ser Sócio do GDR Boavista — Leiria', 'Sabe como te tornares sócio do GDR Boavista e apoia o futebol, a formação e a comunidade do clube em Leiria.'],
  '/galeria': ['Galeria de Fotografias — GDR Boavista', 'Revive os jogos, apresentações e momentos do GDR Boavista nos álbuns de fotografias do clube.'],
  '/patrocinadores': ['Parceiros e Patrocinadores — GDR Boavista', 'Conhece as entidades que apoiam o GDR Boavista e contribuem para o futebol e a formação em Leiria.'],
  '/contactos': ['Contactos e Informações — GDR Boavista, Leiria', 'Contacta o GDR Boavista, em Leiria, para informações sobre equipas, inscrições, sócios, jogos e parcerias.'],
  '/resultados': ['Jogos e Resultados — GDR Boavista', 'Consulta os jogos e resultados das equipas do GDR Boavista. Acompanha o clube e apoia os nossos atletas.'],
  '/loja': ['Loja do GDR Boavista — Artigos do Clube', 'Descobre os artigos disponíveis na loja do GDR Boavista e leva contigo as cores do clube.'],
  '/app': ['App do GDR Boavista — Instalar no Telemóvel', 'Adiciona o site do GDR Boavista ao teu telemóvel para consultar notícias, equipas, jogos e informações do clube.'],
  '/horarios-de-treino': ['Horários de Treino 2026/27 — GDR Boavista, Leiria', 'Consulta os dias e horários de treino dos escalões do GDR Boavista na época 2026/27 e a localização do campo em Leiria.'],
};
export function cleanPath(path) { return ('/' + String(path || '').split(/[?#]/)[0].replace(/^\/+|\/+$/g, '')).replace(/\/{2,}/g, '/'); }
export function plainText(value) { return String(value || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(); }
export function imageUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try { const u = new URL(value, SITE); return u.protocol === 'https:' && !u.username && !u.password ? u.href : null; } catch { return null; }
}
export function baseSeo(rawPath) {
  const path = cleanPath(rawPath);
  const canonicalPath = path === '/parceiros' ? '/patrocinadores' : path;
  const entry = pages[canonicalPath];
  const privatePage = /^\/(admin|newsletter)(\/|$)/.test(path) || path.startsWith('/equipas/seniores/plantel-');
  const dynamic = /^\/(noticias|galeria)\/[a-z0-9-]+$/i.test(path);
  const tournament = /^\/torneios\/[a-z0-9-]+$/i.test(path);
  return { path, title: entry?.[0] || (privatePage ? 'Área reservada — GDR Boavista' : dynamic || tournament ? 'GDR Boavista — Leiria' : 'Página não encontrada — GDR Boavista'),
    description: entry?.[1] || '', canonical: privatePage || (!entry && !dynamic && !tournament) ? null : SITE + canonicalPath,
    image: SITE + '/og-boavista-v1.jpg', type: 'website', noindex: privatePage || (!entry && !dynamic && !tournament),
    status: entry || privatePage || dynamic || tournament ? 200 : 404, paragraphs: [], schema: null };
}
export async function resolveSeo(path, read) {
  const seo = baseSeo(path);
  const match = seo.path.match(/^\/(noticias|galeria)\/([a-z0-9-]+)$/i);
  if (!match) {
    const tournament=seo.path.match(/^\/torneios\/([a-z0-9-]+)$/i);
    if (!tournament) return seo;
    const rows=await read('tournaments',new URLSearchParams({select:'name,description',slug:'eq.'+tournament[1],is_public:'eq.true',limit:'1'}));
    if (!rows[0]) return {...seo,status:404,noindex:true,canonical:null,title:'Torneio não encontrado — GDR Boavista'};
    return {...seo,title:plainText(rows[0].name)+' — GDR Boavista',description:plainText(rows[0].description).slice(0,170),paragraphs:[plainText(rows[0].description)].filter(Boolean)};
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(match[2])) return { ...seo, status:404, noindex:true, canonical:null, title:'Conteúdo não encontrado — GDR Boavista' };
  const news = match[1] === 'noticias';
  const query = new URLSearchParams({ select: news ? 'id,title,summary,content,image_url,published_at' : 'id,title,description,cover_url', id: 'eq.' + match[2], is_published: 'eq.true', ...(news ? {status:'eq.published'} : {}), limit:'1' });
  const rows = await read(news ? 'gdrb_news' : 'gdrb_gallery_albums', query);
  const item = rows[0];
  if (!item) return { ...seo, status:404, noindex:true, canonical:null, title:'Conteúdo não encontrado — GDR Boavista' };
  const description = plainText(news ? item.summary || item.content : item.description).slice(0, 170);
  const image = imageUrl(news ? item.image_url : item.cover_url) || seo.image;
  const paragraphs = String(news ? item.content || item.summary || '' : item.description || '').split(/\n+/).map(plainText).filter(Boolean);
  const schema = news ? { '@context':'https://schema.org', '@type':'NewsArticle', headline:plainText(item.title), description, image:[image], mainEntityOfPage:seo.canonical,
    ...(item.published_at ? {datePublished:item.published_at} : {}),
    publisher:{'@type':'Organization',name:'GDR Boavista',url:SITE,logo:{'@type':'ImageObject',url:SITE+'/logo-gdr-boavista-header-256.png'}} } : null;
  return { ...seo, title:plainText(item.title)+' — GDR Boavista', description, image, type:news?'article':'website', paragraphs, schema };
}
