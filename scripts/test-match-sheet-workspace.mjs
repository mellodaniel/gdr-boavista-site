import test from 'node:test';
import assert from 'node:assert/strict';
import { createMatchSheetWorkspace } from '../server/matchSheetWorkspace.js';
import { newSheet } from '../src/features/match-sheet/model.js';
const key='test-shared-link-'.padEnd(48,'x'), id='10000000-0000-4000-8000-000000000001';
function setup(){
 const calls=[];
 const row={id,age_group:'Seniores',revision:3,document:{status:'finished'},archived_at:'2026-10-23',deleted_at:null,updated_at:'2026-10-23'};
 const env={MATCH_SHEET_LINK_KEY:key,SUPABASE_URL:'https://db.example',SUPABASE_SERVICE_ROLE_KEY:'server-only'};
 const fetcher=async(url,init)=>{calls.push({url,init});if(url.includes('/gdrb_match_sheet_teams?'))return Response.json([{age_group:'Seniores'}]);if(url.endsWith('/gdrb_sheet_roster'))return Response.json([{id,name:'Jogador'}]);if(url.includes('/gdrb_matches?'))return Response.json([]);if(url.endsWith('/gdrb_manage_match_sheet'))return Response.json(row);if(url.endsWith('/gdrb_save_match_sheet'))return Response.json(4);return Response.json([row]);};
 const handler=createMatchSheetWorkspace({fetcher,env});
 const req={method:'POST',headers:{'x-match-sheet-key':key},body:{action:'list',offset:0}};
 const res={statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.statusCode=n;return this;},json(body){this.body=body;return this;}};
 return {handler,req,res,calls,env,row};
}
test('missing, incorrect and malformed shared links never query the database',async()=>{
 for(const supplied of [undefined,'incorrect','z'.repeat(48),['x'.repeat(48)]]){const t=setup();t.req.headers['x-match-sheet-key']=supplied;await t.handler(t.req,t.res);assert.equal(t.res.statusCode,401);assert.equal(t.calls.length,0);}
});
test('access fails closed until a sufficiently long server key is configured',async()=>{
 for(const configured of [undefined,'short']){const t=setup();t.env.MATCH_SHEET_LINK_KEY=configured;await t.handler(t.req,t.res);assert.equal(t.res.statusCode,503);assert.equal(t.calls.length,0);}
});
test('a valid shared URL lists sheets without a Supabase user session and does not expose service credentials',async()=>{
 const t=setup();await t.handler(t.req,t.res);assert.equal(t.res.statusCode,200);assert.equal(t.calls.length,1);assert.equal(t.calls[0].init.headers.Authorization,'Bearer server-only');assert.equal(t.res.headers['Cache-Control'],'no-store');assert.equal(t.res.body[0].recorder_id,'shared');assert.ok(!JSON.stringify(t.res.body).includes('server-only'));
});
test('management sends the expected revision and only supports reversible actions',async()=>{
 for(const operation of ['archive','unarchive','trash','restore']){const t=setup();t.req.body={action:'manage',id,revision:2,operation};await t.handler(t.req,t.res);assert.equal(t.res.statusCode,200);assert.deepEqual(JSON.parse(t.calls[0].init.body),{p_id:id,p_revision:2,p_action:operation});}
 for(const operation of ['delete','purge','grant']){const t=setup();t.req.body={action:'manage',id,revision:2,operation};await t.handler(t.req,t.res);assert.equal(t.res.statusCode,400);assert.equal(t.calls.length,0);}
});
test('unknown operations, invalid IDs and invalid pages cannot reach privileged queries',async()=>{
 for(const body of [{action:'sql',id},{action:'get',id:'id&select=secret'},{action:'list',offset:-1},{action:'manage',id,operation:'trash',revision:0}]){const t=setup();t.req.body=body;await t.handler(t.req,t.res);assert.equal(t.res.statusCode,400);assert.equal(t.calls.length,0);}
});
test('roster loading uses the dedicated player projection and actual calendar columns',async()=>{
 const t=setup();t.req.body={action:'roster',group:'Seniores'};await t.handler(t.req,t.res);assert.equal(t.res.statusCode,200);assert.equal(t.res.body.players[0].name,'Jogador');assert.ok(t.calls.some(c=>c.url.includes('venue_type')));assert.ok(t.calls.every(c=>!c.url.includes('auth.users')));
});
test('saves validate match rules before the privileged RPC',async()=>{
 const t=setup();const doc=newSheet({age_group:'Seniores',field_size:11,period_minutes:45,periods:2,reentry:false,record_goals:true},'Diretor');doc.opponent='Teste';t.req.body={action:'save',document:doc,revision:0};await t.handler(t.req,t.res);assert.equal(t.res.statusCode,200);assert.equal(t.res.body.revision,4);
 const bad=setup();bad.req.body={action:'save',document:{...doc,opponent:''},revision:0};await bad.handler(bad.req,bad.res);assert.equal(bad.res.statusCode,400);assert.equal(bad.calls.length,0);
});
test('context grants module editing only, without account administration',async()=>{
 const t=setup();t.req.body={action:'context'};await t.handler(t.req,t.res);assert.equal(t.res.body.admin,false);assert.deepEqual(t.res.body.access,[{age_group:'Seniores',can_edit:true}]);
});

test('saving an existing sheet enables goals despite the legacy document flag',async()=>{
 const t=setup();const doc=newSheet({age_group:'Seniores',field_size:11,period_minutes:45,periods:2,reentry:false,record_goals:false},'Diretor');doc.opponent='Teste';doc.rules.recordGoals=false;t.req.body={action:'save',document:doc,revision:0};await t.handler(t.req,t.res);assert.equal(t.res.statusCode,200);const call=t.calls.find(c=>c.url.endsWith('/gdrb_save_match_sheet'));assert.equal(JSON.parse(call.init.body).p_document.rules.recordGoals,true);assert.equal(doc.rules.recordGoals,false);const config=t.calls.find(c=>c.init.method==='PATCH');assert.ok(config.url.includes('age_group=eq.Seniores&record_goals=eq.false'));assert.deepEqual(JSON.parse(config.init.body),{record_goals:true});assert.ok(t.calls.indexOf(config)<t.calls.indexOf(call));
});
