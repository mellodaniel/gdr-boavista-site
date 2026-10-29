import { MatchCalendarPicker } from './MatchCalendarPicker';
import {useFeedback} from '../../components/feedback/useFeedback';
import {OpponentBadgeField} from './OpponentBadgeField';
import { FanSharing } from './FanSharing';
import { VoiceObservation } from './VoiceObservation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowLeftRight, Check, ChevronRight, ClipboardList, Download, Flag, Goal, Link, Archive, RotateCcw, Search, Mail, Pause, Pencil, Play, Plus, Printer, RefreshCw, StickyNote, Trash2, Users, WifiOff, X } from 'lucide-react';
import type { GdrbMatch } from '../../types/database';
import type { EventKind, MatchSheet, RosterPlayer, SheetDelivery, SheetEvent, SheetTeam, SheetAction, StoredSheet } from './types';
import { updateMatchClock, playerParticipation, formatPlayingTime, clockAt, eventDescription, eventLabels, eventMinute, lineup, newSheet, orderedEvents, MATCH_SHEET_CLUB_NAME, matchPresentation, validateSheet } from './model.js';
import { localRead, localWrite, SheetRepository } from './storage';
import { accessFromLink, workspaceRequest, type SharedAccess } from './shared-access';
import './match-sheet.css';

const logo='/logo-gdr-boavista-clean-1024.png';
const readableError=(e:unknown)=>e instanceof Error?e.message:'Não foi possível concluir. Tenta novamente.';
function Brand(){return <div className="ms-brand"><img src={logo} alt={`Emblema do ${MATCH_SHEET_CLUB_NAME}`} width="64" height="72"/><div><strong>{MATCH_SHEET_CLUB_NAME}</strong><span>Ficha de jogo</span></div></div>;}
function download(blob:Blob,name:string){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function apiRequest(access:SharedAccess,id:string,revision:number,body?:object){
  const response=await fetch(body?'/api/match-sheet':`/api/match-sheet?id=${encodeURIComponent(id)}&revision=${revision}`,{method:body?'POST':'GET',headers:{'X-Match-Sheet-Key':access.key,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify({id,revision,...body}):undefined,cache:'no-store',referrerPolicy:'no-referrer'});
  if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.error||'Não foi possível concluir. Verifica a ligação.');}
  return response;
}
export default function MatchSheetPage(){
  useEffect(()=>{if(import.meta.env.PROD&&'serviceWorker' in navigator)void navigator.serviceWorker.register('/ficha-sw.js',{scope:'/ficha-de-jogo'}).catch(()=>{});},[]);
  const [access,setAccess]=useState<SharedAccess|null>(null),[ready,setReady]=useState(false);
  useEffect(()=>{let active=true;void accessFromLink().then(value=>{if(active)setAccess(value);}).finally(()=>{if(active)setReady(true);});return()=>{active=false;};},[]);
  if(!ready)return <main className="ms-app"><div className="ms-loading">A abrir as fichas de jogo…</div></main>;
  if(!access)return <main className="ms-app ms-login"><section className="ms-panel"><Brand/><div className="ms-eyebrow">ACESSO POR LINK</div><h1>As fichas da tua equipa.</h1><p>Abre o link completo partilhado pelo clube para criar e gerir as fichas, sem login.</p><p className="ms-small">Guarda esse link nos favoritos do telemóvel para o próximo jogo.</p></section></main>;
  return <MatchWorkspace key={access.scope} access={access}/>;
}
type Access={age_group:string;can_edit:boolean};
type Context={teams:SheetTeam[];admin:boolean;access:Access[]};
function MatchWorkspace({access}:{access:SharedAccess}){
  const repository=useMemo(()=>new SheetRepository(access),[access]);
  const [context,setContext]=useState<Context>({teams:[],admin:false,access:[]});
  const [params]=useSearchParams(),navigate=useNavigate();const selected=params.get('ficha');
  const setParams=(values:Record<string,string>)=>navigate({search:new URLSearchParams(values).toString(),hash:window.location.hash});
  const [sheet,setSheet]=useState<MatchSheet|null>(null),current=useRef<MatchSheet|null>(null),loadedRevision=useRef(-1);
  const [,redraw]=useState(0);const [ready,setReady]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useFeedback('');
  const [online,setOnline]=useState(navigator.onLine),[tab,setTab]=useState<'prepare'|'live'|'report'>('prepare');
  const [teamName,setTeamName]=useState(''),[roster,setRoster]=useState<RosterPlayer[]>([]),[rosterLoading,setRosterLoading]=useState(false);
  const [calendar,setCalendar]=useState<GdrbMatch[]>([]),[event,setEvent]=useState<SheetEvent|null>(null);
  const [mailOpen,setMailOpen]=useState(false),[recipients,setRecipients]=useState(''),[sending,setSending]=useState(false),[deliveries,setDeliveries]=useState<SheetDelivery[]>([]);
  const [localSaving,setLocalSaving]=useState(0),[storageError,setStorageError]=useState(false);
  const [filter,setFilter]=useState('draft'),[query,setQuery]=useState(''),[groupFilter,setGroupFilter]=useState('');
  const [manageTarget,setManageTarget]=useState<{id:string;action:SheetAction}|null>(null),[managing,setManaging]=useState(false);
  const mailAttempt=useRef<{key:string;id:string}|null>(null);
  const canCreate=(name:string)=>context.admin||context.access.some(a=>a.age_group===name&&a.can_edit);
  const stored=repository.records.find(r=>r.document.id===sheet?.id);
  const owned=!stored||stored.owner===access.scope;
  const editable=Boolean(sheet&&owned&&canCreate(sheet.ageGroup)&&sheet.status!=='finished'&&!stored?.conflict&&!stored?.archivedAt&&!stored?.deletedAt&&!managing);
  const [now,setNow]=useState(Date.now());
  useEffect(()=>{const tick=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(tick);},[]);
  const reloadContext=useCallback(async()=>{
    const c=await workspaceRequest<Context>(access,{action:'context'});await localWrite(access.scope+':context',c);setContext(c);
  },[access]);
  useEffect(()=>{
    let active=true;const unsub=repository.subscribe(()=>{if(active)redraw(n=>n+1);});
    const connection=()=>{setOnline(navigator.onLine);if(navigator.onLine)void repository.sync().then(()=>repository.refresh()).catch(e=>setError(readableError(e)));};
    const interval=setInterval(connection,15000);window.addEventListener('online',connection);window.addEventListener('offline',connection);document.addEventListener('visibilitychange',resume);
    function resume(){if(!document.hidden)connection();}
    void (async()=>{
      try {await repository.load();const cache=await localRead<Context>(access.scope+':context');if(cache&&active)setContext(cache);if(active)setReady(true);if(navigator.onLine){await reloadContext();await repository.sync();await repository.refresh();}}
      catch(e){if(active){setError(readableError(e));setReady(true);}}
    })();
    return()=>{active=false;unsub();clearInterval(interval);window.removeEventListener('online',connection);window.removeEventListener('offline',connection);document.removeEventListener('visibilitychange',resume);};
  },[repository,reloadContext,access.scope]);
  // Load a selected document only on navigation; acknowledgements never replace current edits.
  useEffect(()=>{
    if(!ready||localSaving||storageError)return;
    if(!selected){current.current=null;setSheet(null);return;}
    const record=repository.records.find(r=>r.document.id===selected);
    if(current.current?.id===selected&&(record?.dirty||record?.localVersion!==0||loadedRevision.current===record?.revision))return;
    if(record){const document=structuredClone(record.document);current.current=document;loadedRevision.current=record.revision;setSheet(document);setTab(document.status==='draft'?'prepare':document.status==='finished'?'report':'live');}
  },[selected,ready,repository,repository.records,localSaving,storageError]);
  useEffect(()=>{
    if(!sheet)return;let active=true;setRoster([]);setCalendar([]);setRosterLoading(true);
    const group=sheet.ageGroup,key=access.scope+':roster:'+group;
    void (async()=>{
      try{const cached=await localRead<RosterPlayer[]>(key);if(cached&&active)setRoster(cached);
        if(navigator.onLine){const data=await workspaceRequest<{players:RosterPlayer[];calendar:GdrbMatch[]}>(access,{action:'roster',group});
          await localWrite(key,data.players);if(active){setRoster(data.players);setCalendar(data.calendar);}}

      }catch(e){if(active)setError(readableError(e));}finally{if(active)setRosterLoading(false);}
    })();return()=>{active=false;};
  },[sheet?.ageGroup,access.scope]);
  useEffect(()=>{
    if(!sheet||tab!=='report'||!online)return;let active=true;
    void workspaceRequest<SheetDelivery[]>(access,{action:'deliveries',id:sheet.id}).then(data=>{if(active)setDeliveries(data);}).catch(e=>{if(active)setError(readableError(e));});return()=>{active=false;};
  },[sheet?.id,tab,online,notice]);
  useEffect(()=>{
    const warn=(e:BeforeUnloadEvent)=>{if(localSaving||storageError||repository.records.some(r=>r.dirty&&!r.deletedAt)){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);
  },[localSaving,storageError,repository]);
  function change(fn:(doc:MatchSheet)=>MatchSheet,validate=false){
    if(!current.current||stored?.archivedAt||stored?.deletedAt||managing)return false;
    const next=fn(structuredClone(current.current));const issue=validate?validateSheet(next):null;if(issue){setError(issue);return false;}
    current.current=next;setSheet(next);setError('');setStorageError(false);setLocalSaving(n=>n+1);
    void repository.save(next).catch(e=>{setStorageError(true);setError(`Não foi possível guardar neste dispositivo. Mantém esta página aberta e guarda uma cópia. ${readableError(e)}`);}).finally(()=>setLocalSaving(n=>n-1));return true;
  }
  function create(){if(navigator.storage?.persist)void navigator.storage.persist();const team=context.teams.find(t=>t.age_group===teamName);if(!team||!canCreate(teamName))return;if(!team.roster_key){setError('Este escalão ainda não tem plantel associado. O administrador pode associá-lo em Configuração.');return;}const doc=newSheet(team,'');current.current=doc;setSheet(doc);setTab('prepare');setParams({ficha:doc.id});change(d=>d);}
  async function sync(){setError('');try{await repository.sync();await repository.refresh();}catch(e){setError(readableError(e));}}
  function exportBackup(){if(sheet)download(new Blob([JSON.stringify({document:sheet,revision:stored?.revision||0},null,2)],{type:'application/json'}),`ficha-${sheet.date}-${sheet.id.slice(0,8)}.json`);}
  async function shareLink(){try{await navigator.clipboard.writeText(`${window.location.origin}/ficha-de-jogo${sheet?'?ficha='+encodeURIComponent(sheet.id):''}#acesso=${access.key}`);setNotice('Link copiado. Quem receber o link pode criar, editar e gerir as fichas.');}catch{setError('Não foi possível copiar. Podes copiar o link completo na barra de endereços.');}}
  async function manage(){if(!manageTarget)return;setManaging(true);setError('');try{await repository.manage(manageTarget.id,manageTarget.action);setNotice(manageTarget.action==='trash'?'Ficha movida para o lixo. Podes restaurá-la no separador Lixo.':manageTarget.action==='archive'?'Ficha arquivada.':'Ficha restaurada.');setParams({});setManageTarget(null);}catch(e){setError(readableError(e));setManageTarget(null);}finally{setManaging(false);}}
  function openEvent(kind:EventKind,side:'club'|'opponent'='club'){if(!sheet)return;const time=clockAt(sheet);setEvent({id:crypto.randomUUID(),kind,side,period:time.period,minute:time.minute,added:time.added,player:'',incoming:'',ownGoal:false,note:'',createdAt:new Date().toISOString()});}
  function saveEvent(e:SheetEvent){if(change(d=>({...d,events:[...d.events.filter(x=>x.id!==e.id),e]}),true)){setEvent(null);setNotice(`${eventLabels[e.kind]} registado.`);}}
  function removeEvent(id:string){if(!confirm('Remover este evento? A alteração fica no histórico da ficha.'))return;change(d=>({...d,events:d.events.filter(e=>e.id!==id)}),true);}
  function setClock(action:'start'|'pause'|'interval'|'next'){
    change(d=>updateMatchClock(d,action),true);
  }
  async function pdf(){if(!sheet||!stored)return;setSending(true);try{const response=await apiRequest(access,sheet.id,stored.revision);download(await response.blob(),`GDRBoavista-Ficha-${sheet.date}-v${stored.revision}.pdf`);}catch(e){setError(readableError(e));}finally{setSending(false);}}
  async function sendEmail(e:FormEvent){e.preventDefault();if(!sheet||!stored)return;setSending(true);setError('');try{
    const list=[...new Set(recipients.split(/[;,\n]/).map(x=>x.trim().toLowerCase()).filter(Boolean))];if(!list.length||list.length>5)throw new Error('Indica entre 1 e 5 endereços de email.');
    const key=JSON.stringify([sheet.id,stored.revision,list]);const savedAttempt=await localRead<{key:string;id:string}>(access.scope+':email:'+key);if(mailAttempt.current?.key!==key)mailAttempt.current=savedAttempt||{key,id:crypto.randomUUID()};await localWrite(access.scope+':email:'+key,mailAttempt.current);
    await apiRequest(access,sheet.id,stored.revision,{recipients:list,requestId:mailAttempt.current.id});
    setNotice('Ficha aceite pelo serviço de email. Consulta os destinatários no histórico de envios.');setMailOpen(false);await localWrite(access.scope+':email:'+key,null);mailAttempt.current=null;
  }catch(e){setError(readableError(e));}finally{setSending(false);}}
  const live=sheet?clockAt(sheet,now):null,tally=sheet?matchPresentation(sheet):null;
  const syncLabel=storageError?'Falha ao guardar':localSaving?'A guardar…':stored?.conflict?'Conflito entre dispositivos':stored?.dirty?'Guardado no dispositivo · por sincronizar':stored?'Disponível nos outros dispositivos':'A preparar';
  const savedReady=Boolean(stored&&!stored.dirty&&!stored.deletedAt&&!localSaving&&!storageError&&online);
  const buckets=[['draft','Em preparação'],['live','Em curso'],['finished','Finalizadas']];
  const searchStates=[...buckets,['archive','Arquivadas'],['trash','Apagadas (lixo)'],['all','Todos os estados']];
  const inBucket=(r:StoredSheet,b:string)=>b==='all'?true:b==='trash'?Boolean(r.deletedAt):b==='archive'?!r.deletedAt&&Boolean(r.archivedAt):!r.deletedAt&&!r.archivedAt&&(b==='live'?['live','interval'].includes(r.document.status):r.document.status===b);
  const normalized=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const filtered=repository.records.filter(r=>inBucket(r,filter)&&(!groupFilter||r.document.ageGroup===groupFilter)&&normalized(`${r.document.opponent} ${r.document.recorder} ${r.document.competition} ${r.document.date}`).includes(normalized(query.trim()))).sort((a,b)=>b.document.date.localeCompare(a.document.date)||b.updatedAt.localeCompare(a.updatedAt));
  const actionTarget=repository.records.find(r=>r.document.id===manageTarget?.id);
  return <main className="ms-app">
    <header className="ms-top"><Brand/><div className="ms-top-actions">{!online&&<span className="ms-offline"><WifiOff size={16}/>Sem ligação</span>}<button className="ms-icon" onClick={()=>void shareLink()} aria-label="Copiar link de acesso"><Link size={20}/></button></div></header>
    <div className="ms-container">
      {error&&<div className="ms-error ms-alert" role="alert"><span>{error}</span><button className="ms-icon" aria-label="Fechar aviso" onClick={()=>setError('')}><X size={18}/></button></div>}
      {notice&&<div className="ms-notice ms-alert" data-feedback role="status"><span>{notice}</span><button className="ms-icon" aria-label="Fechar confirmação" onClick={()=>setNotice('')}><X size={18}/></button></div>}
      {!ready?<div className="ms-panel">A carregar as fichas…</div>:!sheet?<>
        <div className="ms-page-title"><div className="ms-eyebrow">DIA DE JOGO</div><h1>Fichas de jogo.</h1><p>Prepara o próximo jogo e mantém o histórico da tua equipa organizado.</p></div>
        <section className="ms-panel ms-new"><label>Escalão<select value={teamName} onChange={e=>setTeamName(e.target.value)}><option value="">Selecionar escalão</option>{context.teams.filter(t=>canCreate(t.age_group)).map(t=><option key={t.age_group}>{t.age_group}</option>)}</select></label><button className="ms-primary" disabled={!teamName} onClick={create}><Plus size={20}/>Nova ficha</button></section>
        {!context.teams.length&&<p className="ms-empty">Ainda não foi possível carregar os escalões. Confirma a ligação e se estás a usar o link completo.</p>}
        <div className="ms-section-heading"><h2>As fichas de jogo</h2><button onClick={()=>void sync()} disabled={!online}><RefreshCw size={16}/>Atualizar</button></div>
        <nav className="ms-filters" aria-label="Fichas por estado">{buckets.map(([id,label])=><button key={id} onClick={()=>{setNotice('');setFilter(id);}} aria-pressed={filter===id}>{label}<span>{repository.records.filter(r=>inBucket(r,id)).length}</span></button>)}</nav>
        <div className="ms-search-row ms-search-with-status"><label><span><Search size={15}/> Pesquisar fichas</span><input type="search" value={query} onChange={e=>{setNotice('');setQuery(e.target.value);}} placeholder="Adversário, responsável ou data"/></label><label>Estado das fichas<select value={filter} onChange={e=>{setNotice('');setFilter(e.target.value);}}>{searchStates.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><label>Escalão<select value={groupFilter} onChange={e=>{setNotice('');setGroupFilter(e.target.value);}}><option value="">Todos os escalões</option>{context.teams.map(t=><option key={t.age_group}>{t.age_group}</option>)}</select></label></div>
        <p className="ms-search-summary" role="status">{searchStates.find(([id])=>id===filter)?.[1]} · {filtered.length} {filtered.length===1?'ficha encontrada':'fichas encontradas'}</p>
        {filter==='archive'&&<p className="ms-small">Consulta as fichas arquivadas ou retira-as do arquivo para voltarem à lista de finalizadas.</p>}
        {filter==='trash'&&<p className="ms-small">As fichas apagadas ficam aqui e podem ser restauradas. Não são eliminadas automaticamente.</p>}
        <div className="ms-sheets">{filtered.map(r=><article className="ms-sheet-item" key={r.document.id}><button className="ms-sheet-card" onClick={()=>{setParams({ficha:r.document.id});setNotice('');setError('');}}><div><span className="ms-eyebrow">{r.document.ageGroup} · {r.document.date.split('-').reverse().join('/')}</span><strong>{matchPresentation(r.document).title}</strong><small>{r.deletedAt?'No lixo':r.archivedAt?'Arquivada':r.document.status==='finished'?'Finalizada':r.document.status==='draft'?'Em preparação':'Jogo em curso'} · {r.dirty?'Guardada neste dispositivo':`Versão ${r.revision}`}</small><small>{r.document.recorder||'Responsável por indicar'}</small>{r.error&&<span className="ms-card-error">{r.error}</span>}</div><ChevronRight size={22}/></button><SheetActions record={r} online={online} busy={managing||Boolean(localSaving)||storageError} onAction={action=>setManageTarget({id:r.document.id,action})}/></article>)}</div>
        {!filtered.length&&<div className="ms-empty"><ClipboardList size={32}/><p>{repository.records.length?'Não há fichas com estes filtros.':'Começa por escolher o escalão e criar a primeira ficha.'}</p></div>}
      </>:<>
        <div className="ms-sheet-heading"><button className="ms-back" onClick={()=>{if(localSaving||storageError){setError('Aguarda a gravação. Se existir uma falha, guarda uma cópia e mantém esta página aberta.');return;}setParams({});setNotice('');}}><ArrowLeft size={17}/>Fichas</button><span className="ms-save-state" aria-live="polite">{syncLabel}</span><button className="ms-icon" aria-label="Sincronizar ficha" onClick={()=>void sync()} disabled={!online}><RefreshCw size={18}/></button></div>
        {(stored?.error||storageError)&&<div className="ms-error"><p>{stored?.error||'Guarda uma cópia antes de fechar.'}</p><div className="ms-actions"><button onClick={exportBackup}><Download size={17}/>Guardar cópia</button>{stored?.conflict&&<button onClick={()=>{if(confirm('Já guardaste a cópia? Carregar o servidor substitui as alterações locais desta ficha.'))void repository.replaceFromServer(sheet.id).then(d=>{current.current=d;setSheet(d);}).catch(e=>setError(readableError(e)));}}>Carregar servidor</button>}</div></div>}
        {stored&&(stored.archivedAt||stored.deletedAt)&&<p className="ms-notice">{stored.deletedAt?'Esta ficha está no lixo. Restaura-a para voltar a utilizá-la.':'Esta ficha está arquivada e pode ser consultada ou impressa.'}</p>}
        {stored&&<SheetActions record={stored} online={online} busy={managing||Boolean(localSaving)||storageError} onAction={action=>setManageTarget({id:stored.document.id,action})}/>}
        {!owned&&<p className="ms-notice">Modo de consulta. Esta ficha pertence a outro responsável.</p>}
        <div className="ms-title-row"><div><div className="ms-eyebrow">{sheet.ageGroup} · {sheet.season}</div><h1>{matchPresentation(sheet).title}</h1><p>{sheet.home?'Em casa':'Fora'} · {sheet.date.split('-').reverse().join('/')} {sheet.time&&`· ${sheet.time}`}</p></div><span className="ms-status">{sheet.status==='finished'?'Finalizada':sheet.status==='draft'?'Preparação':sheet.status==='interval'?'Intervalo':'Em jogo'}</span></div>
        <FanSharing key={sheet.id} accessKey={access.key} id={sheet.id} enabled={sheet.fanLiveEnabled===true} synced={savedReady} disabled={!owned||!canCreate(sheet.ageGroup)||!online||Boolean(stored?.conflict||stored?.archivedAt||stored?.deletedAt||localSaving||storageError||managing)} onToggle={value=>change(d=>({...d,fanLiveEnabled:value}))}/>
        <nav className="ms-tabs" aria-label="Etapas da ficha">{([['prepare','Preparar',Users],['live','Jogo',Goal],['report','Ficha',ClipboardList]] as const).map(([id,label,Icon])=><button key={id} onClick={()=>setTab(id)} aria-current={tab===id?'page':undefined}><Icon size={18}/>{label}</button>)}</nav>
        {tab==='prepare'&&<>
          <section className="ms-panel"><h2>Dados do jogo</h2><p className="ms-small">A preparação é guardada automaticamente, mesmo sem convocatória. Com ligação à internet, podes continuar noutro dispositivo usando o mesmo link da equipa.</p><div className="ms-form-grid">
            <MatchCalendarPicker key={sheet.ageGroup} matches={calendar} value={sheet.calendarId} disabled={!editable||sheet.status!=='draft'} loading={rosterLoading} online={online} selected={{opponent:sheet.opponent,date:sheet.date}} onChange={match=>{change(d=>({...d,calendarId:match?.id||null,...(match?{opponent:match.opponent,opponentBadgeUrl:repository.records.find(r=>r.document.opponent.trim().toLowerCase()===match.opponent.trim().toLowerCase()&&r.document.opponentBadgeUrl)?.document.opponentBadgeUrl||'',date:match.match_date,time:match.match_time?.slice(0,5)||'',venue:match.location||'',competition:match.competition,home:match.venue_type==='casa'}:{})}));}}/>

            <label>Adversário<input value={sheet.opponent} maxLength={120} disabled={!editable} onChange={e=>change(d=>({...d,opponent:e.target.value,opponentBadgeUrl:repository.records.find(r=>r.document.opponent.trim().toLowerCase()===e.target.value.trim().toLowerCase()&&r.document.opponentBadgeUrl)?.document.opponentBadgeUrl||''}))}/></label>
            <OpponentBadgeField name={sheet.opponent} value={sheet.opponentBadgeUrl||''} disabled={!editable} onChange={opponentBadgeUrl=>change(d=>({...d,opponentBadgeUrl}))}/>
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
          <section className="ms-scoreboard"><div className="ms-score"><span>{tally.first.name}</span><strong>{tally.result}</strong><span>{tally.second.name}</span></div><div className="ms-clock"><span>{sheet.clock.period}.º período</span><strong>{live.minute}{live.added?`+${live.added}`:''}:{String(live.seconds).padStart(2,'0')}</strong><span>{sheet.clock.startedAt?'A decorrer':'Parado'}</span></div>
            {editable&&<div className="ms-clock-actions">{sheet.status==='interval'&&sheet.clock.period<sheet.rules.periods?<button onClick={()=>setClock('next')}><Play size={17}/>Próximo período</button>:sheet.clock.startedAt?<button onClick={()=>setClock('pause')}><Pause size={17}/>Pausar</button>:<button onClick={()=>setClock('start')}><Play size={17}/>{sheet.status==='draft'?'Iniciar jogo':'Retomar'}</button>}{sheet.status!=='draft'&&sheet.status!=='interval'&&<button onClick={()=>setClock('interval')}>Intervalo</button>}<button onClick={()=>{const value=prompt('Minuto decorrido neste período:',String(Math.floor(live.elapsedMs/60000)));if(value!==null&&/^\d{1,3}$/.test(value)&&Number(value)<=120)change(d=>({...d,clock:{...d.clock,elapsedMs:Number(value)*60000,startedAt:d.clock.startedAt?Date.now():null}}));}}>Acertar relógio</button></div>}
          </section>
          <div className="ms-event-buttons">{<><button className="ms-primary" disabled={!editable||sheet.status==='draft'} onClick={()=>openEvent('goal')}><EventIcon kind="goal"/>Golo {MATCH_SHEET_CLUB_NAME}</button><button disabled={!editable||sheet.status==='draft'} onClick={()=>openEvent('goal','opponent')}><EventIcon kind="goal"/>Golo adversário</button></>}<button disabled={!editable||sheet.status==='draft'} onClick={()=>openEvent('yellow')}><span className="ms-card-icon yellow"/>Amarelo</button><button disabled={!editable||sheet.status==='draft'} onClick={()=>openEvent('red')}><span className="ms-card-icon red"/>Vermelho</button><button disabled={!editable||sheet.status==='draft'} onClick={()=>openEvent('substitution')}><ArrowLeftRight/>Substituição</button><button disabled={!editable||sheet.status==='draft'} onClick={()=>openEvent('note')}><StickyNote/>Nota</button></div>
          <PlayersOnField sheet={sheet} now={now}/>{sheet.status!=='draft'&&<button className="ms-next" onClick={()=>{if(editable&&sheet.clock.startedAt)setClock('pause');setTab('report');}}><Flag size={18}/>Rever e finalizar ficha</button>}
        </div><section className="ms-panel ms-timeline"><h2>Eventos do jogo</h2>{!sheet.events.length&&<p className="ms-empty">Os registos aparecem aqui, por minuto de jogo.</p>}{orderedEvents(sheet).reverse().map(e=><article key={e.id}><time>{eventMinute(e)}<small>{e.period}.º P</small></time><div><strong><EventIcon kind={e.kind}/></strong><p>{eventDescription(sheet,e)}</p></div>{editable&&<div className="ms-event-edit"><button className="ms-icon" aria-label={`Corrigir ${eventLabels[e.kind]} aos ${eventMinute(e)}`} onClick={()=>setEvent({...e})}><Pencil size={16}/></button><button className="ms-icon" aria-label="Remover evento" onClick={()=>removeEvent(e.id)}><Trash2 size={16}/></button></div>}</article>)}</section></div>}
        {tab==='report'&&<>
          <section className="ms-panel"><div className="ms-section-heading"><h2>Fechar a ficha</h2><span className="ms-small">{stored?.revision?`Versão ${stored.revision}`:'Rascunho'}</span></div><label>Observações finais<textarea value={sheet.notes} rows={4} maxLength={4000} disabled={!editable} onChange={e=>change(d=>({...d,notes:e.target.value}))}/></label><VoiceObservation key={sheet.id} accessKey={access.key} value={sheet.notes} maxLength={4000} disabled={!editable} onAdd={notes=>change(d=>({...d,notes}))}/>
            <div className="ms-actions">{editable?<button className="ms-primary" onClick={()=>{if(confirm('Confirmas que os dados e eventos foram revistos?'))change(d=>updateMatchClock(d,'finish'),true);}}><Check size={18}/>Finalizar ficha</button>:sheet.status==='finished'&&owned&&canCreate(sheet.ageGroup)&&!stored?.archivedAt&&!stored?.deletedAt&&<button onClick={()=>{if(confirm('Reabrir para corrigir? O próximo envio terá uma nova versão.'))change(d=>({...d,status:'live'}));}}><Pencil size={17}/>Reabrir para corrigir</button>}<button onClick={()=>window.print()}><Printer size={18}/>Imprimir</button><button disabled={!savedReady||sending} onClick={()=>void pdf()}><Download size={18}/>Descarregar PDF</button><button disabled={!savedReady||Boolean(stored?.archivedAt)||sheet.status!=='finished'||!owned||!canCreate(sheet.ageGroup)||sending} onClick={()=>setMailOpen(true)}><Mail size={18}/>Enviar por email</button></div>
            {!savedReady&&<p className="ms-small">Podes imprimir a versão local ou guardá-la como PDF no diálogo de impressão. Para descarregar o PDF do servidor ou enviar por email, sincroniza a ficha.</p>}
            {deliveries.length>0&&<details className="ms-details"><summary>Histórico de envios</summary>{deliveries.map(d=><p className="ms-small" key={d.id}>v{d.revision} · {d.recipients.join(', ')} · {d.status==='sent'?'Aceite pelo serviço de email':d.status==='pending'?'A confirmar':'Falhou'} · {new Date(d.created_at).toLocaleString('pt-PT')}</p>)}</details>}
          </section><PrintSheet sheet={sheet} revision={stored?.revision||0} pending={Boolean(stored?.dirty||localSaving||storageError)}/>
        </>}
        {tab!=='report'&&<div className="ms-print-only"><PrintSheet sheet={sheet} revision={stored?.revision||0} pending={Boolean(stored?.dirty)}/></div>}
      </>}
    </div>
    {manageTarget&&actionTarget&&<Modal title={manageTarget.action==='trash'?'Apagar ficha?':manageTarget.action==='archive'?'Arquivar ficha?':'Restaurar ficha?'} onClose={()=>{if(!managing)setManageTarget(null);}}><p><strong>{matchPresentation(actionTarget.document).title}</strong><br/>{actionTarget.document.ageGroup} · {actionTarget.document.date.split('-').reverse().join('/')}</p><p>{manageTarget.action==='trash'?'A ficha vai para o lixo e pode ser restaurada mais tarde.':manageTarget.action==='archive'?'A ficha sai da lista principal e fica disponível no Arquivo para consulta e impressão.':'A ficha volta a ficar disponível no estado em que estava antes.'}</p><div className="ms-actions"><button disabled={managing} onClick={()=>setManageTarget(null)}>Cancelar</button><button className="ms-primary" disabled={managing} onClick={()=>void manage()}>{managing?'A guardar…':manageTarget.action==='trash'?'Mover para o lixo':manageTarget.action==='archive'?'Arquivar':'Restaurar'}</button></div></Modal>}
    {event&&sheet&&<EventDialog accessKey={access.key} sheet={sheet} event={event} onSave={saveEvent} onClose={()=>setEvent(null)} error={error}/>}
    {mailOpen&&sheet&&<Modal onClose={()=>{if(!sending)setMailOpen(false);}} title="Enviar a ficha"><form onSubmit={sendEmail}><p>{matchPresentation(sheet).title} · {sheet.ageGroup}<br/>PDF da versão {stored?.revision}</p><label>Destinatários<textarea required rows={3} value={recipients} onChange={e=>setRecipients(e.target.value)} placeholder="treinador@exemplo.pt; diretor@exemplo.pt"/></label><p className="ms-small">Até 5 endereços, separados por ponto e vírgula. Confirma os destinatários antes de enviar.</p>{error&&<p className="ms-error" role="alert">{error}</p>}<button className="ms-primary" disabled={sending}>{sending?'A enviar…':'Confirmar e enviar'}<Mail size={18}/></button></form></Modal>}
  </main>;
}

function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:React.ReactNode}){
  const ref=useRef<HTMLDialogElement>(null);useEffect(()=>{ref.current?.showModal();},[]);
  return <dialog ref={ref} className="ms-dialog" onCancel={e=>{e.preventDefault();onClose();}} aria-labelledby="ms-dialog-title"><div className="ms-dialog-heading"><h2 id="ms-dialog-title">{title}</h2><button className="ms-icon" aria-label="Fechar" onClick={onClose}><X size={22}/></button></div>{children}</dialog>;
}
function EventDialog({accessKey,sheet,event,onSave,onClose,error}:{accessKey:string;sheet:MatchSheet;event:SheetEvent;onSave:(e:SheetEvent)=>void;onClose:()=>void;error:string}){
  const [draft,setDraft]=useState(event),state=lineup(sheet),editing=sheet.events.some(e=>e.id===event.id);
  const outgoing=editing?sheet.squad:sheet.squad.filter(p=>state.onField.has(p.id));
  const incoming=editing?sheet.squad:sheet.squad.filter(p=>!state.onField.has(p.id)&&!state.dismissed.has(p.id)&&(sheet.rules.reentry||!state.used.has(p.id)));
  const playerOptions=(players:RosterPlayer[])=>players.map(p=><option value={p.id} key={p.id}>{p.shirt_number?`${p.shirt_number} · `:''}{p.name}</option>);
  return <Modal title={`${editing?'Corrigir':'Registar'} ${eventLabels[draft.kind].toLowerCase()}`} onClose={onClose}><form onSubmit={e=>{e.preventDefault();onSave(draft);}}>
    <div className="ms-form-grid ms-event-time"><label>Período<select value={draft.period} onChange={e=>setDraft({...draft,period:Number(e.target.value)})}>{Array.from({length:sheet.rules.periods},(_,i)=><option key={i} value={i+1}>{i+1}.º período</option>)}</select></label><label>Minuto<input type="number" required min="0" max="360" value={draft.minute} onChange={e=>setDraft({...draft,minute:Number(e.target.value)})}/></label><label>Acréscimo<input type="number" required min="0" max="60" value={draft.added} onChange={e=>setDraft({...draft,added:Number(e.target.value)})}/></label></div>
    {!['substitution','note'].includes(draft.kind)&&<label>Equipa<select value={draft.side} onChange={e=>setDraft({...draft,side:e.target.value as SheetEvent['side'],player:''})}><option value="club">{MATCH_SHEET_CLUB_NAME}</option><option value="opponent">Adversário</option></select></label>}
    {draft.kind==='substitution'?<><label>Sai<select required value={draft.player} onChange={e=>setDraft({...draft,player:e.target.value})}><option value="">Selecionar jogador</option>{playerOptions(outgoing)}</select></label><label>Entra<select required value={draft.incoming} onChange={e=>setDraft({...draft,incoming:e.target.value})}><option value="">Selecionar jogador</option>{playerOptions(incoming)}</select></label></>:draft.kind!=='note'&&draft.side==='club'&&<label>Jogador<select required={draft.kind!=='goal'} value={draft.player} onChange={e=>setDraft({...draft,player:e.target.value})}><option value="">{draft.kind==='goal'?'Indicar depois':'Selecionar jogador'}</option>{playerOptions(sheet.squad)}</select></label>}
    {['yellow','second_yellow'].includes(draft.kind)&&<label className="ms-check"><input type="checkbox" checked={draft.kind==='second_yellow'} onChange={e=>setDraft({...draft,kind:e.target.checked?'second_yellow':'yellow'})}/>Segundo amarelo / expulsão</label>}
    {draft.kind==='goal'&&<label className="ms-check"><input type="checkbox" checked={draft.ownGoal} onChange={e=>setDraft({...draft,ownGoal:e.target.checked})}/>Autogolo — conta para a outra equipa</label>}
    <label>{draft.kind==='note'?'Observação':'Nota (opcional)'}<textarea rows={2} maxLength={1500} required={draft.kind==='note'} value={draft.note} onChange={e=>setDraft({...draft,note:e.target.value})}/></label><VoiceObservation accessKey={accessKey} value={draft.note} maxLength={1500} onAdd={note=>setDraft(d=>({...d,note}))}/>
    {error&&<p className="ms-error" role="alert">{error}</p>}<div className="ms-actions"><button type="button" onClick={onClose}>Cancelar</button><button className="ms-primary" type="submit"><Check size={18}/>Registar</button></div>
  </form></Modal>;
}
function PrintSheet({sheet,revision,pending}:{sheet:MatchSheet;revision:number;pending:boolean}){
  const result=matchPresentation(sheet), participation=playerParticipation(sheet);return <section className="ms-print-sheet"><header><img src={logo} alt={MATCH_SHEET_CLUB_NAME} width="65"/><div><h2>{MATCH_SHEET_CLUB_NAME}</h2><p>Ficha interna de jogo · {sheet.ageGroup} · {sheet.season}</p><small>{sheet.status==='finished'?'Finalizada':'Rascunho'} · v{revision}{pending?' · alterações locais por sincronizar':''}</small></div></header>
    <h3>{result.title}</h3><p>{sheet.date.split('-').reverse().join('/')} · {sheet.time||'Hora não indicada'} · {sheet.home?'Casa':'Fora'} · {sheet.venue||'Local não indicado'}</p><p>{sheet.competition||'Jogo particular'} · {sheet.rules.periods} × {sheet.rules.periodMinutes} min · Futebol {sheet.rules.fieldSize}</p>
    <p><strong>Resultado: </strong>{result.result}</p>
    <h3>Convocatória</h3><table><thead><tr><th>N.º</th><th>Jogador</th><th>Condição inicial</th><th>Minutos</th></tr></thead><tbody>{sheet.squad.map(p=><tr key={p.id}><td>{p.shirt_number??'—'}</td><td>{p.name}{p.captain?' (C)':''}</td><td>{p.starter?'Titular':'Suplente'}</td><td>{formatPlayingTime(participation.players.find(row=>row.id===p.id)?.elapsedMs||0)}</td></tr>)}</tbody></table>
    <p className="ms-small">Minutos calculados pelos registos de jogo, incluindo acréscimos e reentradas; excluem o intervalo.{participation.estimated?' Estimativa: faltam durações de períodos ou o relógio não acompanha os eventos.':''}</p><h3>Eventos</h3>{sheet.events.length?<table><thead><tr><th>Minuto</th><th>Evento</th><th>Detalhe</th></tr></thead><tbody>{orderedEvents(sheet).map(e=><tr key={e.id}><td>{eventMinute(e)} · {e.period}.º P</td><td><span className="ms-event-label"><EventIcon kind={e.kind}/>{eventLabels[e.kind]}</span></td><td>{eventDescription(sheet,e)}</td></tr>)}</tbody></table>:<p>Sem eventos registados.</p>}
    <h3>Observações</h3><p className="ms-preserve">{sheet.notes||'Sem observações.'}</p><footer><p>Responsável: {sheet.recorder||'Por indicar'}</p><small>Ficha interna de acompanhamento · {sheet.id} · Não substitui a ficha oficial da competição.</small></footer>
  </section>;
}
function SheetActions({record,online,busy,onAction}:{record:StoredSheet;online:boolean;busy:boolean;onAction:(action:SheetAction)=>void}){
  const unavailable=busy||(!online&&record.revision>0)||Boolean(record.revision>0&&(record.dirty||record.conflict));
  return <div className="ms-manage-actions">
    {record.deletedAt?<button disabled={unavailable} onClick={()=>onAction('restore')}><RotateCcw size={16}/>Restaurar</button>:<>
      {record.archivedAt?<button disabled={unavailable} onClick={()=>onAction('unarchive')}><RotateCcw size={16}/>Retirar do arquivo</button>:record.document.status==='finished'&&<button disabled={unavailable||record.revision===0} onClick={()=>onAction('archive')}><Archive size={16}/>Arquivar</button>}
      <button className="ms-danger" disabled={unavailable} onClick={()=>onAction('trash')}><Trash2 size={16}/>Apagar</button>
    </>}
    {unavailable&&!busy&&<span className="ms-small">{!online?'Requer ligação à internet.':'Sincroniza a ficha antes de a gerir.'}</span>}
  </div>;
}

function PlayersOnField({sheet,now}:{sheet:MatchSheet;now:number}) {
  const participation=playerParticipation(sheet,now);
  const groups=[{label:'Em campo',players:participation.players.filter(p=>p.onField)}, {label:'Banco',players:participation.players.filter(p=>!p.onField&&!p.dismissed)}, {label:'Expulsos',players:participation.players.filter(p=>p.dismissed)}];
  return <section className="ms-panel ms-participation"><h2>Quem está em campo</h2><p className="ms-small">{sheet.status==='draft'?'Equipa inicial prevista · jogo por iniciar':'Minutos de participação, incluindo acréscimos'}{participation.estimated?' · estimativa: rever durações dos períodos e relógio':''}</p><div className="ms-participation-groups">{groups.map(group=><div key={group.label}><h3>{group.label} · {group.players.length}</h3>{group.players.length?group.players.map(p=><div className="ms-participation-player" key={p.id}><span><strong>{p.shirt_number??'—'} · {p.name}{(p.dismissed||p.yellow)&&<CardBadge kind={p.dismissed?'red':'yellow'}/>}</strong><small>{p.dismissed?null:!p.used?'Ainda não utilizado':!p.onField?(sheet.rules.reentry?'Pode reentrar':'Já substituído'):p.starter?'Titular':'Entrou durante o jogo'}</small></span><b>{formatPlayingTime(p.elapsedMs)}</b></div>):<p className="ms-small">Nenhum jogador</p>}</div>)}</div></section>;
}

function CardBadge({kind}:{kind:EventKind}) {
  const label=kind==='second_yellow'?'Segundo amarelo e expulsão':kind==='red'?'Cartão vermelho':'Cartão amarelo';
  return <span className="ms-card-badge" role="img" aria-label={label} title={label}>{kind==='second_yellow'&&<span className="ms-card-icon yellow" aria-hidden="true"/>}<span className={`ms-card-icon ${kind==='yellow'?'yellow':'red'}`} aria-hidden="true"/></span>;
}

function EventIcon({kind}:{kind:EventKind}) {
  if(kind==='yellow'||kind==='second_yellow'||kind==='red')return <CardBadge kind={kind}/>;
  return <span className="ms-event-symbol" role="img" aria-label={eventLabels[kind]} title={eventLabels[kind]}>{kind==='goal'?<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="white" stroke="currentColor" strokeWidth="1.7"/><path d="M12 7 16.8 10.5 15 16.1H9L7.2 10.5Z" fill="currentColor"/><path d="M12 7V2M16.8 10.5 21.5 9M15 16.1 18 20M9 16.1 6 20M7.2 10.5 2.5 9" stroke="currentColor" strokeWidth="1.5"/></svg>:kind==='substitution'?<ArrowLeftRight size={24} aria-hidden="true"/>:<StickyNote size={24} aria-hidden="true"/>}</span>;
}
