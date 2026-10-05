import { isOutcomeOnly, outcomeLabel } from '../../lib/ageGroups';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { getResultTeams } from '../../lib/homeAgenda';
import type { GdrbMatch } from '../../types/database';

export function RecentResults({ matches }: { matches: GdrbMatch[] }) {
  if (matches.length === 0) return null;

  return (
    <section className="bg-[#f6f2ec] py-14 md:py-20" aria-labelledby="recent-results-title">
      <div className="mx-auto max-w-7xl px-5 md:px-4">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.32em] text-red-700">Dentro de campo</p>
            <h2 id="recent-results-title" className="mt-4 font-serif text-3xl font-light text-[#24180f] md:text-5xl">Últimos resultados</h2>
            <p className="mt-3 text-sm text-zinc-600">Resultados confirmados dos jogos dos últimos 7 dias.</p>
          </div>
          <Link to="/resultados" className="inline-flex items-center justify-center gap-2 rounded-md bg-red-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-800">
            Ver todos os resultados <ChevronRight size={16} />
          </Link>
        </div>
        <div className="mt-7 grid gap-4 md:mt-10 md:grid-cols-2">
          {matches.map((match) => (
            <article key={match.id} className="rounded-2xl border border-zinc-200 bg-white p-5 md:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-red-700">{match.team_name}</span>
                <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-700">{match.football_type}</span>
                <span className="rounded-full bg-[#24180f] px-3 py-1 text-xs font-bold uppercase text-white">{match.venue_type === 'fora' ? 'Fora' : match.venue_type === 'casa' ? 'Casa' : 'Campo neutro'}</span>
              </div>
              {isOutcomeOnly(match.team_name) && <p className="mt-4 text-xl font-black text-red-700">{outcomeLabel(match)}</p>}
              <div className="my-5 space-y-3">
                {getResultTeams(match).map((team, index) => (
                  <div key={index} className="flex items-center justify-between gap-4">
                    {team.isBoavista ? (
                      <h3 className="min-w-0 font-serif text-2xl text-[#24180f] md:text-3xl">{team.name}</h3>
                    ) : (
                      <p className="min-w-0 text-sm font-bold uppercase tracking-wide text-zinc-500">{team.name}</p>
                    )}
                    {!isOutcomeOnly(match.team_name) && <span className={`shrink-0 tabular-nums ${team.isBoavista ? 'text-3xl font-black text-red-700' : 'text-2xl font-bold text-zinc-500'}`} aria-label={`${team.score} golos`}>{team.score}</span>}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap justify-between gap-2 border-t border-zinc-100 pt-3 text-xs text-zinc-500">
                <time dateTime={match.match_date}>{new Date(`${match.match_date}T12:00:00Z`).toLocaleDateString('pt-PT', { timeZone: 'Europe/Lisbon', weekday: 'short', day: '2-digit', month: 'short' })}</time>
                <span>Terminado</span>
              </div>
              <p className="mt-2 text-xs text-zinc-500">{match.competition}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
