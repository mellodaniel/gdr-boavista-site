import { CalendarDays, MapPin } from 'lucide-react';
import type { GdrbMatch } from '../../types/database';
import { lisbonDate, upcomingMatches } from './calendar.js';

type Props = { matches: GdrbMatch[]; value: string | null; disabled: boolean; loading: boolean; online: boolean; selected: { opponent: string; date: string }; onChange: (match: GdrbMatch | undefined) => void };
const dateLabel = (date: string) => date ? new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Lisbon' }).format(new Date(`${date}T12:00:00Z`)) : 'Data por definir';
const venueLabel = (match: GdrbMatch) => match.venue_type === 'casa' ? 'Casa' : match.venue_type === 'fora' ? 'Fora' : 'Local por confirmar';
export function MatchCalendarPicker({ matches, value, disabled, loading, online, selected, onChange }: Props) {
  const today = lisbonDate();
  const upcoming = upcomingMatches(matches, today);
  const current = upcoming.find(m => m.id === value);
  const months = [...new Set(upcoming.map(m => m.match_date.slice(0, 7)))];
  return <div className="ms-calendar ms-span">
    <label htmlFor="ms-calendar-select">Jogo da agenda</label>
    <p id="ms-calendar-help" className="ms-calendar-help">Só jogos de hoje e futuros. Os mais próximos aparecem primeiro.</p>
    <select id="ms-calendar-select" value={current ? current.id : value ? '' : 'manual'} disabled={disabled || loading} aria-describedby="ms-calendar-help" onChange={e => onChange(upcoming.find(m => m.id === e.target.value))}>
      {value && !current && <option value="" disabled>{loading ? 'A carregar agenda…' : 'Escolher outro jogo da agenda'}</option>}
      {months.map(month => <optgroup key={month} label={new Date(`${month}-01T12:00:00Z`).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric', timeZone: 'UTC' })}>
        {upcoming.filter(m => m.match_date.startsWith(month)).map(m => <option key={m.id} value={m.id}>{m.match_date === today ? 'Hoje' : m.match_date.slice(8,10)+'/'+m.match_date.slice(5,7)} · {m.opponent} · {venueLabel(m)}{m.match_time ? ' · '+m.match_time.slice(0,5) : ' · Hora a confirmar'}</option>)}
      </optgroup>)}
      <option value="manual">Jogo particular / preencher manualmente</option>
    </select>
    {value ? <div className="ms-calendar-current"><CalendarDays size={19} aria-hidden="true"/><div><strong>{selected.opponent}</strong><span>{dateLabel(selected.date)}{current ? ` · ${current.match_time?.slice(0,5) || 'Hora por confirmar'} · ${venueLabel(current)}` : ' · Jogo associado a esta ficha'}</span>{current?.competition && <span>{current.competition}</span>}{current?.location && <span><MapPin size={12} aria-hidden="true"/>{current.location}</span>}</div></div> : <p className="ms-calendar-help">Seleciona um jogo acima para preencher os dados, ou continua com o preenchimento manual.</p>}
    {!loading && !upcoming.length && <p className="ms-calendar-help" role="status">{online ? 'Não há jogos futuros disponíveis para este escalão.' : 'Sem ligação à agenda. Os dados desta ficha continuam disponíveis.'}</p>}
  </div>;
}
