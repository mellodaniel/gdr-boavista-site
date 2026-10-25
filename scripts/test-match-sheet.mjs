import test from 'node:test';
import assert from 'node:assert/strict';
import { newSheet,clockAt,score,matchPresentation,lineup,validateSheet,eventDescription } from '../src/features/match-sheet/model.js';
import { makeMatchSheetPdf } from '../server/matchSheetPdf.js';
import { baseSeo } from '../src/lib/publicSeo.js';
export function fixture(){
 const sheet=newSheet({age_group:'Seniores',field_size:11,period_minutes:45,periods:2,reentry:false,record_goals:true},'Responsável de teste',new Date('2026-10-23T10:00:00Z'));
 return {...sheet,opponent:'Equipa visitante',status:'live',squad:[{id:'a',name:'João Gonçalves',shirt_number:7,starter:true,captain:true},{id:'b',name:'José Conceição',shirt_number:9,starter:true,captain:false},{id:'c',name:'Jogador suplente',shirt_number:14,starter:false,captain:false}]};
}
function event(kind,values={}){return {id:crypto.randomUUID(),kind,side:'club',period:1,minute:12,added:0,player:'a',incoming:'',ownGoal:false,note:'',createdAt:'2026-10-23T10:12:00Z',...values};}
test('clock survives suspension, pauses and represents added time',()=>{const s=fixture();s.clock={period:1,elapsedMs:44*60000,startedAt:1000};assert.deepEqual(clockAt(s,181000),{period:1,minute:45,added:2,seconds:0,elapsedMs:47*60000});s.clock={period:2,elapsedMs:3*60000,startedAt:null};assert.equal(clockAt(s,99999999).minute,48);assert.equal(clockAt(s,99999999).elapsedMs,180000);});
test('goals, opponent goals and own goals consistently update the score',()=>{const s=fixture();s.events=[event('goal'),event('goal',{side:'opponent'}),event('goal',{ownGoal:true}),event('goal',{side:'opponent',ownGoal:true})];assert.deepEqual(score(s),{club:2,opponent:2});s.events.pop();assert.deepEqual(score(s),{club:1,opponent:2});});
test('substitutions are replayed and cannot bring on an already active player',()=>{const s=fixture();s.events=[event('substitution',{incoming:'c'})];assert.equal(validateSheet(s),null);assert.deepEqual([...lineup(s).onField].sort(),['b','c']);s.events.push(event('substitution',{minute:16,player:'b',incoming:'c'}));assert.match(validateSheet(s),/incompatível/);});
test('deleting an earlier event cannot silently invalidate later substitutions',()=>{const s=fixture();s.events=[event('substitution',{incoming:'c'}),event('substitution',{minute:16,player:'c',incoming:'a'})];s.rules.reentry=true;assert.equal(validateSheet(s),null);s.events.shift();assert.match(validateSheet(s),/incompatível/);});
test('reentry and dismissal restrictions are enforced',()=>{const s=fixture();s.events=[event('substitution',{incoming:'c'}),event('substitution',{minute:16,player:'c',incoming:'a'})];assert.match(validateSheet(s),/incompatível/);s.rules.reentry=true;assert.equal(validateSheet(s),null);s.events.splice(1,0,event('red',{minute:13,player:'a'}));assert.match(validateSheet(s),/incompatível/);});
test('second yellow requires a first yellow and removes the player',()=>{const s=fixture();s.events=[event('second_yellow')];assert.match(validateSheet(s),/primeiro/);s.events.unshift(event('yellow',{minute:8}));assert.equal(validateSheet(s),null);assert.equal(lineup(s).onField.has('a'),false);});
test('legacy outcome-only sheets accept goals, draws and finishing without outcome',()=>{const s=fixture();s.rules.recordGoals=false;s.events=[event('goal')];assert.equal(validateSheet(s),null);s.events=[];s.status='finished';assert.equal(validateSheet(s),null);assert.deepEqual(score(s),{club:0,opponent:0});const fresh=newSheet({age_group:'Traquinas',field_size:7,period_minutes:20,periods:2,reentry:true,record_goals:false},'Treinador');assert.equal(fresh.rules.recordGoals,true);});
test('roster numbers are unique and snapshot names remain independent of future roster edits',()=>{const s=fixture();s.squad[1].shirt_number=7;assert.match(validateSheet(s),/únicos/);assert.match(eventDescription(s,event('goal')),/João Gonçalves/);});
test('the private route returns 200 with noindex and no canonical public URL',()=>{const seo=baseSeo('/ficha-de-jogo');assert.equal(seo.status,200);assert.equal(seo.noindex,true);assert.equal(seo.canonical,null);});
test('PDF embeds the club badge, Portuguese names, version, pagination and escapes literal syntax',async()=>{const s=fixture();s.status='finished';s.notes='Revisão técnica (primeira parte) \\ observações.\n'+('Observação de teste com acentos: ação, substituição, João. '.repeat(60));const pdf=await makeMatchSheetPdf(s,4),raw=pdf.toString('latin1');assert.ok(raw.startsWith('%PDF-1.4'));assert.ok(raw.endsWith('%%EOF\n'));assert.match(raw,/\/Subtype \/Image/);assert.match(raw,/João Gonçalves/);assert.match(raw,/versão 4/);assert.match(raw,/\\\(primeira parte\\\)/);assert.ok((raw.match(/\/Type \/Page /g)||[]).length>=2);const xref=Number(raw.match(/startxref\n(\d+)/)[1]);assert.equal(raw.slice(xref,xref+4),'xref');});

test('home/away presentation keeps goals with their team including own goals',async()=>{
 const s=fixture();s.events=[event('goal'),event('goal',{ownGoal:true}),event('goal',{side:'opponent'})];
 const original=structuredClone(s);
 for(const home of [true,false,true]){
  s.home=home;
  const display=matchPresentation(s);
  assert.equal(display.title,home?'GDRBoavista × Equipa visitante':'Equipa visitante × GDRBoavista');
  assert.equal(display.result,home?'1 – 2':'2 – 1');
  assert.deepEqual(score(s),{club:1,opponent:2});
  const raw=(await makeMatchSheetPdf(s,1)).toString('latin1');
  assert.ok(raw.includes(display.title));
  assert.ok(raw.includes(`Resultado: ${home?'1':'2'} ${String.fromCharCode(150)} ${home?'2':'1'}`));
 }
 assert.deepEqual(s,original);
});

test('playing time includes stoppage time and excludes the half-time break',async()=>{
 const {playerParticipation,updateMatchClock}=await import('../src/features/match-sheet/model.js');
 let s=fixture();s.clock={period:1,elapsedMs:47*60000,startedAt:null};
 s.events=[event('substitution',{minute:45,added:1,incoming:'c'})];
 s=updateMatchClock(s,'next',1000000);s=updateMatchClock(s,'pause',1000000+48*60000);
 const result=playerParticipation(s),byId=Object.fromEntries(result.players.map(p=>[p.id,p]));
 assert.equal(result.totalMs,95*60000);assert.equal(result.estimated,false);
 assert.equal(byId.a.elapsedMs,46*60000);assert.equal(byId.c.elapsedMs,49*60000);assert.equal(byId.b.elapsedMs,95*60000);
 assert.equal(byId.a.onField,false);assert.equal(byId.c.onField,true);
 assert.equal(result.players.reduce((sum,p)=>sum+p.elapsedMs,0),190*60000);
 const pdf=(await makeMatchSheetPdf(updateMatchClock(s,'finish'),2)).toString('latin1');assert.ok(pdf.includes('49 min'));assert.ok(pdf.includes('95 min'));
});
test('reentries accumulate separate spells and red cards stop minutes',async()=>{
 const {playerParticipation}=await import('../src/features/match-sheet/model.js');const s=fixture();s.rules.reentry=true;s.clock={period:1,elapsedMs:40*60000,startedAt:null};
 s.events=[event('substitution',{minute:10,incoming:'c'}),event('substitution',{minute:20,player:'c',incoming:'a'}),event('yellow',{minute:22}),event('second_yellow',{minute:30})];
 assert.equal(validateSheet(s),null);const rows=Object.fromEntries(playerParticipation(s).players.map(p=>[p.id,p]));
 assert.equal(rows.a.elapsedMs,20*60000);assert.equal(rows.a.dismissed,true);assert.equal(rows.a.onField,false);assert.equal(rows.a.yellow,true);
 assert.equal(rows.c.elapsedMs,10*60000);assert.equal(rows.b.elapsedMs,40*60000);
});
test('legacy periods are marked estimated and honor known added-time events',async()=>{
 const {playerParticipation}=await import('../src/features/match-sheet/model.js');const s=fixture();s.clock={period:2,elapsedMs:10*60000,startedAt:null};s.events=[event('note',{minute:45,added:3,note:'Intervalo'})];
 const result=playerParticipation(s);assert.equal(result.estimated,true);assert.equal(result.totalMs,58*60000);assert.equal(result.players.find(p=>p.id==='c').elapsedMs,0);assert.equal(result.players.find(p=>p.id==='c').used,false);
});
test('live, paused and corrected clocks recalculate minutes without mutating stored data',async()=>{
 const {playerParticipation,updateMatchClock}=await import('../src/features/match-sheet/model.js');let s=fixture();s.clock={period:1,elapsedMs:0,startedAt:1000};
 assert.equal(playerParticipation(s,601000).players[0].elapsedMs,600000);s=updateMatchClock(s,'pause',601000);assert.equal(playerParticipation(s,1201000).players[0].elapsedMs,600000);
 s.events=[event('substitution',{minute:5,incoming:'c'})];const snapshot=structuredClone(s);assert.equal(playerParticipation(s).players[0].elapsedMs,300000);assert.deepEqual(s,snapshot);
 s.events=[];assert.equal(playerParticipation(s).players[0].elapsedMs,600000);
});
test('invalid stored period durations are rejected',()=>{for(const durations of [{1:-1},{1:'45'},[],{0:60000},{3:60000}]){const s=fixture();s.periodDurations=durations;assert.match(validateSheet(s),/Duração/);}});

test('manual events beyond the clock are included and explicitly estimated',async()=>{const {playerParticipation}=await import('../src/features/match-sheet/model.js');const s=fixture();s.events=[event('substitution',{minute:20,incoming:'c'})];const result=playerParticipation(s);assert.equal(result.estimated,true);assert.equal(result.players.find(p=>p.id==='a').elapsedMs,20*60000);assert.equal(result.players.find(p=>p.id==='a').onField,false);assert.equal(result.players.find(p=>p.id==='c').onField,true);});

test('substitution comments appear in event descriptions and final PDFs',async()=>{const s=fixture();const e=event('substitution',{incoming:'c',note:'Guarda-redes principal saiu lesionado.'});s.events=[e];assert.equal(eventDescription(s,e),'Sai João Gonçalves / entra Jogador suplente · Guarda-redes principal saiu lesionado.');const raw=(await makeMatchSheetPdf(s,3)).toString('latin1');assert.ok(raw.includes('Guarda-redes principal saiu'));assert.ok(raw.includes('lesionado.'));assert.equal(eventDescription(s,{...e,note:''}),'Sai João Gonçalves / entra Jogador suplente');});
