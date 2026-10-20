import {publicCollections} from './boPublicSources.js';
const normalize=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
// Complete factual lists do not use the 12-document search window or an LLM.
export async function directoryAnswer({read,question,history=[],now=new Date()}) {
 let q=normalize(question);
 if(/^(?:e )?(?:os |dos )?(seniores|juniores)[?.! ]*$/.test(q)){
  const previous=history.filter(m=>m.role==='user').toReversed().find(m=>!/^(?:e )?(?:os |dos )?(seniores|juniores)[?.! ]*$/.test(normalize(m.text)));
  if(previous)q=normalize(previous.text).replace(/seniores|juniores|senior|junior/g,'')+' '+q;
 }
 if(/marcou|marcaram|golos|marcadores|classifica|resultado|desconto|beneficio|comprar|preco/.test(q))return null;
 const roster=/plantel|jogadores|equipa tecnica/.test(q)&&(/lista|complet|todos|plantel|quais|quem/.test(q));
 const partners=/parceiros|patrocinadores/.test(q)&&/lista|todos|quais|quem/.test(q);
 const teams=/escaloes|equipas/.test(q)&&/lista|quais|todos/.test(q)&&!/jogo|classifica|marcador|golo/.test(q);
 if(!roster&&!partners&&!teams)return null;
 let team;
 if(roster){
  const scope=[q,...history.filter(m=>m.role==='user').toReversed().map(m=>normalize(m.text))].find(t=>/seniores|senior|juniores|junior|juvenis|iniciados|sub.?13/.test(t))||'';
  team=/seniores|senior/.test(scope)?'senior':/juniores|junior/.test(scope)?'junior':null;
  if(!scope)return {text:'De que escalão queres consultar o plantel?',choices:['Seniores','Juniores'],sources:[]};
  if(!team)return null;
 }
 const spec=publicCollections.find(s=>s.table===(roster?'gdrb_roster_players':partners?'gdrb_sponsors':'gdrb_teams'));
 const fields=roster?'id,name,team_key,shirt_number,position,roster_group,is_active':'id,name,is_active';
 const records=new Map();let truncated=false;
 for(let offset=0;offset<1000;offset+=200){
  const rows=await read(`${spec.table}?select=${fields}&${roster?`is_active=eq.true&team_key=eq.${team}`:spec.filter}&order=id.asc&limit=200&offset=${offset}`);
  if(!Array.isArray(rows))throw Error('CHAT_SOURCE');
  for(const r of rows)if(spec.valid(r)&&(!roster||r.team_key===team)&&typeof r.name==='string')records.set(r.id,r);
  if(rows.length<200)break;
  if(offset===800)truncated=true;
 }
 const all=[...records.values()].sort((a,b)=>a.name.localeCompare(b.name,'pt'));
 const path=roster?spec.path({team_key:team}):spec.route;
 let text;
 if(roster){
  const players=all.filter(r=>r.roster_group!=='Equipa técnica'),staff=all.filter(r=>r.roster_group==='Equipa técnica');
  const line=r=>`${r.name}${r.position?' — '+r.position:''}${r.shirt_number!=null?' · n.º '+r.shirt_number:''}`;
  const staffOnly=/equipa tecnica/.test(q)&&!/plantel|jogadores/.test(q);
  text=`${staffOnly?'Equipa técnica':'Plantel'} dos ${team==='senior'?'Seniores':'Juniores'} — registos ativos do clube.`;
  if(!staffOnly)text+=`\n\nJogadores (${players.length}):\n`+(players.length?players.map(line).join('\n'):'Sem jogadores registados.');
  if(staff.length||staffOnly)text+=`\n\nEquipa técnica (${staff.length}):\n`+(staff.length?staff.map(line).join('\n'):'Sem elementos registados.');
 }else text=`${partners?'Parceiros e patrocinadores':'Equipas e escalões'} ativos (${all.length}):\n\n`+all.map(r=>r.name).join('\n');
 text+=truncated?'\n\nA consulta atingiu o limite de registos; esta lista pode estar incompleta.':'\n\nLista de todos os registos ativos disponíveis nesta consulta.';
 return {text,choices:[],sources:[{id:'D1',name:roster?'Plantel do clube':partners?'Parceiros do clube':'Equipas do clube',url:'https://gdrboavista.pt'+path}],href:path,linkLabel:'Consultar no site',source:'Base de dados do clube · registos públicos ativos',consultedAt:now.toISOString()};
}
