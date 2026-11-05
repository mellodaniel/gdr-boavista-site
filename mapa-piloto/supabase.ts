import type {DayData,Game} from './schedule';
const url=import.meta.env.VITE_SUPABASE_URL;
const key=import.meta.env.VITE_SUPABASE_ANON_KEY;
export class MapError extends Error {status:number;constructor(message:string,status:number){super(message);this.status=status;}}
export async function rpc<T>(name:string,body:unknown):Promise<T>{let response:Response;try{response=await fetch(`${url}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(15000)});}catch{throw new MapError('Sem ligação ao mapa. Verifica a internet e tenta novamente.',503);}
 const data=await response.json();if(!response.ok)throw new MapError(response.status===409?(data.message||'Esta atividade foi alterada noutro dispositivo. Atualiza o mapa antes de continuar.'):response.status===403?'O link de gestão não é válido.':data.message||'Não foi possível guardar. Tenta novamente.',response.status);return data;}
export const getDay=(date?:string)=>rpc<DayData>('gdrb_facility_map_day',{p_date:date||null});
export const checkAccess=(token:string)=>rpc<boolean>('gdrb_facility_map_access',{p_key:token});
export const saveGame=(token:string,game:Game)=>rpc<Game>('gdrb_facility_game_save',{p_key:token,p_game:game,p_version:game._version??0});
export const deleteGame=(token:string,game:Game)=>rpc<boolean>('gdrb_facility_game_delete',{p_key:token,p_id:game.id,p_version:game._version??0});
export type Deleted={game:Game;deletedAt:string};
export const getDeleted=(token:string)=>rpc<Deleted[]>('gdrb_facility_map_deleted',{p_key:token});

export const copyDayTo=(token:string,source:string,target:string)=>rpc<number>('gdrb_facility_map_copy_day',{p_key:token,p_source:source,p_target:target});
