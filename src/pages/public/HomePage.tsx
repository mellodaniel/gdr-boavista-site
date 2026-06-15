import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  ChevronRight,
  HeartHandshake,
  Newspaper,
  ShieldCheck,
  Trophy,
  Users,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { GdrbMatch, GdrbNews } from '../../types/database';

const featuredTeams = [
  {
    title: 'Escola de Futebol',
    description: 'Petizes, ABC e Traquinas',
  },
  {
    title: 'Formação',
    description: 'Benjamins, Infantis, Iniciados, Juvenis e Juniores',
  },
  {
    title: 'Competição',
    description: 'Seniores e Veteranos',
  },
];

const valueItems = [
  {
    icon: Users,
    title: 'Comunidade',
    description:
      'Um clube feito por atletas, famílias, sócios, treinadores e todos os que vivem o Boavista.',
  },
  {
    icon: Trophy,
    title: 'Formação',
    description:
      'Acompanhamos os jovens atletas dentro e fora de campo, com foco no crescimento e no espírito de equipa.',
  },
  {
    icon: HeartHandshake,
    title: 'União',
    description:
      'Valorizamos o compromisso, o respeito, a entreajuda e o orgulho em representar o GDR Boavista.',
  },
];

const missionItems = [
  {
    icon: Users,
    title: 'Família',
    description: 'Aproximar atletas, pais, sócios e comunidade.',
  },
  {
    icon: Trophy,
    title: 'Competição',
    description: 'Valorizar jogos, resultados e conquistas.',
  },
  {
    icon: Newspaper,
    title: 'Comunicação',
    description: 'Partilhar notícias, eventos e momentos importantes.',
  },
  {
    icon: ShieldCheck,
    title: 'Organização',
    description: 'Dar ao clube uma presença digital moderna e simples.',
  },
];

const heroHighlights = ['Formação', 'Comunidade', 'Orgulho', 'Futebol'];

const weeklyTeamSlots = [
  { teamName: 'Petizes / ABC', footballType: 'Futebol 5' },
  { teamName: 'Traquinas', footballType: 'Futebol 5' },
  { teamName: 'Benjamins', footballType: 'Futebol 7' },
  { teamName: 'Infantis', footballType: 'Futebol 9' },
  { teamName: 'Iniciados', footballType: 'Futebol 11' },
  { teamName: 'Juvenis', footballType: 'Futebol 11' },
  { teamName: 'Juniores', footballType: 'Futebol 11' },
  { teamName: 'Seniores', footballType: 'Futebol 11' },
  { teamName: 'Veteranos', footballType: 'Futebol 11' },
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

function formatDateToInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatWeekLabel() {
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

function formatMatchDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('pt-PT', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
}

function formatStatus(status: string) {
  const statusLabels: Record<string, string> = {
    agendado: 'Agendado',
    terminado: 'Terminado',
    adiado: 'Adiado',
    cancelado: 'Cancelado',
  };

  return statusLabels[status] ?? status;
}

function getMatchTeams(match: GdrbMatch) {
  if (match.venue_type === 'fora') {
    return {
      firstTeam: match.opponent,
      secondTeam: 'GDR Boavista',
    };
  }

  return {
    firstTeam: 'GDR Boavista',
    secondTeam: match.opponent,
  };
}

export function HomePage() {
  const [latestNews, setLatestNews] = useState<GdrbNews[]>([]);
  const [weeklyMatches, setWeeklyMatches] = useState<GdrbMatch[]>([]);
  const [loadingNews, setLoadingNews] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(true);

  const matchesByTeam = useMemo(() => {
    return weeklyTeamSlots.reduce<Record<string, GdrbMatch | undefined>>(
      (acc, slot) => {
        const match = weeklyMatches.find(
          (item) => item.team_name === slot.teamName,
        );

        acc[slot.teamName] = match;
        return acc;
      },
      {},
    );
  }, [weeklyMatches]);

  useEffect(() => {
    async function loadLatestNews() {
      const { data, error } = await supabase
        .from('gdrb_news')
        .select('*')
        .eq('is_published', true)
        .order('published_at', { ascending: false, nullsFirst: false })
        .limit(3);

      if (error) {
        console.error('Erro ao carregar últimas notícias:', error);
      }

      setLatestNews(data ?? []);
      setLoadingNews(false);
    }

    async function loadWeeklyMatches() {
      const { monday, sunday } = getCurrentWeekRange();

      const { data, error } = await supabase
        .from('gdrb_matches')
        .select('*')
        .eq('is_visible', true)
        .in('status', ['agendado', 'adiado', 'cancelado'])
        .gte('match_date', formatDateToInput(monday))
        .lte('match_date', formatDateToInput(sunday))
        .order('match_date', { ascending: true })
        .order('match_time', { ascending: true })
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Erro ao carregar jogos da semana:', error);
      }

      setWeeklyMatches(data ?? []);
      setLoadingMatches(false);
    }

    loadLatestNews();
    loadWeeklyMatches();
  }, []);

  return (
    <div className="bg-[#f6f2ec] text-zinc-950">
      <section className="relative min-h-[720px] overflow-hidden bg-black text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_42%,rgba(220,38,38,0.32),transparent_30%),radial-gradient(circle_at_24%_32%,rgba(220,38,38,0.12),transparent_28%),linear-gradient(135deg,rgba(3,3,4,1),rgba(10,10,12,1)_48%,rgba(3,3,4,1))]" />

        <div className="absolute inset-0 hidden overflow-hidden lg:block">
          <img
            src="/hero-boavista.webp"
            alt="Logo do GDR Boavista com brilho"
            className="absolute inset-0 h-full w-full object-cover object-center opacity-70"
          />

          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/82 to-black/25" />
          <div className="absolute inset-0 bg-gradient-to-l from-black/60 via-black/10 to-black/85" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/65" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_45%,transparent_0%,rgba(0,0,0,0.24)_30%,rgba(0,0,0,0.86)_74%)]" />
        </div>

        <div className="relative mx-auto flex min-h-[720px] max-w-7xl items-center px-4 py-20">
          <div className="max-w-3xl">
            <div className="mb-8 flex items-center gap-5">
              <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white/10 p-2 shadow-2xl ring-1 ring-white/15 backdrop-blur">
                <img
                  src="/logo-gdr-boavista-header-256.png"
                  alt="GDR Boavista"
                  className="h-full w-full object-contain"
                />
              </div>

              <div>
                <p className="text-3xl font-black uppercase leading-tight">
                  GDR Boavista
                </p>
                <p className="mt-1 text-sm font-bold uppercase tracking-[0.28em] text-red-400">
                  Grupo Desportivo Recreativo Boavista
                </p>
              </div>
            </div>

            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-600/10 px-4 py-2 text-sm font-bold text-red-200 backdrop-blur">
              Clube, formação e comunidade
            </div>

            <p className="text-sm font-bold uppercase tracking-[0.45em] text-red-400">
              Leiria · Futebol · Formação
            </p>

            <h1 className="mt-8 max-w-4xl font-serif text-6xl font-light leading-[0.96] tracking-tight md:text-8xl">
              Formar atletas,
              <br />
              unir famílias.
            </h1>

            <p className="mt-8 max-w-2xl text-lg font-medium leading-8 text-zinc-300">
              O GDR Boavista é uma casa de futebol, formação e comunidade. Um
              clube feito por atletas, famílias, sócios, treinadores e todos os
              que vivem o futebol com orgulho, união e ambição.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                to="/socios"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-red-700 px-8 py-4 text-sm font-black uppercase tracking-wide text-white shadow-xl shadow-black/20 transition hover:bg-red-800"
              >
                Quero ser sócio
                <ChevronRight size={17} />
              </Link>

              <Link
                to="/equipas"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-white/15 px-8 py-4 text-sm font-bold text-white transition hover:border-red-500 hover:bg-white/10"
              >
                Ver equipas
              </Link>
            </div>

            <div className="mt-14 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
              {heroHighlights.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-center text-sm font-black uppercase tracking-[0.16em] text-white shadow-lg backdrop-blur transition hover:border-red-500/50 hover:bg-red-600/20"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#f6f2ec] to-transparent" />
      </section>

      <section className="relative overflow-hidden bg-[#f6f2ec] py-24">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mx-auto max-w-4xl">
            <p className="text-sm font-bold uppercase tracking-[0.45em] text-red-700">
              Quem somos
            </p>

            <h2 className="mt-8 font-serif text-5xl font-light leading-tight text-[#24180f] md:text-7xl">
              Mais do que um clube —
              <br />
              uma família que cresce dentro e fora de campo.
            </h2>

            <div className="mt-10 grid gap-8 text-base leading-8 text-zinc-600 md:grid-cols-2">
              <p>
                O GDR Boavista representa a força da formação, da dedicação e
                da ligação à comunidade. Cada treino, cada jogo e cada conquista
                fazem parte de uma história construída por todos.
              </p>

              <p>
                O nosso objetivo é dar aos atletas um espaço de crescimento,
                disciplina, amizade e paixão pelo futebol, com o apoio das
                famílias, sócios, patrocinadores e amigos do clube.
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

                  <p className="mt-4 text-sm uppercase leading-6 tracking-[0.14em] text-zinc-400">
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
                Agenda
              </p>

              <h2 className="mt-5 font-serif text-5xl font-light text-[#24180f] md:text-6xl">
                Jogos da semana
              </h2>

              <p className="mt-4 text-sm font-semibold text-zinc-500">
                Semana de {formatWeekLabel()}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/equipas"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-zinc-300 px-5 py-3 text-sm font-bold text-zinc-700 transition hover:border-red-700 hover:text-red-700"
              >
                Ver equipas <ChevronRight size={16} />
              </Link>

              <Link
                to="/resultados"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-red-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-800"
              >
                Histórico de jogos <ChevronRight size={16} />
              </Link>
            </div>
          </div>

          {loadingMatches ? (
            <div className="mt-10 rounded-sm border border-zinc-200 bg-[#f6f2ec] p-8 text-zinc-600">
              A carregar jogos da semana...
            </div>
          ) : (
            <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {weeklyTeamSlots.map((slot) => {
                const match = matchesByTeam[slot.teamName];

                return (
                  <article
                    key={slot.teamName}
                    className="group overflow-hidden rounded-sm border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div
                      className={
                        match ? 'h-1.5 bg-red-700' : 'h-1.5 bg-zinc-300'
                      }
                    />

                    <div className="p-6">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-red-700">
                          {slot.teamName}
                        </span>

                        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-600">
                          {slot.footballType}
                        </span>
                      </div>

                      {match ? (
                        <>
                          {(() => {
                            const { firstTeam, secondTeam } =
                              getMatchTeams(match);

                            return (
                              <>
                                <h3 className="mt-6 font-serif text-3xl font-light leading-tight text-[#24180f]">
                                  {firstTeam}
                                </h3>

                                <p className="mt-1 text-sm font-bold uppercase tracking-[0.22em] text-zinc-500">
                                  vs {secondTeam}
                                </p>
                              </>
                            );
                          })()}

                          <p className="mt-5 text-sm font-semibold text-zinc-600">
                            {match.competition}
                          </p>

                          <div className="mt-5 flex items-center gap-2 text-sm text-zinc-600">
                            <CalendarDays size={16} className="text-red-700" />
                            {formatMatchDate(match.match_date)}
                            {match.match_time
                              ? ` | ${match.match_time.slice(0, 5)}`
                              : ''}
                          </div>

                          <div className="mt-5 flex flex-wrap gap-2">
                            <span className="rounded-full bg-[#f6f2ec] px-4 py-2 text-sm font-semibold text-zinc-700">
                              {match.venue_type === 'casa' ? 'Casa' : 'Fora'}
                            </span>

                            <span className="rounded-full bg-[#f6f2ec] px-4 py-2 text-sm font-semibold text-zinc-700">
                              {formatStatus(match.status)}
                            </span>
                          </div>

                          {match.location && (
                            <p className="mt-4 text-sm font-semibold text-zinc-500">
                              {match.location}
                            </p>
                          )}
                        </>
                      ) : (
                        <div className="py-10">
                          <p className="font-serif text-3xl font-light text-[#24180f]">
                            Sem jogos agendados
                          </p>

                          <p className="mt-4 text-sm leading-6 text-zinc-500">
                            Não há jogos marcados para este escalão na semana
                            corrente.
                          </p>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="bg-[#f6f2ec] py-24">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.45em] text-red-700">
                Informação
              </p>

              <h2 className="mt-5 font-serif text-5xl font-light text-[#24180f] md:text-6xl">
                Últimas notícias
              </h2>
            </div>

            <Link
              to="/noticias"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#24180f] px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700"
            >
              Ver todas <ChevronRight size={16} />
            </Link>
          </div>

          {loadingNews ? (
            <div className="mt-10 rounded-sm border border-zinc-200 bg-white p-8 text-zinc-600">
              A carregar notícias...
            </div>
          ) : latestNews.length === 0 ? (
            <div className="mt-10 rounded-sm border border-zinc-200 bg-white p-8 text-zinc-600">
              Ainda não existem notícias publicadas.
            </div>
          ) : (
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {latestNews.map((item) => (
                <article
                  key={item.id}
                  className="group rounded-sm border border-zinc-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <span className="text-xs font-bold uppercase tracking-[0.25em] text-red-700">
                    {item.source}
                  </span>

                  <h3 className="mt-5 font-serif text-3xl font-light leading-tight text-[#24180f]">
                    {item.title}
                  </h3>

                  {item.summary && (
                    <p className="mt-5 text-sm leading-7 text-zinc-600">
                      {item.summary}
                    </p>
                  )}

                  <div className="mt-7 flex items-center justify-between gap-3">
                    {item.published_at && (
                      <p className="text-xs font-semibold text-zinc-500">
                        {new Date(item.published_at).toLocaleDateString(
                          'pt-PT',
                        )}
                      </p>
                    )}

                    {item.external_url && (
                      <a
                        href={item.external_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sm font-bold text-red-700 hover:text-red-900"
                      >
                        Ver notícia <ChevronRight size={15} />
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.45em] text-red-700">
              Futebol
            </p>

            <h2 className="mt-5 font-serif text-5xl font-light text-[#24180f] md:text-6xl">
              As nossas equipas
            </h2>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {featuredTeams.map((team) => (
              <Link
                key={team.title}
                to="/equipas"
                className="group relative overflow-hidden rounded-sm bg-[#24180f] p-8 text-white transition hover:-translate-y-1 hover:bg-red-800"
              >
                <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-white/10" />

                <div className="relative">
                  <Trophy size={34} className="text-red-400" />

                  <h3 className="mt-12 font-serif text-4xl font-light">
                    {team.title}
                  </h3>

                  <p className="mt-4 text-sm leading-6 text-zinc-300">
                    {team.description}
                  </p>

                  <div className="mt-10 inline-flex items-center gap-2 text-sm font-bold">
                    Ver escalões <ChevronRight size={15} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#24180f] py-20 text-white">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-6 md:grid-cols-4">
            {missionItems.map((item) => {
              const Icon = item.icon;

              return (
                <article key={item.title} className="border border-white/10 p-6">
                  <Icon size={26} className="text-red-500" />

                  <h3 className="mt-6 font-serif text-2xl font-light">
                    {item.title}
                  </h3>

                  <p className="mt-4 text-sm leading-6 text-zinc-400">
                    {item.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-red-700 py-20 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_right,rgba(0,0,0,0.22),transparent_34%)]" />

        <div className="relative mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.35em] text-red-200">
              Sócios
            </p>

            <h2 className="mt-4 font-serif text-5xl font-light">
              Faz parte da família Boavista.
            </h2>

            <p className="mt-4 max-w-xl text-red-100">
              Apoia o clube, acompanha as equipas e ajuda-nos a continuar a
              crescer dentro e fora de campo.
            </p>
          </div>

          <Link
            to="/socios"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-8 py-4 text-sm font-black uppercase tracking-wide text-red-700 shadow-xl transition hover:bg-[#24180f] hover:text-white"
          >
            Quero ser sócio
            <ChevronRight size={17} />
          </Link>
        </div>
      </section>
    </div>
  );
}