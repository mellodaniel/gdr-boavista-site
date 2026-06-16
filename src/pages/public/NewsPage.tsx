import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Newspaper, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { GdrbNews } from '../../types/database';

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

export function NewsPage() {
  const [news, setNews] = useState<GdrbNews[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState('Todas');
  const [search, setSearch] = useState('');

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

  useEffect(() => {
    async function loadNews() {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('gdrb_news')
        .select('*')
        .eq('is_published', true)
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
      <section className="relative overflow-hidden bg-[#24180f] py-24 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_right,rgba(220,38,38,0.28),transparent_34%)]" />

        <div className="relative mx-auto max-w-7xl px-4">
          <div className="max-w-4xl">
            <p className="text-sm font-bold uppercase tracking-[0.45em] text-red-400">
              Notícias
            </p>

            <h1 className="mt-8 font-serif text-6xl font-light leading-[0.95] tracking-tight md:text-8xl">
              Informação,
              <br />
              clube e comunidade.
            </h1>

            <p className="mt-8 max-w-2xl text-lg leading-8 text-zinc-300">
              Acompanha as novidades do GDR Boavista, informações da formação,
              notícias do clube e conteúdos relevantes do futebol distrital.
            </p>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-10 max-w-7xl px-4 pb-24">
        <div className="rounded-sm border border-zinc-200 bg-white p-7 shadow-2xl shadow-zinc-950/10">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <h2 className="font-serif text-3xl font-light text-[#24180f]">
                Pesquisar notícias
              </h2>

              <p className="mt-2 text-sm text-zinc-500">
                Filtra por fonte ou pesquisa por palavra-chave.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr_auto] lg:min-w-[620px]">
              <div className="relative">
                <Search
                  size={17}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
                />

                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Pesquisar por título, resumo ou conteúdo..."
                  className="w-full rounded-md border border-zinc-200 py-3 pl-11 pr-4 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
                />
              </div>

              <select
                value={sourceFilter}
                onChange={(event) => setSourceFilter(event.target.value)}
                className="rounded-md border border-zinc-200 px-4 py-3 text-sm font-semibold outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
              >
                {sourceFilters.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6 border-t border-zinc-200 pt-5">
            <p className="text-sm font-semibold text-zinc-500">
              {filteredNews.length} notícia(s) encontrada(s)
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="mt-8 rounded-sm border border-zinc-200 bg-white p-8 text-zinc-600">
            A carregar notícias...
          </div>
        ) : filteredNews.length === 0 ? (
          <div className="mt-8 rounded-sm border border-dashed border-zinc-300 bg-white p-10 text-center shadow-sm">
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
          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredNews.map((item) => (
              <Link
                key={item.id}
                to={`/noticias/${item.id}`}
                className="group overflow-hidden rounded-sm border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <article>
                  <div className="h-1.5 bg-red-700" />

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

                  <div className="p-7">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-red-700">
                        {item.source}
                      </span>

                      <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-600">
                        {formatDate(item.published_at)}
                      </span>
                    </div>

                    <h3 className="mt-6 font-serif text-4xl font-light leading-tight text-[#24180f]">
                      {item.title}
                    </h3>

                    {item.summary && (
                      <p className="mt-5 text-sm leading-7 text-zinc-600">
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
      </section>
    </div>
  );
}