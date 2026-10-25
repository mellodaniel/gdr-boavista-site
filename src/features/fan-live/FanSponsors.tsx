import {useEffect,useState} from 'react';
import type {ReactNode} from 'react';
import {ExternalLink,Handshake} from 'lucide-react';
import {supabase} from '../../lib/supabase';
export type FanSponsor={id:string;name:string;logo_url:string|null;website_url:string|null};
export const SPONSOR_ROTATION_MS=10_000;
function publicUrl(value:string|null){try{const u=new URL(value||'');return ['https:','http:'].includes(u.protocol)?u.href:undefined;}catch{return undefined;}}
export function useFanSponsors(){
 const [sponsors,setSponsors]=useState<FanSponsor[]>([]);
 useEffect(()=>{let disposed=false;async function load(){const {data,error}=await supabase.from('gdrb_sponsors').select('id,name,logo_url,website_url').eq('is_active',true).order('sort_order',{ascending:true}).order('name',{ascending:true});if(!disposed&&!error)setSponsors(data||[]);}void load();const timer=window.setInterval(()=>{if(!document.hidden)void load();},300_000);return()=>{disposed=true;clearInterval(timer);};},[]);
 return sponsors;
}
function SponsorCard({sponsor}:{sponsor:FanSponsor}){
 const [failed,setFailed]=useState(false),logo=publicUrl(sponsor.logo_url),href=publicUrl(sponsor.website_url);
 const content=<><div className="fl-partner-logo">{logo&&!failed?<img src={logo} alt="" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>:<Handshake size={36} aria-hidden="true"/>}</div><strong>{sponsor.name}</strong>{href&&<span>Visitar parceiro <ExternalLink size={12}/></span>}</>;
 return href?<a className="fl-partner-card" href={href} target="_blank" rel="noopener noreferrer" aria-label={`Visitar ${sponsor.name} (abre noutro separador)`}>{content}</a>:<div className="fl-partner-card">{content}</div>;
}
export function FanSponsors({sponsors,children}:{sponsors:FanSponsor[];children:ReactNode}){
 const [step,setStep]=useState(0),[hovered,setHovered]=useState(false),[focused,setFocused]=useState(false);
 const count=sponsors.length;
 useEffect(()=>{if(count<2||hovered||focused)return;const timer=window.setInterval(()=>{if(!document.hidden)setStep(n=>n+1);},SPONSOR_ROTATION_MS);return()=>clearInterval(timer);},[count,hovered,focused]);
 function rail(side:'left'|'right'){
  const index=(step+(side==='right'?Math.ceil(count/2):0))%count;
  return <aside className={`fl-partner-rail fl-partner-${side}`} aria-label={`Parceiros do clube — ${side==='left'?'esquerda':'direita'}`} onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)} onFocus={()=>setFocused(true)} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setFocused(false);}}><div className="fl-partner-sticky"><p>QUEM APOIA O CLUBE</p><SponsorCard key={sponsors[index].id} sponsor={sponsors[index]}/></div></aside>;
 }
 if(!count)return <>{children}</>;
 return <div className="fl-sponsored-layout">{rail('left')}{children}{rail('right')}</div>;
}
