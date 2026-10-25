export const eventLabels = { goal:'Golo', yellow:'Cartão amarelo', second_yellow:'Segundo amarelo', red:'Cartão vermelho', substitution:'Substituição', note:'Observação' };
export function orderedEvents(sheet) {
  return [...sheet.events].sort((a,b)=>a.period-b.period || a.minute-b.minute || a.added-b.added || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}
export function eventMinute(e) { return `${e.minute}${e.added ? '+'+e.added : ''}′`; }
export function clockAt(sheet, now=Date.now()) {
  const elapsed=Math.max(0,sheet.clock.elapsedMs+(sheet.clock.startedAt===null?0:Math.max(0,now-sheet.clock.startedAt)));
  const raw=Math.floor(elapsed/60000), duration=sheet.rules.periodMinutes;
  return { period:sheet.clock.period, minute:(sheet.clock.period-1)*duration+Math.min(raw,duration), added:Math.max(0,raw-duration), seconds:Math.floor(elapsed/1000)%60, elapsedMs:elapsed };
}
export function score(sheet) {
  let club=0, opponent=0;
  for(const e of sheet.events) if(e.kind==='goal') {
    const toClub=(e.side==='club')!==e.ownGoal;
    if(toClub)club++;else opponent++;
  }
  return { club,opponent };
}
export function lineup(sheet) {
  const onField=new Set(sheet.squad.filter(p=>p.starter).map(p=>p.id)), dismissed=new Set(), used=new Set(onField);
  for(const e of orderedEvents(sheet)) if(e.side==='club') {
    if(e.kind==='substitution'){ onField.delete(e.player);onField.add(e.incoming);used.add(e.incoming); }
    if(e.kind==='red'||e.kind==='second_yellow'){onField.delete(e.player);dismissed.add(e.player);}
  }
  return {onField,dismissed,used};
}
export function eventDescription(sheet,e) {
  const name=id=>sheet.squad.find(p=>p.id===id)?.name||'Por identificar';
  if(e.kind==='note')return e.note;
  if(e.kind==='substitution')return `Sai ${name(e.player)} / entra ${name(e.incoming)}`;
  const actor=e.side==='club'?name(e.player):'Adversário';
  return [actor,e.ownGoal?'Autogolo':'',e.note].filter(Boolean).join(' · ');
}
export function validateSheet(sheet) {
  if(!sheet||sheet.schema!==1||!sheet.id||!sheet.ageGroup||!Array.isArray(sheet.squad)||!Array.isArray(sheet.events)||!sheet.rules||!sheet.clock)return 'Ficha inválida.';
  if(!['draft','live','interval','finished'].includes(sheet.status)||typeof sheet.opponent!=='string'||typeof sheet.recorder!=='string'||typeof sheet.notes!=='string')return 'Ficha inválida.';
  if(!sheet.opponent.trim()||!sheet.date||!sheet.recorder.trim())return 'Preenche o adversário, a data e o responsável.';
  if(sheet.opponent.length>120||sheet.recorder.length>100||sheet.notes.length>4000)return 'Revê o tamanho dos textos da ficha.';
  if(![5,7,9,11].includes(sheet.rules.fieldSize)||!Number.isInteger(sheet.rules.periodMinutes)||sheet.rules.periodMinutes<1||sheet.rules.periodMinutes>60||!Number.isInteger(sheet.rules.periods)||sheet.rules.periods<1||sheet.rules.periods>6||typeof sheet.rules.recordGoals!=='boolean'||typeof sheet.rules.reentry!=='boolean')return 'Revê o formato e a duração do jogo.';
  if(!Number.isInteger(sheet.clock.period)||sheet.clock.period<1||sheet.clock.period>sheet.rules.periods||!Number.isFinite(sheet.clock.elapsedMs)||sheet.clock.elapsedMs<0||(sheet.clock.startedAt!==null&&(!Number.isFinite(sheet.clock.startedAt)||sheet.clock.startedAt<0)))return 'Revê o cronómetro.';
  if(sheet.squad.length>50||sheet.events.length>2000)return 'A ficha excede o número de registos permitido.';
  if(new Set(sheet.squad.map(p=>p.id)).size!==sheet.squad.length)return 'Há jogadores repetidos na convocatória.';
  if(new Set(sheet.events.map(e=>e.id)).size!==sheet.events.length)return 'Há eventos repetidos.';
  if(sheet.squad.filter(p=>p.starter).length>sheet.rules.fieldSize)return 'O número de titulares ultrapassa o formato escolhido.';
  if(sheet.squad.filter(p=>p.captain).length>1)return 'Seleciona apenas um capitão.';
  const numbers=sheet.squad.map(p=>p.shirt_number).filter(n=>n!==null);
  if(numbers.some(n=>!Number.isInteger(n)||n<1||n>99)||new Set(numbers).size!==numbers.length)return 'Os números das camisolas devem ser únicos, entre 1 e 99.';
  if(sheet.status!=='draft'&&!sheet.squad.some(p=>p.starter))return 'Seleciona os jogadores e pelo menos um titular.';
  const onField=new Set(sheet.squad.filter(p=>p.starter).map(p=>p.id)), dismissed=new Set(), used=new Set(onField), yellows=new Map();
  for(const e of orderedEvents(sheet)) {
    if(typeof e.note!=='string'||typeof e.ownGoal!=='boolean')return 'Evento inválido.';
    if(!(e.kind in eventLabels)||!['club','opponent'].includes(e.side)||!Number.isInteger(e.period)||e.period<1||e.period>sheet.rules.periods||!Number.isInteger(e.minute)||e.minute<0||e.minute>360||!Number.isInteger(e.added)||e.added<0||e.added>60)return 'Revê o período e o minuto dos eventos.';
    if(!sheet.rules.recordGoals&&e.kind==='goal')return 'Este escalão está configurado sem registo de golos.';
    if(e.note.length>1500)return 'A observação é demasiado longa.';
    if(e.kind==='note'&&!e.note.trim())return 'Escreve a observação.';
    if(e.player&&e.side==='club'&&!sheet.squad.some(p=>p.id===e.player))return 'O jogador não pertence à convocatória.';
    if(e.side==='club') {
      if(['yellow','second_yellow','red'].includes(e.kind)&&!e.player)return 'Seleciona o jogador que recebeu o cartão.';
      if(e.kind==='substitution') {
        if(!onField.has(e.player)||onField.has(e.incoming)||dismissed.has(e.incoming)||!sheet.squad.some(p=>p.id===e.incoming)||(!sheet.rules.reentry&&used.has(e.incoming)))return 'Substituição incompatível com os jogadores em campo. Revê também os eventos seguintes.';
        onField.delete(e.player);onField.add(e.incoming);used.add(e.incoming);
      }
      if(e.kind==='yellow') {
        if((yellows.get(e.player)||0)>0)return 'Este jogador já tem amarelo. Usa segundo amarelo.';
        yellows.set(e.player,1);
      }
      if(e.kind==='second_yellow'&&!yellows.has(e.player))return 'Regista primeiro o primeiro cartão amarelo.';
      if(e.kind==='red'||e.kind==='second_yellow') {
        if(dismissed.has(e.player))return 'O jogador já está expulso.';
        dismissed.add(e.player);onField.delete(e.player);
      }
    }
  }
  if(sheet.status==='finished'&&!sheet.rules.recordGoals&&!sheet.outcome)return 'Indica vitória ou derrota antes de finalizar.';
  return null;
}
export function newSheet(team, recorder, now=new Date()) {
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Lisbon',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const get=t=>parts.find(p=>p.type===t).value; const year=Number(get('year')), month=Number(get('month')), start=month>=7?year:year-1;
  return {schema:1,id:crypto.randomUUID(),ageGroup:team.age_group,season:`${start}/${start+1}`,calendarId:null,opponent:'',date:`${get('year')}-${get('month')}-${get('day')}`,time:'',venue:'',competition:'',home:true,recorder,notes:'',status:'draft',outcome:'',rules:{fieldSize:team.field_size,periodMinutes:team.period_minutes,periods:team.periods,reentry:team.reentry,recordGoals:team.record_goals},clock:{period:1,elapsedMs:0,startedAt:null},squad:[],events:[]};
}

// Presentation follows home/away order; stored events remain club/opponent based.
export function matchPresentation(sheet, clubName='GDR Boavista') {
  const goals=score(sheet);
  const club={name:clubName,goals:goals.club};
  const opponent={name:sheet.opponent||'Adversário',goals:goals.opponent};
  const [first,second]=sheet.home?[club,opponent]:[opponent,club];
  return {first,second,title:`${first.name} × ${second.name}`,result:`${first.goals} – ${second.goals}`};
}
