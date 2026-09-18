import { readFile } from 'node:fs/promises';
import { SITE, pages, resolveSeo } from '../src/lib/publicSeo.js';
export const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function publicReader(env = process.env) {
  return async (table, query) => {
    const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
    const key = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error('Public data configuration missing');
    const response = await fetch(`${url.replace(/\/$/,'')}/rest/v1/${table}?${query}`, {headers:{apikey:key,Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(8000)});
    if (!response.ok) throw new Error(`Public data unavailable (${response.status})`);
    const rows = await response.json();
    if (!Array.isArray(rows)) throw new Error('Invalid public data response');
    return rows;
  };
}
export function renderPage(template, seo) {
  const json = JSON.stringify(seo.schema).replace(/</g,'\\u003c');
  const metadata = `<title>${escape(seo.title)}</title>
<meta name="description" content="${escape(seo.description)}" />
<meta name="robots" content="${seo.noindex ? 'noindex, nofollow' : 'index, follow'}" />
${seo.canonical ? `<link rel="canonical" href="${escape(seo.canonical)}" />` : ''}
<meta property="og:title" content="${escape(seo.title)}" />
<meta property="og:description" content="${escape(seo.description)}" />
<meta property="og:type" content="${escape(seo.type)}" />
${seo.canonical ? `<meta property="og:url" content="${escape(seo.canonical)}" />` : ''}
<meta property="og:image" content="${escape(seo.image)}" />
<meta name="twitter:title" content="${escape(seo.title)}" />
<meta name="twitter:description" content="${escape(seo.description)}" />
<meta name="twitter:image" content="${escape(seo.image)}" />
${seo.schema ? `<script id="page-schema" type="application/ld+json">${json}</script>` : ''}`;
  const shell = template.replace(/<title>[\s\S]*?<\/title>/gi,'')
    .replace(/<meta\s+[^>]*(?:name|property)=["'](?:description|robots|og:(?:title|description|type|url|image(?::[^"']+)?)|twitter:(?:title|description|image))["'][^>]*>/gi,'')
    .replace(/<link\s+[^>]*rel=["']canonical["'][^>]*>/gi,'')
    .replace('</head>', metadata+'\n</head>');
  // Same initial content for all visitors; React replaces this shell on startup.
  const content = seo.noindex ? '' : `<main style="max-width:960px;margin:40px auto;padding:24px;font-family:Arial,sans-serif"><nav><a href="/">GDR Boavista</a> · <a href="/equipas">Equipas</a> · <a href="/noticias">Notícias</a> · <a href="/galeria">Galeria</a> · <a href="/contactos">Contactos</a></nav><h1>${escape(seo.title)}</h1><p>${escape(seo.description)}</p>${seo.type==='article' ? `<img src="${escape(seo.image)}" alt="${escape(seo.title)}" style="max-width:100%;height:auto" />` : ''}${seo.paragraphs.map(p=>`<p>${escape(p)}</p>`).join('')}</main>`;
  return shell.replace('<div id="root"></div>', `<div id="root">${content}</div>`);
}
export async function pageResponse(path, options = {}) {
  const template = options.template || await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const seo = await resolveSeo(path, options.read || publicReader());
  return { status:seo.status, html:renderPage(template,seo), cache:seo.noindex?'no-store':'public, max-age=0, s-maxage=60' };
}
export async function sitemapXml(read = publicReader()) {
  const urls = Object.keys(pages).map(path => SITE + path);
  for (const [table, prefix, filters] of [['gdrb_news','/noticias/',{status:'eq.published'}],['gdrb_gallery_albums','/galeria/',{}]]) {
    for (let offset=0;;offset+=500) {
      const rows = await read(table,new URLSearchParams({select:'id',is_published:'eq.true',...filters,order:'id.asc',limit:'500',offset:String(offset)}));
      for (const row of rows) if (/^[0-9a-f-]{36}$/i.test(row.id)) urls.push(SITE+prefix+row.id);
      if (urls.length > 50000) throw new Error('Sitemap requires splitting');
      if (rows.length < 500) break;
    }
  }
  for (let offset=0;;offset+=500) {
    const rows=await read('tournaments',new URLSearchParams({select:'slug',is_public:'eq.true',order:'id.asc',limit:'500',offset:String(offset)}));
    for (const row of rows) if (typeof row.slug === 'string' && /^[a-z0-9-]+$/i.test(row.slug)) urls.push(SITE+'/torneios/'+row.slug);
    if (urls.length>50000) throw new Error('Sitemap requires splitting');
    if (rows.length<500) break;
  }
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+[...new Set(urls)].map(url=>`<url><loc>${escape(url)}</loc></url>`).join('')+'</urlset>';
}
