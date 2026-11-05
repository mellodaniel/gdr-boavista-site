const url=import.meta.env.VITE_SUPABASE_URL;
const key=import.meta.env.VITE_SUPABASE_ANON_KEY;
const messages:Record<number,string>={403:'Este link não permite editar o mapa.',409:'O mapa foi alterado noutro dispositivo. Atualiza a página antes de editar.',400:'Verifica os campos obrigatórios e os horários.'};
export async function mapFetch(path:string,options:RequestInit={}){
 const token=new Headers(options.headers).get('Authorization')?.replace(/^Bearer /,'')||'';
 const access=path==='/api/access';const write=options.method==='PUT';
 const input=write?JSON.parse(String(options.body)):null;
 const name=access?'gdrb_facility_map_access':write?'gdrb_facility_map_write':'gdrb_facility_map_read';
 const body=access?{p_key:token}:write?{p_key:token,p_revision:input.revision,p_games:input.games}:{};
 try{
 const r=await fetch(`${url}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(15000)});
 if(!r.ok)return Response.json({error:messages[r.status]||'Não foi possível aceder ao mapa. Tenta novamente.'},{status:r.status});
 const data=await r.json();if(access)return Response.json({allowed:data===true});
 if(!data||!Array.isArray(data.games))throw Error('Mapa indisponível');
 return Response.json(data);
 }catch{return Response.json({error:'Não foi possível ligar ao mapa. Verifica a ligação e tenta novamente.'},{status:503});}
}
