import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Maximize, Pause, Play, ChevronLeft, ChevronRight, ArrowUpRight } from 'lucide-react';
import { isOutcomeOnly, outcomeLabel } from '../../lib/ageGroups';
import { getResultTeams } from '../../lib/homeAgenda';
import { buildTvPlaylist, contactWebsite, plainText, safeImage } from '../../lib/tvPlaylist';
import type { TvFeed, TvSlide } from '../../lib/tvPlaylist';
import './tv.css';

const LOGO='/logo-gdr-boavista-clean-1024.png';
const timeoutSignal=(ms:number)=>typeof AbortSignal!=='undefined' && typeof AbortSignal.timeout==='function' ? AbortSignal.timeout(ms) : undefined;
const dateLabel=(date:string)=>new Date(`${date.slice(0,10)}T12:00:00Z`).toLocaleDateString('pt-PT',{timeZone:'Europe/Lisbon',day:'2-digit',month:'short'});
function TvImage({src,alt,logo=false}:{src?:string|null;alt:string;logo?:boolean}) {
 const [failed,setFailed]=useState(false);
 return <img src={!failed && safeImage(src) ? src! : LOGO} alt={alt} onError={()=>setFailed(true)} className={logo || failed || !safeImage(src) ? 'tv-image-logo' : 'tv-image-photo'} referrerPolicy="no-referrer" />;
}
function TvAction({kind='clube'}:{kind?:'clube'|'socios'|'parceiros'|'canal'}) {
 const labels={canal:['Boavista TV, contigo.','Abre o canal no teu telemóvel','gdrboavista.pt/tv'],clube:['Leva o clube contigo','Notícias, jogos e novidades','gdrboavista.pt'],socios:['Faz parte desta família.','Aponta a câmara e envia o teu pedido','gdrboavista.pt/socios'],parceiros:['Apoia quem nos apoia.','Conhece os nossos parceiros','gdrboavista.pt/parceiros']}[kind];
 return <div className={`tv-action tv-action-${kind}`}><img src={`/tv/qr-${kind}.png`} alt={`Código QR: ${labels[2]}`} width="120" height="120"/><div><strong>{labels[0]}</strong><span>{labels[1]} <ArrowUpRight aria-hidden="true"/></span><small>{labels[2]}</small>{kind==='socios' && <a className="tv-member-button" href="/socios" target="_blank" rel="noopener noreferrer">Quero ser sócio <ArrowUpRight aria-hidden="true"/></a>}</div></div>;
}
const sectionNames:Record<TvSlide['kind'],string>={channel:'Boavista TV',welcome:'O nosso clube',community:'Comunidade',news:'Notícias',matches:'Agenda',results:'Resultados',sponsor:'Parceiros',tournaments:'Torneios'};
function nextTitle(slide:TvSlide){
 if(slide.kind==='sponsor')return slide.sponsor.name;
 if(slide.kind==='news')return plainText(slide.news.title,65);
 return sectionNames[slide.kind];
}
export function TvSlideView({slide}:{slide:TvSlide}) {
 if(slide.kind==='channel') return <section className="tv-promo">
   <div className="tv-promo-copy"><p className="tv-eyebrow">GDR Boavista TV · O canal da nossa família</p><h1>O teu clube.<br/><em>O teu canal.</em></h1><p className="tv-lead">Fica por dentro das notícias, acompanha os jogos e conhece quem apoia o Boavista.</p><div className="tv-coming"><strong>Em breve, mais novidades.</strong><p>Estamos a preparar o futuro do canal, com a ambição de trazer transmissões de jogos.</p></div><TvAction kind="canal"/></div>
   <div className="tv-promo-art" aria-label="Identidade Boavista TV"><div className="tv-broadcast-rings" aria-hidden="true"><i/><i/><i/></div><img src={LOGO} alt="Emblema GDR Boavista"/><div className="tv-promo-wordmark">BOAVISTA <b>TV</b></div><span>NOTÍCIAS · FUTEBOL · COMUNIDADE</span></div>
 </section>;

 if(slide.kind==='welcome' || slide.kind==='community') return <section className={`tv-hero ${slide.kind==='community'?'tv-members':''}`}>
   <div><p className="tv-eyebrow">{slide.kind==='welcome' ? 'A nossa casa. O nosso clube.' : 'Faz parte desta família'}</p><h1>{slide.kind==='welcome' ? <>Aqui vive<br/>o <em>Boavista.</em></> : <>O Boavista<br/>conta <em>contigo.</em></>}</h1><p className="tv-lead">{slide.kind==='welcome' ? 'Formação, paixão e comunidade. Dentro e fora de campo.' : 'Torna-te sócio. Ajuda a nossa formação a crescer e faz parte da vida do clube.'}</p><TvAction kind={slide.kind==='welcome'?'clube':'socios'}/></div>
   <div className="tv-crest"><div className="tv-orbit" aria-hidden="true"/><img src={LOGO} alt="GDR Boavista"/><span>UMA TERRA. UMA EQUIPA. UMA FAMÍLIA.</span></div>
 </section>;
 if(slide.kind==='sponsor') { const sponsor=slide.sponsor; return <section className="tv-partner">
   <div className="tv-partner-copy"><p className="tv-eyebrow">Quem apoia o nosso futuro</p><h1>{sponsor.name}</h1><p className="tv-lead">{plainText(sponsor.tv_message || sponsor.description,220) || 'Parceiro do GDR Boavista. Obrigado por apoiar o nosso clube.'}</p><div className="tv-contact"><span>CONHEÇA O NOSSO PARCEIRO</span>{sponsor.tv_contact && <strong>{plainText(sponsor.tv_contact,160)}</strong>}{contactWebsite(sponsor.website_url) && <strong>{contactWebsite(sponsor.website_url)}</strong>}</div><TvAction kind="parceiros"/></div>
   <div className="tv-partner-logo"><TvImage key={sponsor.logo_url} src={sponsor.logo_url} alt={sponsor.name} logo/><span>PARCEIRO GDR BOAVISTA</span></div>
 </section>; }
 if(slide.kind==='news') return <section className="tv-news"><div><p className="tv-eyebrow">Notícias do clube {slide.news.published_at && <>· {dateLabel(slide.news.published_at)}</>}</p><h1>{plainText(slide.news.title,150)}</h1><p className="tv-lead">{plainText(slide.news.summary,260)}</p><TvAction/></div><div className="tv-news-image"><TvImage key={slide.news.image_url} src={slide.news.image_url} alt={slide.news.title}/></div></section>;
 if(slide.kind==='results' || slide.kind==='matches') return <section className="tv-sports"><div className="tv-section-title"><div><p className="tv-eyebrow">{slide.kind==='results' ? 'Dentro de campo' : 'Marca na agenda'}</p><h1>{slide.kind==='results' ? <>Últimos <em>resultados.</em></> : <>Próximos <em>jogos.</em></>}</h1></div><span>GDR BOAVISTA</span></div><div className={`tv-fixtures ${slide.matches.length===1?'tv-fixtures-single':''}`}>{slide.matches.map(match=>{const [first,second]=getResultTeams(match);return <article className="tv-fixture" key={match.id}>
   <div className="tv-fixture-meta"><b>{match.team_name}</b><span>{dateLabel(match.match_date)}{match.match_time ? ` · ${match.match_time.slice(0,5)}` : ''}</span><small>{match.venue_type==='fora'?'FORA':match.venue_type==='casa'?'CASA':'CAMPO NEUTRO'}</small></div>
   <div className="tv-confrontation"><span className={first.isBoavista?'tv-club':''}>{first.name}</span><strong className={slide.kind==='results' && isOutcomeOnly(match.team_name)?'tv-outcome':'tv-score'} aria-label={slide.kind==='results' && isOutcomeOnly(match.team_name)?`Boavista: ${outcomeLabel(match)}`:undefined}>{slide.kind==='matches'?'×':isOutcomeOnly(match.team_name)?<><small>BOAVISTA</small><span>{outcomeLabel(match).slice(0,1)}</span></>:`${first.score} – ${second.score}`}</strong><span className={second.isBoavista?'tv-club':''}>{second.name}</span></div>
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
 const hideControls=useCallback(()=>{setControls(false);const focused=document.activeElement;if(focused instanceof HTMLElement && focused.closest('.tv-controls'))focused.blur();},[]);
 const showControls=useCallback(()=>{setControls(true);if(controlsTimer.current)clearTimeout(controlsTimer.current);controlsTimer.current=setTimeout(hideControls,4500);},[hideControls]);
 const move=useCallback((delta:number)=>{setIndex(i=>(i+delta+Math.max(1,playlist.length))%Math.max(1,playlist.length));showControls();},[playlist.length,showControls]);
 const fullscreen=useCallback(async()=>{ try { if(!document.fullscreenElement && document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen(); }catch{setMessage('Use o modo de ecrã inteiro do navegador da televisão.');} },[]);
 useEffect(()=>{
   document.title='Boavista TV — Canal do clube';
   const previousScheme=document.documentElement.style.colorScheme;
   document.documentElement.style.colorScheme='only light';
   controlsTimer.current=setTimeout(hideControls,4500);
   const interval=setInterval(()=>setClock(new Date()),30000);
   return()=>{document.documentElement.style.colorScheme=previousScheme;clearInterval(interval);if(controlsTimer.current)clearTimeout(controlsTimer.current);};
 },[hideControls]);
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
   const key=(e:KeyboardEvent)=>{if((e.target as HTMLElement).matches('input,a'))return;showControls();if((e.target as HTMLElement).matches('button'))return;if(e.key==='ArrowRight')move(1);if(e.key==='ArrowLeft')move(-1);if(e.key===' '){e.preventDefault();setPaused(p=>!p);}if(e.key.toLowerCase()==='f'||e.key==='Enter')void fullscreen();};
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
 const section=sectionNames[slide.kind];
 const next=playlist[(index+1)%playlist.length];
 return <div className={`tv-shell tv-section-${slide.kind} ${controls?'tv-controls-visible':''} ${paused?'tv-paused':''}`} onClick={showControls} onTouchStart={showControls}>
   <div className="tv-ambient" aria-hidden="true"><i/><i/></div>
   <header className="tv-header"><div className="tv-brand"><span key={slide.id} className="tv-brand-mark"><img src={LOGO} alt="GDR Boavista"/></span><strong>BOAVISTA<span>TV</span></strong><i/><span className="tv-section-pill">{section}</span></div><div className="tv-clock"><span>{clock.toLocaleDateString('pt-PT',{timeZone:'Europe/Lisbon',weekday:'long',day:'2-digit',month:'long'})}</span><b>{clock.toLocaleTimeString('pt-PT',{timeZone:'Europe/Lisbon',hour:'2-digit',minute:'2-digit'})}</b></div></header>
   <main className="tv-main"><div className="tv-slide" key={`${slide.id}-${index}`}><TvSlideView slide={slide}/></div></main>
   <footer className="tv-footer"><div className="tv-channel"><span className="tv-signal" aria-hidden="true"/><strong>CANAL DO CLUBE</strong><small>{offline?'A restabelecer a ligação':preview?'Pré-visualização':paused?'Em pausa':'GDR BOAVISTA'}</small></div><div className="tv-next" key={next.id}><span>A SEGUIR</span><strong>{nextTitle(next)}</strong><ChevronRight aria-hidden="true"/></div><b>gdrboavista.pt</b></footer>
   <div className="tv-progress" key={`progress-${index}-${slide.id}`} style={{animationDuration:`${slide.seconds}s`,animationPlayState:paused?'paused':'running'}}/>
   <nav className="tv-controls" aria-label="Controlos da televisão" aria-hidden={!controls} onFocus={showControls}><button onClick={()=>move(-1)} aria-label="Anterior"><ChevronLeft/></button><button onClick={()=>{setPaused(p=>!p);showControls();}} aria-label={paused?'Continuar':'Pausar'}>{paused?<Play/>:<Pause/>}</button><button onClick={()=>move(1)} aria-label="Seguinte"><ChevronRight/></button><button onClick={()=>void fullscreen()}><Maximize/> Ecrã inteiro</button></nav>
 </div>;
}
