import { sitemapXml } from './_public-seo.js';
export default async function handler(request, response) {
  if (!['GET','HEAD'].includes(request.method)) return response.status(405).end();
  try {
    const xml=await sitemapXml();
    response.setHeader('Content-Type','application/xml; charset=utf-8');
    response.setHeader('Cache-Control','public, max-age=0, s-maxage=60');
    return response.status(200).send(request.method==='HEAD'?'':xml);
  } catch (error) {
    console.error('Sitemap unavailable:',error.message);
    response.setHeader('Cache-Control','no-store');
    response.setHeader('Retry-After','60');
    return response.status(503).send('Sitemap temporariamente indisponível.');
  }
}
