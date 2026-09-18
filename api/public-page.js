import { pageResponse } from './_public-seo.js';
export default async function handler(request, response) {
  if (!['GET','HEAD'].includes(request.method)) return response.status(405).end();
  try {
    const result = await pageResponse(String(request.query.path || '/'));
    response.setHeader('Content-Type','text/html; charset=utf-8');
    response.setHeader('Cache-Control',result.cache);
    return response.status(result.status).send(request.method==='HEAD'?'':result.html);
  } catch (error) {
    console.error('Public page unavailable:',error.message);
    response.setHeader('Cache-Control','no-store');
    response.setHeader('Retry-After','60');
    return response.status(503).send('Conteúdo temporariamente indisponível. Tenta novamente em breve.');
  }
}
