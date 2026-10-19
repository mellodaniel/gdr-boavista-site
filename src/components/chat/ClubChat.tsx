import { useEffect, useRef, useState } from 'react';
import { ArrowUp, ArrowUpRight, CalendarDays, RotateCcw, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { lisbonClock } from '../../lib/clubChat';
import type { ChatAnswer } from '../../lib/clubChatData';
import { isOutcomeOnly, outcomeLabel } from '../../lib/ageGroups';
import { getResultTeams } from '../../lib/homeAgenda';
import type { GdrbMatch } from '../../types/database';
import './clubChat.css';

type Message = ChatAnswer & { id: number; role: 'user' | 'assistant'; retry?: string };
const initial: Message = { id: 0, role: 'assistant', text: 'Olá! Sou o Bô, o assistente com inteligência artificial do Boavista. Posso ajudar com jogos, treinos, notícias, sócios, loja e informação do clube.', choices: ['Próximo jogo dos Seniores', 'Jogos dos Juvenis este mês', 'Qual é o escalão do meu filho?', 'Horários de treino'] };
function MatchCard({ match }: { match: GdrbMatch }) {
  const teams = getResultTeams(match);
  const pending = match.status === 'agendado' && match.match_date < lisbonClock().date;
  const status = match.status === 'terminado' ? isOutcomeOnly(match.team_name) ? outcomeLabel(match) : match.home_score != null && match.away_score != null ? teams.map(t => t.score).join(' – ') : 'Resultado por confirmar' : pending ? 'Resultado por confirmar' : match.status === 'adiado' ? 'Adiado' : 'Agendado';
  return <article className="club-chat-match">
    <div className="club-chat-match-top"><span>{match.team_name}</span><span>{match.venue_type === 'fora' ? 'Fora' : 'Casa'}</span></div>
    <strong>{teams[0].name} <span className="club-chat-versus">vs</span> {teams[1].name}</strong>
    <p><CalendarDays size={14} aria-hidden="true" />{new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Lisbon' }).format(new Date(`${match.match_date}T12:00:00Z`))} · {match.match_time?.slice(0, 5) || 'Hora por confirmar'}</p>
    <p>{match.location || 'Local por confirmar'}</p><p className="club-chat-competition">{match.competition}</p>
    <span className="club-chat-status">{status}</span>
  </article>;
}

export default function ClubChat() {
  const [open, setOpen] = useState(false), [input, setInput] = useState(''), [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Message[]>([initial]);
  const id = useRef(0), pending = useRef<AbortController | null>(null);
  const dialog = useRef<HTMLDialogElement>(null), launcher = useRef<HTMLButtonElement>(null), inputRef = useRef<HTMLInputElement>(null), log = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const element = dialog.current!;
    element.showModal();
    const overflow = document.body.style.overflow;
    const trigger = launcher.current;
    document.body.style.overflow = 'hidden';
    return () => { element.close(); document.body.style.overflow = overflow; trigger?.focus(); };
  }, [open]);
  useEffect(() => { if (open) log.current?.scrollTo({ top: log.current.scrollHeight, behavior: 'instant' }); }, [messages, busy, open]);
  useEffect(() => () => pending.current?.abort(), []);
  function reset() { pending.current?.abort(); pending.current = null; setBusy(false); setMessages([initial]); setInput(''); inputRef.current?.focus(); }
  async function send(value: string) {
    const question = value.trim();
    if (!question || question.length > 240 || pending.current) return;
    setInput(''); setMessages(old => [...old, { id: ++id.current, role: 'user', text: question }]);
    const controller = new AbortController(); pending.current = controller; setBusy(true);
    const timeout = window.setTimeout(() => controller.abort(), 60000);
    try {
      const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal, body: JSON.stringify({ question, history: messages.filter(m => m.id !== 0).slice(-8).map(m => ({ role: m.role, text: m.text.slice(0, 1000) })) }) });
      const answer: ChatAnswer = await response.json();
      if (pending.current !== controller) return;
      if (controller.signal.aborted) throw new Error('timeout');
      setMessages(old => [...old, { ...answer, role: 'assistant', id: ++id.current }]);
    } catch {
      if (pending.current === controller) setMessages(old => [...old, { id: ++id.current, role: 'assistant', text: 'Não consegui consultar os dados agora. Verifica a ligação e tenta novamente. Não vou apresentar informação antiga como atual.', retry: question }]);
    } finally {
      window.clearTimeout(timeout);
      if (pending.current === controller) { pending.current = null; setBusy(false); inputRef.current?.focus(); }
    }
  }
  return <>
    <button ref={launcher} type="button" className="club-chat-launcher" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open} aria-label="Abrir chat com o Bô"><img className="club-chat-avatar" src="/chat/bo.png" alt="" width="48" height="48" /><span>Fala com o Bô<small>O assistente com IA do Boavista</small></span></button>
    {open && <dialog ref={dialog} className="club-chat-dialog" aria-labelledby="club-chat-title" onCancel={() => setOpen(false)} onClick={e => { if (e.target === e.currentTarget) { const rect = e.currentTarget.getBoundingClientRect(); if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) setOpen(false); } }}>
      <header className="club-chat-header"><div className="club-chat-emblem"><img src="/chat/bo.png" alt="Bô, o leitão do Boavista" width="56" height="56" /></div><div className="club-chat-heading"><span className="club-chat-eyebrow">SEMPRE PELO BOAVISTA</span><h2 id="club-chat-title">Bô · Boavista</h2><p><span />Assistente com inteligência artificial</p></div><div className="club-chat-actions"><button type="button" onClick={() => setOpen(false)} className="club-chat-icon" aria-label="Fechar assistente" autoFocus><X size={21} /></button><button type="button" onClick={reset} className="club-chat-icon" aria-label="Limpar conversa" title="Limpar conversa"><RotateCcw size={15} /></button></div></header>
      <div ref={log} className="club-chat-log" role="log" aria-label="Conversa com o assistente" aria-live="polite" aria-relevant="additions">
        <div className="club-chat-date">O teu clube. Mais perto.</div>
        {messages.map(message => <div key={message.id} className={`club-chat-message club-chat-${message.role}`}>
          {message.role === 'assistant' && <span className="club-chat-author">BÔ</span>}
          <div className="club-chat-bubble"><p>{message.text}</p>
            {message.matches?.map(match => <MatchCard key={match.id} match={match} />)}
            {message.schedules?.map(schedule => <article className="club-chat-match" key={schedule.name}><strong>{schedule.name}</strong>{schedule.sessions.map((session, i) => <p key={i}>{session.days.join(' e ')}<br /><b>{session.time}</b></p>)}</article>)}
            {message.source && <p className="club-chat-source">Fonte: {message.source}{message.consultedAt && <><br />Consultado às {new Intl.DateTimeFormat('pt-PT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Lisbon' }).format(new Date(message.consultedAt))} · a consulta não confirma alterações na origem.</>}</p>}
            {message.sources?.map(source => <p className="club-chat-source" key={source.id}>{source.url ? <a href={source.url} target="_blank" rel="noopener noreferrer">{source.name} ↗</a> : source.name}{source.checkedAt && <> · {new Intl.DateTimeFormat('pt-PT', {dateStyle:'short', timeZone:'Europe/Lisbon'}).format(new Date(source.checkedAt))}</>}</p>)}
            {message.href && <Link className="club-chat-link" to={message.href} onClick={() => setOpen(false)}>{message.linkLabel}<ArrowUpRight size={15} /></Link>}
            {message.retry && <button type="button" className="club-chat-link" disabled={busy} onClick={() => void send(message.retry!)}>Tentar novamente</button>}
          </div>
          {!!message.choices?.length && <div className="club-chat-choices">{message.choices.map(choice => <button key={choice} type="button" disabled={busy} onClick={() => void send(choice)}>{choice}<ArrowUpRight size={13} /></button>)}</div>}
        </div>)}
        {busy && <div className="club-chat-wait" role="status">A consultar a informação do clube…</div>}
      </div>
      <form className="club-chat-form" onSubmit={e => { e.preventDefault(); void send(input); }}><label className="sr-only" htmlFor="club-chat-input">A tua pergunta</label><div className="club-chat-input-wrap"><input ref={inputRef} id="club-chat-input" value={input} onChange={e => setInput(e.target.value)} placeholder="Pergunta sobre o teu clube…" maxLength={240} autoComplete="off" /><button type="submit" disabled={busy || !input.trim()} aria-label="Enviar pergunta"><ArrowUp size={20} /></button></div><p>As mensagens são enviadas à OpenAI para responder.<br />Evita partilhar dados pessoais. <a href="/privacidade-bo.html" target="_blank" rel="noopener noreferrer">Privacidade</a></p></form>
    </dialog>}
  </>;
}
