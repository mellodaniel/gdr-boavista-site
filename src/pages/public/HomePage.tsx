import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  ChevronRight,
  HeartHandshake,
  Newspaper,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { GdrbMatch, GdrbNews } from '../../types/database';

const featuredTeams = [
  {
    title: 'Seniores',
    description: 'Equipa principal',
  },
  {
    title: 'Formação',
    description: 'Todos os escalões',
  },
  {
    title: 'Escola de Futebol',
    description: 'Os mais pequenos',
  },
];

const missionItems = [
  {
    icon: Users,
    title: 'Comunidade',
    description:
      'Aproximar atletas, famílias, sócios e comunidade num só espaço digital.',
  },
  {
    icon: Trophy,
    title: 'Formação',
    description:
      'Dar visibilidade aos escalões, jogos, conquistas e momentos importantes do clube.',
  },
  {
    icon: Newspaper,
    title: 'Comunicação',
    description:
      'Comunicar melhor as notícias do clube, da AF Leiria, da FPF e do futebol de formação.',
  },
  {
    icon: HeartHandshake,
    title: 'Parceiros',
    description:
      'Valorizar quem apoia o Boavista e fortalecer a ligação aos patrocinadores.',
  },
  {
    icon: ShieldCheck,
    title: 'Organização',
    description:
      'Organizar a gestão interna com uma área administrativa simples, moderna e eficiente.',
  },
];

const heroHighlights = ['Formação', 'Comunidade', 'Orgulho', 'Futebol'];

const weeklyTeamSlots = [
  {
    teamName: 'Petizes / ABC',
    footballType: 'Futebol 5',
  },
  {
    teamName: 'Traquinas',
    footballType: 'Futebol 5',
  },
  {
    teamName: 'Benjamins',
    footballType: 'Futebol 7',
  },
  {
    teamName: 'Infantis',
    footballType: 'Futebol 9',
  },
  {
    teamName: 'Iniciados',
    footballType: 'Futebol 11',
  },
  {
    teamName: 'Juvenis',
    footballType: 'Futebol 11',
  },
  {
    teamName: 'Juniores',
    footballType: 'Futebol 11',
  },
  {
    teamName: 'Seniores',
    footballType: 'Futebol 11',
  },
  {
    teamName: 'Veteranos',
    footballType: 'Futebol 11',
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
    <div className="bg-zinc-50">
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

        <div className="absolute inset-0 opacity-[0.045] [background-image:linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:64px_64px]" />

        <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-600/8 blur-3xl" />

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
              <Sparkles size={16} className="text-red-400" />
              Clube, formação e comunidade
            </div>

            <h1 className="max-w-4xl text-5xl font-black uppercase tracking-tight md:text-7xl">
              Formação, paixão e comunidade dentro e fora de campo
            </h1>

            <p className="mt-6 max-w-2xl text-lg font-medium leading-8 text-zinc-300">
              O Boavista é mais do que um clube: é uma família feita de atletas,
              sócios, pais, treinadores, patrocinadores e todos os que vivem o
              futebol com orgulho, união e ambição.
            </p>

            <div className="mt-10 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
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

        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-zinc-50 to-transparent" />
      </section>

      <section className="relative overflow-hidden border-b border-zinc-200 bg-white py-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(220,38,38,0.10),transparent_34%)]" />

        <div className="relative mx-auto max-w-7xl px-4">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-[0.35em] text-red-600">
                A nossa missão
              </p>

              <h2 className="mt-3 text-4xl font-black leading-tight text-zinc-950">
                Crescer juntos, formar melhor e representar Boavista com orgulho.
              </h2>
            </div>

            <div className="hidden rounded-full bg-zinc-950 px-5 py-3 text-sm font-bold text-white lg:flex lg:items-center lg:gap-2">
              <Sparkles size={17} className="text-red-500" />
              Clube, família e comunidade
            </div>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-5">
            {missionItems.map((item, index) => {
              const Icon = item.icon;

              return (
                <article
                  key={item.title}
                  className="group relative overflow-hidden rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-red-200 hover:shadow-xl"
                >
                  <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-red-100 opacity-0 transition group-hover:opacity-100" />

                  <div className="relative">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600 transition group-hover:bg-red-600 group-hover:text-white">
                      <Icon size={22} />
                    </div>

                    <p className="mt-5 text-xs font-black uppercase tracking-[0.3em] text-red-600">
                      0{index + 1}
                    </p>

                    <h3 className="mt-2 text-lg font-black text-zinc-950">
                      {item.title}
                    </h3>

                    <p className="mt-3 text-sm leading-6 text-zinc-600">
                      {item.description}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-zinc-950 py-16 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_left,rgba(220,38,38,0.24),transparent_34%),linear-gradient(135deg,rgba(9,9,11,1),rgba(24,24,27,1))]" />

        <div className="absolute -right-32 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-red-600/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.35em] text-red-500">
                Agenda da semana
              </p>
              <h2 className="mt-2 text-4xl font-black">Jogos por escalão</h2>
              <p className="mt-3 text-sm font-semibold text-zinc-400">
                Semana de {formatWeekLabel()}
              </p>
            </div>

            <Link
              to="/equipas"
              className="inline-flex items-center justify-center gap-1 rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-white hover:border-red-500 hover:bg-red-600"
            >
              Ver equipas <ChevronRight size={16} />
            </Link>
          </div>

          {loadingMatches ? (
            <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.06] p-8 text-zinc-300">
              A carregar jogos da semana...
            </div>
          ) : (
            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {weeklyTeamSlots.map((slot) => {
                const match = matchesByTeam[slot.teamName];

                return (
                  <article
                    key={slot.teamName}
                    className={`group min-h-[285px] overflow-hidden rounded-3xl border shadow-2xl transition hover:-translate-y-1 ${
                      match
                        ? 'border-white/10 bg-white/[0.07] hover:border-red-500/50 hover:bg-white/[0.10]'
                        : 'border-white/10 bg-white/[0.035]'
                    }`}
                  >
                    <div className={match ? 'h-2 bg-red-600' : 'h-2 bg-zinc-700'} />

                    <div className="flex h-full flex-col p-6">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-white">
                          {slot.teamName}
                        </span>

                        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-zinc-300">
                          {slot.footballType}
                        </span>
                      </div>

                      {match ? (
                        <>
                          <h3 className="mt-5 text-2xl font-black text-white">
                            GDR Boavista
                          </h3>

                          <p className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-400">
                            vs {match.opponent}
                          </p>

                          <p className="mt-4 text-sm font-semibold text-zinc-300">
                            {match.competition}
                          </p>

                          <div className="mt-5 flex items-center gap-2 text-sm text-zinc-300">
                            <CalendarDays size={16} className="text-red-500" />
                            {formatMatchDate(match.match_date)}
                            {match.match_time
                              ? ` | ${match.match_time.slice(0, 5)}`
                              : ''}
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <span className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold text-white">
                              {match.venue_type === 'casa' ? 'Casa' : 'Fora'}
                            </span>

                            <span className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold text-white">
                              {formatStatus(match.status)}
                            </span>
                          </div>

                          {match.location && (
                            <p className="mt-4 rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold text-zinc-200">
                              {match.location}
                            </p>
                          )}
                        </>
                      ) : (
                        <div className="flex flex-1 flex-col justify-center">
                          <p className="text-2xl font-black text-white">
                            Sem jogos agendados
                          </p>

                          <p className="mt-3 text-sm leading-6 text-zinc-400">
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

      <section className="relative overflow-hidden bg-zinc-100 py-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(220,38,38,0.10),transparent_35%)]" />

        <div className="relative mx-auto max-w-7xl px-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.35em] text-red-600">
                Informação
              </p>
              <h2 className="mt-2 text-4xl font-black text-zinc-950">
                Últimas notícias
              </h2>
            </div>

            <Link
              to="/noticias"
              className="hidden items-center gap-1 rounded-full bg-zinc-950 px-4 py-2 text-sm font-bold text-white hover:bg-red-600 sm:flex"
            >
              Ver todas <ChevronRight size={16} />
            </Link>
          </div>

          {loadingNews ? (
            <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-8 text-zinc-600 shadow-sm">
              A carregar notícias...
            </div>
          ) : latestNews.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-8 text-zinc-600 shadow-sm">
              Ainda não existem notícias publicadas.
            </div>
          ) : (
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {latestNews.map((item, index) => (
                <article
                  key={item.id}
                  className={`group relative overflow-hidden rounded-3xl border p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${
                    index === 0
                      ? 'border-red-200 bg-white'
                      : 'border-zinc-200 bg-white'
                  }`}
                >
                  {index === 0 && (
                    <div className="absolute inset-x-0 top-0 h-2 bg-red-600" />
                  )}

                  <div className="absolute -right-16 -top-16 h-32 w-32 rounded-full bg-red-100 opacity-70" />

                  <div className="relative">
                    <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold uppercase text-red-700">
                      {item.source}
                    </span>

                    {index === 0 && (
                      <span className="ml-2 rounded-full bg-zinc-950 px-3 py-1 text-xs font-bold uppercase text-white">
                        Destaque
                      </span>
                    )}

                    <h3 className="mt-5 text-2xl font-black leading-tight text-zinc-950">
                      {item.title}
                    </h3>

                    {item.summary && (
                      <p className="mt-4 text-sm leading-6 text-zinc-600">
                        {item.summary}
                      </p>
                    )}

                    <div className="mt-6 flex items-center justify-between gap-3">
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
                          className="inline-flex items-center gap-1 text-sm font-bold text-red-600 hover:text-red-700"
                        >
                          Ver notícia <ChevronRight size={15} />
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="relative overflow-hidden bg-white py-16">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(220,38,38,0.08),transparent_35%,rgba(24,24,27,0.05))]" />

        <div className="relative mx-auto max-w-7xl px-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.35em] text-red-600">
              Futebol
            </p>
            <h2 className="mt-2 text-4xl font-black text-zinc-950">
              Equipas em destaque
            </h2>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {featuredTeams.map((team) => (
              <Link
                key={team.title}
                to="/equipas"
                className="group relative overflow-hidden rounded-3xl bg-zinc-950 p-7 text-white shadow-xl transition hover:-translate-y-1 hover:bg-red-600"
              >
                <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-white/10" />

                <div className="relative">
                  <Trophy size={36} />

                  <h3 className="mt-10 text-3xl font-black">{team.title}</h3>

                  <p className="mt-3 text-sm text-zinc-300 group-hover:text-white">
                    {team.description}
                  </p>

                  <div className="mt-8 inline-flex items-center gap-1 text-sm font-bold">
                    Ver equipa <ChevronRight size={15} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-red-600 py-20 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_right,rgba(0,0,0,0.22),transparent_34%)]" />

        <div className="relative mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-3xl font-black uppercase">
              Faz parte da família Boavista
            </h2>

            <p className="mt-2 text-red-100">
              Apoia o clube, acompanha as equipas e ajuda-nos a crescer.
            </p>
          </div>

          <Link
            to="/socios"
            className="group inline-flex items-center justify-center rounded-full bg-white px-10 py-5 text-lg font-black uppercase tracking-wide text-red-600 shadow-2xl shadow-black/20 transition hover:-translate-y-1 hover:bg-zinc-950 hover:text-white"
          >
            Quero ser sócio
            <span className="ml-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-sm text-white transition group-hover:bg-white group-hover:text-zinc-950">
              →
            </span>
          </Link>
        </div>
      </section>
    </div>
  );
}