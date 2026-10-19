const normalize=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const aliases=[['Sub-13',/\bsub[ -]?13\b|\binfantis\b/],['Iniciados',/\biniciad[oa]s?\b|\bsub[ -]?15\b/],['Juvenis',/\bjuvenis\b|\bjuvenil\b|\bsub[ -]?17\b/],['Juniores',/\bjuniores\b|\bjunior\b|\bsub[ -]?19\b/],['Seniores',/\bseniores\b|\bsenior\b/]];
export function requestedTeams(question,history=[]) {
 for(const text of [question,...history.filter(m=>m.role==='user').toReversed().map(m=>m.text)]) {
  const teams=aliases.filter(([,pattern])=>pattern.test(normalize(text))).map(([team])=>team);
  if(teams.length)return teams;
 }
 return [];
}
const dateLabel=d=>d.split('-').reverse().join('/');
// Names, missing-data states and own goals are rendered from verified rows, never guessed by the model.
export function groundedScorerAnswer({question,history=[],matches,scorers,standings,sources,now,season}) {
 const previous=history.filter(m=>m.role==='user').at(-1)?.text;
 const selection=normalize(question);
 if(previous&&/marcador|goleador|quem.*marcou|autor.*golo/.test(normalize(previous))&&(/^(?:os |dos |de |nos )?(?:sub[ -]?(?:13|15|17|19)|infantis|iniciados|juvenis|juniores|seniores)[.!? ]*$/.test(selection)||/^(?:todos|todos os escaloes|juntar todos)[.!? ]*$/.test(selection)))question=previous+' — '+question;
 const scorerIntent=/quem.*marcou|marcador|autogolo|goleador|autor.*golo/.test(normalize(question));
 const scopeText=[question,...history.filter(m=>m.role==='user').toReversed().map(m=>m.text)].find(t=>/todos|juntar|cinco escaloes|5 escaloes/.test(normalize(t))||aliases.some(([,pattern])=>pattern.test(normalize(t))));
 const allTeams=!!scopeText&&/todos|juntar|cinco escaloes|5 escaloes/.test(normalize(scopeText));
 if(allTeams&&!/todos|juntar|cinco escaloes|5 escaloes/.test(normalize(question)))question+=' — todos os escalões';
 const scope=requestedTeams(question,history);
 if(scorerIntent&&!allTeams&&!scope.length)return {text:'De que escalão queres saber os marcadores: Sub-13, Iniciados, Juvenis, Juniores ou Seniores? Ou queres juntar todos os escalões?',matches:[],schedules:[],sources:[],choices:['Sub-13','Iniciados','Juvenis','Juniores','Seniores','Todos os escalões'],source:'Bô · esclarecer o pedido',consultedAt:now.toISOString()};
 const aggregate=aggregateScorerAnswer({question,history,matches,scorers,sources,now,season});
 if(aggregate)return aggregate;
 const q=normalize(question);
 if(!/quem.*marcou|marcador|autogolo|goleador|autor.*golo/.test(q)||/melhor marcador|goleador|total|epoca|este mes/.test(q))return null;
 const teams=requestedTeams(question,history);
 if(teams.length!==1)return null;
 const team=teams[0];
 let candidates=matches.filter(m=>m.team_name===team&&m.status==='terminado').sort((a,b)=>b.match_date.localeCompare(a.match_date)||String(b.match_time??'').localeCompare(String(a.match_time??'')));
 const date=q.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b/);
 const iso=q.match(/\b\d{4}-\d{2}-\d{2}\b/);
 if(date)candidates=candidates.filter(m=>m.match_date.slice(5)===`${date[2].padStart(2,'0')}-${date[1].padStart(2,'0')}`&&(!date[3]||m.match_date.startsWith(date[3])));
 if(iso)candidates=candidates.filter(m=>m.match_date===iso[0]);
 const against=q.match(/contra (?:o |a |os |as )?(.+?)(?: em | no dia | e |[?.]|$)/)?.[1]?.trim();
 if(against)candidates=candidates.filter(m=>normalize(m.opponent).includes(against));
 const game=candidates[/\banterior\b/.test(q)&&!date&&!iso&&!against?1:0];
 const selectedSources=[];
 const paragraphs=[];
 if(/classifica|posicao|lugar|serie|pontos/.test(q)) {
  const standing=standings.find(s=>s.competition.team_name===team);
  const row=standing?.rows.find(r=>r.is_boavista);
  if(row){
   const tied=standing.rows.filter(r=>r.position===row.position).length>1;
   paragraphs.push(`${team}: ${row.position}.º lugar${tied?' (empatado)':''}, ${row.points} pontos em ${row.played} jogos, ${standing.competition.name}${standing.competition.series?' — '+standing.competition.series:''}. Consulta de ${dateLabel(standing.asOf)}.${standing.roundLabel?' '+standing.roundLabel.replace(/^Consulta de \d{2}\/\d{2}\/\d{4}\.\s*/,''):''}${standing.needsRefresh?' Esta classificação necessita de atualização.':''}`);
   selectedSources.push(...sources.filter(s=>s.id===standing.sourceId));
  }else paragraphs.push(`A classificação de ${team} ainda não está disponível nos dados publicados.`);
 }
 if(!game) paragraphs.push(`Não encontrei um jogo terminado de ${team} que corresponda ao pedido nos dados públicos disponíveis. Indica o adversário ou a data para confirmar.`);
 else {
  const records=scorers.filter(s=>s.match_id===game.id);
  const total=records.reduce((sum,s)=>sum+s.goals,0);
  const own=records.filter(s=>s.kind==='opponent_own_goal').reduce((sum,s)=>sum+s.goals,0);
  const players=records.filter(s=>s.kind==='player');
  const intro=`No jogo de ${team} contra ${game.opponent}, em ${dateLabel(game.match_date)}`;
  if(game.home_score===0)paragraphs.push(`${intro}, o Boavista não marcou (${game.home_score}–${game.away_score}, golos Boavista–adversário). Por isso, não há marcadores do Boavista nesse jogo.`);
  else if(!records.length)paragraphs.push(`${intro}, o Boavista marcou ${game.home_score??'golos por confirmar'}. Os nomes dos marcadores ainda não estão disponíveis; não vou atribuir esse golo a um jogador sem confirmação.`);
  else {
   let text=`${intro}: `;
   text+=players.length?players.map(s=>`${s.public_name} (${s.goals})`).join(', ')+'.':'sem golos atribuídos a jogadores do Boavista.';
   if(own)text+=` Mais ${own} ${own===1?'autogolo do adversário':'autogolos do adversário'} a favor do Boavista.`;
   text+=total===game.home_score?` Estão identificados os ${total} golos do Boavista.`:` A lista é parcial: estão identificados ${total} dos ${game.home_score} golos.`;
   paragraphs.push(text);
  }
  selectedSources.push(...sources.filter(s=>records.some(r=>r.sourceId===s.id)));
  if(!records.length)selectedSources.push({id:'club-match',name:'Jogos publicados pelo clube',url:'https://gdrboavista.pt/resultados'});
 }
 const unique=[...new Map(selectedSources.map(s=>[s.url||s.id,s])).values()].slice(0,4);
 return {text:paragraphs.join('\n\n'),matches:game?[game]:[],schedules:[],sources:unique,choices:[],href:'/resultados',linkLabel:'Consultar jogos no site',source:'Informação publicada pelo clube · dados verificados',consultedAt:now.toISOString()};
}

// Aggregate only confirmed public records. Coverage is never assumed to span a whole season.
export function aggregateScorerAnswer({question,history=[],matches,scorers,sources,now,season}) {
 const q=normalize(question);
 if(!/marcador|goleador|quem.*marcou|autor.*golo/.test(q)||!/epoca|top\s*\d|melhor|lista|total|goleador/.test(q)||/este mes|ultimo jogo|contra |\b\d{1,2}\/\d{1,2}\/\d{4}\b/.test(q))return null;
 const explicit=aliases.filter(([,pattern])=>pattern.test(q)).map(([team])=>team);
 const teams=/todos|juntar|cinco escaloes|5 escaloes/.test(q)?[]:explicit.length?explicit:requestedTeams(question,history);
 const seasonText=[question,...history.filter(m=>m.role==='user').toReversed().map(m=>m.text)].find(t=>/\b(?:20)?\d{2}[/-](?:20)?\d{2}\b/.test(t));
 const token=seasonText?.match(/\b((?:20)?\d{2})[/-]((?:20)?\d{2})\b/);
 const current=season?.match(/^(20\d{2})/);
 const year=token?Number(token[1].length===2?'20'+token[1]:token[1]):current?Number(current[1]):now.getUTCFullYear()-(now.getUTCMonth()<6?1:0);
 const endYear=token?Number(token[2].length===2?'20'+token[2]:token[2]):year+1;
 if(endYear!==year+1)return null;
 const label=`${year}/${String(endYear).slice(-2)}`;
 const games=matches.filter(m=>m.status==='terminado'&&m.match_date>=`${year}-07-01`&&m.match_date<`${endYear}-07-01`&&(!teams.length||teams.includes(m.team_name)));
 const gameMap=new Map(games.map(m=>[m.id,m]));
 const records=scorers.filter(s=>gameMap.has(s.match_id));
 const totals=new Map();
 for(const r of records.filter(r=>r.kind==='player')) {
  const team=gameMap.get(r.match_id).team_name;
  const key=team+'|'+r.public_name;
  const entry=totals.get(key)||{name:r.public_name,team,goals:0};
  entry.goals+=r.goals;totals.set(key,entry);
 }
 const ranked=[...totals.values()].sort((a,b)=>b.goals-a.goals||a.team.localeCompare(b.team,'pt')||a.name.localeCompare(b.name,'pt'));
 const top=q.match(/top\s*(\d+)/);
 const count=Math.min(20,Math.max(1,top?Number(top[1]):/melhor/.test(q)?1:20));
 const cutoff=ranked[count-1]?.goals;
 const selected=ranked.filter((r,i)=>i<count||(cutoff!==undefined&&r.goals===cutoff));
 const scope=teams.length?teams.join(', '):'todos os escalões';
 let text=`Marcadores confirmados — ${scope}, época ${label}.`;
 if(!ranked.length)text+=' Ainda não há nomes de marcadores publicados para este pedido nos registos consultados. Isto não significa que a equipa não tenha marcado.';
 else {
  text+='\n\n'+selected.map(r=>`${ranked.findIndex(x=>x.goals===r.goals)+1}. ${r.name} — ${r.team}: ${r.goals} ${r.goals===1?'golo':'golos'}`).join('\n');
  const covered=new Set(records.map(r=>r.match_id)).size;
  text+=`\n\nLista parcial: estes números somam apenas os marcadores publicados de ${covered} jogos. Não representam o total nem o ranking definitivo da época.`;
  if(selected.length>count)text+=' Incluí os jogadores empatados na última posição apresentada.';
  if(selected.length<ranked.length)text+=' Há mais marcadores registados; podes pedir a lista de um escalão.';
  const own=records.filter(r=>r.kind==='opponent_own_goal').reduce((n,r)=>n+r.goals,0);
  if(own)text+=` Os ${own} autogolos adversários registados não contam para este ranking.`;
 }
 const used=new Set(records.map(r=>r.sourceId));
 return {text,matches:[],schedules:[],sources:[...new Map(sources.filter(s=>used.has(s.id)).map(s=>[s.url||s.id,s])).values()].slice(0,4),choices:[],href:'/resultados',linkLabel:'Consultar jogos no site',source:'Marcadores publicados pelo clube · contagem parcial',consultedAt:now.toISOString()};
}
