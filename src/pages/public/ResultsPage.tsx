import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Filter, Search, Trophy } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { GdrbMatch } from '../../types/database';

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

export function ResultsPage() {
  const [matches, setMatches] = useState<GdrbMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [teamFilter, setTeamFilter] = useState('Todos');
  const [footballTypeFilter, setFootballTypeFilter] = useState('Todos');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');

  const filteredMatches = useMemo(() => {
    return matches.filter((match) => {
      const matchSearch = `${match.team_name} ${match.football_type} ${match.competition} ${match.opponent} ${match.location ?? ''}`
        .toLowerCase()
        .trim();

      const matchesTeam =
        teamFilter === 'Todos' || match.team_name === teamFilter;

      const matchesFootballType =
        footballTypeFilter === 'Todos' ||
        match.football_type === footballTypeFilter;

      const matchesStartDate = !startDate || match.match_date >= startDate;
      const matchesEndDate = !endDate || match.match_date <= endDate;

      const matchesSearch =
        !search.trim() || matchSearch.includes(search.toLowerCase().trim());

      return (
        matchesTeam &&
        matchesFootballType &&
        matchesStartDate &&
        matchesEndDate &&
        matchesSearch
      );
    });
  }, [matches, teamFilter, footballTypeFilter, startDate, endDate, search]);

  useEffect(() => {
    async function loadResults() {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('gdrb_matches')
        .select('*')
        .eq('is_visible', true)
        .eq('status', 'terminado')
        .order('match_date', { ascending: false })
        .order('match_time', { ascending: false });

      if (error) {
        console.error('Erro ao carregar histórico de resultados:', error);
      }

      setMatches(data ?? []);
      setIsLoading(false);
    }

    loadResults();
  }, []);

  function clearFilters() {
    setTeamFilter('Todos');
    setFootballTypeFilter('Todos');
    setStartDate('');
    setEndDate('');
    setSearch('');
  }

  return (
    <div className="bg-zinc-50">
      <section className="relative overflow-hidden bg-zinc-950 py-20 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_left,rgba(220,38,38,0.28),transparent_34%),linear-gradient(135deg,rgba(9,9,11,1),rgba(24,24,27,1))]" />

        <div className="absolute -right-32 top-10 h-96 w-96 rounded-full bg-red-600/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.35em] text-red-500">
              Histórico
            </p>

            <h1 className="mt-4 text-5xl font-black uppercase tracking-tight md:text-7xl">
              Resultados dos jogos
            </h1>

            <p className="mt-6 text-lg leading-8 text-zinc-300">
              Consulta os resultados anteriores do GDR Boavista por data,
              escalão, tipo de futebol, competição ou adversário.
            </p>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-10 max-w-7xl px-4 pb-20">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl shadow-zinc-950/10">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600">
              <Filter size={22} />
            </div>

            <div>
              <h2 className="text-2xl font-black text-zinc-950">
                Pesquisar resultados
              </h2>

              <p className="text-sm text-zinc-500">
                Usa os filtros para consultar jogos terminados.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div>
              <label className="text-sm font-black text-zinc-800">
                Data inicial
              </label>

              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
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
                className="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
              />
            </div>

            <div>
              <label className="text-sm font-black text-zinc-800">
                Escalão
              </label>

              <select
                value={teamFilter}
                onChange={(event) => setTeamFilter(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
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
                className="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
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
                  placeholder="Adversário, competição..."
                  className="w-full rounded-2xl border border-zinc-200 py-3 pl-11 pr-4 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
                />
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-col justify-between gap-3 border-t border-zinc-200 pt-5 sm:flex-row sm:items-center">
            <p className="text-sm font-semibold text-zinc-500">
              {filteredMatches.length} resultado(s) encontrado(s)
            </p>

            <button
              type="button"
              onClick={clearFilters}
              className="rounded-2xl border border-zinc-200 px-5 py-3 text-sm font-bold text-zinc-700 hover:border-red-600 hover:text-red-600"
            >
              Limpar filtros
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-8 text-zinc-600 shadow-sm">
            A carregar histórico de resultados...
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-zinc-300 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-zinc-100 text-zinc-500">
              <Trophy size={28} />
            </div>

            <h3 className="mt-5 text-2xl font-black text-zinc-950">
              Sem resultados encontrados
            </h3>

            <p className="mt-3 text-zinc-500">
              Não existem jogos terminados para os filtros selecionados.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-5">
            {filteredMatches.map((match) => {
              const result = getMatchResult(match);

              return (
                <article
                  key={match.id}
                  className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="h-2 bg-red-600" />

                  <div className="grid gap-6 p-6 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-red-700">
                          {match.team_name}
                        </span>

                        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-700">
                          {match.football_type}
                        </span>

                        <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-bold uppercase text-white">
                          {match.venue_type === 'casa' ? 'Casa' : 'Fora'}
                        </span>
                      </div>

                      <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
                        <h3 className="text-2xl font-black uppercase text-zinc-950 md:text-right">
                          {result.firstTeam}
                        </h3>

                        <div className="rounded-3xl bg-zinc-950 px-6 py-4 text-center text-4xl font-black text-white">
                          <span>{result.firstScore ?? '-'}</span>
                          <span className="px-3 text-red-500">-</span>
                          <span>{result.secondScore ?? '-'}</span>
                        </div>

                        <h3 className="text-2xl font-black uppercase text-zinc-950">
                          {result.secondTeam}
                        </h3>
                      </div>

                      <p className="mt-5 text-sm font-semibold text-zinc-600">
                        {match.competition}
                      </p>

                      {match.location && (
                        <p className="mt-2 text-sm text-zinc-500">
                          {match.location}
                        </p>
                      )}
                    </div>

                    <div className="rounded-3xl bg-zinc-100 px-6 py-5 text-center lg:min-w-[220px]">
                      <CalendarDays className="mx-auto text-red-600" size={24} />

                      <p className="mt-3 text-sm font-black uppercase text-zinc-950">
                        {formatDate(match.match_date)}
                      </p>

                      {match.match_time && (
                        <p className="mt-2 text-2xl font-black text-red-600">
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
  );
}