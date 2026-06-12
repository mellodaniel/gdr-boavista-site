import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { GdrbNews } from '../../types/database';

export function NewsPage() {
  const [news, setNews] = useState<GdrbNews[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadNews() {
      const { data, error } = await supabase
        .from('gdrb_news')
        .select('*')
        .eq('is_published', true)
        .order('published_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar notícias:', error);
      }

      setNews(data ?? []);
      setLoading(false);
    }

    loadNews();
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-4 py-16">
      <p className="text-sm font-bold uppercase tracking-[0.25em] text-red-600">
        Notícias
      </p>

      <h1 className="mt-3 text-4xl font-black">Últimas notícias</h1>

      <p className="mt-4 max-w-3xl text-zinc-600">
        Notícias do clube, AF Leiria, FPF e temas relevantes sobre futebol de
        formação e futebol distrital.
      </p>

      {loading ? (
        <div className="mt-10 rounded-3xl border border-zinc-200 bg-white p-8 text-zinc-600">
          A carregar notícias...
        </div>
      ) : (
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {news.map((item) => (
            <article
              key={item.id}
              className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm"
            >
              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold uppercase text-red-700">
                {item.source}
              </span>

              <h2 className="mt-5 text-xl font-black">{item.title}</h2>

              {item.summary && (
                <p className="mt-3 text-sm text-zinc-600">{item.summary}</p>
              )}

              {item.external_url && (
                <a
                  href={item.external_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex text-sm font-bold text-red-600 hover:text-red-700"
                >
                  Ver notícia
                </a>
              )}
            </article>
          ))}

          {news.length === 0 && (
            <div className="rounded-3xl border border-zinc-200 bg-white p-8 text-zinc-600">
              Ainda não existem notícias publicadas.
            </div>
          )}
        </div>
      )}
    </section>
  );
}