import { useEffect, useState } from 'react';
import { ArrowLeft, ExternalLink, Newspaper } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { NewsLikeButton } from '../../components/public/NewsLikeButton';
import { supabase } from '../../lib/supabase';
import type { GdrbNews } from '../../types/database';

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

function formatContent(content: string | null) {
  if (!content) {
    return [];
  }

  return content
    .split('\n')
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function NewsDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [newsItem, setNewsItem] = useState<GdrbNews | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadNewsItem() {
      if (!id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      const { data, error } = await supabase
        .from('gdrb_news')
        .select('*')
        .eq('id', id)
        .eq('is_published', true)
        .in('status', ['published', 'archived'])
        .single();

      if (error) {
        console.error('Erro ao carregar notícia:', error);
        setNewsItem(null);
        setIsLoading(false);
        return;
      }

      setNewsItem(data);
      setIsLoading(false);
    }

    loadNewsItem();
  }, [id]);

  if (isLoading) {
    return (
      <div className="bg-[#f6f2ec] px-4 py-24 text-zinc-950">
        <div className="mx-auto max-w-5xl rounded-sm border border-zinc-200 bg-white p-8 text-zinc-600 shadow-sm">
          A carregar notícia...
        </div>
      </div>
    );
  }

  if (!newsItem) {
    return (
      <div className="bg-[#f6f2ec] px-4 py-24 text-zinc-950">
        <div className="mx-auto max-w-5xl rounded-sm border border-dashed border-zinc-300 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-700">
            <Newspaper size={28} />
          </div>

          <h1 className="mt-5 font-serif text-4xl font-light text-[#24180f]">
            Notícia não encontrada
          </h1>

          <p className="mt-3 text-zinc-500">
            A notícia pode ter sido removida ou ainda não está publicada.
          </p>

          <Link
            to="/noticias"
            className="mt-8 inline-flex items-center gap-2 rounded-md bg-red-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-[#24180f]"
          >
            <ArrowLeft size={16} />
            Voltar às notícias
          </Link>
        </div>
      </div>
    );
  }

  const paragraphs = formatContent(newsItem.content);

  return (
    <div className="bg-[#f6f2ec] text-zinc-950">
      <section className="relative overflow-hidden bg-[#24180f] py-20 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_right,rgba(220,38,38,0.28),transparent_34%)]" />

        <div className="relative mx-auto max-w-5xl px-4">
          <Link
            to="/noticias"
            className="inline-flex items-center gap-2 rounded-md border border-white/10 px-4 py-2 text-sm font-bold text-zinc-300 transition hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft size={16} />
            Voltar às notícias
          </Link>

          <div className="mt-10 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-red-700 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-white">
              {newsItem.source}
            </span>

            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-zinc-300">
              {formatDate(newsItem.published_at)}
            </span>
          </div>

          <h1 className="mt-8 font-serif text-5xl font-light leading-tight tracking-tight md:text-7xl">
            {newsItem.title}
          </h1>

          {newsItem.summary && (
            <p className="mt-8 max-w-3xl text-lg leading-8 text-zinc-300">
              {newsItem.summary}
            </p>
          )}

          <div className="mt-8">
            <NewsLikeButton newsId={newsItem.id} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16">
        {newsItem.image_url ? (
          <img
            src={newsItem.image_url}
            alt={newsItem.title}
            className="-mt-28 mb-12 h-auto w-full rounded-sm border border-zinc-200 bg-white object-cover shadow-2xl shadow-zinc-950/20"
          />
        ) : (
          <div className="-mt-28 mb-12 flex h-80 w-full items-center justify-center rounded-sm border border-zinc-200 bg-white shadow-2xl shadow-zinc-950/20">
            <Newspaper size={58} className="text-red-700" />
          </div>
        )}

        <article className="rounded-sm border border-zinc-200 bg-white p-8 shadow-sm md:p-12">
          {paragraphs.length > 0 ? (
            <div className="space-y-6 text-base leading-9 text-zinc-700">
              {paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          ) : newsItem.summary ? (
            <p className="text-base leading-9 text-zinc-700">
              {newsItem.summary}
            </p>
          ) : (
            <p className="text-base leading-9 text-zinc-500">
              Esta notícia ainda não tem conteúdo detalhado.
            </p>
          )}

          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-zinc-200 pt-8">
            <NewsLikeButton newsId={newsItem.id} />

            {newsItem.external_url && (
              <a
                href={newsItem.external_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-md bg-red-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-[#24180f]"
              >
                Abrir link externo
                <ExternalLink size={16} />
              </a>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
