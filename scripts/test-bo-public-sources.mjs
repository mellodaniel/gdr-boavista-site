import assert from 'node:assert/strict';
import {loadPublicKnowledge,publicCollections} from '../server/boPublicSources.js';
const secret='NEVER_SEND_PRIVATE_DATA';
const id='00000000-0000-0000-0000-000000000001';
const fixtures={
 gdrb_news:[{id,title:'Vitória dos Juvenis',summary:'Torneio distrital',content:'O clube venceu o torneio.',is_published:true,status:'published',notes:secret},{id,title:secret,content:secret,is_published:false,status:'draft'}],
 gdrb_shop_products:[{id,name:'Cachecol',price:12,price_label:null,sizes:['Único'],stock_status:'preorder',is_active:true,customer_email:secret},{id,name:secret,is_active:false}],
 gdrb_sponsors:[{id,name:'Parceiro Público',description:'Apoia a formação',is_active:true,tv_contact:secret}],
 gdrb_teams:[{id,name:'Juvenis',is_active:true,internal_notes:secret}],
 gdrb_roster_players:[{id,name:'Jogador Público',team_key:'senior',is_active:true,notes:secret},{id,name:secret,team_key:'internal',is_active:true}],
 gdrb_gallery_albums:[{id,title:'Álbum Público',is_published:true},{id,title:secret,is_published:false}],
 gdrb_tournaments:[{id,name:'Torneio Público',is_visible:true,is_archived:false},{id,name:secret,is_visible:true,is_archived:true}],
 tournaments:[{id,name:'Torneio aberto',slug:'torneio-aberto',is_public:true,registration_token:secret},{id,name:secret,is_public:false}],
};
const calls=[],sources=[];
const sourceId=(title,url)=>{sources.push({title,url});return 'S'+sources.length;};
const read=async path=>{calls.push(path);return fixtures[path.split('?')[0]]??[];};
let result=await loadPublicKnowledge({read,question:'Notícias, loja, parceiros, plantel e torneios',sourceId});
assert.equal(result.collections.length,publicCollections.length);
assert(!JSON.stringify(result).includes(secret));
assert(result.documents.some(d=>d.text.includes('Cachecol')));
assert(result.documents.some(d=>d.text.includes('Vitória dos Juvenis')));
assert(sources.some(s=>s.url===`https://gdrboavista.pt/noticias/${id}`));
for(const path of calls){assert(!path.includes('select=*'));assert(publicCollections.some(s=>path.startsWith(s.table+'?'))||/^tournament_(teams|groups|group_teams|fields|days|rules|matches)\?/.test(path));}
assert(!calls.some(p=>/member_requests|shop_orders|contact_requests|subscribers|senior_match/.test(p)));
result=await loadPublicKnowledge({read,question:'Qual a missão e visão do clube?',sourceId});
assert.equal(result.documents[0].title,'Clube, história, missão, visão e valores');
assert.match(result.documents[0].text,/vertentes social, académica e desportiva/);
result=await loadPublicKnowledge({read,question:'Como ser sócio?',sourceId});
assert.match(result.documents[0].text,/Pedido de sócio/);
result=await loadPublicKnowledge({read,question:'Posso pagar na loja por MB WAY?',sourceId});
assert(result.documents.some(d=>d.text.includes('MB WAY')));
result=await loadPublicKnowledge({read:async p=>{if(p.startsWith('gdrb_news'))throw Error('offline');return read(p);},question:'notícias',sourceId});
assert.equal(result.collections.find(s=>s.category==='Notícias').available,false);
assert(result.documents.some(d=>d.title==='Sócios e adesão'));
const manyCalls=[];
result=await loadPublicKnowledge({read:async p=>{manyCalls.push(p);return p.startsWith('gdrb_news')?Array.from({length:200},(_,i)=>({...fixtures.gdrb_news[0],title:`Notícia ${i}`,content:'Texto público '.repeat(2000)})):[];},question:'notícias',sourceId,maxBytes:6000});
assert.equal(manyCalls.filter(p=>p.startsWith('gdrb_news')).length,3);
assert(result.collections.find(s=>s.category==='Notícias').mayBeTruncated);
assert(Buffer.byteLength(JSON.stringify(result.documents))<6000);
assert(result.documents.some(d=>d.excerpt));
console.log('PASS: public field projection, publication flags, private table exclusion, source links, topic ranking, static page facts, partial failures, bounded pagination and bounded context.');

const roster=Array.from({length:30},(_,i)=>({id:String(i),name:`Atleta ${i}`,team_key:'senior',position:'Médio',is_active:true}));
roster.push({id:'coach',name:'Treinador Verificado',team_key:'senior',position:'Treinador Principal',roster_group:'Equipa técnica',is_active:true});
roster.push({id:'other-coach',name:'Treinador Outro Escalão',team_key:'junior',position:'Treinador Principal',is_active:true});
const readRoster=async path=>path.startsWith('gdrb_roster_players')?roster:read(path);
result=await loadPublicKnowledge({read:readRoster,question:'Quem é o treinador dos Seniores?',history:[{role:'user',text:'Juniores'},{role:'assistant',text:'Juniores Juniores Juniores'}],sourceId});
assert(result.documents[0].text.includes('Treinador Verificado'));
result=await loadPublicKnowledge({read:readRoster,question:'Qual é a morada?',history:[{role:'user',text:'Plantel Seniores treinadores jogadores'}],sourceId});
assert(result.documents[0].text.includes('Rua Campo da Bola, 18'));
result=await loadPublicKnowledge({read,question:'Quem é o presidente?',sourceId});
assert(result.documents[0].text.includes('André Gameiro'));
console.log('PASS: coach survives roster crowding; latest topic beats past context; address and president remain discoverable.');
