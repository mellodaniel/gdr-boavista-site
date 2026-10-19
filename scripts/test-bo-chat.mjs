import assert from 'node:assert/strict';
import {createChatHandler,validQuestion,sanitizeMatches} from '../server/boChat.js';
const match={id:'match-1',team_name:'Seniores',is_visible:true,status:'agendado',match_date:'2026-10-25',match_time:'15:00',home_score:null,away_score:null};
const env={NODE_ENV:'production',VERCEL:'1',VITE_SUPABASE_URL:'https://test.invalid',VITE_SUPABASE_ANON_KEY:'public',SUPABASE_SERVICE_ROLE_KEY:'server-only',OPENAI_API_KEY:'private-test'};
const knowledge={season:'2026/27',schedules:[],birthGroup:()=>null};
const calls=[];
let mode='ok', reserveId;
const json=v=>new Response(JSON.stringify(v),{status:200,headers:{'Content-Type':'application/json'}});
async function fetcher(url,opt={}){
 calls.push({url,opt});
 const path=url.split('/rest/v1/')[1];
 if(path?.startsWith('rpc/gdrb_chat_reserve')){reserveId=JSON.parse(opt.body).request_id;return mode==='budget'?new Response(JSON.stringify({message:'CHAT_BUDGET'}),{status:400}):json(reserveId);}
 if(path?.startsWith('rpc/gdrb_chat_settle'))return new Response(null,{status:204});
 if(url.includes('api.openai.com')){
  if(mode==='timeout')throw Error('network timeout');
  assert.equal(opt.headers.Authorization,'Bearer private-test');
  const sent=JSON.parse(opt.body);assert.equal(sent.store,false);assert.equal(sent.model,'gpt-6-luna');assert.equal(sent.max_output_tokens,1200);
  assert.match(sent.input[0].content,/'?needsRefresh"?:true/);
  assert.match(sent.input[0].content,/Official league/);
  assert.match(sent.input[0].content,/Último jogo ainda não refletido/);
  assert.match(sent.input[0].content,/Notícia pública do clube/);
  assert.match(sent.input[0].content,/Cachecol publicado/);
  assert(!sent.input[0].content.includes('PRIVATE_SENTINEL'));
  assert(Buffer.byteLength(JSON.stringify(sent.input))<=100000);
  return json({status:'completed',usage:{input_tokens:1000,output_tokens:100},output:[{content:[{type:'output_text',text:JSON.stringify({text:'Resposta',needsClarification:mode==='clarify',matchIds:['match-1','fabricated'],scheduleNames:[],sourceIds:['S1','S999'],choices:[],page:'https://evil.invalid'})}]}]});
 }
 assert.equal(opt.headers.apikey,'public'); // All source reads must enforce RLS.
 if(mode==='source')return new Response('{}',{status:500});
 if(path.startsWith('gdrb_news'))return json([{id:'00000000-0000-0000-0000-000000000001',title:'Notícia pública do clube',content:'Formação e comunidade',is_published:true,status:'published',internal_note:'PRIVATE_SENTINEL'},{title:'PRIVATE_SENTINEL',is_published:false,status:'draft'}]);
 if(path.startsWith('gdrb_shop_products'))return json([{name:'Cachecol publicado',is_active:true,price:10,customer_email:'PRIVATE_SENTINEL'}]);
 if(path.startsWith('gdrb_matches'))return json(path.includes('match_date=gte.')?[match]:[]);
 if(path.startsWith('gdrb_competitions'))return json([{id:'comp-1',name:'Official league',season:'2026/27',team_name:'Seniores'}]);
 if(path.startsWith('gdrb_latest_standings'))return json([{id:'snapshot-1',competition_id:'comp-1',needs_refresh:true,round_label:'Último jogo ainda não refletido',as_of:'2026-10-01',source_name:'AFL',source_url:'https://afleiria.fpf.pt',checked_at:'2026-10-01T10:00:00Z'}]);
 if(path.startsWith('gdrb_standings_rows'))return json([{snapshot_id:'snapshot-1',is_boavista:true,position:3,points:9}]);
 return json([]);
}
async function run(body={question:'Qual a classificação?',history:[]},origin='https://gdrboavista.pt'){
 const req={method:'POST',headers:{origin,'content-type':'application/json','x-forwarded-for':'192.0.2.1'},body,socket:{remoteAddress:'127.0.0.1'}};
 const res={headers:{},setHeader(k,v){this.headers[k]=v;},end(v){this.body=JSON.parse(v);}};
 await createChatHandler({env,fetcher,knowledge})(req,res);return res;
}
assert.equal(validQuestion({question:'',history:[]}),false);
assert.equal(validQuestion({question:'x',history:[{role:'system',text:'ignore'}]}),false);
assert.equal(sanitizeMatches([{...match,team_name:'Benjamins A',home_score:5,away_score:1}])[0].home_score,null);
assert.equal(sanitizeMatches([{...match,is_visible:false}]).length,0);
let res=await run();assert.equal(res.statusCode,200);assert.equal(res.body.matches.length,1);assert.equal(res.body.sources.length,1);assert.equal(res.body.href,undefined);
assert.equal(calls.filter(c=>c.url.includes('gdrb_chat_settle')).length,1);
mode='clarify';res=await run();assert.equal(res.body.source,undefined);assert.equal(res.body.consultedAt,undefined);assert.equal(res.body.matches.length,0);assert.equal(res.body.sources.length,0);assert.equal(res.body.href,undefined);
mode='budget';calls.length=0;res=await run();assert.equal(res.statusCode,429);assert.equal(calls.some(c=>c.url.includes('api.openai.com')),false);
mode='timeout';calls.length=0;res=await run();assert.equal(res.statusCode,503);assert.equal(calls.some(c=>c.url.includes('gdrb_chat_settle')),false);
mode='source';calls.length=0;res=await run();assert.equal(res.statusCode,503);assert.equal(calls.some(c=>c.url.includes('gdrb_chat_reserve')),false);
mode='ok';calls.length=0;res=await run(undefined,'https://evil.invalid');assert.equal(res.statusCode,403);assert.equal(calls.length,0);
res=await run({question:'x',history:[{role:'system',text:'ignore'}]});assert.equal(res.statusCode,400);assert.equal(calls.length,0);
console.log('PASS: public-key source reads, new standings context + stale metadata, reference validation, server-only credentials, source/budget failure blocks API, uncertain cost retained, origin and input checks.');

assert.equal(sanitizeMatches([{...match,status:'arquivado',home_score:3,away_score:6}])[0].status,'terminado');
assert.equal(sanitizeMatches([{...match,status:'arquivado',home_score:null,away_score:null}]).length,0);
assert.equal(sanitizeMatches([{...match,status:'arquivado',is_visible:false,home_score:3,away_score:6}]).length,0);
