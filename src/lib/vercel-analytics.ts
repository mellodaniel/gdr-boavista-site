const PUBLIC_PATHS = new Set([
  '/', '/clube', '/equipas', '/noticias', '/socios', '/galeria',
  '/patrocinadores', '/parceiros', '/contactos', '/resultados', '/loja',
  '/app', '/horarios-de-treino',
]);

export function publicAnalyticsPage(raw: string): { url: string; path: string; route: string } | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || !['gdrboavista.pt', 'www.gdrboavista.pt'].includes(url.host)) return null;
    const path = url.pathname.replace(/\/$/, '') || '/';
    let route = PUBLIC_PATHS.has(path) ? path : null;
    if (/^\/galeria\/[a-z0-9-]+$/i.test(path)) route = '/galeria/:albumId';
    if (/^\/noticias\/[a-z0-9-]+$/i.test(path)) route = '/noticias/:id';
    if (/^\/torneios\/[a-z0-9-]+$/i.test(path)) route = '/torneios/:slug';
    if (!route) return null;
    // Only public pages; never include query strings, fragments or newsletter tokens.
    return { url: `${url.origin}${path}`, path, route };
  } catch {
    return null;
  }
}
