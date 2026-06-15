import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Eye,
  EyeOff,
  Newspaper,
  Plus,
  RefreshCcw,
  Save,
  Trash2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { GdrbNews } from '../../types/database';

const initialForm = {
  title: '',
  summary: '',
  content: '',
  source: 'GDR Boavista',
  image_url: '',
  external_url: '',
  is_published: true,
};

const sourceOptions = [
  'GDR Boavista',
  'AF Leiria',
  'FPF',
  'Futebol de formação',
  'Outra fonte',
];

function formatDate(date: string | null) {
  if (!date) {
    return 'Sem data';
  }

  return new Date(date).toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function AdminNewsPage() {
  const [news, setNews] = useState<GdrbNews[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  async function loadNews() {
    setIsLoading(true);
    setErrorMessage('');

    const { data, error } = await supabase
      .from('gdrb_news')
      .select('*')
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao carregar notícias:', error);
      setErrorMessage('Não foi possível carregar as notícias.');
      setIsLoading(false);
      return;
    }

    setNews(data ?? []);
    setIsLoading(false);
  }

  useEffect(() => {
    loadNews();
  }, []);

  function handleChange(
    field: keyof typeof initialForm,
    value: string | boolean,
  ) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
    setShowForm(false);
  }

  function handleEdit(item: GdrbNews) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      summary: item.summary ?? '',
      content: item.content ?? '',
      source: item.source,
      image_url: item.image_url ?? '',
      external_url: item.external_url ?? '',
      is_published: item.is_published,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSuccessMessage('');
    setErrorMessage('');

    if (!form.title.trim()) {
      setErrorMessage('Indica o título da notícia.');
      return;
    }

    setIsSaving(true);

    const payload = {
      title: form.title.trim(),
      summary: form.summary.trim() || null,
      content: form.content.trim() || null,
      source: form.source,
      image_url: form.image_url.trim() || null,
      external_url: form.external_url.trim() || null,
      is_published: form.is_published,
      published_at: form.is_published ? new Date().toISOString() : null,
    };

    const result = editingId
      ? await supabase.from('gdrb_news').update(payload).eq('id', editingId)
      : await supabase.from('gdrb_news').insert(payload);

    setIsSaving(false);

    if (result.error) {
      console.error('Erro ao guardar notícia:', result.error);
      setErrorMessage('Não foi possível guardar a notícia.');
      return;
    }

    setSuccessMessage(
      editingId ? 'Notícia atualizada com sucesso.' : 'Notícia criada com sucesso.',
    );

    resetForm();
    await loadNews();
  }

  async function handleTogglePublished(item: GdrbNews) {
    const { error } = await supabase
      .from('gdrb_news')
      .update({
        is_published: !item.is_published,
        published_at: !item.is_published ? new Date().toISOString() : null,
      })
      .eq('id', item.id);

    if (error) {
      console.error('Erro ao alterar publicação:', error);
      setErrorMessage('Não foi possível alterar o estado da notícia.');
      return;
    }

    await loadNews();
  }

  async function handleDelete(item: GdrbNews) {
    const confirmDelete = window.confirm(
      `Tens a certeza que queres apagar a notícia "${item.title}"?`,
    );

    if (!confirmDelete) {
      return;
    }

    const { error } = await supabase.from('gdrb_news').delete().eq('id', item.id);

    if (error) {
      console.error('Erro ao apagar notícia:', error);
      setErrorMessage('Não foi possível apagar a notícia.');
      return;
    }

    await loadNews();
  }

  return (
    <div>
      <section className="relative overflow-hidden rounded-sm bg-[#24180f] p-8 text-white shadow-2xl shadow-zinc-950/10 md:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_right,rgba(220,38,38,0.28),transparent_34%)]" />

        <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.45em] text-red-400">
              Administração
            </p>

            <h1 className="mt-6 font-serif text-5xl font-light leading-tight md:text-7xl">
              Notícias.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-300">
              Cria, edita e publica notícias na área pública do site do GDR
              Boavista.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={loadNews}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
            >
              <RefreshCcw size={17} />
              Atualizar
            </button>

            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(initialForm);
                setShowForm(!showForm);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-red-700 px-6 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-red-800"
            >
              <Plus size={18} />
              Nova notícia
            </button>
          </div>
        </div>
      </section>

      {successMessage && (
        <div className="mt-6 rounded-sm border border-green-200 bg-green-50 px-5 py-4 text-sm font-semibold text-green-800">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="mt-6 rounded-sm border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-800">
          {errorMessage}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mt-8 rounded-sm border border-zinc-200 bg-white p-7 shadow-sm"
        >
          <div className="flex items-center justify-between gap-4 border-b border-zinc-200 pb-5">
            <div>
              <h2 className="font-serif text-4xl font-light text-[#24180f]">
                {editingId ? 'Editar notícia' : 'Nova notícia'}
              </h2>

              <p className="mt-2 text-sm text-zinc-500">
                Preenche os dados principais da notícia.
              </p>
            </div>

            <button
              type="button"
              onClick={resetForm}
              className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-bold text-zinc-600 hover:border-red-700 hover:text-red-700"
            >
              Fechar
            </button>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="text-sm font-black text-zinc-800">
                Título *
              </label>

              <input
                type="text"
                value={form.title}
                onChange={(event) => handleChange('title', event.target.value)}
                className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
              />
            </div>

            <div>
              <label className="text-sm font-black text-zinc-800">Fonte</label>

              <select
                value={form.source}
                onChange={(event) => handleChange('source', event.target.value)}
                className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
              >
                {sourceOptions.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-3 rounded-md border border-zinc-200 px-4 py-3 text-sm font-bold text-zinc-700">
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(event) =>
                  handleChange('is_published', event.target.checked)
                }
                className="h-4 w-4 accent-red-700"
              />
              Publicar no site
            </label>

            <div className="md:col-span-2">
              <label className="text-sm font-black text-zinc-800">Resumo</label>

              <textarea
                value={form.summary}
                onChange={(event) => handleChange('summary', event.target.value)}
                rows={3}
                className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm leading-7 outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-black text-zinc-800">
                Conteúdo
              </label>

              <textarea
                value={form.content}
                onChange={(event) => handleChange('content', event.target.value)}
                rows={6}
                className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm leading-7 outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
              />
            </div>

            <div>
              <label className="text-sm font-black text-zinc-800">
                URL da imagem
              </label>

              <input
                type="url"
                value={form.image_url}
                onChange={(event) =>
                  handleChange('image_url', event.target.value)
                }
                className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
              />
            </div>

            <div>
              <label className="text-sm font-black text-zinc-800">
                Link externo
              </label>

              <input
                type="url"
                value={form.external_url}
                onChange={(event) =>
                  handleChange('external_url', event.target.value)
                }
                className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={resetForm}
              className="rounded-md border border-zinc-200 px-5 py-3 text-sm font-bold text-zinc-600 hover:border-red-700 hover:text-red-700"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-md bg-red-700 px-6 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-[#24180f] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={18} />
              {isSaving ? 'A guardar...' : 'Guardar notícia'}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="mt-8 rounded-sm border border-zinc-200 bg-white p-8 text-zinc-600 shadow-sm">
          A carregar notícias...
        </div>
      ) : news.length === 0 ? (
        <div className="mt-8 rounded-sm border border-dashed border-zinc-300 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-700">
            <Newspaper size={28} />
          </div>

          <h2 className="mt-5 font-serif text-3xl font-light text-[#24180f]">
            Sem notícias
          </h2>

          <p className="mt-3 text-zinc-500">
            Ainda não existem notícias criadas.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-5">
          {news.map((item) => (
            <article
              key={item.id}
              className="overflow-hidden rounded-sm border border-zinc-200 bg-white shadow-sm"
            >
              <div className={item.is_published ? 'h-1.5 bg-red-700' : 'h-1.5 bg-zinc-300'} />

              <div className="grid gap-6 p-7 lg:grid-cols-[1fr_auto] lg:items-start">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-red-700">
                      {item.source}
                    </span>

                    <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-700">
                      {item.is_published ? 'Publicado' : 'Rascunho'}
                    </span>

                    <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-700">
                      {formatDate(item.published_at)}
                    </span>
                  </div>

                  <h3 className="mt-5 font-serif text-4xl font-light leading-tight text-[#24180f]">
                    {item.title}
                  </h3>

                  {item.summary && (
                    <p className="mt-4 text-sm leading-7 text-zinc-600">
                      {item.summary}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <button
                    type="button"
                    onClick={() => handleEdit(item)}
                    className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-bold text-zinc-700 hover:border-red-700 hover:text-red-700"
                  >
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTogglePublished(item)}
                    className="inline-flex items-center gap-2 rounded-md border border-zinc-200 px-4 py-2 text-sm font-bold text-zinc-700 hover:border-red-700 hover:text-red-700"
                  >
                    {item.is_published ? <EyeOff size={16} /> : <Eye size={16} />}
                    {item.is_published ? 'Despublicar' : 'Publicar'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    className="inline-flex items-center gap-2 rounded-md border border-red-200 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                    Apagar
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}