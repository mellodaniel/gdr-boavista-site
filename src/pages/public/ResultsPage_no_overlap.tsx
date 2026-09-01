import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Filter,
  MapPin,
  Search,
  ShieldCheck,
  Trophy,
} from 'lucide-react';
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

const statusFilterOptions = [
  { value: 'Todos', label: 'Todos' },
  { value: 'agenda', label: 'Agenda' },
  { value: 'resultados', label: 'Resultados' },
];

const venueFilterOptions = [
  { value: 'Todos', label: 'Casa/Fora' },
  { value: 'casa', label: 'Casa' },
  { value: 'fora', label: 'Fora' },
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
  const start = formatDateShort(tournament.start_date);

  if (!tournament.end_date || tournament.end_date === tournament.start_date) {
    return start;
  }

  return `${start} a ${formatDateShort(tournament.end_date)}`;
}

function formatMatchStatus(status: string) {
  const labels: Record<string, string> = {
    agendado: 'Agendado',
    aguardar_resultado: 'Aguardar resultado',
    terminado: 'Resultado',
    arquivado: 'Arquivado',
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
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [venueFilter, setVenueFilter] = useState('Todos');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  useEffect(() => {
    async function loadGamesAndTournaments() {
      setIsLoading(true);

      const [matchesResult, tournamentsResult] = await Promise.all([
        supabase
          .from('gdrb_matches')
          .select('*')
          .eq('is_visible', true)
          .neq('status', 'arquivado')
          .order('match_date', { ascending: true })
          .order('match_time', { ascending: true }),

        supabase
          .from('gdrb_tournaments')
          .select('*')
          .eq('is_visible', true)
          .eq('is_archived', false)
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

    void loadGamesAndTournaments();
  }, []);

  const filteredMatches = useMemo(() => {
    return matches.filter((match) => {
      const matchSearch =
        `${match.team_name} ${match.football_type} ${match.competition} ${match.opponent} ${match.location ?? ''} ${formatMatchStatus(match.status)}`
          .toLowerCase()
          .trim();

      const matchesTeam = teamFilter === 'Todos' || match.team_name === teamFilter;

      const matchesFootballType =
        footballTypeFilter === 'Todos' || match.football_type === footballTypeFilter;

      const matchesSearch =
        !search.trim() || matchSearch.includes(search.toLowerCase().trim());

      const matchesVenue = venueFilter === 'Todos' || match.venue_type === venueFilter;

      const matchesStatus =
        statusFilter === 'Todos' ||
        (statusFilter === 'agenda' && ['agendado', 'adiado', 'cancelado'].includes(match.status)) ||
        (statusFilter === 'resultados' && match.status === 'terminado');

      return (
        matchesTeam &&
        matchesFootballType &&
        matchesVenue &&
        matchesStatus &&
        matchesDateRange(match.match_date, startDate, endDate) &&
        matchesSearch
      );
    });
  }, [matches, teamFilter, footballTypeFilter, statusFilter, venueFilter, startDate, endDate, search]);

  const filteredTournaments = useMemo(() => {
    return tournaments.filter((tournament) => {
      const tournamentSearch =
        `${tournament.team_name} ${tournament.football_type} ${tournament.name} ${tournament.location ?? ''}`
          .toLowerCase()
          .trim();

      const matchesTeam = teamFilter === 'Todos' || tournament.team_name === teamFilter;

      const matchesFootballType =
        footballTypeFilter === 'Todos' || tournament.football_type === footballTypeFilter;

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
      .filter((match) => ['agendado', 'adiado', 'cancelado'].includes(match.status))
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

  const activeFiltersCount = [teamFilter, footballTypeFilter, statusFilter, venueFilter].filter(
    (value) => value !== 'Todos',
  ).length + [startDate, endDate, search.trim()].filter(Boolean).length;

  function clearFilters() {
    setTeamFilter('Todos');
    setFootballTypeFilter('Todos');
    setStatusFilter('Todos');
    setVenueFilter('Todos');
    setStartDate('');
    setEndDate('');
    setSearch('');
  }

  function toggleDetails(id: string) {
    setExpandedItemId((current) => (current === id ? null : id));
  }

  return (
    <div className="gdrb-public-page bg-[#f6f2ec] text-zinc-950">
      <section className="relative overflow-hidden bg-[#24180f] py-14 text-white md:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_right,rgba(220,38,38,0.28),transparent_34%)]" />
        <img
          src="/logo-gdr-boavista-header-256.png"
          alt=""
          className="pointer-events-none absolute -right-14 top-8 h-44 w-44 object-contain opacity-[0.05] md:h-72 md:w-72"
        />

        <div className="relative mx-auto max-w-7xl px-5 md:px-4">
          <div className="max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-[0.32em] text-red-400 md:text-sm md:tracking-[0.45em]">
              Jogos · Resultados
            </p>

            <h1 className="mt-5 font-serif text-4xl font-light leading-[0.98] tracking-tight md:mt-8 md:text-8xl">
              Jogos e
              <br />
              resultados.
            </h1>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-16 pt-10 md:px-4 md:pb-24 md:pt-12">
        <div className="rounded-2xl md:rounded-[1.35rem] border border-zinc-200 bg-white p-4 shadow-lg md:shadow-2xl shadow-zinc-950/10 md:p-7">
          <button
            type="button"
            onClick={() => setIsFiltersOpen((current) => !current)}
            className="flex w-full items-center justify-between gap-4 text-left md:cursor-default"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-700 md:h-12 md:w-12">
                <Filter size={20} />
              </span>
              <span>
                <span className="block font-serif text-2xl font-light text-[#24180f] md:text-3xl">
                  Consultar jogos
                </span>
                <span className="mt-1 block text-xs font-semibold text-zinc-500 md:text-sm">
                  {activeFiltersCount > 0 ? `${activeFiltersCount} filtro(s) aplicado(s)` : 'Filtros e pesquisa'}
                </span>
              </span>
            </span>

            <span className="md:hidden">
              {isFiltersOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </span>
          </button>

          <div className={`${isFiltersOpen ? 'block' : 'hidden'} mt-5 md:block`}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
              <FilterField label="Data inicial">
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="w-full rounded-md border border-zinc-200 px-5 md:px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
                />
              </FilterField>

              <FilterField label="Data final">
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="w-full rounded-md border border-zinc-200 px-5 md:px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
                />
              </FilterField>

              <FilterField label="Escalão">
                <select value={teamFilter} onChange={(event) => setTeamFilter(event.target.value)} className="w-full rounded-md border border-zinc-200 px-5 md:px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100">
                  {teamOptions.map((team) => <option key={team} value={team}>{team}</option>)}
                </select>
              </FilterField>

              <FilterField label="Tipo">
                <select value={footballTypeFilter} onChange={(event) => setFootballTypeFilter(event.target.value)} className="w-full rounded-md border border-zinc-200 px-5 md:px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100">
                  {footballTypeOptions.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </FilterField>

              <FilterField label="Estado">
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="w-full rounded-md border border-zinc-200 px-5 md:px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100">
                  {statusFilterOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </FilterField>

              <FilterField label="Casa/Fora">
                <select value={venueFilter} onChange={(event) => setVenueFilter(event.target.value)} className="w-full rounded-md border border-zinc-200 px-5 md:px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100">
                  {venueFilterOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </FilterField>

              <FilterField label="Pesquisa">
                <div className="relative">
                  <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Adversário, torneio..."
                    className="w-full rounded-md border border-zinc-200 px-5 md:px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100 pl-11"
                  />
                </div>
              </FilterField>
            </div>

            <div className="mt-5 flex flex-col justify-between gap-3 border-t border-zinc-200 pt-5 sm:flex-row sm:items-center">
              <p className="text-xs font-semibold text-zinc-500 md:text-sm">
                {agendaMatches.length} agenda · {filteredTournaments.length} torneio(s) · {resultMatches.length} resultado(s)
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
        </div>

        {isLoading ? (
          <div className="mt-8 rounded-2xl md:rounded-[1.35rem] border border-zinc-200 bg-white p-6 text-sm font-semibold text-zinc-600 shadow-sm md:p-8">
            A carregar jogos e torneios...
          </div>
        ) : (
          <div className="mt-10 space-y-12 md:mt-12 md:space-y-16">
            <ResultsSection eyebrow="Próximos compromissos" title="Agenda">
              {agendaMatches.length === 0 ? (
                <EmptyState icon="calendar" title="Sem jogos na agenda" />
              ) : (
                <div className="mt-5 grid gap-3 md:mt-8 md:grid-cols-2 md:gap-6 xl:grid-cols-3">
                  {agendaMatches.map((match) => (
                    <AgendaCard
                      key={match.id}
                      match={match}
                      isExpanded={expandedItemId === `agenda-${match.id}`}
                      onToggle={() => toggleDetails(`agenda-${match.id}`)}
                    />
                  ))}
                </div>
              )}
            </ResultsSection>

            <ResultsSection eyebrow="Competições especiais" title="Torneios">
              {filteredTournaments.length === 0 ? (
                <EmptyState icon="trophy" title="Sem torneios encontrados" />
              ) : (
                <div className="mt-5 grid gap-3 md:mt-8 md:grid-cols-2 md:gap-6 xl:grid-cols-3">
                  {filteredTournaments.map((tournament) => (
                    <TournamentCard
                      key={tournament.id}
                      tournament={tournament}
                      isExpanded={expandedItemId === `tournament-${tournament.id}`}
                      onToggle={() => toggleDetails(`tournament-${tournament.id}`)}
                    />
                  ))}
                </div>
              )}
            </ResultsSection>

            <ResultsSection eyebrow="Consulta" title="Resultados">
              {resultMatches.length === 0 ? (
                <EmptyState icon="shield" title="Sem resultados encontrados" />
              ) : (
                <div className="mt-5 grid gap-3 md:mt-8 md:gap-5">
                  {resultMatches.map((match) => (
                    <ResultCard
                      key={match.id}
                      match={match}
                      isExpanded={expandedItemId === `result-${match.id}`}
                      onToggle={() => toggleDetails(`result-${match.id}`)}
                    />
                  ))}
                </div>
              )}
            </ResultsSection>
          </div>
        )}
      </section>
    </div>
  );
}

type FilterFieldProps = {
  label: string;
  children: ReactNode;
};

function FilterField({ label, children }: FilterFieldProps) {
  return (
    <div>
      <label className="text-xs font-black uppercase tracking-[0.12em] text-zinc-700 md:text-sm md:normal-case md:tracking-normal">
        {label}
      </label>
      <div className="mt-2">{children}</div>
    </div>
  );
}

type ResultsSectionProps = {
  eyebrow: string;
  title: string;
  children: ReactNode;
};

function ResultsSection({ eyebrow, title, children }: ResultsSectionProps) {
  return (
    <section>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-red-700 md:text-sm md:tracking-[0.35em]">
          {eyebrow}
        </p>
        <h2 className="mt-2 font-serif text-3xl font-light text-[#24180f] md:mt-3 md:text-5xl">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

type AgendaCardProps = {
  match: GdrbMatch;
  isExpanded: boolean;
  onToggle: () => void;
};

function AgendaCard({ match, isExpanded, onToggle }: AgendaCardProps) {
  const isAway = match.venue_type === 'fora';

  return (
    <article className="overflow-hidden rounded-2xl md:rounded-[1.35rem] border border-zinc-200 bg-white shadow-sm transition duration-300 md:hover:-translate-y-1 md:hover:shadow-2xl md:hover:shadow-red-950/10">
      <div className={`h-1.5 ${isAway ? 'bg-zinc-950' : 'bg-red-700'}`} />
      <div className="p-4 md:p-7">
        <div className="flex flex-wrap gap-2">
          <Badge variant={isAway ? 'dark' : 'red'}>{isAway ? 'Fora' : 'Casa'}</Badge>
          <Badge>{match.team_name}</Badge>
          <Badge muted>{match.football_type}</Badge>
        </div>

        <h3 className="mt-4 font-serif text-2xl font-light leading-tight text-[#24180f] md:mt-6 md:text-4xl">
          {isAway ? `${match.opponent} vs GDR Boavista` : `GDR Boavista vs ${match.opponent}`}
        </h3>

        <p className="mt-3 text-sm font-semibold text-zinc-600">{match.competition}</p>

        <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-zinc-600 md:text-sm">
          <span className="inline-flex items-center gap-2 rounded-md bg-[#f6f2ec] px-3 py-2">
            <CalendarDays size={15} className="text-red-700" />
            {formatDateShort(match.match_date)}
            {match.match_time ? ` · ${match.match_time.slice(0, 5)}` : ''}
          </span>
          <span className="rounded-md bg-[#f6f2ec] px-3 py-2">{formatMatchStatus(match.status)}</span>
        </div>

        <div className={`${isExpanded ? 'block' : 'hidden'} mt-4 border-t border-zinc-100 pt-4 md:block`}>
          {match.location ? (
            <p className="text-sm font-semibold text-zinc-600">{match.location}</p>
          ) : null}
          {match.notes ? <p className="mt-2 text-sm leading-6 text-zinc-500">{match.notes}</p> : null}
        </div>

        <DetailsButton isExpanded={isExpanded} onToggle={onToggle} />
      </div>
    </article>
  );
}

type TournamentCardProps = {
  tournament: GdrbTournament;
  isExpanded: boolean;
  onToggle: () => void;
};

function TournamentCard({ tournament, isExpanded, onToggle }: TournamentCardProps) {
  return (
    <article className="overflow-hidden rounded-2xl md:rounded-[1.35rem] border border-amber-200 bg-gradient-to-br from-[#24180f] via-[#3a2415] to-red-950 text-white shadow-sm transition duration-300 md:hover:-translate-y-1 md:hover:shadow-2xl md:hover:shadow-red-950/20">
      <div className="h-1.5 bg-amber-400" />
      <div className="p-4 md:p-7">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-amber-400 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#24180f] md:text-xs">
            Torneio
          </span>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white">
            {tournament.team_name}
          </span>
        </div>

        <h3 className="mt-4 font-serif text-2xl font-light leading-tight md:mt-6 md:text-4xl">
          {tournament.name}
        </h3>

        <div className="mt-4 inline-flex items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-xs font-semibold text-zinc-100 md:text-sm">
          <CalendarDays size={15} className="text-amber-300" />
          {formatTournamentDate(tournament)}
        </div>

        <div className={`${isExpanded ? 'block' : 'hidden'} mt-4 border-t border-white/10 pt-4 md:block`}>
          <div className="flex flex-wrap gap-2 text-xs font-semibold text-zinc-100 md:text-sm">
            <span className="rounded-md bg-white/10 px-3 py-2">{tournament.football_type}</span>
            {tournament.location ? (
              <span className="inline-flex items-center gap-2 rounded-md bg-white/10 px-3 py-2">
                <MapPin size={15} className="text-amber-300" />
                {tournament.location}
              </span>
            ) : null}
          </div>
          {tournament.notes ? <p className="mt-3 text-sm leading-6 text-zinc-200">{tournament.notes}</p> : null}
        </div>

        <DetailsButton isExpanded={isExpanded} onToggle={onToggle} light />
      </div>
    </article>
  );
}

type ResultCardProps = {
  match: GdrbMatch;
  isExpanded: boolean;
  onToggle: () => void;
};

function ResultCard({ match, isExpanded, onToggle }: ResultCardProps) {
  const result = getMatchResult(match);

  return (
    <article className="overflow-hidden rounded-2xl md:rounded-[1.35rem] border border-zinc-200 bg-white shadow-sm transition md:hover:-translate-y-1 md:hover:shadow-xl">
      <div className="h-1.5 bg-red-700" />
      <div className="p-4 md:grid md:gap-6 md:p-7 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge>{match.team_name}</Badge>
            <Badge muted>{match.football_type}</Badge>
            <Badge variant="dark">{match.venue_type === 'casa' ? 'Casa' : 'Fora'}</Badge>
          </div>

          <div className="mt-4 grid gap-3 md:mt-6 md:grid-cols-[1fr_auto_1fr] md:items-center">
            <h3 className="font-serif text-xl font-light uppercase text-[#24180f] md:text-right md:text-3xl">
              {result.firstTeam}
            </h3>
            <div className="w-fit rounded-2xl md:rounded-[1.35rem] bg-[#24180f] px-5 py-3 text-3xl font-black text-white md:px-6 md:py-4 md:text-4xl">
              <span>{result.firstScore ?? '-'}</span>
              <span className="px-2 text-red-500 md:px-3">-</span>
              <span>{result.secondScore ?? '-'}</span>
            </div>
            <h3 className="font-serif text-xl font-light uppercase text-[#24180f] md:text-3xl">
              {result.secondTeam}
            </h3>
          </div>

          <p className="mt-4 text-sm font-semibold text-zinc-600 md:mt-6">{match.competition}</p>
        </div>

        <div className={`${isExpanded ? 'block' : 'hidden'} mt-4 border-t border-zinc-100 pt-4 md:block md:border-t-0 md:pt-0 lg:min-w-[220px]`}>
          <div className="rounded-2xl md:rounded-[1.35rem] bg-[#f6f2ec] px-5 py-4 text-left md:text-center">
            <CalendarDays className="hidden text-red-700 md:mx-auto md:block" size={24} />
            <p className="text-sm font-black uppercase text-[#24180f] md:mt-3">
              {formatDate(match.match_date)}
            </p>
            {match.match_time ? <p className="mt-2 text-xl font-black text-red-700 md:text-2xl">{match.match_time.slice(0, 5)}</p> : null}
            {match.location ? <p className="mt-2 text-sm text-zinc-500">{match.location}</p> : null}
          </div>
        </div>

        <DetailsButton isExpanded={isExpanded} onToggle={onToggle} />
      </div>
    </article>
  );
}

type BadgeProps = {
  children: ReactNode;
  muted?: boolean;
  variant?: 'red' | 'dark';
};

function Badge({ children, muted, variant = 'red' }: BadgeProps) {
  const className = muted
    ? 'bg-zinc-100 text-zinc-700'
    : variant === 'dark'
      ? 'bg-[#24180f] text-white'
      : 'bg-red-50 text-red-700';

  return (
    <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] md:text-xs ${className}`}>
      {children}
    </span>
  );
}

type DetailsButtonProps = {
  isExpanded: boolean;
  onToggle: () => void;
  light?: boolean;
};

function DetailsButton({ isExpanded, onToggle, light = false }: DetailsButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`mt-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] md:hidden ${light ? 'text-amber-300' : 'text-red-700'}`}
    >
      {isExpanded ? 'Fechar' : 'Detalhes'}
      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
    </button>
  );
}

type EmptyStateProps = {
  icon: 'calendar' | 'trophy' | 'shield';
  title: string;
};

function EmptyState({ icon, title }: EmptyStateProps) {
  const Icon = icon === 'calendar' ? CalendarDays : icon === 'trophy' ? Trophy : ShieldCheck;

  return (
    <div className="mt-5 rounded-2xl md:rounded-[1.35rem] border border-dashed border-zinc-300 bg-white p-6 text-center shadow-sm md:mt-8 md:p-10">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-700 md:h-16 md:w-16">
        <Icon size={24} />
      </div>
      <h3 className="mt-4 font-serif text-2xl font-light text-[#24180f] md:mt-5 md:text-3xl">
        {title}
      </h3>
    </div>
  );
}
