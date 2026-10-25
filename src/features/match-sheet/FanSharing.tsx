import {useFeedback} from '../../components/feedback/useFeedback';
import {DismissibleFeedback} from '../../components/feedback/DismissibleFeedback';
import {useState} from 'react';
export function FanSharing({accessKey,id,enabled,disabled,synced,onToggle}:{accessKey:string;id:string;enabled:boolean;disabled:boolean;synced:boolean;onToggle:(value:boolean)=>void}){
 const [url,setUrl]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useFeedback<{type:'success'|'error';text:string}|null>(null);
 async function share(){setBusy(true);setMessage(null);try{
  const response=await fetch('/api/fan-live',{method:'POST',headers:{'Content-Type':'application/json','X-Match-Sheet-Key':accessKey},body:JSON.stringify({action:'link'}),cache:'no-store',referrerPolicy:'no-referrer'});
  const data=await response.json();if(!response.ok)throw Error(data.error||'Não foi possível criar o link.');
  const link=`${location.origin}/acompanhar-jogo#acesso=${data.token}&jogo=${id}`;setUrl(link);
  try{await navigator.clipboard.writeText(link);setMessage({type:'success',text:'Link dos adeptos copiado.'});}catch{setMessage({type:'success',text:'Seleciona e copia o link abaixo.'});}
 }catch(e){setMessage({type:'error',text:e instanceof Error?e.message:'Não foi possível criar o link.'});}finally{setBusy(false);}}
 return <section className="ms-panel" style={{marginBottom:16}}><label className="ms-check"><input type="checkbox" checked={enabled} disabled={disabled} onChange={e=>onToggle(e.target.checked)}/>Relato para adeptos</label><p className="ms-small">Ativa para partilhar este jogo, incluindo a data e hora previstas antes do início. Qualquer pessoa com o link pode acompanhar e reenviá-lo. Apenas resultado, golos, cartões e substituições; notas e comentários ficam reservados.</p>{enabled&&!synced&&<p role="status">A aguardar sincronização da ficha.</p>}<button onClick={()=>void share()} disabled={busy||disabled}>{busy?'A preparar…':'Copiar link dos adeptos'}</button>{url&&<label style={{display:'block',marginTop:12}}>Link de consulta<input readOnly value={url} onFocus={e=>e.target.select()} style={{width:'100%'}}/></label>}{message&&<DismissibleFeedback error={message.type==='error'} onDismiss={()=>setMessage(null)}><p>{message.text}</p></DismissibleFeedback>}</section>;
}
