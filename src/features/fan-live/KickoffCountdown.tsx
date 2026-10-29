import {useEffect,useState} from 'react';
export function KickoffCountdown({kickoffAt,checkedAt}:{kickoffAt?:string|null;checkedAt:string}){
 const [now,setNow]=useState(Date.now());
 useEffect(()=>{const server=Date.parse(checkedAt),base=Number.isFinite(server)?server:Date.now(),start=performance.now();const tick=()=>setNow(base+performance.now()-start);tick();const timer=window.setInterval(tick,1000);return()=>clearInterval(timer);},[checkedAt]);
 const target=Date.parse(kickoffAt||''),seconds=Number.isFinite(target)?Math.max(0,Math.ceil((target-now)/1000)):null;
 const units=seconds===null?[]:[[Math.floor(seconds/86400),'dias'],[Math.floor(seconds%86400/3600),'horas'],[Math.floor(seconds%3600/60),'minutos'],[seconds%60,'segundos']];
 return <section className="fl-countdown"><p className="fl-eyebrow">O APITO INICIAL ESTÁ A CHEGAR</p><h2>{seconds===null?'Horário por confirmar':seconds===0?'A aguardar o início do jogo':'Falta para o início previsto'}</h2>{seconds!==null&&seconds>0&&<div className="fl-countdown-digits" role="timer" aria-label="Tempo até ao início previsto">{units.map(([value,label])=><div key={label}><strong>{String(value).padStart(2,'0')}</strong><span>{label}</span></div>)}</div>}<p>{seconds===null?'A hora do jogo será anunciada aqui.':seconds===0?'Aguardamos a confirmação do apito inicial. O relato aparecerá automaticamente.':'Horário de Portugal continental. O início será confirmado pela equipa no campo.'}</p></section>;
}
