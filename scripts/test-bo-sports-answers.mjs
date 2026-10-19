import assert from 'node:assert/strict';
import {groundedScorerAnswer,requestedTeams} from '../server/boSportsAnswers.js';
const matches=[
 {id:'ini',team_name:'Iniciados',opponent:'CCMI',match_date:'2026-10-18',status:'terminado',home_score:6,away_score:3},
 {id:'old',team_name:'Iniciados',opponent:'Marrazes',match_date:'2026-10-11',status:'terminado',home_score:5,away_score:2},
 {id:'sub',team_name:'Sub-13',opponent:'Bolatangente',match_date:'2026-10-17',status:'terminado',home_score:1,away_score:4},
 {id:'jun',team_name:'Juniores',opponent:'Vieirense',match_date:'2026-10-17',status:'terminado',home_score:2,away_score:3},
 {id:'sen',team_name:'Seniores',opponent:'União',match_date:'2026-10-18',status:'terminado',home_score:0,away_score:4},
];
const scorers=[
 ...['Ary','Guilherme Alberto','Gustavo','Santiago','Tiago'].map(public_name=>({match_id:'ini',public_name,goals:1,kind:'player',sourceId:'M'})),
 {match_id:'ini',public_name:'Autogolo do adversário',goals:1,kind:'opponent_own_goal',sourceId:'M'},
 {match_id:'old',public_name:'Tiago',goals:3,kind:'player',sourceId:'O'},
 {match_id:'jun',public_name:'Guilherme Silva',goals:1,kind:'player',sourceId:'J'},
 {match_id:'jun',public_name:'Tomas Coelho',goals:1,kind:'player',sourceId:'J'},
];
const standings=[{competition:{team_name:'Sub-13',name:'Infantis F9',series:'C'},asOf:'2026-10-19',roundLabel:'O resultado de 17/10 ainda não está refletido.',sourceId:'S',rows:[{is_boavista:true,position:3,points:0,played:0},{position:3}]}];
const sources=[{id:'M',url:'https://example.org/match'},{id:'O',url:'https://example.org/old'},{id:'J',url:'https://example.org/junior'},{id:'S',url:'https://example.org/standings'}];
const answer=(question,history=[])=>groundedScorerAnswer({question,history,matches,scorers,standings,sources,now:new Date('2026-10-19T12:00:00Z')});
let a=answer('Quem marcou no último jogo dos Iniciados?');
assert.match(a.text,/1 autogolo/);assert.match(a.text,/identificados os 6 golos/);assert(!a.text.includes('parcial'));assert.equal(a.sources.length,1);
a=answer('Qual a classificação dos Sub-13 e quem marcou contra o Bolatangente em 17/10?');
assert.match(a.text,/ainda não estão disponíveis/);assert.match(a.text,/ainda não está refletido/);assert.match(a.text,/empatado/);assert(!a.text.includes('Guilherme'));assert.equal(a.matches[0].id,'sub');
a=answer('Quem marcou no último jogo dos Seniores?');assert.match(a.text,/não marcou/);assert(!a.text.includes('ainda não estão disponíveis'));
a=answer('Quem marcou nos Juniores contra o Vieirense?');assert.match(a.text,/Guilherme Silva \(1\)/);assert.match(a.text,/Tomas Coelho \(1\)/);assert(!a.text.includes('Ary'));
a=answer('Quem marcou nos Iniciados em 11/10?');assert.match(a.text,/Tiago \(3\)/);assert.match(a.text,/parcial/);assert.equal(a.matches[0].id,'old');
a=answer('Quem marcou nos Iniciados contra o Clube inexistente?');assert.match(a.text,/Não encontrei/);assert.equal(a.matches.length,0);
a=answer('E quem marcou?', [{role:'user',text:'Qual o último jogo dos Sub-13?'}]);assert.match(a.text,/ainda não estão disponíveis/);
assert.deepEqual(requestedTeams('E os Juniores?',[{role:'user',text:'Seniores'}]),['Juniores']);
a=answer('Quem é o melhor marcador dos Iniciados nesta época?');assert.match(a.text,/Tiago — Iniciados: 4 golos/);assert.match(a.text,/Lista parcial/);
a=answer('Quais são os marcadores do boavista na época 26/27?');assert.match(a.text,/De que escalão/);assert(!a.text.includes('Tiago'));
a=answer('Todos os escalões',[{role:'user',text:'Quais são os marcadores do boavista na época 26/27?'}]);assert.match(a.text,/Tiago — Iniciados: 4 golos/);assert.match(a.text,/Guilherme Silva — Juniores: 1 golo/);assert(!a.text.includes('Autogolo do adversário —'));
a=answer('Me de uma lista dos top 3 marcadores desta epoca',[{role:'user',text:'Marcadores do Boavista na época 26/27?'},{role:'assistant',text:'Resultados dos Seniores, Juniores e Iniciados'}]);assert.match(a.text,/De que escalão/);
a=answer('Todos os escalões',[{role:'user',text:'Me de uma lista dos top 3 marcadores desta epoca'}]);assert.match(a.text,/Tiago — Iniciados: 4 golos/);assert.match(a.text,/empatados/);assert.match(a.text,/ranking definitivo/);
a=answer('Lista dos marcadores dos Juniores nesta época');assert(!a.text.includes('Tiago'));assert.match(a.text,/Tomas Coelho/);
a=answer('Lista de marcadores dos Iniciados na época 25/26');assert.match(a.text,/Ainda não há nomes/);assert(!a.text.includes('Tiago'));
a=answer('Marcadores de todos os escalões nesta época',[{role:'user',text:'Iniciados'}]);assert.match(a.text,/Juniores/);
assert.deepEqual(requestedTeams('E quem marcou?',[{role:'user',text:'Sub-13'},{role:'assistant',text:'Juniores'}]),['Sub-13']);
console.log('PASS: scorer names bound to exact match; missing Sub-13 never borrows junior names; own goals count toward completeness; zero goals; dated match; follow-up; stale/tied standings.');

a=answer('Iniciados',[{role:'user',text:'Me de uma lista dos top 3 marcadores desta epoca'},{role:'assistant',text:'De que escalão?'}]);assert.match(a.text,/Tiago — Iniciados: 4 golos/);assert(!a.text.includes('Juniores'));

a=answer('E dos Iniciados?',[{role:'user',text:'Quero o top 3 de marcadores desta época'},{role:'assistant',text:'De que escalão?'},{role:'user',text:'Seniores'},{role:'assistant',text:'Sem nomes nesta amostra'}]);assert.match(a.text,/Tiago — Iniciados: 4 golos/);assert(!a.text.includes('Juniores'));
a=answer('Marcadores dos Iniciados nesta época',[{role:'user',text:'Época 25/26'}]);assert.match(a.text,/2026\/27/);
a=answer('Marcadores dos Iniciados na época passada');assert.match(a.text,/2025\/26/);assert(!a.text.includes('Tiago'));
a=answer('Quem marcou?',[{role:'user',text:'Como ficou o jogo dos Iniciados em 11/10?'}]);assert.equal(a,null);
a=answer('Quero saber os marcadores');assert.equal(a.source,undefined);
console.log('PASS: scope switches retain ranking intent; current/past season; dated follow-up does not default to last game; clarification has no false source.');

a=answer('Quem marcou mais golos nos Iniciados?');assert.match(a.text,/Tiago — Iniciados: 4 golos/);assert.match(a.text,/Lista parcial/);
