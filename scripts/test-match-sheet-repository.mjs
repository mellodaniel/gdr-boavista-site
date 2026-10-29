import test from 'node:test';import assert from 'node:assert/strict';
import {MatchSheetRepository} from '../src/features/match-sheet/repository.js';
import {newSheet} from '../src/features/match-sheet/model.js';
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
function setup(){let disk=[],online=true,user='owner',calls=[];const io={schedule:false,read:async()=>structuredClone(disk),write:async rows=>{disk=structuredClone(rows);},list:async()=>[],get:async()=>{},online:()=>online,user:async()=>user,upload:async r=>{calls.push(structuredClone(r));return {revision:r.revision+1};}};const repo=new MatchSheetRepository('owner',io);const doc=newSheet({age_group:'Seniores',field_size:11,period_minutes:45,periods:2,reentry:false,record_goals:true},'Diretor');doc.opponent='Adversário';return {repo,io,doc,calls,setOnline:v=>{online=v;},setUser:v=>{user=v;},disk:()=>disk};}
test('offline events survive reconstructing the repository and synchronize once online',async()=>{const t=setup();t.setOnline(false);await t.repo.save(t.doc);await t.repo.sync();assert.equal(t.calls.length,0);const reopened=new MatchSheetRepository('owner',t.io);await reopened.load();assert.equal(reopened.records[0].document.opponent,'Adversário');assert.equal(reopened.records[0].dirty,true);t.setOnline(true);await reopened.sync();assert.equal(t.calls.length,1);assert.equal(reopened.records[0].dirty,false);await reopened.sync();assert.equal(t.calls.length,1);});
test('an edit during upload is retained and uses the acknowledged server revision',async()=>{const t=setup(),started=deferred(),release=deferred();t.io.upload=async r=>{t.calls.push(structuredClone(r));started.resolve();return release.promise;};await t.repo.save(t.doc);const sync=t.repo.sync();await started.promise;await t.repo.save({...t.doc,notes:'Novo evento durante o envio'});release.resolve({revision:1});await sync;assert.equal(t.repo.records[0].document.notes,'Novo evento durante o envio');assert.equal(t.repo.records[0].dirty,true);assert.equal(t.repo.records[0].revision,1);t.io.upload=async r=>{t.calls.push(structuredClone(r));return {revision:2};};await t.repo.sync();assert.equal(t.calls[1].revision,1);assert.equal(t.repo.records[0].dirty,false);});
test('a server conflict preserves the full local document and prevents automatic overwrites',async()=>{const t=setup();t.io.upload=async()=>({error:{code:'40001'}});await t.repo.save(t.doc);await t.repo.sync();assert.equal(t.repo.records[0].conflict,true);assert.equal(t.disk()[0].document.id,t.doc.id);t.io.upload=async()=>{throw new Error('Must not retry conflict');};await t.repo.sync();assert.equal(t.repo.records[0].dirty,true);});
test('storage failures are surfaced before a document is marked saved',async()=>{const t=setup();t.io.write=async()=>{throw new Error('Quota exceeded');};await assert.rejects(t.repo.save(t.doc),/Quota/);assert.equal(t.repo.records.length,0);assert.equal(t.calls.length,0);});
test('switching account cannot send the previous account’s pending records',async()=>{const t=setup();await t.repo.save(t.doc);t.setUser('another-user');await t.repo.sync();assert.equal(t.calls.length,0);assert.equal(t.repo.records[0].dirty,true);});
test('refresh cannot replace a dirty local record with an older server version',async()=>{const t=setup();await t.repo.save({...t.doc,notes:'local'});t.io.list=async()=>[{id:t.doc.id,document:{...t.doc,notes:'remote'},recorder_id:'owner',revision:10,updated_at:'2026-10-23'}];await t.repo.refresh();assert.equal(t.repo.records[0].document.notes,'local');assert.equal(t.repo.records[0].revision,0);});
test('incomplete preparation is synchronized without waiting for match readiness',async()=>{const t=setup();t.doc.opponent='';await t.repo.save(t.doc);await t.repo.sync();assert.equal(t.disk()[0].document.opponent,'');assert.equal(t.calls.length,1);assert.equal(t.repo.records[0].dirty,false);});
test('an incomplete local draft can be trashed offline, survives reopening and can be restored',async()=>{
 const t=setup();t.setOnline(false);t.doc.opponent='';await t.repo.save(t.doc);await t.repo.manage(t.doc.id,'trash');assert.ok(t.disk()[0].deletedAt);
 const reopened=new MatchSheetRepository('owner',t.io);await reopened.load();assert.ok(reopened.records[0].deletedAt);await assert.rejects(reopened.save(t.doc),/Restaura/);await reopened.manage(t.doc.id,'restore');assert.equal(reopened.records[0].deletedAt,null);assert.equal(reopened.records[0].document.opponent,'');
});
test('a trashed local draft never gets uploaded when the network returns',async()=>{const t=setup();await t.repo.save(t.doc);await t.repo.manage(t.doc.id,'trash');await t.repo.sync();assert.equal(t.calls.length,0);});
test('archiving uses the server revision, preserves history metadata and prevents editing',async()=>{
 const t=setup();await t.repo.save(t.doc);await t.repo.sync();let requested;
 t.io.manage=async(id,revision,action)=>{requested={id,revision,action};return {id,revision:2,document:t.doc,recorder_id:'owner',updated_at:'2026-10-23',archived_at:'2026-10-23'};};
 await t.repo.manage(t.doc.id,'archive');assert.equal(requested.revision,1);assert.equal(t.repo.records[0].revision,2);assert.ok(t.repo.records[0].archivedAt);await assert.rejects(t.repo.save(t.doc),/Restaura/);
});
test('unsynced changes and offline devices cannot manage a server record',async()=>{
 const t=setup();await t.repo.save(t.doc);await t.repo.sync();await t.repo.save({...t.doc,notes:'Por sincronizar'});await assert.rejects(t.repo.manage(t.doc.id,'trash'),/Sincroniza/);await t.repo.sync();t.setOnline(false);await assert.rejects(t.repo.manage(t.doc.id,'trash'),/internet/);
});
test('remote tombstones replace clean cached sheets and block stale local writes',async()=>{
 const t=setup();await t.repo.save(t.doc);await t.repo.sync();t.io.list=async()=>[{id:t.doc.id,document:t.doc,recorder_id:'owner',revision:2,updated_at:'2026-10-23',deleted_at:'2026-10-23'}];await t.repo.refresh();assert.ok(t.repo.records[0].deletedAt);await assert.rejects(t.repo.save(t.doc),/Restaura/);
});
test('a management conflict preserves the local copy and existing lifecycle',async()=>{
 const t=setup();await t.repo.save(t.doc);await t.repo.sync();t.io.manage=async()=>{throw new Error('Conflito');};await assert.rejects(t.repo.manage(t.doc.id,'trash'),/Conflito/);assert.equal(t.repo.records[0].revision,1);assert.ok(!t.repo.records[0].deletedAt);
});

test('two devices continue an incomplete draft and exchange live events with revision protection',async()=>{
 const a=setup(),b=setup();let row;
 const shared={list:async()=>row?[structuredClone(row)]:[],upload:async r=>{
  if(r.revision!==(row?.revision||0))return {error:{code:'40001'}};
  row={id:r.document.id,document:structuredClone(r.document),recorder_id:'owner',revision:r.revision+1,updated_at:new Date().toISOString()};return {revision:row.revision};
 }};
 Object.assign(a.io,shared);Object.assign(b.io,shared);
 a.doc.recorder='';a.doc.opponent='';a.doc.date='';await a.repo.save(a.doc);await a.repo.sync();await b.repo.refresh();
 assert.equal(b.repo.records[0].document.id,a.doc.id);assert.equal(b.repo.records[0].document.recorder,'');
 const prepared={...b.repo.records[0].document,opponent:'Alvaiázere',recorder:'Adjunto',date:'2026-10-31',squad:[{id:'p1',name:'Jogador',shirt_number:7,starter:true}],status:'live'};
 await b.repo.save(prepared);await b.repo.sync();await a.repo.refresh();assert.equal(a.repo.records[0].document.status,'live');
 const goal={id:'e1',kind:'goal',side:'club',period:1,minute:12,added:0,player:'p1',incoming:'',ownGoal:false,note:'',createdAt:new Date().toISOString()};
 await a.repo.save({...a.repo.records[0].document,events:[goal]});await a.repo.sync();await b.repo.refresh();assert.deepEqual(b.repo.records[0].document.events,[goal]);
 await a.repo.save({...a.repo.records[0].document,notes:'Dispositivo A'});await b.repo.save({...b.repo.records[0].document,notes:'Dispositivo B'});
 await a.repo.sync();await b.repo.sync();assert.equal(b.repo.records[0].conflict,true);assert.equal(row.document.notes,'Dispositivo A');assert.equal(b.repo.records[0].document.notes,'Dispositivo B');
});
test('invalid drafts surface validation errors instead of silently remaining local',async()=>{const t=setup();t.doc.rules.fieldSize=3;await t.repo.save(t.doc);await t.repo.sync();assert.equal(t.calls.length,0);assert.match(t.repo.records[0].error,/formato/);});
