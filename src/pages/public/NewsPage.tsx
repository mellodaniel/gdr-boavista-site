import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, ExternalLink, Newspaper, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { NewsLikeButton } from '../../components/public/NewsLikeButton';
import { supabase } from '../../lib/supabase';
import type { GdrbNews, GdrbNewsStatus } from '../../types/database';

const sourceFilters = [
  'Todas',
  'GDR Boavista',
  'AF Leiria',
  'FPF',
  'Futebol de formação',
  'Outra fonte',
];

function formatDate(date: string | null) {
  if (!date) {
    return 'Data por definir';
  }

  return new Date(date).toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function getNewsStatus(item: GdrbNews): GdrbNewsStatus {
  if (item.status) {
    return item.status;
  }

  return item.is_published ? 'published' : 'draft';
}

export function NewsPage() {
  const [news, setNews] = useState<GdrbNews[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState('Todas');
  const [search, setSearch] = useState('');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [expandedNewsId, setExpandedNewsId] = useState<string | null>(null);
  const filteredNews = useMemo(() => {
    return news.filter((item) => {
      const matchesSource =
        sourceFilter === 'Todas' || item.source === sourceFilter;

      const searchableText = `${item.title} ${item.summary ?? ''} ${
        item.content ?? ''
      } ${item.source}`
        .toLowerCase()
        .trim();

      const matchesSearch =
        !search.trim() || searchableText.includes(search.toLowerCase().trim());

      return matchesSource && matchesSearch;
    });
  }, [news, sourceFilter, search]);

  const publishedCount = useMemo(
    () => news.filter((item) => getNewsStatus(item) === 'published').length,
    [news],
  );


  useEffect(() => {
    async function loadNews() {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('gdrb_news')
        .select('*')
        .eq('is_published', true)
        .eq('status', 'published')
        .order('sort_order', { ascending: true })
        .order('published_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar notícias:', error);
      }

      setNews(data ?? []);
      setIsLoading(false);
    }

    loadNews();
  }, []);

  return (
    <div className="bg-[#f6f2ec] text-zinc-950">
      <section className="relative overflow-hidden bg-[#24180f] py-16 text-white md:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_right,rgba(220,38,38,0.28),transparent_34%)]" />

        <div className="relative mx-auto max-w-7xl px-5 md:px-4">
          <div className="max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-red-400 md:text-sm md:tracking-[0.45em]">
              Notícias
            </p>

            <h1 className="mt-6 font-serif text-4xl font-light leading-[0.95] tracking-tight md:mt-8 md:text-8xl">
              Informação,
              <br />
              clube e comunidade.
            </h1>


          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-6 max-w-7xl px-5 md:px-4 pb-16 md:-mt-10 md:pb-24">
        <div className="rounded-2xl md:rounded-sm border border-zinc-200 bg-white p-4 shadow-lg md:shadow-2xl shadow-zinc-950/10 md:p-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl font-light text-[#24180f] md:text-3xl">
                Notícias publicadas
              </h2>

              <p className="mt-1 text-sm font-semibold text-zinc-500">
                {filteredNews.length} notícia(s) encontrada(s)
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsFiltersOpen((value) => !value)}
              className="inline-flex items-center gap-2 rounded-md border border-zinc-200 px-5 md:px-4 py-3 text-xs font-black uppercase tracking-wide text-zinc-700 md:hidden"
            >
              Filtrar
              <ChevronDown
                size={16}
                className={`transition ${isFiltersOpen ? 'rotate-180' : ''}`}
              />
            </button>
          </div>

          <div className={`${isFiltersOpen ? 'grid' : 'hidden'} mt-5 gap-4 border-t border-zinc-100 pt-5 md:grid md:grid-cols-[1fr_auto] md:border-t-0 md:pt-0 lg:min-w-[620px]`}>
            <div className="relative">
              <Search
                size={17}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
              />

              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Pesquisar notícias..."
                className="w-full rounded-md border border-zinc-200 py-3 pl-11 pr-4 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
              />
            </div>

            <select
              value={sourceFilter}
              onChange={(event) => setSourceFilter(event.target.value)}
              className="rounded-md border border-zinc-200 px-5 md:px-4 py-3 text-sm font-semibold outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
            >
              {sourceFilters.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-5 flex flex-col justify-between gap-3 border-t border-zinc-200 pt-4 md:flex-row md:items-center">
            <span className="inline-flex w-fit rounded-full bg-red-700 px-5 md:px-4 py-2 text-xs font-black uppercase tracking-wide text-white md:text-sm">
              Publicadas · {publishedCount}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="mt-8 rounded-2xl md:rounded-sm border border-zinc-200 bg-white p-6 md:p-8 text-zinc-600">
            A carregar notícias...
          </div>
        ) : filteredNews.length === 0 ? (
          <div className="mt-8 rounded-2xl md:rounded-sm border border-dashed border-zinc-300 bg-white p-6 md:p-10 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-700">
              <Newspaper size={28} />
            </div>

            <h3 className="mt-5 font-serif text-3xl font-light text-[#24180f]">
              Sem notícias encontradas
            </h3>

            <p className="mt-3 text-zinc-500">
              Não existem notícias publicadas para os filtros selecionados.
            </p>
          </div>
        ) : (
          <div className="mt-8 overflow-hidden rounded-2xl md:rounded-sm border border-zinc-200 bg-white shadow-sm md:grid md:gap-6 md:border-0 md:bg-transparent md:shadow-none lg:grid-cols-2 xl:grid-cols-3">
            {filteredNews.map((item, index) => {
              const isExpanded = expandedNewsId === item.id;

              return (
                <article
                  key={item.id}
                  className={`${index === 0 ? '' : 'border-t border-zinc-100 md:border-t-0'} overflow-hidden bg-white md:rounded-sm md:border md:border-zinc-200 md:shadow-sm md:transition md:hover:-translate-y-1 md:hover:shadow-xl`}
                >
                  <div className="hidden h-1.5 bg-red-700 md:block" />

                  <button
                    type="button"
                    onClick={() => setExpandedNewsId(isExpanded ? null : item.id)}
                    className="flex w-full gap-4 p-4 text-left md:hidden"
                  >
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="h-20 w-24 shrink-0 rounded-2xl md:rounded-sm object-cover"
                      />
                    ) : (
                      <div className="flex h-20 w-24 shrink-0 items-center justify-center rounded-2xl md:rounded-sm bg-[#24180f]">
                        <Newspaper size={24} className="text-red-500" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-red-700">
                          {item.source}
                        </span>
                        <span className="text-xs font-semibold text-zinc-500">
                          {formatDate(item.published_at)}
                        </span>
                      </div>

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

                      {item.external_url && (
                        <a
                          href={item.external_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-red-700"
                        >
                          Ver fonte externa
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  )}

                  <Link to={`/noticias/${item.id}`} className="group hidden md:block">
                    {item.image_url ? (
                      <div className="h-56 overflow-hidden">
                        <img
                          src={item.image_url}
                          alt={item.title}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      </div>
                    ) : (
                      <div className="flex h-56 items-center justify-center bg-[#24180f]">
                        <Newspaper size={50} className="text-red-500" />
                      </div>
                    )}

                    <div className="p-5 md:p-7">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-red-700">
                          {item.source}
                        </span>

                        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-600">
                          {formatDate(item.published_at)}
                        </span>
                      </div>

                      <h3 className="mt-6 font-serif text-3xl font-light leading-tight text-[#24180f] xl:text-4xl">
                        {item.title}
                      </h3>

                      {item.summary && (
                        <p className="mt-5 text-sm leading-7 text-zinc-600">
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
                  </Link>

                  {item.external_url && (
                    <div className="hidden px-7 pb-7 md:block">
                      <a
                        href={item.external_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-md bg-[#24180f] px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700"
                      >
                        Ver fonte externa
                        <ExternalLink size={16} />
                      </a>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
