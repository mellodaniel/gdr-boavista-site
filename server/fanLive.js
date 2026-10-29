import {opponentBadge} from '../src/features/match-sheet/badges.js';
import {fanKickoff,compareFanMatches} from './fanKickoff.js';
import { createHmac,timingSafeEqual } from 'node:crypto';
import { sharedSheetAccess,serviceHeaders } from './matchSheetAccess.js';
import { orderedEvents,clockAt,score,MATCH_SHEET_CLUB_NAME } from '../src/features/match-sheet/model.js';
const publicKinds=new Set(['goal','yellow','second_yellow','red','substitution']);
export function fanLiveToken(env) {
  if(!/^[A-Za-z0-9_-]{43,128}$/.test(env.MATCH_SHEET_LINK_KEY||''))throw Error('CONFIG');
  return createHmac('sha256',env.MATCH_SHEET_LINK_KEY).update('gdrb:fan-live:read-only:v1').digest('base64url');
}
export function publicMatch(row,now=Date.now()) {
  const s=row.document;
  if(row.deleted_at||row.archived_at||s?.fanLiveEnabled!==true||!['draft','live','interval','finished'].includes(s.status))return null;
  if(s.status==='draft'&&(!s.opponent?.trim()||!s.date))return null;
  // Explicit allowlist. Never spread a document, player or event into a public response.
  const player=id=>{const p=s.squad.find(p=>p.id===id);return p?{name:p.name,number:p.shirt_number}:null;};
  const events=(s.status==='draft'?[]:orderedEvents(s)).filter(e=>publicKinds.has(e.kind)).map(e=>({
    id:e.id,kind:e.kind,side:e.side,period:e.period,minute:e.minute,added:e.added,
    player:e.side==='club'?player(e.player):null,incoming:e.kind==='substitution'&&e.side==='club'?player(e.incoming):null,
    ownGoal:e.kind==='goal'&&e.ownGoal===true,
  }));
  const tally=score(s),clock=clockAt(s,now);
  return {id:s.id,ageGroup:s.ageGroup,season:s.season,date:s.date,time:s.time,venue:s.venue,competition:s.competition,
    kickoffAt:fanKickoff(s.date,s.time),home:s.home,club:MATCH_SHEET_CLUB_NAME,opponent:s.opponent,opponentBadgeUrl:opponentBadge(s.opponent,s.opponentBadgeUrl),status:s.status,
    score:s.status!=='draft'?tally:null,outcome:null,
    clock:{period:clock.period,minute:clock.minute,added:clock.added,running:s.status==='live'&&s.clock.startedAt!==null},
    updatedAt:row.updated_at,events};
}
export function createFanLiveHandler({env=process.env,fetcher=fetch,now=Date.now}={}) {
 return async(req,res)=>{
  res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Content-Type-Options','nosniff');
  const fail=(status,error)=>res.status(status).json({error});
  if(req.method!=='POST'){res.setHeader('Allow','POST');return fail(405,'Método não permitido.');}
  try{
    let input=req.body;
    if(typeof input==='string'){if(input.length>1000)return fail(400,'Pedido inválido.');input=JSON.parse(input);}
    if(!input||JSON.stringify(input).length>1000)return fail(400,'Pedido inválido.');
    if(input.action==='link'){
      if(!sharedSheetAccess(req,env))return fail(401,'Acesso reservado à equipa.');
      return res.json({token:fanLiveToken(env)});
    }
    if(input.action!=='read')return fail(400,'Pedido inválido.');
    const supplied=req.headers['x-fan-key'],expected=fanLiveToken(env);
    if(typeof supplied!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(supplied)||!timingSafeEqual(Buffer.from(supplied),Buffer.from(expected)))return fail(401,'Abre o link completo de acompanhamento partilhado pelo clube.');
    const base=(env.SUPABASE_URL||env.VITE_SUPABASE_URL||'').replace(/\/$/,'');if(!base)return fail(503,'Relato temporariamente indisponível.');
    const query=new URLSearchParams({select:'document,updated_at,archived_at,deleted_at',deleted_at:'is.null',archived_at:'is.null','document->>fanLiveEnabled':'eq.true','document->>status':'in.(draft,live,interval,finished)',order:'updated_at.desc',limit:'100'});
    const response=await fetcher(`${base}/rest/v1/gdrb_match_sheets?${query}`,{headers:serviceHeaders(env),signal:AbortSignal.timeout(10000)});
    if(!response.ok)return fail(503,'Não foi possível atualizar o relato. Vamos tentar novamente.');
    const rows=await response.json();if(!Array.isArray(rows))return fail(503,'Relato temporariamente indisponível.');
    const at=now();return res.json({checkedAt:new Date(at).toISOString(),matches:rows.map(r=>publicMatch(r,at)).filter(Boolean).sort(compareFanMatches)});
  }catch(e){return fail(e.status||503,e.status?e.message:'Relato temporariamente indisponível. Tenta novamente.');}
 };
}
