// First run: npx vite build --ssr src/pages/tv/TvPage.tsx --outDir .local/tv-review-ssr
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TvSlideView } from '../.local/tv-review-ssr/TvPage.js';
import { readFileSync } from 'node:fs';
const render=slide=>renderToStaticMarkup(createElement(TvSlideView,{slide}));
const match={id:'test',team_name:'Sub-12',opponent:'Alcobaça',venue_type:'fora',status:'terminado',result_outcome:'loss',home_score:0,away_score:7,match_date:'2026-10-03',match_time:'09:30',competition:'Encontro'};
for(const [outcome,letter,label] of [['loss','D','Derrota'],['win','V','Vitória']]){
 const html=render({kind:'results',matches:[{...match,result_outcome:outcome}]});
 assert.ok(html.includes(`aria-label="Boavista: ${label}"`));
 const visible=html.replace(/<[^>]+>/g,'');
 assert.ok(visible.includes(letter));assert.ok(!visible.includes(label));assert.ok(!visible.includes('0 – 7'));
 assert.ok(html.includes('class="tv-outcome"'));assert.ok(!html.includes('class="tv-score"'));
}
assert.ok(render({kind:'results',matches:[{...match,team_name:'Sub-13'}]}).includes('7 – 0'));
assert.ok(render({kind:'matches',matches:[match]}).includes('×'));
for(const [kind,qr] of [['welcome','clube'],['community','socios']]) assert.ok(render({kind}).includes(`/tv/qr-${qr}.svg`));
const sponsorHtml=render({kind:'sponsor',sponsor:{name:'Parceiro',tv_message:'Mensagem curta',tv_contact:'Contacto público',logo_url:'https://example.com/logo.png',website_url:'https://example.com'}});
assert.ok(sponsorHtml.includes('/tv/qr-parceiros.svg'));assert.ok(sponsorHtml.includes('Contacto público'));
const newsHtml=render({kind:'news',news:{title:'Notícia <script> nunca executa',summary:'Texto',published_at:'2026-10-01',image_url:'https://example.com/news.jpg'}});
assert.ok(!newsHtml.includes('<script>'));assert.ok(newsHtml.includes('/tv/qr-clube.svg'));
for(const name of ['clube','socios','parceiros'])assert.ok(readFileSync(`public/tv/qr-${name}.svg`,'utf8').includes('<svg'));
console.log('TV rendering: discreet V/D, accessible outcomes, no youth scores, away scores, QR calls to action, partner contact and escaped content passed.');
