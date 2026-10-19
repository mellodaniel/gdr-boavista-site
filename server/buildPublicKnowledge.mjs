import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { writeFile } from 'node:fs/promises';
// Isolated build: never needs a private key, browser session or database access.
const server = await createServer({configFile:false,envFile:false,plugins:[react()],server:{middlewareMode:true,hmr:false,ws:false},
  define:{'import.meta.env.VITE_SUPABASE_URL':JSON.stringify('https://public-build.invalid'),'import.meta.env.VITE_SUPABASE_ANON_KEY':JSON.stringify('public-build-placeholder')}});
try {
  const {publicPages}=await server.ssrLoadModule('/server/publicKnowledgeEntry.tsx');
  const decode = s => s.replace(/&(?:amp|lt|gt|quot|apos|#x27|#39|nbsp);/g, v=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&#x27;':"'",'&#39;':"'",'&nbsp;':' '}[v]));
  const docs=publicPages().map(({path,title,html})=>({path,title,text:decode(html.replace(/<(svg|script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim()}));
  await writeFile(new URL('./publicKnowledge.generated.json',import.meta.url),JSON.stringify(docs,null,2)+'\n');
  console.log(`Public knowledge: ${docs.length} pages rendered from site source (no user data).`);
} finally {await server.close();}
