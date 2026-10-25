import {useState} from 'react';
import {Shield} from 'lucide-react';
export function TeamBadge({src,name}:{src:string;name:string}){const [failed,setFailed]=useState(false);return src&&!failed?<img className="fl-team-badge" src={src} alt={`Emblema ${name}`} referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>:<div className="fl-away-mark" title={`Emblema de ${name} por associar`}><Shield size={48} aria-label={`Emblema de ${name} por associar`}/></div>;}
