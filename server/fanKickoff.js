// Match times are entered in mainland Portugal time, independent of the viewer's timezone.
export function fanKickoff(date,time){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date||'')||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time||''))return null;
 const wall=Date.parse(`${date}T${time}:00Z`);if(!Number.isFinite(wall))return null;
 const format=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Lisbon',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 // Lisbon's modern winter/summer offsets; choose the earlier occurrence in the autumn overlap.
 for(const offset of [60,0]){const candidate=wall-offset*60000;if(format.format(candidate)===`${date} ${time}`)return new Date(candidate).toISOString();}
 return null;
}
export function compareFanMatches(a,b){
 const rank=s=>s==='live'||s==='interval'?0:s==='draft'?1:2;
 return rank(a.status)-rank(b.status)||(a.status==='draft'?(a.kickoffAt||'9999').localeCompare(b.kickoffAt||'9999'):b.date.localeCompare(a.date));
}
