import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronRight,
  HeartHandshake,
  MapPin,
  Newspaper,
  ShieldCheck,
  Trophy,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type {
  GdrbMatch,
  GdrbNews,
  GdrbTeam,
  GdrbTournament,
} from '../../types/database';

const heroHighlights = ['Formação', 'Comunidade', 'Orgulho', 'Futebol'];

const valueItems = [
  {
    icon: Users,
    title: 'Formação',
    description: 'Acompanhamos atletas em diferentes fases de crescimento.',
  },
  {
    icon: HeartHandshake,
    title: 'Comunidade',
    description: 'Famílias, sócios e atletas fazem parte da mesma casa.',
  },
  {
    icon: ShieldCheck,
    title: 'Identidade',
    description: 'Orgulho em representar o GDR Boavista dentro e fora de campo.',
  },
];

const missionItems = [
  {
    title: 'Crescer com valores',
    description:
      'Mais do que competir, queremos formar atletas responsáveis, unidos e comprometidos.',
  },
  {
    title: 'Representar a terra',
    description:
      'O clube é um ponto de encontro da comunidade e uma referência para as famílias.',
  },
  {
    title: 'Trabalhar todos os dias',
    description:
      'Cada treino, jogo e torneio é uma oportunidade para evoluir e fortalecer o grupo.',
  },
];

function getCurrentWeekRange() {
  const today = new Date();
  const day = today.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(today);
  monday.setDate(today.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { monday, sunday };
}

function isDateInCurrentWeek(dateValue: string) {
  const { monday, sunday } = getCurrentWeekRange();
  const date = new Date(`${dateValue}T12:00:00`);

  return date >= monday && date <= sunday;
}

function isTournamentInCurrentWeek(tournament: GdrbTournament) {
  const { monday, sunday } = getCurrentWeekRange();

  const startDate = new Date(`${tournament.start_date}T12:00:00`);
  const endDate = tournament.end_date
    ? new Date(`${tournament.end_date}T12:00:00`)
    : startDate;

  return startDate <= sunday && endDate >= monday;
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'short',
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
  if (!tournament.end_date || tournament.end_date === tournament.start_date) {
    return formatDate(tournament.start_date);
  }

  return `${formatDate(tournament.start_date)} a ${formatDate(
    tournament.end_date,
  )}`;
}

function getWeekLabel() {
  const { monday, sunday } = getCurrentWeekRange();

  const start = monday.toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'short',
  });

  const end = sunday.toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'short',
  });

  return `${start} a ${end}`;
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

type AgendaItem =
  | {
      type: 'match';
      id: string;
      date: string;
      sortDate: string;
      data: GdrbMatch;
    }
  | {
      type: 'tournament';
      id: string;
      date: string;
      sortDate: string;
      data: GdrbTournament;
    };

export function HomePage() {
  const [matches, setMatches] = useState<GdrbMatch[]>([]);
  const [tournaments, setTournaments] = useState<GdrbTournament[]>([]);
  const [news, setNews] = useState<GdrbNews[]>([]);
  const [teams, setTeams] = useState<GdrbTeam[]>([]);
  const [isLoadingAgenda, setIsLoadingAgenda] = useState(true);

  useEffect(() => {
    async function loadHomeData() {
      setIsLoadingAgenda(true);

      const [matchesResult, tournamentsResult, newsResult, teamsResult] =
        await Promise.all([
          supabase
            .from('gdrb_matches')
            .select('*')
            .eq('is_visible', true)
            .in('status', ['agendado', 'adiado', 'cancelado'])
            .order('match_date', { ascending: true })
            .order('match_time', { ascending: true }),

          supabase
            .from('gdrb_tournaments')
            .select('*')
            .eq('is_visible', true)
            .order('start_date', { ascending: true })
            .order('sort_order', { ascending: true }),

          supabase
            .from('gdrb_news')
            .select('*')
            .eq('is_published', true)
            .order('published_at', { ascending: false, nullsFirst: false })
            .order('created_at', { ascending: false })
            .limit(3),

          supabase
            .from('gdrb_teams')
            .select('*')
            .eq('is_active', true)
            .order('sort_order', { ascending: true })
            .order('name', { ascending: true })
            .limit(6),
        ]);

      if (matchesResult.error) {
        console.error('Erro ao carregar jogos:', matchesResult.error);
      }

      if (tournamentsResult.error) {
        console.error('Erro ao carregar torneios:', tournamentsResult.error);
      }

      if (newsResult.error) {
        console.error('Erro ao carregar notícias:', newsResult.error);
      }

      if (teamsResult.error) {
        console.error('Erro ao carregar equipas:', teamsResult.error);
      }

      setMatches(matchesResult.data ?? []);
      setTournaments(tournamentsResult.data ?? []);
      setNews(newsResult.data ?? []);
      setTeams(teamsResult.data ?? []);
      setIsLoadingAgenda(false);
    }

    loadHomeData();
  }, []);

  const agendaItems = useMemo<AgendaItem[]>(() => {
    const weeklyMatches: AgendaItem[] = matches
      .filter((match) => isDateInCurrentWeek(match.match_date))
      .map((match) => ({
        type: 'match',
        id: match.id,
        date: match.match_date,
        sortDate: `${match.match_date} ${match.match_time ?? '00:00'}`,
        data: match,
      }));

    const weeklyTournaments: AgendaItem[] = tournaments
      .filter((tournament) => isTournamentInCurrentWeek(tournament))
      .map((tournament) => ({
        type: 'tournament',
        id: tournament.id,
        date: tournament.start_date,
        sortDate: `${tournament.start_date} 00:00`,
        data: tournament,
      }));

    return [...weeklyMatches, ...weeklyTournaments]
      .sort((a, b) => a.sortDate.localeCompare(b.sortDate))
      .slice(0, 6);
  }, [matches, tournaments]);

  return (
    <div className="bg-[#f6f2ec] text-zinc-950">
      <section className="relative min-h-[760px] overflow-hidden bg-[#24180f] text-white">
        <img
          src="/hero-boavista.webp"
          alt="GDR Boavista"
          className="absolute inset-0 h-full w-full object-cover opacity-45"
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#24180f] via-[#24180f]/80 to-black/30" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_right,rgba(220,38,38,0.28),transparent_35%)]" />

        <div className="relative mx-auto flex min-h-[760px] max-w-7xl flex-col justify-center px-4 py-24">
          <div className="max-w-4xl">
            <div className="mb-10 flex items-center gap-4">
              <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white p-3 shadow-2xl">
                <img
                  src="/logo-gdr-boavista-header-256.png"
                  alt="GDR Boavista"
                  className="h-full w-full object-contain"
                />
              </div>

              <div>
                <p className="text-sm font-black uppercase tracking-[0.4em] text-red-400">
                  GDR Boavista
                </p>
                <p className="mt-2 text-sm font-semibold text-zinc-300">
                  Leiria · Formação · Comunidade
                </p>
              </div>
            </div>

            <h1 className="font-serif text-6xl font-light leading-[0.95] tracking-tight md:text-8xl">
              Formar atletas,
              <br />
              unir famílias.
            </h1>

            <p className="mt-8 max-w-2xl text-lg leading-8 text-zinc-300">
              O GDR Boavista é uma casa de futebol, formação e comunidade.
              Um clube onde atletas, famílias, sócios e amigos vivem o futebol
              com compromisso, união e orgulho.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                to="/socios"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-red-700 px-6 py-4 text-sm font-black uppercase tracking-wide text-white transition hover:bg-red-800"
              >
                Quero ser sócio
                <ChevronRight size={18} />
              </Link>

              <Link
                to="/equipas"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-6 py-4 text-sm font-black uppercase tracking-wide text-[#24180f] transition hover:bg-zinc-100"
              >
                Ver equipas
                <ChevronRight size={18} />
              </Link>
            </div>

            <div className="mt-12 flex flex-wrap gap-3">
              {heroHighlights.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mx-auto max-w-4xl">
            <p className="text-sm font-bold uppercase tracking-[0.45em] text-red-700">
              Quem somos
            </p>

            <h2 className="mt-8 font-serif text-5xl font-light leading-tight text-[#24180f] md:text-7xl">
              Um clube feito de pessoas, compromisso e paixão pelo futebol.
            </h2>

            <div className="mt-10 grid gap-8 text-base leading-8 text-zinc-600 md:grid-cols-2">
              <p>
                O GDR Boavista trabalha todos os dias para dar aos seus atletas
                um ambiente de crescimento, aprendizagem e competição saudável.
              </p>

              <p>
                Da formação aos escalões mais velhos, o clube vive da energia
                dos jogadores, treinadores, famílias, sócios e parceiros.
              </p>
            </div>
          </div>

          <div className="mt-16 grid gap-0 overflow-hidden rounded-sm bg-[#24180f] text-white md:grid-cols-3">
            {valueItems.map((item, index) => {
              const Icon = item.icon;

              return (
                <article
                  key={item.title}
                  className={`p-10 text-center ${
                    index !== valueItems.length - 1
                      ? 'border-b border-white/10 md:border-b-0 md:border-r'
                      : ''
                  }`}
                >
                  <Icon className="mx-auto text-red-500" size={30} />

                  <h3 className="mt-6 font-serif text-2xl font-light">
                    {item.title}
                  </h3>

                  <p className="mt-4 text-sm uppercase leading-6 tracking-[0.12em] text-zinc-400">
                    {item.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.45em] text-red-700">
                Semana de {getWeekLabel()}
              </p>

              <h2 className="mt-5 font-serif text-5xl font-light text-[#24180f] md:text-6xl">
                Jogos e torneios da semana
              </h2>
            </div>

            <Link
              to="/resultados"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-red-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-800"
            >
              Histórico de jogos <ChevronRight size={16} />
            </Link>
          </div>

          {isLoadingAgenda ? (
            <div className="mt-10 rounded-sm border border-zinc-200 bg-[#f6f2ec] p-8 text-zinc-600">
              A carregar agenda da semana...
            </div>
          ) : agendaItems.length === 0 ? (
            <div className="mt-10 rounded-sm border border-dashed border-zinc-300 bg-[#f6f2ec] p-10 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-700">
                <CalendarDays size={28} />
              </div>

              <h3 className="mt-5 font-serif text-3xl font-light text-[#24180f]">
                Sem jogos ou torneios nesta semana
              </h3>

              <p className="mt-3 text-zinc-500">
                Quando forem criados no admin, os jogos e torneios visíveis
                aparecem automaticamente aqui.
              </p>
            </div>
          ) : (
            <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {agendaItems.map((item) => {
                if (item.type === 'tournament') {
                  const tournament = item.data;

                  return (
                    <article
                      key={`tournament-${item.id}`}
                      className="overflow-hidden rounded-sm border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                    >
                      <div className="h-1.5 bg-red-700" />

                      <div className="p-7">
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-red-700">
                            {tournament.team_name}
                          </span>

                          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-700">
                            {tournament.football_type}
                          </span>

                          <span className="rounded-full bg-[#24180f] px-3 py-1 text-xs font-bold uppercase text-white">
                            Torneio
                          </span>
                        </div>

                        <h3 className="mt-6 font-serif text-4xl font-light leading-tight text-[#24180f]">
                          {tournament.name}
                        </h3>

                        <div className="mt-5 grid gap-3 text-sm text-zinc-600">
                          <span className="inline-flex items-center gap-2 rounded-md bg-[#f6f2ec] px-4 py-3 font-semibold">
                            <CalendarDays size={16} className="text-red-700" />
                            {formatTournamentDate(tournament)}
                          </span>

                          {tournament.location && (
                            <span className="inline-flex items-center gap-2 rounded-md bg-[#f6f2ec] px-4 py-3 font-semibold">
                              <MapPin size={16} className="text-red-700" />
                              {tournament.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                }

                const match = item.data;

                return (
                  <article
                    key={`match-${item.id}`}
                    className="overflow-hidden rounded-sm border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div className="h-1.5 bg-red-700" />

                    <div className="p-7">
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-red-700">
                          {match.team_name}
                        </span>

                        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-700">
                          {match.football_type}
                        </span>

                        <span className="rounded-full bg-[#24180f] px-3 py-1 text-xs font-bold uppercase text-white">
                          {formatMatchStatus(match.status)}
                        </span>
                      </div>

                      {match.venue_type === 'fora' ? (
                        <>
                          <p className="mt-6 text-sm font-black uppercase tracking-[0.22em] text-zinc-500">
                            {match.opponent}
                          </p>

                          <h3 className="mt-2 font-serif text-4xl font-light leading-tight text-[#24180f]">
                            vs GDR Boavista
                          </h3>
                        </>
                      ) : (
                        <>
                          <h3 className="mt-6 font-serif text-4xl font-light leading-tight text-[#24180f]">
                            GDR Boavista
                          </h3>

                          <p className="mt-1 text-sm font-black uppercase tracking-[0.22em] text-zinc-500">
                            vs {match.opponent}
                          </p>
                        </>
                      )}

                      <p className="mt-4 text-sm font-semibold text-zinc-600">
                        {match.competition}
                      </p>

                      <div className="mt-5 grid gap-3 text-sm text-zinc-600">
                        <span className="inline-flex items-center gap-2 rounded-md bg-[#f6f2ec] px-4 py-3 font-semibold">
                          <CalendarDays size={16} className="text-red-700" />
                          {formatDateShort(match.match_date)}
                          {match.match_time
                            ? ` | ${match.match_time.slice(0, 5)}`
                            : ''}
                        </span>

                        <div className="flex flex-wrap gap-3">
                          <span className="rounded-md bg-[#f6f2ec] px-4 py-3 font-semibold">
                            {match.venue_type === 'casa' ? 'Casa' : 'Fora'}
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
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.45em] text-red-700">
                Notícias
              </p>

              <h2 className="mt-5 font-serif text-5xl font-light text-[#24180f] md:text-6xl">
                Últimas novidades
              </h2>
            </div>

            <Link
              to="/noticias"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#24180f] px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700"
            >
              Ver notícias <ChevronRight size={16} />
            </Link>
          </div>

          {news.length === 0 ? (
            <div className="mt-10 rounded-sm border border-dashed border-zinc-300 bg-white p-10 text-center">
              <Newspaper className="mx-auto text-red-700" size={32} />

              <h3 className="mt-5 font-serif text-3xl font-light text-[#24180f]">
                Notícias em preparação
              </h3>

              <p className="mt-3 text-zinc-500">
                As notícias publicadas no admin aparecem automaticamente aqui.
              </p>
            </div>
          ) : (
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {news.map((item) => (
                <Link
                  key={item.id}
                  to={`/noticias/${item.id}`}
                  className="group overflow-hidden rounded-sm border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <article>
                    <div className="h-1.5 bg-red-700" />

                    {item.image_url && (
                      <div className="h-52 overflow-hidden">
                        <img
                          src={item.image_url}
                          alt={item.title}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      </div>
                    )}

                    <div className="p-7">
                      <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-red-700">
                        {item.source}
                      </span>

                      <h3 className="mt-5 font-serif text-3xl font-light leading-tight text-[#24180f]">
                        {item.title}
                      </h3>

                      {item.summary && (
                        <p className="mt-4 text-sm leading-7 text-zinc-600">
                          {item.summary}
                        </p>
                      )}

                      <span className="mt-7 inline-flex items-center gap-2 text-sm font-black uppercase tracking-wide text-red-700">
                        Ler notícia completa
                        <ChevronRight size={16} />
                      </span>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.45em] text-red-700">
                Equipas
              </p>

              <h2 className="mt-5 font-serif text-5xl font-light text-[#24180f] md:text-6xl">
                As nossas equipas
              </h2>
            </div>

            <Link
              to="/equipas"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-red-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-800"
            >
              Ver todas <ChevronRight size={16} />
            </Link>
          </div>

          {teams.length === 0 ? (
            <div className="mt-10 rounded-sm border border-dashed border-zinc-300 bg-[#f6f2ec] p-10 text-center">
              <Trophy className="mx-auto text-red-700" size={32} />

              <h3 className="mt-5 font-serif text-3xl font-light text-[#24180f]">
                Equipas em preparação
              </h3>

              <p className="mt-3 text-zinc-500">
                As equipas ativas no admin aparecem automaticamente aqui.
              </p>
            </div>
          ) : (
            <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {teams.map((team) => (
                <article
                  key={team.id}
                  className="overflow-hidden rounded-sm border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="h-1.5 bg-red-700" />

                  <div className="p-7">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-red-700">
                        {team.name}
                      </span>

                      <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-700">
                        {team.football_type}
                      </span>
                    </div>

                    <h3 className="mt-6 font-serif text-4xl font-light text-[#24180f]">
                      {team.category}
                    </h3>

                    {team.description && (
                      <p className="mt-4 text-sm leading-7 text-zinc-600">
                        {team.description}
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="bg-[#24180f] py-24 text-white">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-6 md:grid-cols-3">
            {missionItems.map((item) => (
              <article
                key={item.title}
                className="rounded-sm border border-white/10 bg-white/5 p-8"
              >
                <h3 className="font-serif text-3xl font-light">
                  {item.title}
                </h3>

                <p className="mt-4 text-sm leading-7 text-zinc-400">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-red-700 py-20 text-white">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 px-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.35em] text-red-200">
              Sócios
            </p>

            <h2 className="mt-4 font-serif text-5xl font-light">
              Faz parte da família Boavista.
            </h2>
          </div>

          <Link
            to="/socios"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-6 py-4 text-sm font-black uppercase tracking-wide text-red-700 transition hover:bg-[#24180f] hover:text-white"
          >
            Tornar-me sócio
            <ChevronRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}