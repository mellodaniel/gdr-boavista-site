import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Maximize, Pause, Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { isOutcomeOnly, outcomeLabel } from '../../lib/ageGroups';
import { getResultTeams } from '../../lib/homeAgenda';
import { buildTvPlaylist, contactWebsite, plainText, safeImage } from '../../lib/tvPlaylist';
import type { TvFeed, TvSlide } from '../../lib/tvPlaylist';
import './tv.css';

const LOGO='/logo-gdr-boavista-header-256.png';
const timeoutSignal=(ms:number)=>typeof AbortSignal!=='undefined' && typeof AbortSignal.timeout==='function' ? AbortSignal.timeout(ms) : undefined;
const dateLabel=(date:string)=>new Date(`${date.slice(0,10)}T12:00:00Z`).toLocaleDateString('pt-PT',{timeZone:'Europe/Lisbon',day:'2-digit',month:'short'});
function TvImage({src,alt,logo=false}:{src?:string|null;alt:string;logo?:boolean}) {
 const [failed,setFailed]=useState(false);
 return <img src={!failed && safeImage(src) ? src! : LOGO} alt={alt} onError={()=>setFailed(true)} className={logo || failed || !safeImage(src) ? 'tv-image-logo' : 'tv-image-photo'} referrerPolicy="no-referrer" />;
}
function Slide({slide}:{slide:TvSlide}) {
 if(slide.kind==='welcome' || slide.kind==='community') return <section className="tv-hero">
   <div><p className="tv-eyebrow">{slide.kind==='welcome' ? 'A nossa casa. O nosso clube.' : 'Faz parte desta família'}</p><h1>{slide.kind==='welcome' ? <>Aqui vive<br/>o <em>Boavista.</em></> : <>Juntos,<br/>somos <em>mais.</em></>}</h1><p className="tv-lead">{slide.kind==='welcome' ? 'Formação, paixão e comunidade. Dentro e fora de campo.' : 'Apoia os nossos atletas. Torna-te sócio e acompanha o futuro do clube.'}</p><span className="tv-tag">{slide.kind==='welcome' ? 'BEM-VINDOS AO GDR BOAVISTA' : 'gdrboavista.pt/socios'}</span></div>
   <div className="tv-crest"><img src={LOGO} alt="GDR Boavista"/><span>UMA TERRA. UMA EQUIPA. UMA FAMÍLIA.</span></div>
 </section>;
 if(slide.kind==='sponsor') { const sponsor=slide.sponsor; return <section className="tv-partner">
   <div className="tv-partner-copy"><p className="tv-eyebrow">Quem apoia o nosso futuro</p><h1>{sponsor.name}</h1><p className="tv-lead">{plainText(sponsor.tv_message || sponsor.description,220) || 'Parceiro do GDR Boavista. Obrigado por apoiar o nosso clube.'}</p><div className="tv-contact"><span>CONHEÇA O NOSSO PARCEIRO</span>{sponsor.tv_contact && <strong>{plainText(sponsor.tv_contact,160)}</strong>}{contactWebsite(sponsor.website_url) && <strong>{contactWebsite(sponsor.website_url)}</strong>}</div><p className="tv-thanks">Apoie quem apoia o Boavista.</p></div>
   <div className="tv-partner-logo"><TvImage key={sponsor.logo_url} src={sponsor.logo_url} alt={sponsor.name} logo/><span>PARCEIRO GDR BOAVISTA</span></div>
 </section>; }
 if(slide.kind==='news') return <section className="tv-news"><div><p className="tv-eyebrow">Notícias do clube {slide.news.published_at && <>· {dateLabel(slide.news.published_at)}</>}</p><h1>{plainText(slide.news.title,150)}</h1><p className="tv-lead">{plainText(slide.news.summary,260)}</p><span className="tv-tag">SAIBA MAIS EM GDRBOAVISTA.PT</span></div><div className="tv-news-image"><TvImage key={slide.news.image_url} src={slide.news.image_url} alt={slide.news.title}/></div></section>;
 if(slide.kind==='results' || slide.kind==='matches') return <section className="tv-sports"><div className="tv-section-title"><div><p className="tv-eyebrow">{slide.kind==='results' ? 'Dentro de campo' : 'Marca na agenda'}</p><h1>{slide.kind==='results' ? <>Últimos <em>resultados.</em></> : <>Próximos <em>jogos.</em></>}</h1></div><span>GDR BOAVISTA</span></div><div className="tv-fixtures">{slide.matches.map(match=>{const [first,second]=getResultTeams(match);return <article className="tv-fixture" key={match.id}>
   <div className="tv-fixture-meta"><b>{match.team_name}</b><span>{dateLabel(match.match_date)}{match.match_time ? ` · ${match.match_time.slice(0,5)}` : ''}</span><small>{match.venue_type==='fora'?'FORA':match.venue_type==='casa'?'CASA':'CAMPO NEUTRO'}</small></div>
   <div className="tv-confrontation"><span className={first.isBoavista?'tv-club':''}>{first.name}</span><strong className="tv-score">{slide.kind==='matches'?'×':isOutcomeOnly(match.team_name)?<><small>BOAVISTA</small>{outcomeLabel(match)}</>:`${first.score} – ${second.score}`}</strong><span className={second.isBoavista?'tv-club':''}>{second.name}</span></div>
   <p>{plainText(match.competition,90)}{slide.kind==='matches' && match.location ? ` · ${plainText(match.location,65)}`:''}</p>
 </article>;})}</div></section>;
 if(slide.kind==='tournaments') return <section className="tv-sports"><div className="tv-section-title"><div><p className="tv-eyebrow">Levamos o Boavista connosco</p><h1>Os nossos <em>torneios.</em></h1></div></div><div className="tv-fixtures">{slide.tournaments.map(t=><article className="tv-tournament" key={t.id}><div><span className="tv-eyebrow">{t.team_name} · {t.football_type}</span><h2>{plainText(t.name,100)}</h2><p>{plainText(t.location,100)}</p></div><strong>{dateLabel(t.start_date)}{t.end_date && t.end_date!==t.start_date && <> — {dateLabel(t.end_date)}</>}{t.start_time && <small>{t.start_time.slice(0,5)}</small>}</strong></article>)}</div></section>;
 return null;
}

export default function TvPage() {
 const [feed,setFeed]=useState<TvFeed|null>(null);
 const [message,setMessage]=useState('A ligar ao canal do clube…');
 const [offline,setOffline]=useState(false);
 const [index,setIndex]=useState(0);
 const [paused,setPaused]=useState(false);
 const [clock,setClock]=useState(new Date());
 const [controls,setControls]=useState(true);
 const lastSuccess=useRef(0);
 const controlsTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const preview=useMemo(()=>new URLSearchParams(window.location.search).get('preview')==='1',[]);
 const playlist=useMemo(()=>feed ? buildTvPlaylist(feed,clock) : [],[feed,clock]);
 const slide=playlist[index%Math.max(1,playlist.length)];
 const slideId=slide?.id; const seconds=slide?.seconds; const hasFeed=Boolean(feed);
 const showControls=useCallback(()=>{setControls(true);if(controlsTimer.current)clearTimeout(controlsTimer.current);controlsTimer.current=setTimeout(()=>setControls(false),4500);},[]);
 const move=useCallback((delta:number)=>{setIndex(i=>(i+delta+Math.max(1,playlist.length))%Math.max(1,playlist.length));showControls();},[playlist.length,showControls]);
 const fullscreen=useCallback(async()=>{ try { if(!document.fullscreenElement && document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen(); }catch{setMessage('Use o modo de ecrã inteiro do navegador da televisão.');} },[]);
 useEffect(()=>{
   document.title='Boavista TV — Canal do clube';
   controlsTimer.current=setTimeout(()=>setControls(false),4500);
   const interval=setInterval(()=>setClock(new Date()),30000);
   return()=>{clearInterval(interval);if(controlsTimer.current)clearTimeout(controlsTimer.current);};
 },[]);
 useEffect(()=>{
   let stopped=false;let busy=false;
   const load=async()=>{
     if(busy)return;busy=true;
     try {
       // Old activation links also open the unrestricted trial channel.
       if(window.location.hash)window.history.replaceState(null,'',window.location.pathname+window.location.search);
       const options:RequestInit={signal:timeoutSignal(20000)};
       const response=await fetch('/api/tv',options);
       if(!response.ok)throw new Error('unavailable');
       const data=await response.json() as TvFeed;
       if(!Array.isArray(data.matches)||!Array.isArray(data.sponsors)||!Array.isArray(data.news)||!Array.isArray(data.tournaments))throw new Error('invalid');
       if(!stopped){lastSuccess.current=Date.now();setFeed(data);setOffline(false);setMessage('');}
     }catch{if(!stopped){setOffline(true);setMessage('A restabelecer a ligação…');if(Date.now()-lastSuccess.current>10*60*1000)setFeed(null);}}
     finally{busy=false;}
   };
   void load();const interval=setInterval(()=>void load(),60000);
   window.addEventListener('online',load);
   window.addEventListener('hashchange',load);
   return()=>{stopped=true;clearInterval(interval);window.removeEventListener('online',load);window.removeEventListener('hashchange',load);};
 },[]);
 useEffect(()=>{if(!slideId || !seconds || paused)return;const timer=setTimeout(()=>setIndex(i=>i+1),seconds*1000);return()=>clearTimeout(timer);},[slideId,seconds,paused,index]);
 useEffect(()=>{
   const key=(e:KeyboardEvent)=>{if((e.target as HTMLElement).matches('input,button,a'))return;showControls();if(e.key==='ArrowRight')move(1);if(e.key==='ArrowLeft')move(-1);if(e.key===' '){e.preventDefault();setPaused(p=>!p);}if(e.key.toLowerCase()==='f'||e.key==='Enter')void fullscreen();};
   window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
 },[move,fullscreen,showControls]);
 useEffect(()=>{
   if(!hasFeed || !('wakeLock' in navigator))return;
   let wake:WakeLockSentinel|null=null;let cancelled=false;
   const acquire=async()=>{if(document.visibilityState!=='visible')return;try{const lock=await navigator.wakeLock.request('screen');if(cancelled)await lock.release();else wake=lock;}catch{/* Not supported by every TV; kiosk settings remain available. */}};
   void acquire();document.addEventListener('visibilitychange',acquire);
   return()=>{cancelled=true;void wake?.release();document.removeEventListener('visibilitychange',acquire);};
 },[hasFeed]);
 if(!feed || !slide)return <div className="tv-shell tv-gate"><img src={LOGO} alt="GDR Boavista"/><p className="tv-eyebrow">CANAL DO CLUBE</p><h1>Boavista <em>TV.</em></h1><p role="status">{message}</p><small>Voltamos a tentar automaticamente.</small></div>;
 const section={welcome:'O nosso clube',community:'Comunidade',news:'Notícias',matches:'Agenda',results:'Resultados',sponsor:'Parceiros',tournaments:'Torneios'}[slide.kind];
 return <div className={`tv-shell ${controls?'tv-controls-visible':''}`} onMouseMove={showControls} onTouchStart={showControls}>
   <header className="tv-header"><div className="tv-brand"><img src={LOGO} alt="GDR Boavista"/><strong>BOAVISTA<span>TV</span></strong><i/>{section}</div><div className="tv-clock"><span>{clock.toLocaleDateString('pt-PT',{timeZone:'Europe/Lisbon',weekday:'long',day:'2-digit',month:'long'})}</span><b>{clock.toLocaleTimeString('pt-PT',{timeZone:'Europe/Lisbon',hour:'2-digit',minute:'2-digit'})}</b></div></header>
   <main className="tv-main"><div className="tv-slide" key={`${slide.id}-${index}`}><Slide slide={slide}/></div></main>
   <footer className="tv-footer"><strong>GDR BOAVISTA</strong><span>{offline?'Ligação interrompida · a tentar atualizar':preview?'PRÉ-VISUALIZAÇÃO · '+section:'LEIRIA · FUTEBOL · FORMAÇÃO · COMUNIDADE'}</span><b>gdrboavista.pt</b></footer>
   <div className="tv-progress" key={`progress-${index}-${slide.id}`} style={{animationDuration:`${slide.seconds}s`,animationPlayState:paused?'paused':'running'}}/>
   <nav className="tv-controls" aria-label="Controlos da televisão" onFocus={showControls}><button onClick={()=>move(-1)} aria-label="Anterior"><ChevronLeft/></button><button onClick={()=>{setPaused(p=>!p);showControls();}} aria-label={paused?'Continuar':'Pausar'}>{paused?<Play/>:<Pause/>}</button><button onClick={()=>move(1)} aria-label="Seguinte"><ChevronRight/></button><button onClick={()=>void fullscreen()}><Maximize/> Ecrã inteiro</button></nav>
 </div>;
}
