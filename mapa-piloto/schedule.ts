export type Game={id:string;date:string;start:string;end:string;home:string;away:string;level:string;type:'Campeonato'|'Particular'|'Treino';field:string;homeRoom:string;awayRoom:string;notes:string;roomStart?:string;roomEnd?:string;_version?:number};
export type DayData={date:string;games:Game[];dates:string[];teams:string[];levels:string[];updatedAt:string|null};
export const fields=['1','2','3','4','5','6','7','8','9','10'];
export const canonicalGame=(g:Game):Game=>g.field==='7 + 8'?{...g,field:'9'}:g;
export const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
export const validDate=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
export const today=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Lisbon'}).format(new Date());
export const dayLabel=(d:string,short=false)=>validDate(d)?new Date(d+'T12:00:00').toLocaleDateString('pt-PT',short?{day:'numeric',month:'short'}:{weekday:'long',day:'numeric',month:'long'}):'';
export const shiftDate=(d:string,n:number)=>{const x=new Date(d+'T12:00:00Z');x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10);};
export const offsetTime=(t:string,n:number)=>{const [h,m]=t.split(':').map(Number);const v=Math.max(0,Math.min(1439,h*60+m+n));return `${String(Math.floor(v/60)).padStart(2,'0')}:${String(v%60).padStart(2,'0')}`;};
export function validate(g:Game){const e:Partial<Record<keyof Game,string>>={};const time=/^([01]\d|2[0-3]):[0-5]\d$/;
 if(!validDate(g.date))e.date='Escolhe uma data válida.';
 if(!g.home.trim())e.home='Indica a equipa da casa.';
 if(!g.level.trim())e.level='Escolhe ou escreve o escalão.';
 if(g.type!=='Treino'&&!g.away.trim())e.away='Indica a equipa visitante.';
 if(!time.test(g.start))e.start='Indica a hora de início.';
 if(!time.test(g.end)||g.end<=g.start)e.end='O fim deve ser depois do início.';
 if(!fields.includes(g.field))e.field='Escolhe o campo.';
 if(g.roomStart||g.roomEnd){if(!time.test(g.roomStart||'')||g.roomStart!>g.start)e.roomStart='A entrada deve ser até ao início do jogo.';if(!time.test(g.roomEnd||'')||g.roomEnd!<g.end||g.roomEnd!<=g.roomStart!)e.roomEnd='A saída deve ser depois do jogo e da entrada.';}
 return e;}
const zones:Record<string,string[]>={'1':['1'],'2':['2'],'3':['3'],'4':['4'],'5':['5'],'6':['6'],'7':['5','6'],'8':['3','4'],'9':['3','4','5','6'],'10':['1','2'],'7 + 8':['3','4','5','6']};
const overlaps=(a:string,b:string,c:string,d:string)=>a<d&&c<b;
export function conflicts(g:Game,others:Game[]){const warnings:string[]=[];for(const other of others){if(other.id===g.id||other.date!==g.date)continue;
 if(overlaps(g.start,g.end,other.start,other.end)&&(zones[g.field]||[]).some(x=>(zones[other.field]||[]).includes(x)))warnings.push(`Campo ${g.field}: sobreposição com ${other.level} (${other.start}–${other.end}, campo ${other.field}).`);
 if(g.roomStart&&g.roomEnd&&other.roomStart&&other.roomEnd&&overlaps(g.roomStart,g.roomEnd,other.roomStart,other.roomEnd)){const shared=[...new Set([g.homeRoom,g.awayRoom].filter(Boolean))].filter(r=>[other.homeRoom,other.awayRoom].includes(r));for(const r of shared)warnings.push(`Balneário ${r}: utilização sobreposta com ${other.level} (${other.roomStart}–${other.roomEnd}).`);}}
 if(g.type!=='Treino'&&g.homeRoom&&g.homeRoom===g.awayRoom)warnings.push('As duas equipas estão atribuídas ao mesmo balneário. Confirma se a partilha é intencional.');return [...new Set(warnings)];}
export const missingRooms=(g:Game)=>!g.homeRoom||(g.type!=='Treino'&&!g.awayRoom);
export function consultationUrl(date:string,game?:Game,query?:string){const u=new URL('/mapa-jogos',location.origin);u.searchParams.set('data',date);if(game)u.searchParams.set('jogo',game.id);else if(query?.trim())u.searchParams.set('equipa',query.trim());return u.toString();}
export function newGame(date:string):Game{return{id:crypto.randomUUID(),date,start:'09:00',end:'10:00',home:'GDRB',away:'',level:'',type:'Particular',field:'7',homeRoom:'',awayRoom:'',roomStart:'08:30',roomEnd:'10:30',notes:'',_version:-1};}
