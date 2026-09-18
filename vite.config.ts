import { defineConfig, loadEnv } from 'vite';
import { readFile } from 'node:fs/promises';
import { pageResponse, publicReader, sitemapXml } from './api/_public-seo.js';
import { pages } from './src/lib/publicSeo.js';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Forward only Vercel's public collection endpoints to the React SDK.
  define: {
    'import.meta.env.VITE_VERCEL_OBSERVABILITY_CLIENT_CONFIG': JSON.stringify(
      process.env.VITE_VERCEL_OBSERVABILITY_CLIENT_CONFIG
        ?? process.env.VERCEL_OBSERVABILITY_CLIENT_CONFIG
        ?? '',
    ),
  },
  plugins: [
    {
      name: 'public-seo-development',
      configureServer(server) {
        const read=publicReader(loadEnv(server.config.mode, server.config.root, ''));
        server.middlewares.use(async (request,response,next)=>{
          const pathname=new URL(request.url || '/', 'http://localhost').pathname;
          if (!['GET','HEAD'].includes(request.method || 'GET')) return next();
          const publicRoute=Boolean(pages[pathname]) || pathname==='/parceiros' || /^\/(noticias|galeria|torneios)\/[^/]+$/.test(pathname);
          if (pathname!=='/sitemap.xml' && !publicRoute) return next();
          try {
            if(pathname==='/sitemap.xml') {
              response.setHeader('Content-Type','application/xml; charset=utf-8');
              response.end(await sitemapXml(read));return;
            }
            const template=await server.transformIndexHtml(pathname,await readFile('index.html','utf8'));
            const result=await pageResponse(pathname,{template,read});
            response.statusCode=result.status;
            response.setHeader('Content-Type','text/html; charset=utf-8');
            response.setHeader('Cache-Control','no-store');
            response.end(result.html);
          } catch {response.statusCode=503;response.end('Conteúdo temporariamente indisponível.');}
        });
      },
    },
    react(),
    tailwindcss(),
  ],
});