import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { baseSeo,resolveSeo } from '../src/lib/publicSeo.js';
import { renderPage,sitemapXml,pageResponse } from '../api/_public-seo.js';
const id='086ed069-edcd-4974-a049-27d19ae48a53';
const template=await readFile(new URL('../index.html',import.meta.url),'utf8');
assert.equal(baseSeo('/equipas?x=1').canonical,'https://gdrboavista.pt/equipas');
assert.equal(baseSeo('/parceiros').canonical,'https://gdrboavista.pt/patrocinadores');
for(const path of ['/admin','/admin/noticias','/newsletter/cancelar/private-token','/equipas/seniores/plantel-2026-gdrb-7f4k']) {assert.ok(baseSeo(path).noindex);assert.equal(baseSeo(path).canonical,null);}
assert.equal(baseSeo('/does-not-exist').status,404);
let called=false;
const seo=await resolveSeo('/noticias/'+id,async(table,q)=>{
 called=true;assert.equal(table,'gdrb_news');assert.equal(q.get('is_published'),'eq.true');assert.equal(q.get('status'),'eq.published');
 return [{title:'Gala & Clube',summary:'Distinção do clube',content:'Texto público.\nOutro parágrafo.',image_url:'javascript:alert(1)',published_at:'2026-09-17T12:00:00Z'}];
});
assert.ok(called);assert.equal(seo.type,'article');assert.equal(seo.paragraphs.length,2);
const html=renderPage(template,seo);
assert.ok(html.includes('Texto público.'));assert.ok(html.includes('Gala &amp; Clube'));
assert.equal((html.match(/rel="canonical"/g)||[]).length,1);assert.equal((html.match(/<title>/g)||[]).length,1);
assert.ok(!html.includes('javascript:'));
assert.ok(html.includes('https://gdrboavista.pt/noticias/'+id));
JSON.parse(html.match(/<script id="page-schema"[^>]*>(.*?)<\/script>/s)[1]);
const injection=renderPage(template,{...seo,title:'"</title><script>alert(1)</script>',schema:{text:'</script><script>alert(1)</script>'}});
assert.ok(!injection.includes('<script>alert(1)</script>'));
assert.equal((await resolveSeo('/noticias/'+id,async()=>[])).status,404);
assert.equal((await resolveSeo('/galeria/'+id,async()=>[])).noindex,true);
await assert.rejects(()=>pageResponse('/noticias/'+id,{template,read:async()=>{throw Error('offline');}}));
let reads=0;
const xml=await sitemapXml(async(table,q)=>{reads++;assert.equal(q.get(table==='tournaments'?'is_public':'is_published'),'eq.true');if(table==='gdrb_news')assert.equal(q.get('status'),'eq.published');return [{id}];});
assert.ok(!xml.includes('/torneios/undefined'));
assert.equal(reads,3);assert.ok(xml.includes('/noticias/'+id));assert.ok(xml.includes('/galeria/'+id));assert.ok(!xml.includes('/admin'));assert.ok(!xml.includes('/parceiros'));
let page=0;
await sitemapXml(async(table,q)=>{if(table!=='gdrb_news')return [];page++;return q.get('offset')==='0'?Array.from({length:500},()=>({id})):[];});
assert.equal(page,2);
console.log('SEO: metadata, canonical URLs, safe HTML, published-only content, missing pages, failures and sitemap pagination passed.');

const tournaments=await sitemapXml(async(table)=>table==='tournaments'?[{slug:'boavista-cup'},{slug:null}]:[]);
assert.ok(tournaments.includes('/torneios/boavista-cup'));
assert.ok(!tournaments.includes('/torneios/null'));
