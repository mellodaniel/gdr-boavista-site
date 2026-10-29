import test from 'node:test';
import assert from 'node:assert/strict';
import { lisbonDate, upcomingMatches } from '../src/features/match-sheet/calendar.js';
test('past, finished, cancelled and archived matches are absent; today is retained',()=>{
 const matches=[{id:'past',match_date:'2026-10-24'},{id:'far',match_date:'2027-02-20'},{id:'next',match_date:'2026-10-31'},{id:'today',match_date:'2026-10-29'},{id:'done',match_date:'2026-10-29',status:'terminado'},{id:'cancel',match_date:'2026-11-01',status:'cancelado'},{id:'archive',match_date:'2026-11-01',status:'arquivado'}].map(m=>({opponent:'Teste',status:'agendado',...m}));
 assert.deepEqual(upcomingMatches(matches,'2026-10-29').map(m=>m.id),['today','next','far']);
 assert.equal(matches[0].id,'past');
});
test('same-day games are chronological, unknown kick-off comes last',()=>{
 const matches=[null,'15:00:00','10:00:00'].map(time=>({opponent:'Teste',match_date:'2026-10-29',match_time:time}));
 assert.deepEqual(upcomingMatches(matches,'2026-10-29').map(m=>m.match_time),['10:00:00','15:00:00',null]);
});
test('Lisbon summer midnight is the next day even when UTC is still yesterday',()=>{
 assert.equal(lisbonDate(new Date('2026-07-15T23:30:00Z')),'2026-07-16');
 assert.equal(lisbonDate(new Date('2026-10-29T23:30:00Z')),'2026-10-29');
});
