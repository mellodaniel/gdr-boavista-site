import assert from 'node:assert/strict';
import { AGE_GROUPS, normalizeAgeGroup, isOutcomeOnly, getMatchOutcome, outcomeLabel, hasMatchResult } from '../src/lib/ageGroups.ts';
import { selectRecentResults } from '../src/lib/homeAgenda.ts';
import { calculateTournamentStandings } from '../src/lib/tournamentStandings.ts';
assert.equal(AGE_GROUPS.length,12);
assert.equal(new Set(AGE_GROUPS).size,12);
for (const team_name of AGE_GROUPS) {
  const youth = AGE_GROUPS.indexOf(team_name)<7;
  assert.equal(isOutcomeOnly(team_name),youth);
  const row={id:'m',team_name,match_date:'2026-10-03',match_time:'09:30',status:'terminado',is_visible:true,home_score:null,away_score:null,result_outcome:'loss'};
  assert.equal(hasMatchResult(row),youth);
  assert.equal(selectRecentResults([row],'2026-10-05').length,youth ? 1 : 0);
  assert.equal(hasMatchResult({...row,result_outcome:null,home_score:0,away_score:0}),!youth);
}
assert.equal(normalizeAgeGroup('ABc'),'ABCs');
assert.equal(normalizeAgeGroup('sub12'),'Sub-12');
assert.equal(normalizeAgeGroup('Séniores'),'Seniores');
assert.equal(normalizeAgeGroup('Benjamins'),'Benjamins B');
assert.equal(normalizeAgeGroup('Infantis'),'Sub-13');
assert.equal(normalizeAgeGroup('Traquinas'),'Traquinas');
assert.equal(isOutcomeOnly('Infantis'),false);
assert.equal(isOutcomeOnly('Petizes / ABC'),true);
for (const venue_type of ['casa','fora','neutro']) {
  assert.equal(outcomeLabel({venue_type,home_score:null,away_score:null,result_outcome:'win'}),'Vitória');
  assert.equal(outcomeLabel({venue_type,home_score:null,away_score:null,result_outcome:'loss'}),'Derrota');
  assert.equal(getMatchOutcome({venue_type,home_score:1,away_score:7}), 'loss');
}
assert.equal(outcomeLabel({home_score:0,away_score:0}), 'Por confirmar');
const teams=[{id:'a',name:'A'},{id:'b',name:'B'}];
const groups=[{id:'g',name:'Grupo A',sort_order:0}];
const groupTeams=teams.map((t,i)=>({id:String(i),group_id:'g',team_id:t.id,sort_order:i}));
const matches=[{id:'m',group_id:'g',phase:'group',status:'finished',team_a_id:'a',team_b_id:'b',score_a:null,score_b:null,result_winner:'b'}];
// Outcome-only standings must award a win/loss without inventing goals.
const standings=calculateTournamentStandings({teams,groups,groupTeams,matches,rule:null});
const rows=standings.groups[0].rows;
assert.equal(rows.find(r=>r.team.id==='b').wins,1);
assert.equal(rows.find(r=>r.team.id==='a').losses,1);
assert.ok(rows.every(r=>r.goals_for===0 && r.goals_against===0 && r.draws===0));
console.log('12 age groups, aliases, outcome/score boundary, away perspective, recent results and tournament standings passed.');
