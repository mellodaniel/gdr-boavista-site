// Only published tournament parents and safe sporting fields. No contacts, players or internal notes.
const tables={
 tournament_teams:'id,tournament_id,name,club',
 tournament_groups:'id,tournament_id,name',
 tournament_group_teams:'id,tournament_id,group_id,team_id',
 tournament_fields:'id,tournament_id,name,location,is_active',
 tournament_days:'id,tournament_id,day_date,start_time,end_time,break_start,break_end,lunch_start,lunch_end',
 tournament_rules:'id,tournament_id,format_type,group_count,teams_per_group,qualifiers_per_group,match_parts,minutes_per_part,halftime_minutes,minutes_between_matches,min_rest_minutes,win_points,draw_points,loss_points,tiebreakers',
 tournament_matches:'id,tournament_id,group_id,field_id,team_a_id,team_b_id,phase,match_number,match_date,match_time,status,score_a,score_b,team_a_placeholder,team_b_placeholder',
};
export async function tournamentDocuments({read}){
 const parents=await read('tournaments?select=id,name,slug,age_group,is_public&is_public=eq.true&order=id.asc&limit=50');
 if(!Array.isArray(parents))throw Error('CHAT_SOURCE');
 const visible=parents.filter(p=>p.is_public===true&&/^[0-9a-f-]{36}$/i.test(p.id));
 if(!visible.length)return [];
 const ids=visible.map(p=>p.id).join(',');
 const parts=await Promise.all(Object.entries(tables).map(async([table,fields])=>{
  try{
   const rows=await read(`${table}?select=${fields}&tournament_id=in.(${ids})&order=id.asc&limit=300`);
   if(!Array.isArray(rows))throw Error('CHAT_SOURCE');
   return {table,rows,fields,available:true,truncated:rows.length===300};
  }catch{return {table,rows:[],fields,available:false,truncated:false};}
 }));
 return visible.map(parent=>{
  const data={tournament:parent.name,coverage:'Dados de torneio publicado. Cada coleção assinala disponibilidade e possível corte.',collections:parts.map(({table,rows,fields,available,truncated})=>({table,available,mayBeTruncated:truncated,rows:rows.filter(r=>r.tournament_id===parent.id&&(table!=='tournament_fields'||r.is_active===true)).map(r=>{
   const safe=Object.fromEntries(fields.split(',').map(k=>[k,r[k]??null]));
   if(table==='tournament_matches'&&/ABCs|Petizes|Traquinas|Benjamins|Sub-12|desenvolvimento/i.test(parent.age_group||'')){delete safe.score_a;delete safe.score_b;}
   return safe;
  })}))};
  return {title:`Calendário, equipas, grupos e regras — ${parent.name}`,category:'Torneios calendário jogos resultados grupos regras',path:/^[a-z0-9-]+$/i.test(parent.slug||'')?`/torneios/${parent.slug}`:'/resultados',text:JSON.stringify(data)};
 });
}
