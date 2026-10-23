import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowLeftRight, Check, ChevronRight, ClipboardList, Download, Flag, Goal, LogOut, Mail, Pause, Pencil, Play, Plus, Printer, RefreshCw, Settings, StickyNote, Trash2, Users, WifiOff, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { GdrbMatch } from '../../types/database';
import type { EventKind, MatchSheet, RosterPlayer, SheetDelivery, SheetEvent, SheetTeam } from './types';
import { clockAt, eventDescription, eventLabels, eventMinute, lineup, newSheet, orderedEvents, score, validateSheet } from './model.js';
import { localClear, localRead, localWrite, SheetRepository } from './storage';
import './match-sheet.css';

const logo='/logo-gdr-boavista-clean-1024.png';
const readableError=(e:unknown)=>e instanceof Error?e.message:'Não foi possível concluir. Tenta novamente.';
function Brand(){return <div className="ms-brand"><img src={logo} alt="Emblema do GDR Boavista" width="64" height="72"/><div><strong>GDR BOAVISTA</strong><span>Ficha de jogo</span></div></div>;}
function download(blob:Blob,name:string){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function apiRequest(id:string,revision:number,body?:object){
  const {data:{session}}=await supabase.auth.getSession();if(!session)throw new Error('Entra novamente para continuar.');
  const response=await fetch(body?'/api/match-sheet':`/api/match-sheet?id=${encodeURIComponent(id)}&revision=${revision}`,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${session.access_token}`,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify({id,revision,...body}):undefined});
  if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.error||'Não foi possível concluir. Verifica a ligação.');}
  return response;
}
export default function MatchSheetPage(){
  useEffect(()=>{if(import.meta.env.PROD&&'serviceWorker' in navigator)void navigator.serviceWorker.register('/ficha-sw.js',{scope:'/ficha-de-jogo'}).catch(()=>{});},[]);
  const [session,setSession]=useState<Session|null>(null),[ready,setReady]=useState(false);
  const [username,setUsername]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  useEffect(()=>{void supabase.auth.getSession().then(({data})=>{setSession(data.session);setReady(true);}).catch(()=>{setError('Não foi possível recuperar a sessão. Tenta entrar novamente.');setReady(true);});const {data}=supabase.auth.onAuthStateChange((_e,s)=>{setSession(s);setReady(true);});return()=>data.subscription.unsubscribe();},[]);
  async function login(e:FormEvent){e.preventDefault();setBusy(true);setError('');const email=username.trim().includes('@')?username.trim():`${username.trim().toLowerCase()}@gdrboavista.local`;try{const {error}=await supabase.auth.signInWithPassword({email,password});if(error)throw new Error('Verifica o utilizador e a palavra-passe.');setPassword('');}catch(e){setError(readableError(e));}finally{setBusy(false);}}
  if(!ready)return <main className="ms-app"><div className="ms-loading">A abrir a ficha de jogo…</div></main>;
  if(!session)return <main className="ms-app ms-login"><form onSubmit={login} className="ms-panel"><Brand/><div className="ms-eyebrow">ÁREA RESERVADA</div><h1>O jogo começa aqui.</h1><p>Convocatória, eventos e relatório num só lugar.</p><label>Utilizador<input autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} required/></label><label>Palavra-passe<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required/></label>{error&&<p className="ms-error" role="alert">{error}</p>}<button className="ms-primary" disabled={busy}>{busy?'A entrar…':'Entrar na ficha'}<ChevronRight size={18}/></button><p className="ms-small">Usa a conta atribuída pelo clube. Prepara o jogo com ligação antes de ir para o campo.</p></form></main>;
  return <MatchWorkspace key={session.user.id} session={session}/>;
}
type Access={age_group:string;can_edit:boolean};
type Context={teams:SheetTeam[];admin:boolean;access:Access[]};
function MatchWorkspace({session}:{session:Session}){
  const repository=useMemo(()=>new SheetRepository(session.user.id),[session.user.id]);
  const [context,setContext]=useState<Context>({teams:[],admin:false,access:[]});
  const [params,setParams]=useSearchParams();const selected=params.get('ficha');
  const [sheet,setSheet]=useState<MatchSheet|null>(null),current=useRef<MatchSheet|null>(null);
  const [,redraw]=useState(0);const [ready,setReady]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const [online,setOnline]=useState(navigator.onLine),[tab,setTab]=useState<'prepare'|'live'|'report'>('prepare');
  const [teamName,setTeamName]=useState(''),[roster,setRoster]=useState<RosterPlayer[]>([]),[rosterLoading,setRosterLoading]=useState(false);
  const [calendar,setCalendar]=useState<GdrbMatch[]>([]),[event,setEvent]=useState<SheetEvent|null>(null),[settings,setSettings]=useState(false);
  const [mailOpen,setMailOpen]=useState(false),[recipients,setRecipients]=useState(''),[sending,setSending]=useState(false),[deliveries,setDeliveries]=useState<SheetDelivery[]>([]);
  const [localSaving,setLocalSaving]=useState(0),[storageError,setStorageError]=useState(false);
  const mailAttempt=useRef<{key:string;id:string}|null>(null);
  const canCreate=(name:string)=>context.admin||context.access.some(a=>a.age_group===name&&a.can_edit);
  const stored=repository.records.find(r=>r.document.id===sheet?.id);
  const owned=!stored||stored.owner===session.user.id;
  const editable=Boolean(sheet&&owned&&canCreate(sheet.ageGroup)&&sheet.status!=='finished'&&!stored?.conflict);
  const [now,setNow]=useState(Date.now());
  useEffect(()=>{const tick=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(tick);},[]);
  const reloadContext=useCallback(async()=>{
    const [teams,admin,access]=await Promise.all([supabase.from('gdrb_match_sheet_teams').select('*').order('age_group'),supabase.rpc('gdrb_gallery_is_admin'),supabase.from('gdrb_match_sheet_access').select('age_group,can_edit').eq('user_id',session.user.id)]);
    if(teams.error||admin.error||access.error)throw new Error('Não foi possível carregar o módulo. Verifica a ligação e se a atualização da base de dados já foi aplicada.');
    const c:Context={teams:teams.data||[],admin:admin.data===true,access:access.data||[]};await localWrite(session.user.id+':context',c);setContext(c);
  },[session.user.id]);
  useEffect(()=>{
    let active=true;const unsub=repository.subscribe(()=>{if(active)redraw(n=>n+1);});
    const connection=()=>{setOnline(navigator.onLine);if(navigator.onLine)void repository.sync().catch(e=>setError(readableError(e)));};
    const interval=setInterval(connection,15000);window.addEventListener('online',connection);window.addEventListener('offline',connection);
    void (async()=>{
      try {await repository.load();const cache=await localRead<Context>(session.user.id+':context');if(cache&&active)setContext(cache);if(active)setReady(true);if(navigator.onLine){await reloadContext();await repository.sync();await repository.refresh();}}
      catch(e){if(active){setError(readableError(e));setReady(true);}}
    })();
    return()=>{active=false;unsub();clearInterval(interval);window.removeEventListener('online',connection);window.removeEventListener('offline',connection);};
  },[repository,reloadContext,session.user.id]);
  // Load a selected document only on navigation; acknowledgements never replace current edits.
  useEffect(()=>{
    if(!ready)return;
    if(!selected){current.current=null;setSheet(null);return;}
    if(current.current?.id===selected)return;
    const record=repository.records.find(r=>r.document.id===selected);
    if(record){const document=structuredClone(record.document);current.current=document;setSheet(document);setTab(document.status==='draft'?'prepare':document.status==='finished'?'report':'live');}
  },[selected,ready,repository,repository.records]);
  useEffect(()=>{
    if(!sheet)return;let active=true;setRoster([]);setCalendar([]);setRosterLoading(true);
    const group=sheet.ageGroup,key=session.user.id+':roster:'+group;
    void (async()=>{
      try{const cached=await localRead<RosterPlayer[]>(key);if(cached&&active)setRoster(cached);
        if(navigator.onLine){const [r,c]=await Promise.all([supabase.rpc('gdrb_sheet_roster',{p_group:group}),supabase.from('gdrb_matches').select('*').eq('team_name',group).order('match_date',{ascending:false}).limit(50)]);
          if(r.error)throw new Error('Não foi possível carregar o plantel.');await localWrite(key,r.data);if(active){setRoster(r.data||[]);setCalendar(c.data||[]);}}
      }catch(e){if(active)setError(readableError(e));}finally{if(active)setRosterLoading(false);}
    })();return()=>{active=false;};
  },[sheet?.ageGroup,session.user.id]);
  useEffect(()=>{
    if(!sheet||tab!=='report'||!online)return;let active=true;
    void supabase.from('gdrb_match_sheet_deliveries').select('id,revision,recipients,status,created_at').eq('sheet_id',sheet.id).order('created_at',{ascending:false}).limit(8).then(({data})=>{if(active)setDeliveries(data||[]);});return()=>{active=false;};
  },[sheet?.id,tab,online,notice]);
  useEffect(()=>{
    const warn=(e:BeforeUnloadEvent)=>{if(localSaving||storageError){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);
  },[localSaving,storageError]);
  function change(fn:(doc:MatchSheet)=>MatchSheet,validate=false){
    if(!current.current)return false;
    const next=fn(structuredClone(current.current));const issue=validate?validateSheet(next):null;if(issue){setError(issue);return false;}
    current.current=next;setSheet(next);setError('');setStorageError(false);setLocalSaving(n=>n+1);
    void repository.save(next).catch(e=>{setStorageError(true);setError(`Não foi possível guardar neste dispositivo. Mantém esta página aberta e guarda uma cópia. ${readableError(e)}`);}).finally(()=>setLocalSaving(n=>n-1));return true;
  }
  function create(){if(navigator.storage?.persist)void navigator.storage.persist();const team=context.teams.find(t=>t.age_group===teamName);if(!team||!canCreate(teamName))return;if(!team.roster_key){setError('Este escalão ainda não tem plantel associado. O administrador pode associá-lo em Configuração.');return;}const doc=newSheet(team,session.user.user_metadata?.full_name||'');current.current=doc;setSheet(doc);setTab('prepare');setParams({ficha:doc.id});change(d=>d);}
  async function sync(){setError('');try{await repository.sync();if(!sheet)await repository.refresh();}catch(e){setError(readableError(e));}}
  function exportBackup(){if(sheet)download(new Blob([JSON.stringify({document:sheet,revision:stored?.revision||0},null,2)],{type:'application/json'}),`ficha-${sheet.date}-${sheet.id.slice(0,8)}.json`);}
  async function signOut(){if(repository.records.some(r=>r.dirty)||localSaving||storageError){setError('Existem fichas por sincronizar. Sincroniza-as antes de terminar sessão.');return;}await localClear(session.user.id);repository.stop();await supabase.auth.signOut();}
  function openEvent(kind:EventKind,side:'club'|'opponent'='club'){if(!sheet)return;const time=clockAt(sheet);setEvent({id:crypto.randomUUID(),kind,side,period:time.period,minute:time.minute,added:time.added,player:'',incoming:'',ownGoal:false,note:'',createdAt:new Date().toISOString()});}
  function saveEvent(e:SheetEvent){if(change(d=>({...d,events:[...d.events.filter(x=>x.id!==e.id),e]}),true)){setEvent(null);setNotice(`${eventLabels[e.kind]} registado.`);}}
  function removeEvent(id:string){if(!confirm('Remover este evento? A alteração fica no histórico da ficha.'))return;change(d=>({...d,events:d.events.filter(e=>e.id!==id)}),true);}
  function setClock(action:'start'|'pause'|'interval'|'next'){
    change(d=>{const elapsed=clockAt(d).elapsedMs;if(action==='start'){d.status='live';d.clock.startedAt=Date.now();}if(action==='pause'){d.clock.elapsedMs=elapsed;d.clock.startedAt=null;}if(action==='interval'){d.status='interval';d.clock.elapsedMs=elapsed;d.clock.startedAt=null;}if(action==='next'){if(d.clock.period>=d.rules.periods)return d;d.clock={period:d.clock.period+1,elapsedMs:0,startedAt:Date.now()};d.status='live';}return d;},true);
  }
  async function pdf(){if(!sheet||!stored)return;setSending(true);try{const response=await apiRequest(sheet.id,stored.revision);download(await response.blob(),`GDRBoavista-Ficha-${sheet.date}-v${stored.revision}.pdf`);}catch(e){setError(readableError(e));}finally{setSending(false);}}
  async function sendEmail(e:FormEvent){e.preventDefault();if(!sheet||!stored)return;setSending(true);setError('');try{
    const list=[...new Set(recipients.split(/[;,\n]/).map(x=>x.trim().toLowerCase()).filter(Boolean))];if(!list.length||list.length>5)throw new Error('Indica entre 1 e 5 endereços de email.');
    const key=JSON.stringify([sheet.id,stored.revision,list]);const savedAttempt=await localRead<{key:string;id:string}>(session.user.id+':email:'+key);if(mailAttempt.current?.key!==key)mailAttempt.current=savedAttempt||{key,id:crypto.randomUUID()};await localWrite(session.user.id+':email:'+key,mailAttempt.current);
    await apiRequest(sheet.id,stored.revision,{recipients:list,requestId:mailAttempt.current.id});
    setNotice('Ficha aceite pelo serviço de email. Consulta os destinatários no histórico de envios.');setMailOpen(false);await localWrite(session.user.id+':email:'+key,null);mailAttempt.current=null;
  }catch(e){setError(readableError(e));}finally{setSending(false);}}
  const live=sheet?clockAt(sheet,now):null,tally=sheet?score(sheet):null;
  const syncLabel=storageError?'Falha ao guardar':localSaving?'A guardar…':stored?.conflict?'Conflito entre dispositivos':stored?.dirty?'Guardado no dispositivo · por sincronizar':stored?'Sincronizado':'A preparar';
  const savedReady=Boolean(stored&&!stored.dirty&&!localSaving&&!storageError&&online);
  return <main className="ms-app">
    <header className="ms-top"><Brand/><div className="ms-top-actions">{!online&&<span className="ms-offline"><WifiOff size={16}/>Sem ligação</span>}{context.admin&&<button className="ms-icon" onClick={()=>setSettings(s=>!s)} aria-label="Configuração"><Settings size={20}/></button>}<button className="ms-icon" onClick={()=>void signOut()} aria-label="Terminar sessão"><LogOut size={20}/></button></div></header>
    <div className="ms-container">
      {error&&<div className="ms-error ms-alert" role="alert"><span>{error}</span><button className="ms-icon" aria-label="Fechar aviso" onClick={()=>setError('')}><X size={18}/></button></div>}
      {notice&&<div className="ms-notice" role="status">{notice}</div>}
      {settings&&context.admin&&<SettingsPanel context={context} onSaved={()=>void reloadContext()} onError={setError}/>}
      {!ready?<div className="ms-panel">A carregar as fichas…</div>:!sheet?<>
        <div className="ms-page-title"><div className="ms-eyebrow">DIA DE JOGO</div><h1>Da convocatória ao apito final.</h1><p>Tudo o que precisas para acompanhar a tua equipa.</p></div>
        <section className="ms-panel ms-new"><label>Escalão<select value={teamName} onChange={e=>setTeamName(e.target.value)}><option value="">Selecionar escalão</option>{context.teams.filter(t=>canCreate(t.age_group)).map(t=><option key={t.age_group}>{t.age_group}</option>)}</select></label><button className="ms-primary" disabled={!teamName} onClick={create}><Plus size={20}/>Nova ficha</button></section>
        {!context.teams.length&&<p className="ms-empty">Ainda não há escalões disponíveis para esta conta. O administrador pode atribuir o acesso após ativar o módulo.</p>}
        <div className="ms-section-heading"><h2>As fichas de jogo</h2><button onClick={()=>void sync()} disabled={!online}><RefreshCw size={16}/>Atualizar</button></div>
        <div className="ms-sheets">{[...repository.records].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).map(r=><button className="ms-sheet-card" key={r.document.id} onClick={()=>{setParams({ficha:r.document.id});setNotice('');setError('');}}><div><span className="ms-eyebrow">{r.document.ageGroup} · {r.document.date.split('-').reverse().join('/')}</span><strong>Boavista × {r.document.opponent||'Adversário por definir'}</strong><small>{r.document.status==='finished'?'Finalizada':r.document.status==='draft'?'Em preparação':'Jogo em curso'} · {r.dirty?'Por sincronizar':`Versão ${r.revision}`}</small></div><ChevronRight size={22}/></button>)}</div>
        {!repository.records.length&&<div className="ms-empty"><ClipboardList size={32}/><p>Começa por escolher o escalão e criar a primeira ficha.</p></div>}
      </>:<>
        <div className="ms-sheet-heading"><button className="ms-back" onClick={()=>{if(localSaving||storageError){setError('Aguarda a gravação. Se existir uma falha, guarda uma cópia e mantém esta página aberta.');return;}setParams({});setNotice('');}}><ArrowLeft size={17}/>Fichas</button><span className="ms-save-state" aria-live="polite">{syncLabel}</span><button className="ms-icon" aria-label="Sincronizar ficha" onClick={()=>void sync()} disabled={!online}><RefreshCw size={18}/></button></div>
        {(stored?.error||storageError)&&<div className="ms-error"><p>{stored?.error||'Guarda uma cópia antes de fechar.'}</p><div className="ms-actions"><button onClick={exportBackup}><Download size={17}/>Guardar cópia</button>{stored?.conflict&&<button onClick={()=>{if(confirm('Já guardaste a cópia? Carregar o servidor substitui as alterações locais desta ficha.'))void repository.replaceFromServer(sheet.id).then(d=>{current.current=d;setSheet(d);}).catch(e=>setError(readableError(e)));}}>Carregar servidor</button>}</div></div>}
        {!owned&&<p className="ms-notice">Modo de consulta. Esta ficha pertence a outro responsável.</p>}
        <div className="ms-title-row"><div><div className="ms-eyebrow">{sheet.ageGroup} · {sheet.season}</div><h1>Boavista × {sheet.opponent||'Adversário'}</h1><p>{sheet.home?'Em casa':'Fora'} · {sheet.date.split('-').reverse().join('/')} {sheet.time&&`· ${sheet.time}`}</p></div><span className="ms-status">{sheet.status==='finished'?'Finalizada':sheet.status==='draft'?'Preparação':sheet.status==='interval'?'Intervalo':'Em jogo'}</span></div>
        <nav className="ms-tabs" aria-label="Etapas da ficha">{([['prepare','Preparar',Users],['live','Jogo',Goal],['report','Ficha',ClipboardList]] as const).map(([id,label,Icon])=><button key={id} onClick={()=>setTab(id)} aria-current={tab===id?'page':undefined}><Icon size={18}/>{label}</button>)}</nav>
        {tab==='prepare'&&<>
          <section className="ms-panel"><h2>Dados do jogo</h2><div className="ms-form-grid">
            <label className="ms-span">Jogo da agenda<select value={sheet.calendarId||''} disabled={!editable||sheet.status!=='draft'} onChange={e=>{const match=calendar.find(m=>m.id===e.target.value);change(d=>({...d,calendarId:match?.id||null,...(match?{opponent:match.opponent,date:match.match_date,time:match.match_time?.slice(0,5)||'',venue:match.location||'',competition:match.competition,home:match.venue_type==='casa'}:{})}));}}><option value="">Jogo particular / preencher manualmente</option>{calendar.map(m=><option key={m.id} value={m.id}>{m.match_date} · {m.opponent}</option>)}</select></label>
            <label>Adversário<input value={sheet.opponent} maxLength={120} disabled={!editable} onChange={e=>change(d=>({...d,opponent:e.target.value}))}/></label>
            <label>Competição<input value={sheet.competition} maxLength={120} disabled={!editable} onChange={e=>change(d=>({...d,competition:e.target.value}))}/></label>
            <label>Data<input type="date" value={sheet.date} disabled={!editable} onChange={e=>change(d=>({...d,date:e.target.value}))}/></label><label>Hora<input type="time" value={sheet.time} disabled={!editable} onChange={e=>change(d=>({...d,time:e.target.value}))}/></label>
            <label>Local<input value={sheet.venue} maxLength={160} disabled={!editable} onChange={e=>change(d=>({...d,venue:e.target.value}))}/></label><label>Campo<select value={sheet.home?'home':'away'} disabled={!editable} onChange={e=>change(d=>({...d,home:e.target.value==='home'}))}><option value="home">Casa</option><option value="away">Fora</option></select></label>
            <label>Responsável pela ficha<input value={sheet.recorder} maxLength={100} disabled={!editable} onChange={e=>change(d=>({...d,recorder:e.target.value}))}/></label><label>Época<input value={sheet.season} maxLength={20} disabled={!editable||sheet.status!=='draft'} onChange={e=>change(d=>({...d,season:e.target.value}))}/></label>
          </div><details className="ms-details"><summary>Formato e duração do jogo</summary><div className="ms-form-grid"><label>Formato<select value={sheet.rules.fieldSize} disabled={!editable||sheet.status!=='draft'} onChange={e=>change(d=>({...d,rules:{...d.rules,fieldSize:Number(e.target.value)}}))}>{[5,7,9,11].map(n=><option key={n} value={n}>Futebol {n}</option>)}</select></label><label>Minutos por período<input type="number" min="1" max="60" value={sheet.rules.periodMinutes} disabled={!editable||sheet.status!=='draft'} onChange={e=>change(d=>({...d,rules:{...d.rules,periodMinutes:Number(e.target.value)}}))}/></label><label>Períodos<input type="number" min="1" max="6" value={sheet.rules.periods} disabled={!editable||sheet.status!=='draft'} onChange={e=>change(d=>({...d,rules:{...d.rules,periods:Number(e.target.value)}}))}/></label><label className="ms-check"><input type="checkbox" checked={sheet.rules.reentry} disabled={!editable||sheet.status!=='draft'} onChange={e=>change(d=>({...d,rules:{...d.rules,reentry:e.target.checked}}))}/>Permitir reentradas</label></div><p className="ms-small">Confirma a duração e o formato previstos para este jogo.</p></details></section>
          <section className="ms-panel"><div className="ms-section-heading"><div><h2>Convocatória</h2><p>{sheet.squad.length} convocados · {sheet.squad.filter(p=>p.starter).length}/{sheet.rules.fieldSize} titulares</p></div><Users size={24}/></div>
            {sheet.status!=='draft'&&<p className="ms-small">A convocatória fica fixada após iniciar o jogo.</p>}
            {rosterLoading?<p>A carregar o plantel…</p>:!roster.length&&!sheet.squad.length?<p className="ms-empty">Não foram encontrados jogadores ativos. Associa ou completa o plantel deste escalão na gestão do clube.</p>:null}
            <div className="ms-roster">{Array.from(new Map([...roster,...sheet.squad].map(p=>[p.id,p])).values()).map(p=>{const selected=sheet.squad.find(s=>s.id===p.id);return <div className={`ms-player ${selected?'is-selected':''}`} key={p.id}><label className="ms-player-select"><input type="checkbox" checked={Boolean(selected)} disabled={!editable||sheet.status!=='draft'} onChange={e=>change(d=>({...d,squad:e.target.checked?[...d.squad,{...p,starter:false,captain:false}]:d.squad.filter(x=>x.id!==p.id)}))}/>{p.photo_url?<img src={p.photo_url} alt="" loading="lazy"/>:<span className="ms-avatar">{p.shirt_number||'—'}</span>}<span>{p.name}<small>{p.position||'Jogador'}</small></span></label>{selected&&<div className="ms-player-options"><label>N.º<input type="number" min="1" max="99" aria-label={`Número de ${p.name}`} value={selected.shirt_number??''} disabled={!editable||sheet.status!=='draft'} onChange={e=>change(d=>({...d,squad:d.squad.map(s=>s.id===p.id?{...s,shirt_number:e.target.value===''?null:Number(e.target.value)}:s)}))}/></label><label className="ms-check"><input type="checkbox" checked={selected.starter} disabled={!editable||sheet.status!=='draft'} onChange={e=>change(d=>({...d,squad:d.squad.map(s=>s.id===p.id?{...s,starter:e.target.checked}:s)}))}/>Titular</label><label className="ms-check"><input type="checkbox" checked={selected.captain} disabled={!editable||sheet.status!=='draft'} onChange={e=>change(d=>({...d,squad:d.squad.map(s=>({...s,captain:s.id===p.id?e.target.checked:false}))}))}/>Capitão</label></div>}</div>;})}</div>
          </section><button className="ms-primary ms-next" onClick={()=>{const issue=validateSheet({...sheet,status:'live'});if(issue)setError(issue);else setTab('live');}}><Play size={18}/>Ir para o jogo</button>
        </>}
        {tab==='live'&&live&&tally&&<div className="ms-match-grid"><div>
          <section className="ms-scoreboard"><div className="ms-score"><span>GDR Boavista</span><strong>{sheet.rules.recordGoals?`${tally.club} – ${tally.opponent}`:'×'}</strong><span>{sheet.opponent}</span></div><div className="ms-clock"><span>{sheet.clock.period}.º período</span><strong>{live.minute}{live.added?`+${live.added}`:''}:{String(live.seconds).padStart(2,'0')}</strong><span>{sheet.clock.startedAt?'A decorrer':'Parado'}</span></div>
            {editable&&<div className="ms-clock-actions">{sheet.status==='interval'&&sheet.clock.period<sheet.rules.periods?<button onClick={()=>setClock('next')}><Play size={17}/>Próximo período</button>:sheet.clock.startedAt?<button onClick={()=>setClock('pause')}><Pause size={17}/>Pausar</button>:<button onClick={()=>setClock('start')}><Play size={17}/>{sheet.status==='draft'?'Iniciar jogo':'Retomar'}</button>}{sheet.status!=='draft'&&sheet.status!=='interval'&&<button onClick={()=>setClock('interval')}>Intervalo</button>}<button onClick={()=>{const value=prompt('Minuto decorrido neste período:',String(Math.floor(live.elapsedMs/60000)));if(value!==null&&/^\d{1,3}$/.test(value)&&Number(value)<=120)change(d=>({...d,clock:{...d.clock,elapsedMs:Number(value)*60000,startedAt:d.clock.startedAt?Date.now():null}}));}}>Acertar relógio</button></div>}
          </section>
          {!sheet.rules.recordGoals&&<p className="ms-small">Este escalão usa vitória/derrota, sem registo de golos.</p>}
          <div className="ms-event-buttons">{sheet.rules.recordGoals&&<><button className="ms-primary" disabled={!editable||sheet.status==='draft'} onClick={()=>openEvent('goal')}><Goal/>Golo Boavista</button><button disabled={!editable||sheet.status==='draft'} onClick={()=>openEvent('goal','opponent')}><Goal/>Golo adversário</button></>}<button disabled={!editable||sheet.status==='draft'} onClick={()=>openEvent('yellow')}><span className="ms-card-icon yellow"/>Amarelo</button><button disabled={!editable||sheet.status==='draft'} onClick={()=>openEvent('red')}><span className="ms-card-icon red"/>Vermelho</button><button disabled={!editable||sheet.status==='draft'} onClick={()=>openEvent('substitution')}><ArrowLeftRight/>Substituição</button><button disabled={!editable||sheet.status==='draft'} onClick={()=>openEvent('note')}><StickyNote/>Nota</button></div>
          {sheet.status!=='draft'&&<button className="ms-next" onClick={()=>{if(editable&&sheet.clock.startedAt)setClock('pause');setTab('report');}}><Flag size={18}/>Rever e finalizar ficha</button>}
        </div><section className="ms-panel ms-timeline"><h2>Eventos do jogo</h2>{!sheet.events.length&&<p className="ms-empty">Os registos aparecem aqui, por minuto de jogo.</p>}{orderedEvents(sheet).reverse().map(e=><article key={e.id}><time>{eventMinute(e)}<small>{e.period}.º P</small></time><div><strong>{eventLabels[e.kind]}</strong><p>{eventDescription(sheet,e)}</p></div>{editable&&<div className="ms-event-edit"><button className="ms-icon" aria-label={`Corrigir ${eventLabels[e.kind]} aos ${eventMinute(e)}`} onClick={()=>setEvent({...e})}><Pencil size={16}/></button><button className="ms-icon" aria-label="Remover evento" onClick={()=>removeEvent(e.id)}><Trash2 size={16}/></button></div>}</article>)}</section></div>}
        {tab==='report'&&<>
          <section className="ms-panel"><div className="ms-section-heading"><h2>Fechar a ficha</h2><span className="ms-small">{stored?.revision?`Versão ${stored.revision}`:'Rascunho'}</span></div>{!sheet.rules.recordGoals&&<label>Resultado<select value={sheet.outcome} disabled={!editable} onChange={e=>change(d=>({...d,outcome:e.target.value as MatchSheet['outcome']}))}><option value="">Selecionar</option><option value="win">Vitória</option><option value="loss">Derrota</option></select></label>}<label>Observações finais<textarea value={sheet.notes} rows={4} maxLength={4000} disabled={!editable} onChange={e=>change(d=>({...d,notes:e.target.value}))}/></label>
            <div className="ms-actions">{editable?<button className="ms-primary" onClick={()=>{if(confirm('Confirmas que os dados e eventos foram revistos?'))change(d=>({...d,status:'finished',clock:{...d.clock,elapsedMs:clockAt(d).elapsedMs,startedAt:null}}),true);}}><Check size={18}/>Finalizar ficha</button>:sheet.status==='finished'&&owned&&canCreate(sheet.ageGroup)&&<button onClick={()=>{if(confirm('Reabrir para corrigir? O próximo envio terá uma nova versão.'))change(d=>({...d,status:'live'}));}}><Pencil size={17}/>Reabrir para corrigir</button>}<button onClick={()=>window.print()}><Printer size={18}/>Imprimir</button><button disabled={!savedReady||sending} onClick={()=>void pdf()}><Download size={18}/>Descarregar PDF</button><button disabled={!savedReady||sheet.status!=='finished'||!owned||!canCreate(sheet.ageGroup)||sending} onClick={()=>setMailOpen(true)}><Mail size={18}/>Enviar por email</button></div>
            {!savedReady&&<p className="ms-small">Podes imprimir a versão local ou guardá-la como PDF no diálogo de impressão. Para descarregar o PDF do servidor ou enviar por email, sincroniza a ficha.</p>}
            {deliveries.length>0&&<details className="ms-details"><summary>Histórico de envios</summary>{deliveries.map(d=><p className="ms-small" key={d.id}>v{d.revision} · {d.recipients.join(', ')} · {d.status==='sent'?'Aceite pelo serviço de email':d.status==='pending'?'A confirmar':'Falhou'} · {new Date(d.created_at).toLocaleString('pt-PT')}</p>)}</details>}
          </section><PrintSheet sheet={sheet} revision={stored?.revision||0} pending={Boolean(stored?.dirty||localSaving||storageError)}/>
        </>}
        {tab!=='report'&&<div className="ms-print-only"><PrintSheet sheet={sheet} revision={stored?.revision||0} pending={Boolean(stored?.dirty)}/></div>}
      </>}
    </div>
    {event&&sheet&&<EventDialog sheet={sheet} event={event} onSave={saveEvent} onClose={()=>setEvent(null)} error={error}/>}
    {mailOpen&&sheet&&<Modal onClose={()=>{if(!sending)setMailOpen(false);}} title="Enviar a ficha"><form onSubmit={sendEmail}><p>Boavista × {sheet.opponent} · {sheet.ageGroup}<br/>PDF da versão {stored?.revision}</p><label>Destinatários<textarea required rows={3} value={recipients} onChange={e=>setRecipients(e.target.value)} placeholder="treinador@exemplo.pt; diretor@exemplo.pt"/></label><p className="ms-small">Até 5 endereços, separados por ponto e vírgula. Confirma os destinatários antes de enviar.</p>{error&&<p className="ms-error" role="alert">{error}</p>}<button className="ms-primary" disabled={sending}>{sending?'A enviar…':'Confirmar e enviar'}<Mail size={18}/></button></form></Modal>}
  </main>;
}

function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:React.ReactNode}){
  const ref=useRef<HTMLDialogElement>(null);useEffect(()=>{ref.current?.showModal();},[]);
  return <dialog ref={ref} className="ms-dialog" onCancel={e=>{e.preventDefault();onClose();}} aria-labelledby="ms-dialog-title"><div className="ms-dialog-heading"><h2 id="ms-dialog-title">{title}</h2><button className="ms-icon" aria-label="Fechar" onClick={onClose}><X size={22}/></button></div>{children}</dialog>;
}
function EventDialog({sheet,event,onSave,onClose,error}:{sheet:MatchSheet;event:SheetEvent;onSave:(e:SheetEvent)=>void;onClose:()=>void;error:string}){
  const [draft,setDraft]=useState(event),state=lineup(sheet),editing=sheet.events.some(e=>e.id===event.id);
  const outgoing=editing?sheet.squad:sheet.squad.filter(p=>state.onField.has(p.id));
  const incoming=editing?sheet.squad:sheet.squad.filter(p=>!state.onField.has(p.id)&&!state.dismissed.has(p.id)&&(sheet.rules.reentry||!state.used.has(p.id)));
  const playerOptions=(players:RosterPlayer[])=>players.map(p=><option value={p.id} key={p.id}>{p.shirt_number?`${p.shirt_number} · `:''}{p.name}</option>);
  return <Modal title={`${editing?'Corrigir':'Registar'} ${eventLabels[draft.kind].toLowerCase()}`} onClose={onClose}><form onSubmit={e=>{e.preventDefault();onSave(draft);}}>
    <div className="ms-form-grid ms-event-time"><label>Período<select value={draft.period} onChange={e=>setDraft({...draft,period:Number(e.target.value)})}>{Array.from({length:sheet.rules.periods},(_,i)=><option key={i} value={i+1}>{i+1}.º período</option>)}</select></label><label>Minuto<input type="number" required min="0" max="360" value={draft.minute} onChange={e=>setDraft({...draft,minute:Number(e.target.value)})}/></label><label>Acréscimo<input type="number" required min="0" max="60" value={draft.added} onChange={e=>setDraft({...draft,added:Number(e.target.value)})}/></label></div>
    {!['substitution','note'].includes(draft.kind)&&<label>Equipa<select value={draft.side} onChange={e=>setDraft({...draft,side:e.target.value as SheetEvent['side'],player:''})}><option value="club">GDR Boavista</option><option value="opponent">Adversário</option></select></label>}
    {draft.kind==='substitution'?<><label>Sai<select required value={draft.player} onChange={e=>setDraft({...draft,player:e.target.value})}><option value="">Selecionar jogador</option>{playerOptions(outgoing)}</select></label><label>Entra<select required value={draft.incoming} onChange={e=>setDraft({...draft,incoming:e.target.value})}><option value="">Selecionar jogador</option>{playerOptions(incoming)}</select></label></>:draft.kind!=='note'&&draft.side==='club'&&<label>Jogador<select required={draft.kind!=='goal'} value={draft.player} onChange={e=>setDraft({...draft,player:e.target.value})}><option value="">{draft.kind==='goal'?'Indicar depois':'Selecionar jogador'}</option>{playerOptions(sheet.squad)}</select></label>}
    {['yellow','second_yellow'].includes(draft.kind)&&<label className="ms-check"><input type="checkbox" checked={draft.kind==='second_yellow'} onChange={e=>setDraft({...draft,kind:e.target.checked?'second_yellow':'yellow'})}/>Segundo amarelo / expulsão</label>}
    {draft.kind==='goal'&&<label className="ms-check"><input type="checkbox" checked={draft.ownGoal} onChange={e=>setDraft({...draft,ownGoal:e.target.checked})}/>Autogolo — conta para a outra equipa</label>}
    <label>{draft.kind==='note'?'Observação':'Nota (opcional)'}<textarea rows={2} maxLength={1500} required={draft.kind==='note'} value={draft.note} onChange={e=>setDraft({...draft,note:e.target.value})}/></label>
    {error&&<p className="ms-error" role="alert">{error}</p>}<div className="ms-actions"><button type="button" onClick={onClose}>Cancelar</button><button className="ms-primary" type="submit"><Check size={18}/>Registar</button></div>
  </form></Modal>;
}
function PrintSheet({sheet,revision,pending}:{sheet:MatchSheet;revision:number;pending:boolean}){
  const result=score(sheet);return <section className="ms-print-sheet"><header><img src={logo} alt="GDR Boavista" width="65"/><div><h2>GDR BOAVISTA</h2><p>Ficha interna de jogo · {sheet.ageGroup} · {sheet.season}</p><small>{sheet.status==='finished'?'Finalizada':'Rascunho'} · v{revision}{pending?' · alterações locais por sincronizar':''}</small></div></header>
    <h3>GDR Boavista × {sheet.opponent}</h3><p>{sheet.date.split('-').reverse().join('/')} · {sheet.time||'Hora não indicada'} · {sheet.home?'Casa':'Fora'} · {sheet.venue||'Local não indicado'}</p><p>{sheet.competition||'Jogo particular'} · {sheet.rules.periods} × {sheet.rules.periodMinutes} min · Futebol {sheet.rules.fieldSize}</p>
    <p><strong>Resultado: </strong>{sheet.rules.recordGoals?`${result.club} – ${result.opponent}`:sheet.outcome==='win'?'Vitória':sheet.outcome==='loss'?'Derrota':'Por indicar'}</p>
    <h3>Convocatória</h3><table><thead><tr><th>N.º</th><th>Jogador</th><th>Condição inicial</th></tr></thead><tbody>{sheet.squad.map(p=><tr key={p.id}><td>{p.shirt_number??'—'}</td><td>{p.name}{p.captain?' (C)':''}</td><td>{p.starter?'Titular':'Suplente'}</td></tr>)}</tbody></table>
    <h3>Eventos</h3>{sheet.events.length?<table><thead><tr><th>Minuto</th><th>Evento</th><th>Detalhe</th></tr></thead><tbody>{orderedEvents(sheet).map(e=><tr key={e.id}><td>{eventMinute(e)} · {e.period}.º P</td><td>{eventLabels[e.kind]}</td><td>{eventDescription(sheet,e)}</td></tr>)}</tbody></table>:<p>Sem eventos registados.</p>}
    <h3>Observações</h3><p className="ms-preserve">{sheet.notes||'Sem observações.'}</p><footer><p>Responsável: {sheet.recorder||'Por indicar'}</p><small>Ficha interna de acompanhamento · {sheet.id} · Não substitui a ficha oficial da competição.</small></footer>
  </section>;
}
function SettingsPanel({context,onSaved,onError}:{context:Context;onSaved:()=>void;onError:(e:string)=>void}){
  const [group,setGroup]=useState(''),[key,setKey]=useState(''),[email,setEmail]=useState(''),[readOnly,setReadOnly]=useState(false),[busy,setBusy]=useState(false);
  const selected=context.teams.find(t=>t.age_group===group);
  async function assign(remove=false){setBusy(true);try{const address=email.includes('@')?email.trim():`${email.trim().toLowerCase()}@gdrboavista.local`;const {error}=await supabase.rpc('gdrb_sheet_grant',{p_email:address,p_group:group,p_edit:!readOnly,p_remove:remove});if(error)throw new Error(error.message);onError(remove?'Acesso removido.':'Acesso guardado.');onSaved();}catch(e){onError(readableError(e));}finally{setBusy(false);}}
  return <section className="ms-panel ms-settings"><h2>Configuração do módulo</h2><label>Escalão<select value={group} onChange={e=>{setGroup(e.target.value);setKey(context.teams.find(t=>t.age_group===e.target.value)?.roster_key||'');}}><option value="">Selecionar</option>{context.teams.map(t=><option key={t.age_group}>{t.age_group}</option>)}</select></label>{selected&&<><form onSubmit={async e=>{e.preventDefault();setBusy(true);try{const {error}=await supabase.from('gdrb_match_sheet_teams').update({roster_key:key.trim()||null}).eq('age_group',group);if(error)throw error;onSaved();}catch{onError('Não foi possível associar o plantel.');}finally{setBusy(false);}}}><label>Identificador do plantel<input value={key} onChange={e=>setKey(e.target.value)} placeholder="Ex.: senior ou junior"/></label><p className="ms-small">Usa o identificador da equipa já existente nos plantéis. Não são criados jogadores automaticamente.</p><button disabled={busy}>Guardar associação</button></form><hr/><h3>Acesso de uma conta existente</h3><label>Utilizador ou email<input value={email} onChange={e=>setEmail(e.target.value)}/></label><label className="ms-check"><input type="checkbox" checked={readOnly} onChange={e=>setReadOnly(e.target.checked)}/>Apenas consulta</label><div className="ms-actions"><button disabled={busy||!email.trim()} onClick={()=>void assign()}>Atribuir acesso</button><button disabled={busy||!email.trim()} onClick={()=>{if(confirm('Remover o acesso desta conta ao escalão?'))void assign(true);}}>Remover acesso</button></div></>}</section>;
}
