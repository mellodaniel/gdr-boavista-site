import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  HeartHandshake,
  MapPin,
  Mail,
  Newspaper,
  ShieldCheck,
  Send,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { NewsLikeButton } from '../../components/public/NewsLikeButton';
import { supabase } from '../../lib/supabase';
import { trackAnalyticsEvent } from '../../lib/analytics';
import type { GdrbMatch, GdrbNews, GdrbSponsor, GdrbTournament } from '../../types/database';

const googleMapsUrl =
  'https://www.google.com/maps/place/Campo+do+Grupo+Desportivo+e+Recreativo+da+Boavista/@39.780229,-8.7487878,17z/data=!3m1!4b1!4m6!3m5!1s0xd2271873a862cd7:0x575890ac1492b6a2!8m2!3d39.780229!4d-8.7462129!16s%2Fg%2F11bytx3sxs?entry=ttu&g_ep=EgoyMDI2MDYxMC4wIKXMDSoASAFQAw%3D%3D';


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

function NewsletterSignupSection() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [acceptsNewsletter, setAcceptsNewsletter] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSuccessMessage('');
    setErrorMessage('');

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setErrorMessage('Indica o teu email para subscrever a newsletter.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setErrorMessage('Indica um email válido.');
      return;
    }

    if (!acceptsNewsletter) {
      setErrorMessage('Tens de aceitar receber comunicações para subscrever a newsletter.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/subscribe-newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          email: normalizedEmail,
          consentEmail: acceptsNewsletter,
          privacyPolicyAccepted: acceptsNewsletter,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result?.error || 'Não foi possível concluir a subscrição.');
      }

      setSuccessMessage('Subscrição registada com sucesso. Obrigado por acompanhares o GDR Boavista.');
      setName('');
      setEmail('');
      setAcceptsNewsletter(false);
      trackAnalyticsEvent({
        eventName: 'newsletter_subscribe',
        entityType: 'newsletter',
        entityName: 'Homepage',
      });
    } catch (error) {
      console.error('Erro ao subscrever newsletter:', error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível concluir a subscrição. Tenta novamente.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="bg-[#f6f2ec] py-10 md:py-14">
      <div className="mx-auto max-w-7xl px-5 md:px-4">
        <div className="gdrb-soft-panel rounded-2xl md:rounded-[1.35rem] border border-[#eadfce] bg-white px-5 py-5 shadow-lg shadow-zinc-950/5 md:px-7 md:py-6">
          <div className="grid gap-5 lg:grid-cols-[0.95fr_1.55fr] lg:items-center">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#2a1a12] text-red-100 shadow-sm">
                <Mail size={19} />
              </div>

              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.34em] text-red-700">
                  Newsletter
                </p>

                <h2 className="mt-2 font-serif text-2xl font-light leading-tight text-[#24180f] md:text-3xl">
                  Recebe novidades do clube.
                </h2>

                <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-600">
                  Notícias, jogos e comunicados oficiais do GDR Boavista no teu email.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {successMessage && (
                <div className="flex items-start gap-3 rounded-2xl md:rounded-[1.35rem] border border-green-200 bg-green-50 p-3 text-sm font-semibold text-green-800">
                  <CheckCircle2 size={18} />
                  <span>{successMessage}</span>
                </div>
              )}

              {errorMessage && (
                <div className="rounded-2xl md:rounded-[1.35rem] border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">
                  {errorMessage}
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-[0.9fr_1.1fr_auto] md:items-end">
                <div>
                  <label className="text-xs font-black uppercase tracking-wide text-zinc-600">
                    Nome
                  </label>

                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="O teu nome"
                    className="mt-1.5 w-full rounded-md border border-zinc-200 px-5 md:px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-wide text-zinc-600">
                    Email *
                  </label>

                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="email@exemplo.pt"
                    className="mt-1.5 w-full rounded-md border border-zinc-200 px-5 md:px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex h-[46px] items-center justify-center gap-2 rounded-md bg-red-700 px-5 text-xs font-black uppercase tracking-wide text-white transition hover:bg-[#24180f] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? 'A subscrever...' : 'Subscrever'}
                  <Send size={15} />
                </button>
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl md:rounded-[1.35rem] border border-zinc-200 bg-[#faf7f2] px-3 py-2.5 text-xs leading-5 text-zinc-600">
                <input
                  type="checkbox"
                  checked={acceptsNewsletter}
                  onChange={(event) => setAcceptsNewsletter(event.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-red-700 focus:ring-red-700"
                />
                <span>
                  Aceito receber comunicações por email e sei que posso cancelar a subscrição a qualquer momento.
                </span>
              </label>

              <p className="text-[11px] leading-5 text-zinc-500">
                Usaremos o teu email apenas para comunicações do clube.
              </p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

export function HomePage() {
  const [matches, setMatches] = useState<GdrbMatch[]>([]);
  const [tournaments, setTournaments] = useState<GdrbTournament[]>([]);
  const [news, setNews] = useState<GdrbNews[]>([]);
  const [sponsors, setSponsors] = useState<GdrbSponsor[]>([]);
  const [isLoadingAgenda, setIsLoadingAgenda] = useState(true);
  const [expandedAgendaItemId, setExpandedAgendaItemId] = useState<string | null>(null);
  const [expandedHomeNewsId, setExpandedHomeNewsId] = useState<string | null>(null);

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
          .eq('is_archived', false)
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

  const featuredTournament = useMemo(() => {
    return tournaments.find((tournament) =>
      tournament.name.toLowerCase().includes('torneio fut 7') ||
      tournament.football_type.toLowerCase() === 'futebol 7',
    );
  }, [tournaments]);

  const featuredTournamentLink = featuredTournament?.website_url?.trim() || '/torneios/fut7-boavista-2026';

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
    <div className="gdrb-public-page gdrb-home bg-[#f6f2ec] text-zinc-950">
      <section className="gdrb-home-hero relative min-h-[640px] overflow-hidden bg-[#24180f] text-white md:min-h-[760px]">
        <img
          src="/hero-boavista.webp"
          alt="GDR Boavista"
          className="absolute inset-0 h-full w-full object-cover opacity-45 md:hidden"
        />
        <img
          src="/hero-boavista-premium.webp"
          alt=""
          aria-hidden="true"
          className="gdrb-home-hero-image absolute inset-0 hidden h-full w-full object-cover object-center opacity-90 md:block"
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#24180f] via-[#24180f]/80 to-black/30 md:via-[#24180f]/74 md:to-black/20" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_right,rgba(220,38,38,0.28),transparent_35%)] md:bg-[radial-gradient(circle_at_78%_32%,rgba(220,38,38,0.30),transparent_31%)]" />
        <div className="absolute inset-x-0 bottom-0 hidden h-36 bg-gradient-to-t from-[#f6f2ec] via-[#f6f2ec]/12 to-transparent md:block" />

        <div className="relative mx-auto flex min-h-[640px] max-w-7xl flex-col justify-center md:min-h-[760px] px-6 py-14 md:py-24 sm:px-8 lg:px-16 xl:px-28">
          <div className="max-w-3xl lg:ml-8 xl:ml-10">
            <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center md:mb-12 md:gap-6">
              <div className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-[1.75rem] bg-white p-4 shadow-lg md:shadow-2xl ring-4 ring-white/15 md:h-36 md:w-36 md:rounded-[2.35rem] md:p-5">
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
              </div>
            </div>

            <div className="mt-2 h-px w-20 bg-gradient-to-r from-red-500/90 to-transparent md:mt-0 md:w-24" />

            <h1 className="mt-8 max-w-3xl font-serif text-4xl font-light leading-[0.98] tracking-tight sm:text-6xl md:mt-10 md:text-7xl">
              Formar atletas,
              <br />
              unir famílias.
            </h1>

            <p className="mt-7 max-w-2xl text-base leading-8 text-zinc-300 md:mt-8 md:text-lg">
              O GDR Boavista é uma casa de futebol, formação e comunidade. Um
              clube onde atletas, famílias, sócios e amigos vivem o futebol com
              compromisso, união e orgulho.
            </p>

            <div className="mt-8 flex flex-wrap gap-4 md:mt-9">
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

          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#f8f6f2] text-[#24180f]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_22%,rgba(185,28,28,0.09),transparent_26%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-200/70 to-transparent" />

        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 py-14 md:px-4 md:py-16 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-3 rounded-full border border-red-200/80 bg-white/80 px-4 py-2 shadow-sm backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-red-700 shadow-[0_0_14px_rgba(185,28,28,0.25)]" />
              <span className="text-[11px] font-black uppercase tracking-[0.28em] text-red-700">
                Época 2026/27 · Equipa Sénior
              </span>
            </div>

            <h2 className="mt-6 max-w-3xl font-serif text-4xl font-light leading-[1.03] tracking-tight text-[#24180f] md:text-6xl">
              Campeões invictos.
              <br />
              Um novo desafio começa agora.
            </h2>

            <p className="mt-6 max-w-2xl text-base leading-8 text-[#65584e] md:text-lg">
              Depois de uma época inesquecível, conquistada sem uma única derrota,
              os nossos Seniores entram em 2026/27 com a mesma ambição, união e
              compromisso. O passado dá-nos orgulho; o próximo capítulo dá-nos
              ainda mais vontade de lutar.
            </p>

            <blockquote className="mt-6 max-w-2xl border-l-2 border-red-300 pl-5 font-serif text-xl italic leading-8 text-[#3d3028] md:text-2xl">
              Ao novo plantel, toda a força do Boavista. Que esta equipa continue
              a honrar o símbolo, a camisola e todos os que caminham connosco.
            </blockquote>

            <div className="mt-8">
              <Link
                to="/equipas/seniores/plantel-2026-gdrb-7f4k"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-red-700 px-6 py-4 text-sm font-black uppercase tracking-wide text-white shadow-[0_18px_40px_-24px_rgba(127,29,29,0.45)] transition hover:-translate-y-0.5 hover:bg-red-800 hover:shadow-[0_22px_44px_-24px_rgba(127,29,29,0.5)]"
              >
                Conhecer o plantel 2026/27
                <ChevronRight size={18} />
              </Link>
            </div>
          </div>

          <div className="hidden lg:flex lg:justify-end">
            <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-[#e8dfd7] bg-white p-2.5 shadow-[0_28px_70px_-42px_rgba(67,43,27,0.45)]">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[1.45rem]">
                <img
                  src="/hero-boavista-premium.webp"
                  alt="Futebol no GDR Boavista"
                  className="h-full w-full object-cover object-[62%_center] brightness-110 saturate-105 transition duration-700 hover:scale-[1.025]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#24180f]/72 via-transparent to-white/5" />
                <div className="absolute bottom-0 left-0 right-0 p-7">
                  <p className="text-xs font-black uppercase tracking-[0.28em] text-red-100">
                    Orgulho · Ambição · União
                  </p>
                  <p className="mt-3 max-w-sm font-serif text-3xl font-light leading-tight text-white">
                    Uma equipa pronta para escrever o próximo capítulo.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {featuredTournament && (
        <section className="relative overflow-hidden bg-[#111827] py-14 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(220,38,38,0.45),transparent_34%)]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#24180f] via-[#4a1515] to-[#7f1d1d]" />

          <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-5 md:px-4 md:grid-cols-[1fr_auto]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.42em] text-red-200">Torneio em destaque</p>
              <h2 className="mt-4 font-serif text-4xl font-light leading-tight md:text-6xl">
                {featuredTournament.name}
              </h2>
              <p className="mt-5 max-w-3xl text-base font-semibold leading-7 text-red-50 md:text-lg">
                Calendário, grupos, jogos e resultados online. Acompanha tudo em tempo real no site oficial do clube.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <span className="rounded-full bg-white/12 px-5 md:px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white">
                  {featuredTournament.football_type}
                </span>
                {featuredTournament.location && (
                  <span className="rounded-full bg-white/12 px-5 md:px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white">
                    {featuredTournament.location}
                  </span>
                )}
                <span className="rounded-full bg-white/12 px-5 md:px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white">
                  {formatTournamentDate(featuredTournament)}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
              <Link
                to={featuredTournamentLink}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-6 py-4 text-sm font-black uppercase tracking-wide text-red-800 shadow-md md:shadow-xl transition hover:bg-red-50"
              >
                Ver torneio online
                <ChevronRight size={18} />
              </Link>
            </div>
          </div>
        </section>
      )}

      <section className="py-14 md:py-24">
        <div className="mx-auto max-w-7xl px-5 md:px-4">
          <div className="mx-auto max-w-4xl">
            <p className="text-sm font-bold uppercase tracking-[0.45em] text-red-700">
              Quem somos
            </p>

            <h2 className="mt-8 font-serif text-4xl font-light leading-tight text-[#24180f] md:text-7xl">
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

          <div className="gdrb-premium-dark mt-16 grid gap-0 overflow-hidden rounded-2xl md:rounded-[1.35rem] bg-[#24180f] text-white md:grid-cols-3 md:shadow-[0_32px_90px_-56px_rgba(36,24,15,0.85)]">
            {valueItems.map((item, index) => {
              const Icon = item.icon;

              return (
                <article
                  key={item.title}
                  className={`p-6 md:p-10 text-center ${
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

          <Link
            to="/horarios-de-treino"
            onClick={() => {
              void trackAnalyticsEvent({
                eventName: 'training_schedule_click',
                entityType: 'training_schedule',
                entityName: 'Horários de treino 2026/27',
                metadata: { position: 'homepage_banner' },
              });
            }}
            aria-label="Consultar os horários de treino da época 2026/27"
            className="group relative mt-8 block overflow-hidden rounded-2xl border border-[#e4d8cd] bg-[linear-gradient(135deg,#ffffff_0%,#faf6f1_58%,#f2e6dc_100%)] p-5 shadow-[0_24px_70px_-50px_rgba(59,37,24,0.65)] transition hover:-translate-y-1 hover:border-red-200 hover:shadow-[0_30px_78px_-48px_rgba(59,37,24,0.72)] md:mt-10 md:rounded-[1.6rem] md:p-8"
          >
            <div className="pointer-events-none absolute -right-14 top-1/2 h-56 w-56 -translate-y-1/2 rounded-full border border-red-900/[0.07] md:right-10 md:h-72 md:w-72" />
            <div className="pointer-events-none absolute right-20 top-0 hidden h-full w-px bg-red-900/[0.07] md:block" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-[radial-gradient(circle_at_center,rgba(185,28,28,0.09),transparent_64%)]" />

            <div className="relative grid gap-5 md:grid-cols-[auto_1fr_auto] md:items-center md:gap-7">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#24180f] text-white shadow-[0_16px_34px_-22px_rgba(36,24,15,0.85)] transition group-hover:bg-red-700 md:h-16 md:w-16">
                <CalendarDays size={27} />
              </span>

              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-700 md:text-xs">
                  Horários de treino · Época 2026/27
                </p>
                <h2 className="mt-2 font-serif text-3xl font-light leading-tight text-[#24180f] md:text-4xl">
                  Todos os horários. Um só lugar.
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-zinc-600 md:text-base">
                  Consulta os dias e horários de todos os escalões do GDR Boavista.
                </p>
              </div>

              <span className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-red-700 px-5 py-3.5 text-sm font-black uppercase tracking-wide text-white transition group-hover:bg-[#24180f] md:w-auto">
                Consultar horários
                <ChevronRight size={17} />
              </span>
            </div>
          </Link>
        </div>
      </section>

      <section className="bg-white py-14 md:py-24">
        <div className="mx-auto max-w-7xl px-5 md:px-4">
          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.32em] text-red-700 md:text-sm md:tracking-[0.45em]">
                Semana de {getWeekLabel()}
              </p>

              <h2 className="mt-4 font-serif text-3xl font-light text-[#24180f] md:mt-5 md:text-6xl">
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
            <div className="mt-10 rounded-2xl md:rounded-[1.35rem] border border-zinc-200 bg-[#f6f2ec] p-6 md:p-8 text-zinc-600">
              A carregar agenda da semana...
            </div>
          ) : agendaItems.length === 0 ? (
            <div className="mt-10 rounded-2xl md:rounded-[1.35rem] border border-dashed border-zinc-300 bg-[#f6f2ec] p-6 md:p-10 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-700">
                <CalendarDays size={28} />
              </div>

              <h3 className="mt-5 font-serif text-3xl font-light text-[#24180f]">
                Sem jogos ou torneios nesta semana
              </h3>

            </div>
          ) : (
            <div className="mt-7 overflow-hidden rounded-2xl md:rounded-[1.35rem] border border-zinc-200 bg-white shadow-sm md:mt-10">
              {agendaItems.map((item, index) => {
                const itemKey = `${item.type}-${item.id}`;
                const isExpanded = expandedAgendaItemId === itemKey;

                if (item.type === 'tournament') {
                  const tournament = item.data;

                  return (
                    <article
                      key={itemKey}
                      className={index === 0 ? '' : 'border-t border-zinc-100'}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedAgendaItemId(isExpanded ? null : itemKey)
                        }
                        className="flex w-full flex-col gap-4 p-5 text-left transition hover:bg-[#f6f2ec] lg:flex-row lg:items-center lg:justify-between"
                      >
                        <div className="min-w-0">
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

                          <h3 className="mt-3 font-serif text-2xl font-light leading-tight text-[#24180f] md:text-3xl">
                            {tournament.name}
                          </h3>
                        </div>

                        <div className="flex shrink-0 items-center gap-4 text-sm font-semibold text-zinc-600">
                          <span className="inline-flex items-center gap-2 rounded-md bg-[#f6f2ec] px-5 md:px-4 py-3">
                            <CalendarDays size={16} className="text-red-700" />
                            {formatTournamentDate(tournament)}
                          </span>

                          <span className="inline-flex items-center gap-2 rounded-md border border-zinc-200 px-5 md:px-4 py-3 text-xs font-black uppercase tracking-wide text-zinc-700">
                            Detalhes
                            <ChevronDown
                              size={16}
                              className={`transition ${isExpanded ? 'rotate-180' : ''}`}
                            />
                          </span>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-zinc-100 bg-[#fdfbf8] px-5 py-5">
                          <div className="grid gap-3 text-sm text-zinc-600 md:grid-cols-2">
                            <span className="inline-flex items-center gap-2 rounded-md bg-white px-5 md:px-4 py-3 font-semibold shadow-sm">
                              <CalendarDays size={16} className="text-red-700" />
                              {formatTournamentDate(tournament)}
                            </span>

                            {tournament.location && (
                              <span className="inline-flex items-center gap-2 rounded-md bg-white px-5 md:px-4 py-3 font-semibold shadow-sm">
                                <MapPin size={16} className="text-red-700" />
                                {tournament.location}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </article>
                  );
                }

                const match = item.data;
                const mainTitle = match.venue_type === 'fora' ? match.opponent : 'GDR Boavista';
                const subTitle = match.venue_type === 'fora' ? 'vs GDR Boavista' : `vs ${match.opponent}`;

                return (
                  <article
                    key={itemKey}
                    className={index === 0 ? '' : 'border-t border-zinc-100'}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedAgendaItemId(isExpanded ? null : itemKey)
                      }
                      className="flex w-full flex-col gap-4 p-5 text-left transition hover:bg-[#f6f2ec] lg:flex-row lg:items-center lg:justify-between"
                    >
                      <div className="min-w-0">
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

                        <h3 className="mt-3 font-serif text-2xl font-light leading-tight text-[#24180f] md:text-3xl">
                          {mainTitle}
                        </h3>

                        <p className="mt-1 text-sm font-black uppercase tracking-[0.18em] text-zinc-500">
                          {subTitle}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-4 text-sm font-semibold text-zinc-600">
                        <span className="inline-flex items-center gap-2 rounded-md bg-[#f6f2ec] px-5 md:px-4 py-3">
                          <CalendarDays size={16} className="text-red-700" />
                          {formatDateShort(match.match_date)}
                          {match.match_time ? ` | ${match.match_time.slice(0, 5)}` : ''}
                        </span>

                        <span className="inline-flex items-center gap-2 rounded-md border border-zinc-200 px-5 md:px-4 py-3 text-xs font-black uppercase tracking-wide text-zinc-700">
                          Detalhes
                          <ChevronDown
                            size={16}
                            className={`transition ${isExpanded ? 'rotate-180' : ''}`}
                          />
                        </span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-zinc-100 bg-[#fdfbf8] px-5 py-5">
                        <p className="text-sm font-semibold text-zinc-600">
                          {match.competition}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-3 text-sm text-zinc-600">
                          <span className="rounded-md bg-white px-5 md:px-4 py-3 font-semibold shadow-sm">
                            {match.venue_type === 'casa' ? 'Casa' : 'Fora'}
                          </span>

                          {match.location && (
                            <span className="inline-flex items-center gap-2 rounded-md bg-white px-5 md:px-4 py-3 font-semibold shadow-sm">
                              <MapPin size={16} className="text-red-700" />
                              {match.location}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="py-14 md:py-24">
        <div className="mx-auto max-w-7xl px-5 md:px-4">
          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.32em] text-red-700 md:text-sm md:tracking-[0.45em]">
                Notícias
              </p>

              <h2 className="mt-4 font-serif text-3xl font-light text-[#24180f] md:mt-5 md:text-6xl">
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
            <div className="mt-10 rounded-2xl md:rounded-[1.35rem] border border-dashed border-zinc-300 bg-white p-6 md:p-10 text-center">
              <Newspaper className="mx-auto text-red-700" size={32} />

              <h3 className="mt-5 font-serif text-3xl font-light text-[#24180f]">
                Notícias em preparação
              </h3>

              <p className="mt-3 text-zinc-500">
                As notícias publicadas no admin aparecem automaticamente aqui.
              </p>
            </div>
          ) : (
            <div className="mt-7 overflow-hidden rounded-2xl md:rounded-[1.35rem] border border-zinc-200 bg-white shadow-sm md:mt-10 md:grid md:gap-6 md:border-0 md:bg-transparent md:shadow-none lg:grid-cols-3">
              {news.map((item, index) => {
                const isExpanded = expandedHomeNewsId === item.id;

                return (
                  <article
                    key={item.id}
                    className={`${index === 0 ? '' : 'border-t border-zinc-100 md:border-t-0'} overflow-hidden bg-white md:rounded-[1.35rem] md:border md:border-zinc-200 md:shadow-sm md:transition md:hover:-translate-y-1 md:hover:shadow-xl`}
                  >
                    <div className="hidden h-1.5 bg-red-700 md:block" />

                    <button
                      type="button"
                      onClick={() => setExpandedHomeNewsId(isExpanded ? null : item.id)}
                      className="flex w-full gap-4 p-4 text-left md:hidden"
                    >
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.title}
                          className="h-[4.5rem] w-24 shrink-0 rounded-2xl md:rounded-[1.35rem] object-cover"
                        />
                      ) : (
                        <div className="flex h-[4.5rem] w-24 shrink-0 items-center justify-center rounded-2xl md:rounded-[1.35rem] bg-[#24180f]">
                          <Newspaper size={22} className="text-red-500" />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <span className="rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-red-700">
                          {item.source}
                        </span>

                        <h3 className="mt-2 line-clamp-2 font-serif text-xl font-light leading-tight text-[#24180f]">
                          {item.title}
                        </h3>
                      </div>

                      <ChevronDown
                        size={18}
                        className={`mt-1 shrink-0 text-zinc-400 transition ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {isExpanded && (
                      <div className="border-t border-zinc-100 bg-[#fdfbf8] p-4 md:hidden">
                        {item.summary && (
                          <p className="text-sm leading-6 text-zinc-600">
                            {item.summary}
                          </p>
                        )}

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                          <NewsLikeButton newsId={item.id} compact />

                          <Link
                            to={`/noticias/${item.id}`}
                            className="inline-flex items-center gap-2 rounded-md bg-red-700 px-5 md:px-4 py-3 text-xs font-black uppercase tracking-wide text-white"
                          >
                            Ler notícia
                            <ChevronRight size={15} />
                          </Link>
                        </div>
                      </div>
                    )}

                    <Link
                      to={`/noticias/${item.id}`}
                      className="group hidden md:block"
                    >
                      <article>
                        {item.image_url && (
                          <div className="h-52 overflow-hidden">
                            <img
                              src={item.image_url}
                              alt={item.title}
                              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                            />
                          </div>
                        )}

                        <div className="p-5 md:p-7">
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
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="overflow-hidden bg-white py-14 md:py-24">
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

        <div className="mx-auto max-w-7xl px-5 md:px-4">
          <div className="gdrb-premium-dark relative overflow-hidden rounded-2xl md:rounded-[1.35rem] bg-[#24180f] text-white shadow-lg md:shadow-2xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(220,38,38,0.32),transparent_34%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.08),transparent_28%)]" />

            <div className="relative grid gap-10 p-6 md:p-12 lg:grid-cols-[0.9fr_1.4fr] lg:items-center">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.38em] text-red-300">
                  Parceiros em destaque
                </p>

                <h2 className="mt-5 font-serif text-4xl font-light leading-tight md:text-6xl">
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

              <div className="relative overflow-hidden py-2 md:py-5">
                {sponsors.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.06] p-6 text-center backdrop-blur-sm md:p-10">
                    <h3 className="font-serif text-3xl font-light">
                      Espaço reservado aos parceiros
                    </h3>

                    <p className="mt-4 text-sm leading-7 text-zinc-300">
                      Os parceiros ativos no admin aparecerão automaticamente
                      nesta área da página principal.
                    </p>
                  </div>
                ) : (
                  <div className="relative overflow-hidden">
                    <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-[#24180f] via-[#24180f]/85 to-transparent md:w-20" />
                    <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-[#24180f] via-[#24180f]/85 to-transparent md:w-20" />

                    <div className="gdrb-sponsor-marquee flex w-max gap-3 py-3 md:gap-5 md:py-5">
                      {marqueeSponsors.map((sponsor, index) => {
                        const content = (
                          <div className="group relative flex h-full min-h-[132px] w-[185px] flex-col rounded-2xl border border-[#eadfd3] bg-[#fbf8f4]/95 p-4 text-[#24180f] shadow-[0_12px_30px_rgba(20,12,8,0.10)] backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-white hover:bg-white hover:shadow-[0_18px_42px_rgba(20,12,8,0.18)] md:min-h-[150px] md:w-[205px] md:p-5">
                            {sponsor.website_url && (
                              <span className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#eadfd3] bg-white/80 text-[#6f5a4b] transition duration-300 group-hover:border-red-200 group-hover:text-red-700">
                                <ExternalLink size={13} />
                              </span>
                            )}

                            <div className="flex h-16 items-center justify-center pr-8 md:h-20">
                              {sponsor.logo_url ? (
                                <img
                                  src={sponsor.logo_url}
                                  alt={sponsor.name}
                                  className="max-h-full max-w-full object-contain transition duration-300 group-hover:scale-[1.03]"
                                />
                              ) : (
                                <span className="font-serif text-3xl font-light text-red-700">
                                  {getSponsorInitials(sponsor.name)}
                                </span>
                              )}
                            </div>

                            <div className="mt-auto pt-4">
                              <h3 className="line-clamp-2 font-serif text-lg font-medium leading-snug md:text-xl">
                                {sponsor.name}
                              </h3>

                              <span className="mt-2 inline-flex rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-red-700">
                                {formatSponsorLevel(sponsor.sponsor_level)}
                              </span>
                            </div>
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


      <NewsletterSignupSection />

      <section className="bg-[#24180f] py-14 md:py-24 text-white md:bg-[linear-gradient(135deg,#f4ebe2_0%,#fff_48%,#efe0d5_100%)] md:text-[#24180f]">
        <div className="mx-auto max-w-7xl px-5 md:px-4">
          <div className="grid gap-6 md:grid-cols-3">
            {missionItems.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl md:rounded-[1.35rem] border border-white/10 bg-white/5 p-6 md:border-[#eadfd2] md:bg-white/80 md:p-8 md:shadow-[0_24px_70px_-52px_rgba(59,37,24,0.55)] md:backdrop-blur"
              >
                <h3 className="font-serif text-3xl font-light">
                  {item.title}
                </h3>

                <p className="mt-4 text-sm leading-7 text-zinc-400 md:text-zinc-600">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-14 md:py-24">
        <div className="mx-auto max-w-7xl px-5 md:px-4">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="gdrb-pitch-panel group relative block min-h-[320px] overflow-hidden md:min-h-[420px] rounded-2xl md:rounded-[1.35rem] bg-[#24180f] shadow-md md:shadow-xl"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.35),transparent_38%)] md:bg-[radial-gradient(circle_at_28%_18%,rgba(251,191,36,0.18),transparent_34%)]" />
            <div className="absolute inset-0 bg-gradient-to-br from-[#24180f] via-[#24180f]/90 to-red-950 md:bg-gradient-to-br md:from-[#102f24]/35 md:via-[#123729]/20 md:to-[#0b241b]/45" />

            <div className="relative flex min-h-[320px] flex-col items-center justify-center md:min-h-[420px] p-6 md:p-10 text-center text-white">
              <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white p-3 shadow-lg md:shadow-2xl">
                <img
                  src="/logo-gdr-boavista-header-256.png"
                  alt="GDR Boavista"
                  className="h-full w-full object-contain"
                />
              </div>

              <p className="mt-8 text-sm font-bold uppercase tracking-[0.45em] text-red-300">
                Localização
              </p>

              <h2 className="mt-5 font-serif text-4xl font-light leading-tight md:text-6xl">
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

      <section className="gdrb-premium-red bg-red-700 py-14 md:py-20 text-white">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 px-5 md:px-4 md:flex-row md:items-center">
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
