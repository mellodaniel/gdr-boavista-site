import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import {
  Archive,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Newspaper,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { GdrbNews, GdrbNewsStatus } from '../../types/database';

const NEWS_STORAGE_BUCKET = 'gdrb-news-images';

type NewsFilter = 'all' | GdrbNewsStatus;

const initialForm = {
  title: '',
  summary: '',
  content: '',
  source: 'GDR Boavista',
  image_url: '',
  external_url: '',
  status: 'published' as GdrbNewsStatus,
  sort_order: 0,
};

const sourceOptions = [
  'GDR Boavista',
  'AF Leiria',
  'FPF',
  'Futebol de formação',
  'Outra fonte',
];

const statusOptions: Array<{
  value: GdrbNewsStatus;
  label: string;
  description: string;
}> = [
  {
    value: 'published',
    label: 'Publicada',
    description: 'Aparece na página inicial e na página Notícias.',
  },
  {
    value: 'draft',
    label: 'Rascunho',
    description: 'Não aparece no site público.',
  },
  {
    value: 'archived',
    label: 'Arquivada',
    description: 'Fica apenas guardada no admin para consulta/pesquisa.',
  },
];

const pageSizeOptions = [10, 25, 50];

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

function getNewsStatus(item: GdrbNews): GdrbNewsStatus {
  if (item.status) {
    return item.status;
  }

  return item.is_published ? 'published' : 'draft';
}

function getStatusLabel(status: GdrbNewsStatus) {
  const labels: Record<GdrbNewsStatus, string> = {
    published: 'Publicada',
    archived: 'Arquivada',
    draft: 'Rascunho',
  };

  return labels[status];
}

function getStatusBadgeClass(status: GdrbNewsStatus) {
  if (status === 'published') {
    return 'border-green-200 bg-green-50 text-green-700';
  }

  if (status === 'archived') {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }

  return 'border-zinc-200 bg-zinc-100 text-zinc-700';
}

export function AdminNewsPage() {
  const [news, setNews] = useState<GdrbNews[]>([]);
  const [activeStatusFilter, setActiveStatusFilter] = useState<NewsFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedNewsId, setExpandedNewsId] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');

  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    return () => {
      if (imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeStatusFilter, searchTerm, pageSize]);

  function setPreviewUrl(nextPreview: string) {
    setImagePreview((currentPreview) => {
      if (currentPreview.startsWith('blob:')) {
        URL.revokeObjectURL(currentPreview);
      }

      return nextPreview;
    });
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Escolhe um ficheiro de imagem válido.');
      event.target.value = '';
      return;
    }

    const maxSizeInMb = 6;
    const maxSizeInBytes = maxSizeInMb * 1024 * 1024;

    if (file.size > maxSizeInBytes) {
      setErrorMessage(`A imagem deve ter no máximo ${maxSizeInMb}MB.`);
      event.target.value = '';
      return;
    }

    setErrorMessage('');
    setSelectedImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function handleRemoveImage() {
    setSelectedImageFile(null);
    setPreviewUrl('');
    handleChange('image_url', '');
  }

  async function uploadSelectedImage() {
    if (!selectedImageFile) {
      return form.image_url.trim() || null;
    }

    const extension = selectedImageFile.name.split('.').pop()?.toLowerCase() || 'jpg';
    const uniqueId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const filePath = `news/${uniqueId}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(NEWS_STORAGE_BUCKET)
      .upload(filePath, selectedImageFile, {
        cacheControl: '3600',
        contentType: selectedImageFile.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Erro ao fazer upload da imagem da notícia:', uploadError);
      throw new Error(
        'Não foi possível fazer upload da imagem. Confirma se o bucket gdrb-news-images existe no Supabase.',
      );
    }

    const { data } = supabase.storage
      .from(NEWS_STORAGE_BUCKET)
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  async function loadNews() {
    setIsLoading(true);
    setErrorMessage('');

    const { data, error } = await supabase
      .from('gdrb_news')
      .select('*')
      .order('sort_order', { ascending: true })
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
    value: string | number | GdrbNewsStatus,
  ) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm(initialForm);
    setSelectedImageFile(null);
    setPreviewUrl('');
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
      status: getNewsStatus(item),
      sort_order: item.sort_order ?? 0,
    });
    setSelectedImageFile(null);
    setPreviewUrl(item.image_url ?? '');
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

    const currentItem = editingId
      ? news.find((item) => item.id === editingId)
      : null;

    const shouldBeVisible = form.status === 'published';

    let uploadedImageUrl: string | null = null;

    try {
      uploadedImageUrl = await uploadSelectedImage();
    } catch (error) {
      setIsSaving(false);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível fazer upload da imagem.',
      );
      return;
    }

    const payload = {
      title: form.title.trim(),
      summary: form.summary.trim() || null,
      content: form.content.trim() || null,
      source: form.source,
      image_url: uploadedImageUrl,
      external_url: form.external_url.trim() || null,
      status: form.status,
      is_published: shouldBeVisible,
      published_at: shouldBeVisible
        ? currentItem?.published_at ?? new Date().toISOString()
        : null,
      sort_order: Number(form.sort_order) || 0,
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

  async function handleQuickStatus(item: GdrbNews, status: GdrbNewsStatus) {
    setErrorMessage('');

    const shouldBeVisible = status === 'published';

    const { error } = await supabase
      .from('gdrb_news')
      .update({
        status,
        is_published: shouldBeVisible,
        published_at: shouldBeVisible
          ? item.published_at ?? new Date().toISOString()
          : null,
      })
      .eq('id', item.id);

    if (error) {
      console.error('Erro ao alterar estado:', error);
      setErrorMessage('Não foi possível alterar o estado da notícia.');
      return;
    }

    setExpandedNewsId(null);
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

  const newsCounts = news.reduce<Record<GdrbNewsStatus, number>>(
    (accumulator, item) => {
      const status = getNewsStatus(item);
      accumulator[status] += 1;
      return accumulator;
    },
    { published: 0, draft: 0, archived: 0 },
  );

  const filteredNews = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return news.filter((item) => {
      const status = getNewsStatus(item);

      const matchesStatus =
        activeStatusFilter === 'all'
          ? status !== 'archived'
          : status === activeStatusFilter;

      const searchableText = `${item.title} ${item.summary ?? ''} ${
        item.content ?? ''
      } ${item.source}`
        .toLowerCase()
        .trim();

      const matchesSearch =
        !normalizedSearch || searchableText.includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [news, activeStatusFilter, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredNews.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = (safeCurrentPage - 1) * pageSize;
  const paginatedNews = filteredNews.slice(pageStart, pageStart + pageSize);

  const activeStatusLabel =
    activeStatusFilter === 'all'
      ? 'Todos'
      : statusOptions.find((option) => option.value === activeStatusFilter)?.label ?? 'Todos';

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
              Cria, edita, publica e arquiva notícias na área pública do site do
              GDR Boavista.
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
                setSelectedImageFile(null);
                setPreviewUrl('');
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

      <section className="mt-8 rounded-sm border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-red-700">
              Conteúdo editorial
            </p>
            <h2 className="mt-2 font-serif text-3xl font-light text-[#24180f]">
              Notícias do site
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-600">
              Esta área gere apenas as notícias próprias do site. Conteúdo arquivado fica
              guardado para consulta no admin e nunca aparece no site público.
            </p>
          </div>

          <a
            href="/admin/facebook"
            className="inline-flex items-center justify-center rounded-md border border-zinc-200 px-5 py-3 text-sm font-black uppercase tracking-wide text-zinc-700 transition hover:border-red-700 hover:text-red-700"
          >
            Gerir Facebook
          </a>
        </div>
      </section>

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

            <div>
              <label className="text-sm font-black text-zinc-800">
                Ordem / posição
              </label>

              <input
                type="number"
                value={form.sort_order}
                onChange={(event) =>
                  handleChange('sort_order', Number(event.target.value))
                }
                className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
              />

              <p className="mt-2 text-xs leading-5 text-zinc-500">
                Na página inicial aparecem no máximo 12 notícias publicadas,
                ordenadas por esta posição.
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-black text-zinc-800">Estado</label>

              <div className="mt-2 grid gap-3 md:grid-cols-3">
                {statusOptions.map((option) => (
                  <label
                    key={option.value}
                    className={`cursor-pointer rounded-md border px-4 py-4 transition ${
                      form.status === option.value
                        ? 'border-red-700 bg-red-50 text-red-800 ring-4 ring-red-100'
                        : 'border-zinc-200 bg-white text-zinc-700 hover:border-red-200 hover:bg-red-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="status"
                      value={option.value}
                      checked={form.status === option.value}
                      onChange={() => handleChange('status', option.value)}
                      className="sr-only"
                    />
                    <span className="block text-sm font-black">
                      {option.label}
                    </span>
                    <span className="mt-2 block text-xs leading-5 text-zinc-500">
                      {option.description}
                    </span>
                  </label>
                ))}
              </div>
            </div>

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
                Imagem da notícia
              </label>

              <div className="mt-2 rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-4">
                {imagePreview ? (
                  <div className="overflow-hidden rounded-md border border-zinc-200 bg-white">
                    <img
                      src={imagePreview}
                      alt="Pré-visualização da notícia"
                      className="h-44 w-full object-cover"
                    />

                    <div className="flex items-center justify-between gap-3 p-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500">
                        <ImageIcon size={15} />
                        {selectedImageFile
                          ? selectedImageFile.name
                          : 'Imagem atual da notícia'}
                      </div>

                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="inline-flex items-center gap-1 rounded-md border border-red-200 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-50"
                      >
                        <X size={14} />
                        Remover
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-md bg-white px-4 py-8 text-center transition hover:bg-red-50">
                    <Upload size={30} className="text-red-700" />

                    <span className="mt-3 text-sm font-black text-zinc-800">
                      Fazer upload da imagem
                    </span>

                    <span className="mt-1 text-xs leading-5 text-zinc-500">
                      JPG, PNG ou WebP até 6MB. Se não enviares imagem, o site usa apenas o texto da notícia.
                    </span>

                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                )}

                {imagePreview && (
                  <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-md border border-zinc-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-zinc-700 hover:border-red-700 hover:text-red-700">
                    <Upload size={14} />
                    Trocar imagem
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
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

      <section className="mt-8 rounded-sm border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto_auto] lg:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Pesquisar por título, resumo, conteúdo ou fonte..."
              className="w-full rounded-md border border-zinc-200 py-3 pl-12 pr-4 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
            />
          </div>

          <select
            value={activeStatusFilter}
            onChange={(event) => setActiveStatusFilter(event.target.value as NewsFilter)}
            className="rounded-md border border-zinc-200 px-4 py-3 text-sm font-semibold outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
          >
            <option value="all">Todos</option>
            <option value="published">Publicadas ({newsCounts.published})</option>
            <option value="draft">Rascunhos ({newsCounts.draft})</option>
            <option value="archived">Arquivadas ({newsCounts.archived})</option>
          </select>

          <select
            value={pageSize}
            onChange={(event) => setPageSize(Number(event.target.value))}
            className="rounded-md border border-zinc-200 px-4 py-3 text-sm font-semibold outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option} por página
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex flex-col justify-between gap-3 border-t border-zinc-200 pt-4 text-sm text-zinc-600 md:flex-row md:items-center">
          <div>
            <span className="font-black text-zinc-900">{activeStatusLabel}</span>{' '}
            · {filteredNews.length} notícia(s) encontrada(s)
            {activeStatusFilter === 'all' && (
              <span className="ml-2 text-xs text-zinc-400">
                Arquivadas ficam apenas no filtro Arquivadas.
              </span>
            )}
          </div>

          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
            Publicadas {newsCounts.published} · Rascunhos {newsCounts.draft} · Arquivadas {newsCounts.archived}
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="mt-8 rounded-sm border border-zinc-200 bg-white p-8 text-zinc-600 shadow-sm">
          A carregar notícias...
        </div>
      ) : filteredNews.length === 0 ? (
        <div className="mt-8 rounded-sm border border-dashed border-zinc-300 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-700">
            <Newspaper size={28} />
          </div>

          <h2 className="mt-5 font-serif text-3xl font-light text-[#24180f]">
            Sem notícias nesta área
          </h2>

          <p className="mt-3 text-zinc-500">
            Não existem notícias para os filtros selecionados.
          </p>
        </div>
      ) : (
        <section className="mt-8 overflow-hidden rounded-sm border border-zinc-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                    Notícia
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                    Estado
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                    Fonte
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                    Data / ordem
                  </th>
                  <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-100 bg-white">
                {paginatedNews.map((item) => {
                  const itemStatus = getNewsStatus(item);
                  const isExpanded = expandedNewsId === item.id;

                  return (
                    <tr key={item.id} className="align-top transition hover:bg-zinc-50">
                      <td className="px-5 py-5">
                        <div className="flex gap-4">
                          <div className="hidden h-16 w-20 flex-shrink-0 overflow-hidden rounded-md border border-zinc-200 bg-zinc-100 md:block">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-zinc-400">
                                <Newspaper size={22} />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <h3 className="font-black leading-6 text-zinc-900">
                              {item.title}
                            </h3>

                            {item.summary && (
                              <p className="mt-1 line-clamp-2 max-w-2xl text-sm leading-6 text-zinc-500">
                                {item.summary}
                              </p>
                            )}

                            <button
                              type="button"
                              onClick={() =>
                                setExpandedNewsId(isExpanded ? null : item.id)
                              }
                              className="mt-3 inline-flex items-center gap-1 text-xs font-black uppercase tracking-[0.16em] text-red-700 hover:text-red-900"
                            >
                              <ChevronDown
                                size={14}
                                className={`transition ${isExpanded ? 'rotate-180' : ''}`}
                              />
                              {isExpanded ? 'Ocultar detalhes' : 'Detalhes'}
                            </button>

                            {isExpanded && (
                              <div className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 p-4 text-sm leading-7 text-zinc-600">
                                {item.content ? (
                                  <p className="whitespace-pre-wrap">{item.content}</p>
                                ) : (
                                  <p>Sem conteúdo detalhado.</p>
                                )}

                                {item.external_url && (
                                  <a
                                    href={item.external_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-3 inline-flex text-sm font-bold text-red-700 hover:text-red-900"
                                  >
                                    Abrir link externo
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-5">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${getStatusBadgeClass(
                            itemStatus,
                          )}`}
                        >
                          {getStatusLabel(itemStatus)}
                        </span>
                      </td>

                      <td className="px-5 py-5 text-sm font-semibold text-zinc-700">
                        {item.source}
                      </td>

                      <td className="px-5 py-5 text-sm text-zinc-600">
                        <div>{formatDate(item.published_at)}</div>
                        <div className="mt-1 text-xs text-zinc-400">
                          Posição {item.sort_order ?? 0}
                        </div>
                      </td>

                      <td className="px-5 py-5">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(item)}
                            className="rounded-md border border-zinc-200 px-3 py-2 text-xs font-black text-zinc-700 hover:border-red-700 hover:text-red-700"
                          >
                            Editar
                          </button>

                          {itemStatus !== 'published' && (
                            <button
                              type="button"
                              onClick={() => handleQuickStatus(item, 'published')}
                              className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-3 py-2 text-xs font-black text-zinc-700 hover:border-red-700 hover:text-red-700"
                            >
                              <Eye size={14} />
                              Publicar
                            </button>
                          )}

                          {itemStatus !== 'archived' && (
                            <button
                              type="button"
                              onClick={() => handleQuickStatus(item, 'archived')}
                              className="inline-flex items-center gap-1 rounded-md border border-amber-200 px-3 py-2 text-xs font-black text-amber-700 hover:bg-amber-50"
                            >
                              <Archive size={14} />
                              Arquivar
                            </button>
                          )}

                          {itemStatus !== 'draft' && itemStatus !== 'archived' && (
                            <button
                              type="button"
                              onClick={() => handleQuickStatus(item, 'draft')}
                              className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-3 py-2 text-xs font-black text-zinc-700 hover:border-red-700 hover:text-red-700"
                            >
                              <EyeOff size={14} />
                              Rascunho
                            </button>
                          )}

                          {itemStatus === 'archived' && (
                            <button
                              type="button"
                              onClick={() => handleQuickStatus(item, 'draft')}
                              className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-3 py-2 text-xs font-black text-zinc-700 hover:border-red-700 hover:text-red-700"
                            >
                              <EyeOff size={14} />
                              Reativar como rascunho
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            className="inline-flex items-center gap-1 rounded-md border border-red-200 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-50"
                          >
                            <Trash2 size={14} />
                            Apagar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col justify-between gap-4 border-t border-zinc-200 bg-zinc-50 px-5 py-4 text-sm text-zinc-600 md:flex-row md:items-center">
            <div>
              A mostrar {filteredNews.length === 0 ? 0 : pageStart + 1}–{Math.min(pageStart + pageSize, filteredNews.length)} de {filteredNews.length}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={safeCurrentPage === 1}
                className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs font-black text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft size={14} />
                Anterior
              </button>

              <span className="px-2 text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                {safeCurrentPage} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={safeCurrentPage === totalPages}
                className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs font-black text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Próxima
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
