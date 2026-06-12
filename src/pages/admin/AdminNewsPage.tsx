import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ExternalLink, Newspaper, Plus, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { GdrbNews } from '../../types/database';

const sourceOptions = [
  'GDR Boavista',
  'AF Leiria',
  'FPF',
  'Futebol de formação',
  'Outra fonte',
];

export function AdminNewsPage() {
  const [news, setNews] = useState<GdrbNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [source, setSource] = useState('GDR Boavista');
  const [externalUrl, setExternalUrl] = useState('');
  const [isPublished, setIsPublished] = useState(true);

  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  async function loadNews() {
    setLoading(true);
    setErrorMessage('');

    const { data, error } = await supabase
      .from('gdrb_news')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao carregar notícias:', error);
      setErrorMessage('Não foi possível carregar as notícias.');
    }

    setNews(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadNews();
  }, []);

  async function handleCreateNews(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSuccessMessage('');
    setErrorMessage('');

    if (!title.trim()) {
      setErrorMessage('Indica o título da notícia.');
      return;
    }

    setSaving(true);

    const { error } = await supabase.from('gdrb_news').insert({
      title: title.trim(),
      summary: summary.trim() || null,
      content: content.trim() || null,
      source,
      external_url: externalUrl.trim() || null,
      is_published: isPublished,
      published_at: isPublished ? new Date().toISOString() : null,
    });

    setSaving(false);

    if (error) {
      console.error('Erro ao criar notícia:', error);
      setErrorMessage('Não foi possível criar a notícia.');
      return;
    }

    setTitle('');
    setSummary('');
    setContent('');
    setSource('GDR Boavista');
    setExternalUrl('');
    setIsPublished(true);
    setSuccessMessage('Notícia criada com sucesso.');
    loadNews();
  }

  async function togglePublished(item: GdrbNews) {
    setErrorMessage('');
    setSuccessMessage('');

    const nextPublishedState = !item.is_published;

    const { error } = await supabase
      .from('gdrb_news')
      .update({
        is_published: nextPublishedState,
        published_at: nextPublishedState
          ? item.published_at ?? new Date().toISOString()
          : null,
      })
      .eq('id', item.id);

    if (error) {
      console.error('Erro ao atualizar notícia:', error);
      setErrorMessage('Não foi possível atualizar o estado da notícia.');
      return;
    }

    setNews((currentNews) =>
      currentNews.map((newsItem) =>
        newsItem.id === item.id
          ? {
              ...newsItem,
              is_published: nextPublishedState,
              published_at: nextPublishedState
                ? item.published_at ?? new Date().toISOString()
                : null,
            }
          : newsItem,
      ),
    );
  }

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-red-600">
            Notícias
          </p>

          <h2 className="mt-2 text-3xl font-black text-zinc-950">
            Gestão de notícias
          </h2>

          <p className="mt-3 max-w-3xl text-zinc-600">
            Cria notícias do clube ou regista conteúdos relevantes da AF Leiria,
            FPF e futebol de formação.
          </p>
        </div>

        <button
          type="button"
          onClick={loadNews}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-zinc-950 px-5 py-3 text-sm font-bold text-white hover:bg-red-600"
        >
          <RefreshCw size={16} />
          Atualizar
        </button>
      </div>

      {successMessage && (
        <div className="mt-6 rounded-xl bg-green-100 px-4 py-3 text-sm font-semibold text-green-800">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="mt-6 rounded-xl bg-red-100 px-4 py-3 text-sm font-semibold text-red-800">
          {errorMessage}
        </div>
      )}

      <div className="mt-8 grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
        <form
          onSubmit={handleCreateNews}
          className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-red-100 p-3 text-red-600">
              <Plus size={22} />
            </div>

            <div>
              <h3 className="text-2xl font-black">Nova notícia</h3>
              <p className="text-sm text-zinc-500">
                Criar conteúdo para o site público.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            <input
              className="rounded-xl border border-zinc-300 px-4 py-3"
              placeholder="Título da notícia *"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />

            <textarea
              className="min-h-24 rounded-xl border border-zinc-300 px-4 py-3"
              placeholder="Resumo curto"
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
            />

            <textarea
              className="min-h-32 rounded-xl border border-zinc-300 px-4 py-3"
              placeholder="Conteúdo completo ou notas internas"
              value={content}
              onChange={(event) => setContent(event.target.value)}
            />

            <select
              className="rounded-xl border border-zinc-300 bg-white px-4 py-3"
              value={source}
              onChange={(event) => setSource(event.target.value)}
            >
              {sourceOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            <input
              className="rounded-xl border border-zinc-300 px-4 py-3"
              placeholder="Link externo, se existir"
              value={externalUrl}
              onChange={(event) => setExternalUrl(event.target.value)}
            />

            <label className="flex items-center gap-3 rounded-xl bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-700">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(event) => setIsPublished(event.target.checked)}
              />
              Publicar notícia imediatamente
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-red-600 px-6 py-3 font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'A guardar...' : 'Criar notícia'}
          </button>
        </form>

        <div>
          <h3 className="text-2xl font-black text-zinc-950">
            Notícias existentes
          </h3>

          {loading ? (
            <div className="mt-5 rounded-3xl border border-zinc-200 bg-white p-8 text-zinc-600">
              A carregar notícias...
            </div>
          ) : news.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-zinc-200 bg-white p-8 text-zinc-600">
              Ainda não existem notícias.
            </div>
          ) : (
            <div className="mt-5 grid gap-4">
              {news.map((item) => (
                <article
                  key={item.id}
                  className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                    <div className="flex gap-4">
                      <div className="h-fit rounded-full bg-red-100 p-3 text-red-600">
                        <Newspaper size={22} />
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold uppercase text-zinc-700">
                            {item.source}
                          </span>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                              item.is_published
                                ? 'bg-green-100 text-green-800'
                                : 'bg-zinc-200 text-zinc-700'
                            }`}
                          >
                            {item.is_published ? 'Publicado' : 'Rascunho'}
                          </span>
                        </div>

                        <h4 className="mt-3 text-lg font-black text-zinc-950">
                          {item.title}
                        </h4>

                        {item.summary && (
                          <p className="mt-2 text-sm text-zinc-600">
                            {item.summary}
                          </p>
                        )}

                        {item.external_url && (
                          <a
                            href={item.external_url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-red-600 hover:text-red-700"
                          >
                            <ExternalLink size={15} />
                            Ver link externo
                          </a>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => togglePublished(item)}
                      className={`rounded-full px-4 py-2 text-sm font-bold ${
                        item.is_published
                          ? 'bg-zinc-950 text-white hover:bg-red-600'
                          : 'bg-red-600 text-white hover:bg-red-700'
                      }`}
                    >
                      {item.is_published ? 'Despublicar' : 'Publicar'}
                    </button>
                  </div>

                  <p className="mt-4 text-xs text-zinc-500">
                    Criada em{' '}
                    {new Date(item.created_at).toLocaleString('pt-PT')}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}