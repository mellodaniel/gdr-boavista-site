import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  CalendarDays,
  ExternalLink,
  Globe2,
  Laptop,
  MousePointerClick,
  RefreshCcw,
  Smartphone,
  TrendingUp,
  Users,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

type AnalyticsEvent = {
  id: string;
  event_name: string;
  page_path: string | null;
  page_title: string | null;
  entity_type: string | null;
  entity_id: string | null;
  entity_name: string | null;
  visitor_id: string | null;
  session_id: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type PeriodKey = '7d' | '30d' | '90d';

type RankedItem = {
  label: string;
  count: number;
  subLabel?: string;
};

const periodOptions: Array<{ key: PeriodKey; label: string; days: number }> = [
  { key: '7d', label: '7 dias', days: 7 },
  { key: '30d', label: '30 dias', days: 30 },
  { key: '90d', label: '90 dias', days: 90 },
];

const commercialEvents = new Set([
  'sponsor_impression',
  'sponsor_click',
  'shop_view',
  'shop_click',
  'contact_click',
  'contact_submit',
  'social_click',
  'maps_click',
  'member_cta_click',
  'member_request_submit',
  'news_like',
]);

const eventLabels: Record<string, string> = {
  page_view: 'Visualizações de página',
  navigation_click: 'Cliques no menu',
  news_view: 'Visualizações de notícia',
  news_like: 'Gostos em notícias',
  shop_view: 'Visitas à loja',
  shop_click: 'Cliques na loja',
  contact_click: 'Cliques de contacto',
  contact_submit: 'Formulários de contacto',
  social_click: 'Cliques em redes sociais',
  maps_click: 'Cliques no Google Maps',
  sponsor_impression: 'Impressões de patrocinador',
  sponsor_click: 'Cliques em patrocinador',
  member_cta_click: 'Cliques para sócios',
  member_request_submit: 'Pedidos de sócio',
};

function formatNumber(value: number) {
  return new Intl.NumberFormat('pt-PT').format(value);
}

function getPeriodStart(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(0, 0, 0, 0);
  return date;
}

function normalizeLabel(value: string | null | undefined, fallback = 'Não identificado') {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

function getPageLabel(path: string | null | undefined) {
  const pagePath = normalizeLabel(path, '/');

  if (pagePath === '/') return 'Página inicial';
  if (pagePath === '/noticias') return 'Notícias';
  if (pagePath.startsWith('/noticias/')) return 'Detalhe de notícia';
  if (pagePath === '/loja') return 'Loja';
  if (pagePath === '/contactos') return 'Contactos';
  if (pagePath === '/socios') return 'Sócios';
  if (pagePath === '/patrocinadores') return 'Patrocinadores';
  if (pagePath === '/equipas') return 'Equipas';
  if (pagePath === '/resultados') return 'Resultados';
  if (pagePath === '/galeria') return 'Galeria';
  if (pagePath === '/clube') return 'Clube';

  return pagePath;
}

function groupCount(
  events: AnalyticsEvent[],
  getKey: (event: AnalyticsEvent) => string,
  limit = 8,
): RankedItem[] {
  const counts = new Map<string, number>();

  events.forEach((event) => {
    const key = getKey(event);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function uniqueCount(events: AnalyticsEvent[], key: 'visitor_id' | 'session_id') {
  return new Set(
    events
      .map((event) => event[key])
      .filter((value): value is string => Boolean(value)),
  ).size;
}

function filterSince(events: AnalyticsEvent[], days: number) {
  const start = getPeriodStart(days).getTime();
  return events.filter((event) => new Date(event.created_at).getTime() >= start);
}

function getLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDailyCounts(events: AnalyticsEvent[], days: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daysList = Array.from({ length: days }).map((_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - 1 - index));
    const key = getLocalDateKey(date);
    return { key, label: date.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' }), count: 0 };
  });

  const byDay = new Map(daysList.map((day) => [day.key, day]));

  events.forEach((event) => {
    const eventDate = new Date(event.created_at);

    if (Number.isNaN(eventDate.getTime())) {
      return;
    }

    const key = getLocalDateKey(eventDate);
    const day = byDay.get(key);

    if (day) {
      day.count += 1;
    }
  });

  return daysList;
}

function getEventNameLabel(eventName: string) {
  return eventLabels[eventName] ?? eventName;
}

function getNewsRanking(events: AnalyticsEvent[], eventName: string) {
  const newsEvents = events.filter((event) => event.event_name === eventName);
  const counts = new Map<string, RankedItem>();

  newsEvents.forEach((event) => {
    const label = normalizeLabel(event.entity_name, getPageLabel(event.page_path));
    const key = event.entity_id ?? label;
    const current = counts.get(key) ?? {
      label,
      subLabel: event.page_path ?? undefined,
      count: 0,
    };

    current.count += 1;
    counts.set(key, current);
  });

  return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 8);
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: typeof BarChart3;
}) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-zinc-400">
            {title}
          </p>
          <p className="mt-4 font-serif text-4xl font-light text-[#24180f]">
            {value}
          </p>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-700">
          <Icon size={22} />
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-zinc-500">{description}</p>
    </div>
  );
}

function RankingCard({
  title,
  description,
  items,
  emptyMessage = 'Ainda não há dados suficientes para este bloco.',
}: {
  title: string;
  description?: string;
  items: RankedItem[];
  emptyMessage?: string;
}) {
  const max = Math.max(...items.map((item) => item.count), 1);

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="font-serif text-2xl font-light text-[#24180f]">{title}</h2>
        {description ? (
          <p className="mt-2 text-sm leading-6 text-zinc-500">{description}</p>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.label}>
              <div className="mb-2 flex items-start justify-between gap-4 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-bold text-zinc-800">{item.label}</p>
                  {item.subLabel ? (
                    <p className="mt-1 truncate text-xs text-zinc-400">{item.subLabel}</p>
                  ) : null}
                </div>
                <span className="shrink-0 font-black text-red-700">
                  {formatNumber(item.count)}
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-red-700"
                  style={{ width: `${Math.max((item.count / max) * 100, 6)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DailyActivityCard({ events, days }: { events: AnalyticsEvent[]; days: number }) {
  const dailyCounts = getDailyCounts(events, days <= 7 ? 7 : 14);
  const max = Math.max(...dailyCounts.map((day) => day.count), 1);

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm lg:col-span-2">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-light text-[#24180f]">
            Atividade recente
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Evolução dos eventos registados no site nos últimos dias.
          </p>
        </div>
        <div className="rounded-2xl bg-[#24180f] px-4 py-2 text-xs font-black uppercase tracking-wide text-white">
          Eventos
        </div>
      </div>

      <div className="flex h-56 items-end gap-2 border-b border-zinc-200 pb-4">
        {dailyCounts.map((day) => (
          <div key={day.key} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className="flex h-40 w-full items-end rounded-t-2xl bg-zinc-50 px-1">
              <div
                className="relative w-full rounded-t-2xl bg-red-700 transition-all"
                style={{ height: `${Math.max((day.count / max) * 100, day.count > 0 ? 8 : 0)}%` }}
                title={`${day.label}: ${day.count}`}
              >
                {day.count > 0 ? (
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-black text-red-700">
                    {day.count}
                  </span>
                ) : null}
              </div>
            </div>
            <p className="text-[10px] font-bold text-zinc-400">{day.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminAnalyticsPage() {
  const [period, setPeriod] = useState<PeriodKey>('30d');
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedPeriod = periodOptions.find((option) => option.key === period) ?? periodOptions[1];

  async function loadAnalytics() {
    setIsLoading(true);
    setErrorMessage(null);

    const startDate = getPeriodStart(90).toISOString();

    const { data, error } = await supabase
      .from('gdrb_analytics_events')
      .select('*')
      .gte('created_at', startDate)
      .order('created_at', { ascending: false })
      .limit(5000);

    if (error) {
      setErrorMessage('Não foi possível carregar os dados de analytics. Confirma as permissões RLS da tabela gdrb_analytics_events.');
      setEvents([]);
      setIsLoading(false);
      return;
    }

    setEvents((data ?? []) as AnalyticsEvent[]);
    setIsLoading(false);
  }

  useEffect(() => {
    loadAnalytics();
  }, []);

  const periodEvents = useMemo(
    () => filterSince(events, selectedPeriod.days),
    [events, selectedPeriod.days],
  );

  const pageViews = periodEvents.filter((event) => event.event_name === 'page_view');
  const commercialEventCount = periodEvents.filter((event) => commercialEvents.has(event.event_name)).length;
  const visitors = uniqueCount(periodEvents, 'visitor_id');
  const sessions = uniqueCount(periodEvents, 'session_id');

  const topPages = groupCount(pageViews, (event) => getPageLabel(event.page_path), 8).map((item) => ({
    ...item,
    subLabel: pageViews.find((event) => getPageLabel(event.page_path) === item.label)?.page_path ?? undefined,
  }));

  const topDevices = groupCount(periodEvents, (event) => normalizeLabel(event.device_type), 6);
  const topBrowsers = groupCount(periodEvents, (event) => normalizeLabel(event.browser), 6);
  const topEvents = groupCount(periodEvents, (event) => getEventNameLabel(event.event_name), 10);
  const topCommercialEvents = groupCount(
    periodEvents.filter((event) => commercialEvents.has(event.event_name)),
    (event) => getEventNameLabel(event.event_name),
    8,
  );
  const topNewsViews = getNewsRanking(periodEvents, 'news_view');
  const topNewsLikes = getNewsRanking(periodEvents, 'news_like');

  const lastUpdated = events[0]?.created_at
    ? new Date(events[0].created_at).toLocaleString('pt-PT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Sem dados';

  return (
    <div className="space-y-8">
      <div className="overflow-hidden rounded-[2rem] bg-[#24180f] text-white shadow-xl shadow-black/10">
        <div className="relative p-8 lg:p-10">
          <div className="absolute right-8 top-8 hidden h-32 w-32 rounded-full bg-red-700/30 blur-3xl lg:block" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.35em] text-red-400">
                Observabilidade comercial
              </p>
              <h1 className="mt-4 font-serif text-4xl font-light lg:text-5xl">
                Analytics do site
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">
                Acompanha visitas, páginas vistas, dispositivos, notícias e eventos comerciais para apoiar propostas a patrocinadores e parceiros.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-zinc-200">
                <span className="font-bold text-white">Último evento:</span> {lastUpdated}
              </div>

              <button
                type="button"
                onClick={loadAnalytics}
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black uppercase tracking-wide text-[#24180f] transition hover:bg-red-700 hover:text-white"
              >
                <RefreshCcw size={16} />
                Atualizar
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3 text-sm text-zinc-500">
          <CalendarDays size={18} className="text-red-700" />
          Período de análise
        </div>

        <div className="flex flex-wrap gap-2">
          {periodOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setPeriod(option.key)}
              className={`rounded-2xl px-5 py-2 text-sm font-black transition ${
                period === option.key
                  ? 'bg-red-700 text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-[#24180f] hover:text-white'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm leading-7 text-red-800">
          {errorMessage}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-3xl border border-zinc-200 bg-white p-10 text-center shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-zinc-400">
            A carregar analytics...
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Eventos"
              value={formatNumber(periodEvents.length)}
              description="Total de eventos registados no período selecionado."
              icon={Activity}
            />
            <StatCard
              title="Page views"
              value={formatNumber(pageViews.length)}
              description="Visualizações de páginas captadas pelo tracking próprio."
              icon={Globe2}
            />
            <StatCard
              title="Visitantes"
              value={formatNumber(visitors)}
              description="Visitantes únicos estimados por browser/dispositivo."
              icon={Users}
            />
            <StatCard
              title="Eventos comerciais"
              value={formatNumber(commercialEventCount)}
              description="Cliques e ações úteis para propostas comerciais."
              icon={MousePointerClick}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <DailyActivityCard events={periodEvents} days={selectedPeriod.days} />
            <RankingCard
              title="Resumo técnico"
              description="Sessões e utilização por dispositivo."
              items={[
                { label: 'Sessões', count: sessions, subLabel: 'Estimativa por sessão do browser' },
                { label: 'Visitantes únicos', count: visitors, subLabel: 'Estimativa por dispositivo' },
                { label: 'Page views', count: pageViews.length, subLabel: 'Páginas visualizadas' },
              ]}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <RankingCard
              title="Páginas mais vistas"
              description="Ajuda a perceber onde existe maior exposição para patrocinadores."
              items={topPages}
            />
            <RankingCard
              title="Eventos mais registados"
              description="Mostra quais ações geram mais interação no site."
              items={topEvents}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <RankingCard
              title="Eventos comerciais"
              description="Base para vender publicidade com dados reais de interação."
              items={topCommercialEvents}
            />
            <div className="grid gap-6 md:grid-cols-2">
              <RankingCard
                title="Dispositivos"
                description="Desktop, mobile ou tablet."
                items={topDevices}
              />
              <RankingCard
                title="Browsers"
                description="Tecnologia usada pelos visitantes."
                items={topBrowsers}
              />
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <RankingCard
              title="Notícias mais vistas"
              description="Conteúdo com maior potencial de exposição."
              items={topNewsViews}
            />
            <RankingCard
              title="Notícias com mais gostos"
              description="Mede envolvimento direto da comunidade."
              items={topNewsLikes}
            />
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="font-serif text-2xl font-light text-[#24180f]">
                  Como usar estes dados com patrocinadores
                </h2>
                <p className="mt-2 text-sm leading-7 text-zinc-500">
                  Depois de 30 dias, estes números já podem apoiar um media kit simples para venda de publicidade local.
                </p>
              </div>

              <a
                href="https://gdrboavista.pt"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#24180f] px-5 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-red-700"
              >
                Ver site
                <ExternalLink size={16} />
              </a>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-[#f6f2ec] p-5">
                <TrendingUp className="text-red-700" size={24} />
                <p className="mt-4 font-bold text-[#24180f]">Audiência</p>
                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  Quantas pessoas visitam o site e quais páginas recebem mais atenção.
                </p>
              </div>
              <div className="rounded-2xl bg-[#f6f2ec] p-5">
                <Smartphone className="text-red-700" size={24} />
                <p className="mt-4 font-bold text-[#24180f]">Dispositivos</p>
                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  Mostra se o público chega principalmente por telemóvel ou desktop.
                </p>
              </div>
              <div className="rounded-2xl bg-[#f6f2ec] p-5">
                <Laptop className="text-red-700" size={24} />
                <p className="mt-4 font-bold text-[#24180f]">Performance comercial</p>
                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  Mede cliques, gostos e ações que podem ser apresentados aos parceiros.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
