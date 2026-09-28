import assert from 'node:assert/strict';
import { getLisbonDate, addCalendarDays, selectUpcomingMatches, selectPostponedMatches, isTournamentUpcoming } from '../src/lib/homeAgenda.ts';
const match = (id, date, team = 'Juvenis', extra = {}) => ({ id, match_date: date, team_name: team, football_type: 'Futebol 11', match_time: '10:00', is_visible: true, status: 'agendado', ...extra });
const ids = (rows, today) => selectUpcomingMatches(rows, today).map(m => m.id);
// Monday holiday is visible on Friday; all seven calendar days are included.
assert.deepEqual(ids([match('holiday','2026-10-05'),match('end','2026-10-08'),match('later','2026-10-09')], '2026-10-02'), ['holiday','end']);
// Each team gets its own next fixture even outside the seven-day period.
assert.deepEqual(ids([match('junior','2026-10-17','Juniores'),match('juvenil','2026-10-05'),match('second','2026-10-24','Juniores'),match('fut7','2026-10-18','Juvenis',{football_type:'Futebol 7'})], '2026-10-02'), ['juvenil','junior','fut7']);
// No six-row cap, and completed, hidden, archived, cancelled and postponed matches cannot displace a scheduled fixture.
const full = Array.from({length:8}, (_, i) => match(String(i), '2026-10-05'));
assert.equal(ids(full,'2026-10-02').length,8);
const excluded = [match('past','2026-10-01'),match('done','2026-10-02','Juvenis',{status:'terminado'}),match('hidden','2026-10-02','Juvenis',{is_visible:false}),match('archived','2026-10-02','Juvenis',{is_archived:true}),match('cancelled','2026-10-02','Juvenis',{status:'cancelado'}),match('postponed','2026-10-02','Juvenis',{status:'adiado'})];
assert.deepEqual(ids([...excluded,match('next','2026-10-20')], '2026-10-02'), ['next']);
assert.deepEqual(selectPostponedMatches(excluded).map(m=>m.id), ['postponed']);
assert.deepEqual(ids([match('today','2026-10-05')], '2026-10-05'), ['today']);
// The calendar follows Lisbon even when a visitor is in another timezone, including DST and year boundaries.
assert.equal(getLisbonDate(new Date('2026-10-01T23:30:00Z')), '2026-10-02');
assert.equal(getLisbonDate(new Date('2026-10-25T23:30:00Z')), '2026-10-25');
assert.equal(addCalendarDays('2026-10-23',6),'2026-10-29');
assert.equal(addCalendarDays('2026-12-29',6),'2027-01-04');
const tournament = {is_visible:true,is_archived:false,start_date:'2026-10-01',end_date:'2026-10-03'};
assert.ok(isTournamentUpcoming(tournament,'2026-10-02'));
assert.ok(!isTournamentUpcoming({...tournament,end_date:'2026-10-01'},'2026-10-02'));
assert.ok(!isTournamentUpcoming({...tournament,is_archived:true},'2026-10-02'));
console.log('Home agenda: holiday, seven-day window, team fallback, status, timezone and tournament checks passed.');

const { selectRecentResults, getResultTeams } = await import('../src/lib/homeAgenda.ts');
const result = (id, date, extra = {}) => match(id, date, 'Seniores', {status:'terminado',home_score:0,away_score:0,opponent:'Visitante',...extra});
const recent = (rows, today) => selectRecentResults(rows,today).map(m=>m.id);
assert.deepEqual(recent([result('sunday','2026-09-27')],'2026-10-02'), ['sunday']);
assert.deepEqual(recent([result('sunday','2026-09-27')],'2026-10-03'), ['sunday']);
assert.deepEqual(recent([result('sunday','2026-09-27')],'2026-10-04'), []);
assert.deepEqual(recent([result('monday','2026-10-05')],'2026-10-11'), ['monday']);
assert.deepEqual(recent([result('friday','2026-10-02')],'2026-10-08'), ['friday']);
assert.deepEqual(recent([result('older','2026-09-27'),result('today','2026-09-28'),result('future','2026-09-29'),result('missing','2026-09-28',{home_score:null}),result('scheduled','2026-09-28',{status:'agendado'}),result('hidden','2026-09-28',{is_visible:false}),result('archived','2026-09-28',{is_archived:true})],'2026-09-28'), ['today','older']);
assert.deepEqual(getResultTeams(result('away','2026-09-27',{venue_type:'fora',home_score:3,away_score:6})).map(t=>[t.name,t.score]), [['Visitante',6],['GDR Boavista',3]]);
assert.deepEqual(getResultTeams(result('home','2026-09-27',{venue_type:'casa',home_score:3,away_score:6})).map(t=>[t.name,t.score]), [['GDR Boavista',3],['Visitante',6]]);
console.log('Recent results: expiry, confirmed zero scores, exclusions, order and home/away score checks passed.');

const { selectUpcomingTournaments } = await import('../src/lib/homeAgenda.ts');
const event = (id, start, extra = {}) => ({id,start_date:start,end_date:start,team_name:'Traquinas',football_type:'Futebol 5',is_visible:true,is_archived:false,...extra});
const eventIds = rows => selectUpcomingTournaments(rows,'2026-09-28').map(t=>t.id);
assert.deepEqual(eventIds([event('oct5','2026-10-05'),event('later','2026-10-12')]),['oct5']);
assert.deepEqual(eventIds([event('week1','2026-10-01'),event('week2','2026-10-04'),event('later','2026-10-05')]),['week1','week2']);
assert.deepEqual(eventIds([event('past','2026-09-27'),event('ongoing','2026-09-27',{end_date:'2026-09-29'}),event('hidden','2026-10-01',{is_visible:false}),event('archive','2026-10-02',{is_archived:true}),event('other','2026-10-10',{team_name:'Benjamins'}),event('otherFormat','2026-10-11',{football_type:'Futebol 7'})]),['ongoing','other','otherFormat']);
console.log('Tournament agenda: next participation beyond seven days, all weekly events, ongoing events and exclusions passed.');

const { getTeamOrder, groupAgendaByDate } = await import('../src/lib/homeAgenda.ts');
const hierarchy = ['Seniores','Juniores','Juvenis','Iniciados','Sub-13','Sub12','Benjamins','Traquinas','Petizes','ABCs'];
assert.deepEqual([...hierarchy].reverse().sort((a,b)=>getTeamOrder(a)-getTeamOrder(b)), hierarchy);
assert.equal(getTeamOrder('Séniores'),0);
assert.equal(getTeamOrder('Petizes / ABC'),8);
const agendaEntry=(date,team,time)=>({date,sortDate:`${date} ${time}`,data:{team_name:team}});
const grouped=groupAgendaByDate([agendaEntry('2026-10-05','Traquinas','09:30'),agendaEntry('2026-10-05','Juniores','15:30'),agendaEntry('2026-10-04','Seniores','15:00'),agendaEntry('2026-10-05','Juvenis','11:00'),agendaEntry('2026-10-05','Iniciados','10:00'),agendaEntry('2026-10-05','Juvenis','10:00')]);
assert.deepEqual(grouped.map(g=>g.date),['2026-10-04','2026-10-05']);
assert.deepEqual(grouped[1].items.map(i=>[i.data.team_name,i.sortDate.slice(-5)]),[['Juniores','15:30'],['Juvenis','10:00'],['Juvenis','11:00'],['Iniciados','10:00'],['Traquinas','09:30']]);
assert.deepEqual(groupAgendaByDate([]),[]);
console.log('Date grouping and senior-to-ABC hierarchy checks passed.');
