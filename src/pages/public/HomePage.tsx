import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronRight,
  ExternalLink,
  HeartHandshake,
  MapPin,
  Newspaper,
  QrCode,
  ShieldCheck,
  Smartphone,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { NewsLikeButton } from '../../components/public/NewsLikeButton';
import { supabase } from '../../lib/supabase';
import { trackAnalyticsEvent } from '../../lib/analytics';
import type { GdrbMatch, GdrbNews, GdrbSponsor, GdrbTournament } from '../../types/database';

const googleMapsUrl =
  'https://www.google.com/maps/place/Campo+do+Grupo+Desportivo+e+Recreativo+da+Boavista/@39.780229,-8.7487878,17z/data=!3m1!4b1!4m6!3m5!1s0xd2271873a862cd7:0x575890ac1492b6a2!8m2!3d39.780229!4d-8.7462129!16s%2Fg%2F11bytx3sxs?entry=ttu&g_ep=EgoyMDI2MDYxMC4wIKXMDSoASAFQAw%3D%3D';

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

  return `${formatDate(tournament.start_date)} a ${formatDate(tournament.end_date)}`;
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

function formatSponsorLevel(level: string) {
  const labels: Record<string, string> = {
    premium: 'Parceiro Premium',
    ouro: 'Parceiro Ouro',
    prata: 'Parceiro Prata',
    bronze: 'Parceiro Bronze',
    apoio: 'Apoio Oficial',
    partner: 'Parceiro Oficial',
    sponsor: 'Parceiro Oficial',
    'Patrocinador principal': 'Parceiro principal',
    'Patrocinador oficial': 'Parceiro oficial',
    'Patrocinador': 'Parceiro',
  };

  return (labels[level] ?? level) || 'Parceiro Oficial';
}

function getSponsorInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

function trackSponsorClick(sponsor: GdrbSponsor, position: string) {
  return trackAnalyticsEvent({
    eventName: 'sponsor_click',
    entityType: 'sponsor',
    entityId: sponsor.id,
    entityName: sponsor.name,
    metadata: {
      sponsor_level: sponsor.sponsor_level,
      position,
      website_url: sponsor.website_url,
    },
  });
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
  const [sponsors, setSponsors] = useState<GdrbSponsor[]>([]);
  const [isLoadingAgenda, setIsLoadingAgenda] = useState(true);

  useEffect(() => {
    async function loadHomeData() {
      setIsLoadingAgenda(true);

      const [matchesResult, tournamentsResult, newsResult, sponsorsResult] = await Promise.all([
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
          .eq('status', 'published')
          .order('sort_order', { ascending: true })
          .order('published_at', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false })
          .limit(12),

        supabase
          .from('gdrb_sponsors')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: false })
          .limit(12),
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

      if (sponsorsResult.error) {
        console.error('Erro ao carregar parceiros:', sponsorsResult.error);
      }

      setMatches(matchesResult.data ?? []);
      setTournaments(tournamentsResult.data ?? []);
      setNews(newsResult.data ?? []);
      setSponsors(sponsorsResult.data ?? []);
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

  useEffect(() => {
    if (sponsors.length === 0) {
      return;
    }

    void trackAnalyticsEvent({
      eventName: 'sponsor_section_view',
      entityType: 'sponsor_section',
      entityName: 'Homepage parceiros em destaque',
      metadata: {
        sponsors_count: sponsors.length,
        position: 'homepage_highlight',
      },
    });
  }, [sponsors.length]);

  const marqueeSponsors = sponsors.length > 0 ? [...sponsors, ...sponsors] : [];

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

        <div className="relative mx-auto flex min-h-[760px] max-w-7xl flex-col justify-center px-6 py-24 sm:px-8 lg:px-16 xl:px-28">
          <div className="max-w-3xl lg:ml-8 xl:ml-10">
            <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-center md:mb-12">
              <div className="relative flex h-32 w-32 shrink-0 items-center justify-center rounded-[2rem] bg-white p-4 shadow-2xl ring-4 ring-white/15 md:h-36 md:w-36 md:rounded-[2.35rem] md:p-5">
                <div className="absolute -inset-2 rounded-[2.25rem] bg-red-700/20 blur-xl md:rounded-[2.65rem]" />
                <img
                  src="/logo-gdr-boavista-header-256.png"
                  alt="GDR Boavista"
                  className="relative h-full w-full object-contain"
                />
              </div>

              <div className="max-w-2xl">
                <p className="text-base font-black uppercase tracking-[0.45em] text-red-400 md:text-xl">
                  GDR Boavista
                </p>
                <p className="mt-3 max-w-xl font-serif text-2xl font-light leading-tight text-white md:text-3xl">
                  Grupo Desportivo e Recreativo Boavista
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm font-bold uppercase tracking-[0.22em] text-zinc-200">
                  <span>Leiria</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  <span>Formação</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  <span>Comunidade</span>
                </div>
              </div>
            </div>

            <h1 className="max-w-3xl font-serif text-5xl font-light leading-[0.98] tracking-tight sm:text-6xl md:text-7xl">
              Formar atletas,
              <br />
              unir famílias.
            </h1>

            <p className="mt-8 max-w-xl text-base leading-8 text-zinc-300 md:text-lg">
              O GDR Boavista é uma casa de futebol, formação e comunidade. Um
              clube onde atletas, famílias, sócios e amigos vivem o futebol com
              compromisso, união e orgulho.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
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

            <div className="mt-10 flex flex-wrap gap-3">
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
            <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
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

                      <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-5">
                        <NewsLikeButton newsId={item.id} compact />

                        <span className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-wide text-red-700">
                          Ler notícia completa
                          <ChevronRight size={16} />
                        </span>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="overflow-hidden bg-white py-24">
        <style>{`
          @keyframes gdrb-sponsor-marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }

          .gdrb-sponsor-marquee {
            animation: gdrb-sponsor-marquee 34s linear infinite;
          }

          .gdrb-sponsor-marquee:hover {
            animation-play-state: paused;
          }

          @media (prefers-reduced-motion: reduce) {
            .gdrb-sponsor-marquee {
              animation: none;
              transform: none;
            }
          }
        `}</style>

        <div className="mx-auto max-w-7xl px-4">
          <div className="relative overflow-hidden rounded-sm bg-[#24180f] text-white shadow-2xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(220,38,38,0.32),transparent_34%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.08),transparent_28%)]" />

            <div className="relative grid gap-10 p-8 md:p-12 lg:grid-cols-[0.9fr_1.4fr] lg:items-center">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.38em] text-red-300">
                  Parceiros em destaque
                </p>

                <h2 className="mt-5 font-serif text-5xl font-light leading-tight md:text-6xl">
                  Marcas que apoiam o GDR Boavista.
                </h2>

                <p className="mt-5 text-base leading-8 text-zinc-300">
                  Os nossos parceiros ajudam a fortalecer a formação, o desporto
                  e a comunidade. Cada apoio faz a diferença dentro e fora de campo.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    to="/patrocinadores"
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-red-700 px-5 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-white hover:text-[#24180f]"
                  >
                    Ver parceiros
                    <ChevronRight size={16} />
                  </Link>

                  <Link
                    to="/contactos"
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-white/15 bg-white/10 px-5 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-white hover:text-[#24180f]"
                  >
                    Tornar-se parceiro
                    <ChevronRight size={16} />
                  </Link>
                </div>
              </div>

              <div className="overflow-hidden rounded-sm border border-white/10 bg-white/10 p-4">
                {sponsors.length === 0 ? (
                  <div className="rounded-sm border border-dashed border-white/20 bg-white/10 p-10 text-center">
                    <h3 className="font-serif text-3xl font-light">
                      Espaço reservado aos parceiros
                    </h3>

                    <p className="mt-4 text-sm leading-7 text-zinc-300">
                      Os parceiros ativos no admin aparecerão automaticamente
                      nesta área da página principal.
                    </p>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[#24180f] to-transparent" />
                    <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[#24180f] to-transparent" />

                    <div className="gdrb-sponsor-marquee flex w-max gap-4 py-2">
                      {marqueeSponsors.map((sponsor, index) => {
                        const content = (
                          <div className="flex h-full min-h-[170px] w-[230px] flex-col justify-between rounded-sm border border-white/10 bg-white p-5 text-[#24180f] shadow-xl transition hover:-translate-y-1 hover:shadow-2xl">
                            <div>
                              <div className="flex h-20 items-center justify-center rounded-sm bg-[#f6f2ec] p-4">
                                {sponsor.logo_url ? (
                                  <img
                                    src={sponsor.logo_url}
                                    alt={sponsor.name}
                                    className="max-h-full max-w-full object-contain"
                                  />
                                ) : (
                                  <span className="font-serif text-3xl font-light text-red-700">
                                    {getSponsorInitials(sponsor.name)}
                                  </span>
                                )}
                              </div>

                              <h3 className="mt-4 line-clamp-2 font-serif text-2xl font-light leading-tight">
                                {sponsor.name}
                              </h3>

                              <p className="mt-2 text-xs font-black uppercase tracking-[0.18em] text-red-700">
                                {formatSponsorLevel(sponsor.sponsor_level)}
                              </p>
                            </div>

                            <span className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-[#24180f]">
                              {sponsor.website_url ? 'Visitar parceiro' : 'Parceiro do clube'}
                              {sponsor.website_url && <ExternalLink size={13} />}
                            </span>
                          </div>
                        );

                        if (!sponsor.website_url) {
                          return <div key={`${sponsor.id}-${index}`}>{content}</div>;
                        }

                        return (
                          <a
                            key={`${sponsor.id}-${index}`}
                            href={sponsor.website_url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={() => {
                              void trackSponsorClick(sponsor, 'homepage_carousel');
                            }}
                          >
                            {content}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>


      <section className="bg-[#f6f2ec] py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="relative overflow-hidden rounded-sm border border-[#e5d8c7] bg-white shadow-xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(220,38,38,0.10),transparent_34%)]" />
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#f4e9dc]" />

            <div className="relative grid gap-10 p-8 md:p-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#f6f2ec] px-4 py-2 text-xs font-black uppercase tracking-[0.26em] text-red-700">
                  <Smartphone size={15} />
                  App instalável
                </div>

                <h2 className="mt-6 max-w-2xl font-serif text-4xl font-light leading-tight text-[#24180f] md:text-5xl">
                  Leve o GDR Boavista no telemóvel.
                </h2>

                <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-600">
                  Instale a app do clube e acompanhe notícias, jogos, loja oficial,
                  sócios e contactos diretamente no ecrã principal do telemóvel.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    to="/app"
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-[#24180f] px-6 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-red-700"
                  >
                    Instalar app
                    <ChevronRight size={16} />
                  </Link>

                  <a
                    href="/app-qr-code.png"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-[#e5d8c7] bg-[#f6f2ec] px-6 py-3 text-sm font-black uppercase tracking-wide text-[#24180f] transition hover:border-[#24180f] hover:bg-white"
                  >
                    Ver QR Code
                    <QrCode size={16} />
                  </a>
                </div>
              </div>

              <div className="rounded-sm border border-[#eadfce] bg-[#f8f3ec] p-5 shadow-inner">
                <div className="rounded-sm bg-white p-5 text-center shadow-md">
                  <img
                    src="/app-qr-code.png"
                    alt="QR Code para instalar a app GDR Boavista"
                    className="mx-auto h-48 w-48 rounded-sm object-contain md:h-56 md:w-56"
                  />
                </div>

                <p className="mt-5 text-center text-xs font-black uppercase tracking-[0.22em] text-red-700">
                  Aponte a câmara e instale
                </p>

                <p className="mt-3 text-center text-sm leading-6 text-zinc-600">
                  No iPhone, abra no Safari e escolha “Adicionar ao ecrã principal”.
                </p>
              </div>
            </div>
          </div>
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

      <section className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-4">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="group relative block min-h-[420px] overflow-hidden rounded-sm bg-[#24180f] shadow-xl"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.35),transparent_38%)]" />
            <div className="absolute inset-0 bg-gradient-to-br from-[#24180f] via-[#24180f]/90 to-red-950" />

            <div className="relative flex min-h-[420px] flex-col items-center justify-center p-10 text-center text-white">
              <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white p-3 shadow-2xl">
                <img
                  src="/logo-gdr-boavista-header-256.png"
                  alt="GDR Boavista"
                  className="h-full w-full object-contain"
                />
              </div>

              <p className="mt-8 text-sm font-bold uppercase tracking-[0.45em] text-red-300">
                Localização
              </p>

              <h2 className="mt-5 font-serif text-5xl font-light leading-tight md:text-6xl">
                Visita-nos no campo.
              </h2>

              <p className="mt-5 max-w-xl text-base leading-8 text-zinc-300">
                Campo do Grupo Desportivo e Recreativo da Boavista, em Leiria.
              </p>

              <span className="mt-8 inline-flex items-center gap-2 rounded-md bg-red-700 px-6 py-4 text-sm font-black uppercase tracking-wide text-white transition group-hover:bg-white group-hover:text-[#24180f]">
                Abrir no Google Maps
                <ChevronRight size={16} />
              </span>
            </div>
          </a>
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
