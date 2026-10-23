import assert from 'node:assert/strict';
import {tournamentDocuments} from '../server/boTournamentSources.js';
const id='00000000-0000-0000-0000-000000000001';
const result=await tournamentDocuments({read:async path=>{
 assert(!/select=\*|contact_phone|contact_email|notes|tournament_players|tournament_result_access/.test(path));
 if(path.startsWith('tournaments?'))return [{id,name:'Torneio público',slug:'publico',is_public:true,age_group:'Benjamins'},{id:'00000000-0000-0000-0000-000000000002',name:'SECRET',is_public:false}];
 if(path.startsWith('tournament_rules'))throw Error('offline');
 return [{id:'1',tournament_id:id,name:'Equipa',notes:'SECRET',score_a:7,score_b:2,is_active:true},{id:'2',tournament_id:'private',name:'SECRET'}];
}});
assert(!JSON.stringify(result).includes('SECRET'));
const data=JSON.parse(result[0].text);
assert.equal(data.collections.find(c=>c.table==='tournament_rules').available,false);
assert.equal(data.collections.find(c=>c.table==='tournament_matches').rows[0].score_a,undefined);
assert.equal(data.collections.find(c=>c.table==='tournament_teams').rows.length,1);
console.log('PASS: published tournament parents only; explicit safe fields; unpublished/private data excluded; source failure flagged; youngest scores masked.');
