import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Filter, MapPin, Search, ShieldCheck, Trophy } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { GdrbMatch, GdrbTournament } from '../../types/database';

const teamOptions = [
  'Todos',
  'Petizes / ABC',
  'Traquinas',
  'Benjamins',
  'Infantis',
  'Iniciados',
  'Juvenis',
  'Juniores',
  'Seniores',
  'Veteranos',
];

const footballTypeOptions = [
  'Todos',
  'Futebol 5',
  'Futebol 7',
  'Futebol 9',
  'Futebol 11',
];

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('pt-PT', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatDateShort(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('pt-PT', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
}

function formatTournamentDate(tournament: GdrbTournament) {
  const start = formatDate(tournament.start_date);

  if (!tournament.end_date || tournament.end_date === tournament.start_date) {
    return start;
  }

  return `${start} a ${formatDate(tournament.end_date)}`;
}

function formatMatchStatus(status: string) {
  const labels: Record<string, string> = {
    agendado: 'Agendado',
    terminado: 'Terminado',
    adiado: 'Adiado',
    cancelado: 'Cancelado',
  };

  return labels[status] ?? status;
}

function getMatchResult(match: GdrbMatch) {
  if (match.venue_type === 'fora') {
    return {
      firstTeam: match.opponent,
      firstScore: match.away_score,
      secondTeam: 'GDR Boavista',
      secondScore: match.home_score,
    };
  }

  return {
    firstTeam: 'GDR Boavista',
    firstScore: match.home_score,
    secondTeam: match.opponent,
    secondScore: match.away_score,
  };
}

function getMatchMotivation(match: GdrbMatch) {
  if (match.venue_type === 'fora') {
    return {
      label: 'Jogo fora',
      title: 'O Boavista vai à luta',
      phrase: 'Fora de casa, a garra é a mesma.',
      topClass: 'bg-zinc-950',
      badgeClass: 'bg-zinc-950 text-white',
    };
  }

  return {
    label: 'Jogo em casa',
    title: 'Todos ao Campo da Boavista',
    phrase: 'Em casa, joga-se com todos nós.',
    topClass: 'bg-red-700',
    badgeClass: 'bg-red-700 text-white',
  };
}

function matchesDateRange(date: string, startDate: string, endDate: string) {
  const matchesStartDate = !startDate || date >= startDate;
  const matchesEndDate = !endDate || date <= endDate;

  return matchesStartDate && matchesEndDate;
}

function tournamentMatchesDateRange(
  tournament: GdrbTournament,
  startDate: string,
  endDate: string,
) {
  const tournamentEnd = tournament.end_date || tournament.start_date;
  const matchesStartDate = !startDate || tournamentEnd >= startDate;
  const matchesEndDate = !endDate || tournament.start_date <= endDate;

  return matchesStartDate && matchesEndDate;
}

export function ResultsPage() {
  const [matches, setMatches] = useState<GdrbMatch[]>([]);
  const [tournaments, setTournaments] = useState<GdrbTournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [teamFilter, setTeamFilter] = useState('Todos');
  const [footballTypeFilter, setFootballTypeFilter] = useState('Todos');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadGamesAndTournaments() {
      setIsLoading(true);

      const [matchesResult, tournamentsResult] = await Promise.all([
        supabase
          .from('gdrb_matches')
          .select('*')
          .eq('is_visible', true)
          .order('match_date', { ascending: true })
          .order('match_time', { ascending: true }),

        supabase
          .from('gdrb_tournaments')
          .select('*')
          .eq('is_visible', true)
          .order('start_date', { ascending: true })
          .order('sort_order', { ascending: true }),
      ]);

      if (matchesResult.error) {
        console.error('Erro ao carregar jogos:', matchesResult.error);
      }

      if (tournamentsResult.error) {
        console.error('Erro ao carregar torneios:', tournamentsResult.error);
      }

      setMatches(matchesResult.data ?? []);
      setTournaments(tournamentsResult.data ?? []);
      setIsLoading(false);
    }

    loadGamesAndTournaments();
  }, []);

  const filteredMatches = useMemo(() => {
    return matches.filter((match) => {
      const matchSearch =
        `${match.team_name} ${match.football_type} ${match.competition} ${match.opponent} ${match.location ?? ''} ${formatMatchStatus(match.status)}`
          .toLowerCase()
          .trim();

      const matchesTeam =
        teamFilter === 'Todos' || match.team_name === teamFilter;

      const matchesFootballType =
        footballTypeFilter === 'Todos' ||
        match.football_type === footballTypeFilter;

      const matchesSearch =
        !search.trim() || matchSearch.includes(search.toLowerCase().trim());

      return (
        matchesTeam &&
        matchesFootballType &&
        matchesDateRange(match.match_date, startDate, endDate) &&
        matchesSearch
      );
    });
  }, [matches, teamFilter, footballTypeFilter, startDate, endDate, search]);

  const filteredTournaments = useMemo(() => {
    return tournaments.filter((tournament) => {
      const tournamentSearch =
        `${tournament.team_name} ${tournament.football_type} ${tournament.name} ${tournament.location ?? ''}`
          .toLowerCase()
          .trim();

      const matchesTeam =
        teamFilter === 'Todos' || tournament.team_name === teamFilter;

      const matchesFootballType =
        footballTypeFilter === 'Todos' ||
        tournament.football_type === footballTypeFilter;

      const matchesSearch =
        !search.trim() || tournamentSearch.includes(search.toLowerCase().trim());

      return (
        matchesTeam &&
        matchesFootballType &&
        tournamentMatchesDateRange(tournament, startDate, endDate) &&
        matchesSearch
      );
    });
  }, [tournaments, teamFilter, footballTypeFilter, startDate, endDate, search]);

  const agendaMatches = useMemo(() => {
    return filteredMatches
      .filter((match) => match.status !== 'terminado')
      .sort((a, b) =>
        `${a.match_date} ${a.match_time ?? '00:00'}`.localeCompare(
          `${b.match_date} ${b.match_time ?? '00:00'}`,
        ),
      );
  }, [filteredMatches]);

  const resultMatches = useMemo(() => {
    return filteredMatches
      .filter((match) => match.status === 'terminado')
      .sort((a, b) =>
        `${b.match_date} ${b.match_time ?? '00:00'}`.localeCompare(
          `${a.match_date} ${a.match_time ?? '00:00'}`,
        ),
      );
  }, [filteredMatches]);

  function clearFilters() {
    setTeamFilter('Todos');
    setFootballTypeFilter('Todos');
    setStartDate('');
    setEndDate('');
    setSearch('');
  }

  return (
    <div className="bg-[#f6f2ec] text-zinc-950">
      <section className="relative overflow-hidden bg-[#24180f] py-24 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_right,rgba(220,38,38,0.28),transparent_34%)]" />
        <img
          src="/logo-gdr-boavista-header-256.png"
          alt=""
          className="pointer-events-none absolute -right-16 top-8 h-72 w-72 object-contain opacity-[0.04]"
        />

        <div className="relative mx-auto max-w-7xl px-4">
          <div className="max-w-4xl">
            <p className="text-sm font-bold uppercase tracking-[0.45em] text-red-400">
              Agenda · Torneios · Resultados
            </p>

            <h1 className="mt-8 font-serif text-6xl font-light leading-[0.95] tracking-tight md:text-8xl">
              Jogos e
              <br />
              torneios.
            </h1>

            <p className="mt-8 max-w-2xl text-lg leading-8 text-zinc-300">
              Consulta a agenda do GDR Boavista, os torneios dos nossos escalões
              e o histórico de resultados dos jogos terminados.
            </p>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-10 max-w-7xl px-4 pb-24">
        <div className="rounded-sm border border-zinc-200 bg-white p-7 shadow-2xl shadow-zinc-950/10">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-700">
              <Filter size={22} />
            </div>

            <div>
              <h2 className="font-serif text-3xl font-light text-[#24180f]">
                Pesquisar jogos e torneios
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Usa os filtros para consultar agenda, torneios e resultados.
              </p>
            </div>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div>
              <label className="text-sm font-black text-zinc-800">
                Data inicial
              </label>

              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
              />
            </div>

            <div>
              <label className="text-sm font-black text-zinc-800">
                Data final
              </label>

              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
              />
            </div>

            <div>
              <label className="text-sm font-black text-zinc-800">
                Escalão
              </label>

              <select
                value={teamFilter}
                onChange={(event) => setTeamFilter(event.target.value)}
                className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
              >
                {teamOptions.map((team) => (
                  <option key={team} value={team}>
                    {team}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-black text-zinc-800">
                Tipo de futebol
              </label>

              <select
                value={footballTypeFilter}
                onChange={(event) => setFootballTypeFilter(event.target.value)}
                className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
              >
                {footballTypeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-black text-zinc-800">
                Pesquisa livre
              </label>

              <div className="relative mt-2">
                <Search
                  size={17}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
                />

                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Adversário, torneio..."
                  className="w-full rounded-md border border-zinc-200 py-3 pl-11 pr-4 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col justify-between gap-3 border-t border-zinc-200 pt-5 sm:flex-row sm:items-center">
            <p className="text-sm font-semibold text-zinc-500">
              {agendaMatches.length} jogo(s) na agenda · {filteredTournaments.length}{' '}
              torneio(s) · {resultMatches.length} resultado(s)
            </p>

            <button
              type="button"
              onClick={clearFilters}
              className="rounded-md border border-zinc-200 px-5 py-3 text-sm font-bold text-zinc-700 hover:border-red-700 hover:text-red-700"
            >
              Limpar filtros
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="mt-8 rounded-sm border border-zinc-200 bg-white p-8 text-zinc-600 shadow-sm">
            A carregar jogos e torneios...
          </div>
        ) : (
          <div className="mt-12 space-y-16">
            <section>
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.35em] text-red-700">
                    Próximos compromissos
                  </p>
                  <h2 className="mt-3 font-serif text-5xl font-light text-[#24180f]">
                    Agenda
                  </h2>
                </div>
                <p className="max-w-xl text-sm leading-6 text-zinc-500">
                  Jogos agendados, adiados ou cancelados que continuam visíveis
                  para consulta pública.
                </p>
              </div>

              {agendaMatches.length === 0 ? (
                <EmptyState
                  icon="calendar"
                  title="Sem jogos na agenda"
                  description="Não existem jogos futuros ou visíveis para os filtros selecionados."
                />
              ) : (
                <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {agendaMatches.map((match) => {
                    const motivation = getMatchMotivation(match);

                    return (
                      <article
                        key={match.id}
                        className="group relative overflow-hidden rounded-sm border border-zinc-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-red-950/10"
                      >
                        <img
                          src="/logo-gdr-boavista-header-256.png"
                          alt=""
                          className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 object-contain opacity-[0.045] transition duration-500 group-hover:scale-110 group-hover:opacity-[0.09]"
                        />
                        <div className={`h-1.5 ${motivation.topClass}`} />

                        <div className="relative p-7">
                          <div className="flex flex-wrap gap-2">
                            <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.18em] ${motivation.badgeClass}`}>
                              {motivation.label}
                            </span>
                            <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-red-700">
                              {match.team_name}
                            </span>
                            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-700">
                              {match.football_type}
                            </span>
                          </div>

                          <p className="mt-6 text-sm font-black uppercase tracking-[0.24em] text-red-700">
                            {motivation.title}
                          </p>

                          {match.venue_type === 'fora' ? (
                            <div className="mt-4">
                              <p className="text-sm font-black uppercase tracking-[0.22em] text-zinc-500">
                                {match.opponent}
                              </p>
                              <h3 className="mt-1 font-serif text-4xl font-light leading-tight text-[#24180f]">
                                vs GDR Boavista
                              </h3>
                            </div>
                          ) : (
                            <div className="mt-4">
                              <h3 className="font-serif text-4xl font-light leading-tight text-[#24180f]">
                                GDR Boavista
                              </h3>
                              <p className="mt-1 text-sm font-black uppercase tracking-[0.22em] text-zinc-500">
                                vs {match.opponent}
                              </p>
                            </div>
                          )}

                          <p className="mt-4 text-sm font-semibold text-zinc-600">
                            {match.competition}
                          </p>

                          <p className="mt-3 rounded-md bg-[#f6f2ec] px-4 py-3 text-sm font-black text-[#24180f]">
                            {motivation.phrase}
                          </p>

                          <div className="mt-5 grid gap-3 text-sm text-zinc-600">
                            <span className="inline-flex items-center gap-2 rounded-md bg-[#f6f2ec] px-4 py-3 font-semibold">
                              <CalendarDays size={16} className="text-red-700" />
                              {formatDateShort(match.match_date)}
                              {match.match_time ? ` | ${match.match_time.slice(0, 5)}` : ''}
                            </span>

                            <div className="flex flex-wrap gap-3">
                              <span className="rounded-md bg-[#f6f2ec] px-4 py-3 font-semibold">
                                {formatMatchStatus(match.status)}
                              </span>
                              {match.location && (
                                <span className="rounded-md bg-[#f6f2ec] px-4 py-3 font-semibold">
                                  {match.location}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <section>
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.35em] text-red-700">
                    Competições especiais
                  </p>
                  <h2 className="mt-3 font-serif text-5xl font-light text-[#24180f]">
                    Torneios
                  </h2>
                </div>
                <p className="max-w-xl text-sm leading-6 text-zinc-500">
                  Torneios visíveis dos escalões do GDR Boavista.
                </p>
              </div>

              {filteredTournaments.length === 0 ? (
                <EmptyState
                  icon="trophy"
                  title="Sem torneios encontrados"
                  description="Não existem torneios para os filtros selecionados."
                />
              ) : (
                <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {filteredTournaments.map((tournament) => (
                    <article
                      key={tournament.id}
                      className="group relative overflow-hidden rounded-sm border border-amber-200 bg-gradient-to-br from-[#24180f] via-[#3a2415] to-red-950 text-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-red-950/20"
                    >
                      <img
                        src="/logo-gdr-boavista-header-256.png"
                        alt=""
                        className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 object-contain opacity-[0.08] transition duration-500 group-hover:scale-110 group-hover:opacity-[0.12]"
                      />
                      <div className="h-1.5 bg-amber-400" />

                      <div className="relative p-7">
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-[#24180f]">
                            Torneio
                          </span>
                          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white">
                            {tournament.team_name}
                          </span>
                          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white">
                            {tournament.football_type}
                          </span>
                        </div>

                        <p className="mt-6 text-sm font-black uppercase tracking-[0.24em] text-amber-200">
                          Dia de competição
                        </p>

                        <h3 className="mt-2 font-serif text-4xl font-light leading-tight">
                          {tournament.name}
                        </h3>

                        <p className="mt-4 text-sm font-semibold leading-6 text-zinc-300">
                          Vários jogos, uma só camisola.
                        </p>

                        <div className="mt-6 grid gap-3 text-sm text-zinc-100">
                          <span className="inline-flex items-center gap-2 rounded-md bg-white/10 px-4 py-3 font-semibold">
                            <CalendarDays size={16} className="text-amber-300" />
                            {formatTournamentDate(tournament)}
                          </span>

                          {tournament.location && (
                            <span className="inline-flex items-center gap-2 rounded-md bg-white/10 px-4 py-3 font-semibold">
                              <MapPin size={16} className="text-amber-300" />
                              {tournament.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section>
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.35em] text-red-700">
                    Histórico
                  </p>
                  <h2 className="mt-3 font-serif text-5xl font-light text-[#24180f]">
                    Resultados
                  </h2>
                </div>
                <p className="max-w-xl text-sm leading-6 text-zinc-500">
                  Jogos terminados com resultados disponíveis para consulta.
                </p>
              </div>

              {resultMatches.length === 0 ? (
                <EmptyState
                  icon="shield"
                  title="Sem resultados encontrados"
                  description="Não existem jogos terminados para os filtros selecionados."
                />
              ) : (
                <div className="mt-8 grid gap-5">
                  {resultMatches.map((match) => {
                    const result = getMatchResult(match);

                    return (
                      <article
                        key={match.id}
                        className="overflow-hidden rounded-sm border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                      >
                        <div className="h-1.5 bg-red-700" />

                        <div className="grid gap-6 p-7 lg:grid-cols-[1fr_auto] lg:items-center">
                          <div>
                            <div className="flex flex-wrap gap-2">
                              <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-red-700">
                                {match.team_name}
                              </span>

                              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-700">
                                {match.football_type}
                              </span>

                              <span className="rounded-full bg-[#24180f] px-3 py-1 text-xs font-bold uppercase text-white">
                                {match.venue_type === 'casa' ? 'Casa' : 'Fora'}
                              </span>
                            </div>

                            <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
                              <h3 className="font-serif text-3xl font-light uppercase text-[#24180f] md:text-right">
                                {result.firstTeam}
                              </h3>

                              <div className="rounded-sm bg-[#24180f] px-6 py-4 text-center text-4xl font-black text-white">
                                <span>{result.firstScore ?? '-'}</span>
                                <span className="px-3 text-red-500">-</span>
                                <span>{result.secondScore ?? '-'}</span>
                              </div>

                              <h3 className="font-serif text-3xl font-light uppercase text-[#24180f]">
                                {result.secondTeam}
                              </h3>
                            </div>

                            <p className="mt-6 text-sm font-semibold text-zinc-600">
                              {match.competition}
                            </p>

                            {match.location && (
                              <p className="mt-2 text-sm text-zinc-500">
                                {match.location}
                              </p>
                            )}
                          </div>

                          <div className="rounded-sm bg-[#f6f2ec] px-6 py-5 text-center lg:min-w-[220px]">
                            <CalendarDays className="mx-auto text-red-700" size={24} />

                            <p className="mt-3 text-sm font-black uppercase text-[#24180f]">
                              {formatDate(match.match_date)}
                            </p>

                            {match.match_time && (
                              <p className="mt-2 text-2xl font-black text-red-700">
                                {match.match_time.slice(0, 5)}
                              </p>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </section>
    </div>
  );
}

type EmptyStateProps = {
  icon: 'calendar' | 'trophy' | 'shield';
  title: string;
  description: string;
};

function EmptyState({ icon, title, description }: EmptyStateProps) {
  const Icon = icon === 'calendar' ? CalendarDays : icon === 'trophy' ? Trophy : ShieldCheck;

  return (
    <div className="mt-8 rounded-sm border border-dashed border-zinc-300 bg-white p-10 text-center shadow-sm">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-700">
        <Icon size={28} />
      </div>

      <h3 className="mt-5 font-serif text-3xl font-light text-[#24180f]">
        {title}
      </h3>

      <p className="mt-3 text-zinc-500">{description}</p>
    </div>
  );
}
