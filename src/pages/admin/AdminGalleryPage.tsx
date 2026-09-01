import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import {
  Camera,
  ChevronDown,
  ChevronUp,
  Edit3,
  Eye,
  EyeOff,
  ImagePlus,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

type GalleryItem = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  category: string | null;
  is_active: boolean;
  sort_order: number | null;
  created_at: string;
  updated_at: string | null;
};

const initialForm = {
  title: '',
  description: '',
  image_url: '',
  category: 'GDR Boavista',
  is_active: true,
  sort_order: 0,
};

const statusFilters = [
  { value: 'active', label: 'Visíveis' },
  { value: 'all', label: 'Todas' },
  { value: 'inactive', label: 'Ocultas' },
] as const;

const pageSizeOptions = [10, 25, 50];

type StatusFilter = (typeof statusFilters)[number]['value'];

function formatDate(value: string | null | undefined) {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function normalizeCategory(category: string | null | undefined) {
  return category?.trim() || 'GDR Boavista';
}

export function AdminGalleryPage() {
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  async function loadGalleryItems() {
    setIsLoading(true);
    setErrorMessage('');

    const { data, error } = await supabase
      .from('gdrb_gallery_items')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao carregar galeria:', error);
      setErrorMessage(
        'Não foi possível carregar a galeria. Confirma se a tabela gdrb_gallery_items já existe no Supabase.',
      );
      setGalleryItems([]);
      setIsLoading(false);
      return;
    }

    setGalleryItems((data ?? []) as GalleryItem[]);
    setIsLoading(false);
  }

  useEffect(() => {
    void loadGalleryItems();
  }, []);

  const counts = useMemo(() => {
    const active = galleryItems.filter((item) => item.is_active).length;
    const inactive = galleryItems.length - active;

    return {
      total: galleryItems.length,
      active,
      inactive,
    };
  }, [galleryItems]);

  const availableCategories = useMemo(() => {
    const categories = new Set<string>();

    galleryItems.forEach((item) => {
      categories.add(normalizeCategory(item.category));
    });

    return Array.from(categories).sort((a, b) => a.localeCompare(b, 'pt-PT'));
  }, [galleryItems]);

  const filteredItems = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return galleryItems.filter((item) => {
      const category = normalizeCategory(item.category);

      if (statusFilter === 'active' && !item.is_active) {
        return false;
      }

      if (statusFilter === 'inactive' && item.is_active) {
        return false;
      }

      if (categoryFilter !== 'all' && category !== categoryFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const searchableContent = [
        item.title,
        item.description,
        item.image_url,
        category,
        String(item.sort_order ?? ''),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableContent.includes(normalizedSearch);
    });
  }, [galleryItems, searchTerm, statusFilter, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredItems.length);
  const paginatedItems = filteredItems.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, categoryFilter, pageSize]);

  function handleChange(
    field: keyof typeof initialForm,
    value: string | boolean | number,
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

  function handleEdit(item: GalleryItem) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      description: item.description ?? '',
      image_url: item.image_url ?? '',
      category: normalizeCategory(item.category),
      is_active: item.is_active,
      sort_order: item.sort_order ?? 0,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setIsUploadingImage(true);
    setErrorMessage('');
    setSuccessMessage('');

    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${Date.now()}-${crypto.randomUUID()}.${fileExtension}`;
    const filePath = `galeria/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('gdrb-gallery-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Erro ao carregar imagem:', uploadError);
      setErrorMessage(
        'Não foi possível carregar a imagem. Confirma se o bucket gdrb-gallery-images existe e é público.',
      );
      setIsUploadingImage(false);
      return;
    }

    const { data } = supabase.storage
      .from('gdrb-gallery-images')
      .getPublicUrl(filePath);

    handleChange('image_url', data.publicUrl);
    setSuccessMessage('Imagem carregada com sucesso.');
    setIsUploadingImage(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      image_url: form.image_url.trim() || null,
      category: form.category.trim() || 'GDR Boavista',
      is_active: form.is_active,
      sort_order: Number(form.sort_order) || 0,
      updated_at: new Date().toISOString(),
    };

    if (!payload.title) {
      setErrorMessage('O título é obrigatório.');
      setIsSaving(false);
      return;
    }

    if (!payload.image_url) {
      setErrorMessage('A imagem é obrigatória.');
      setIsSaving(false);
      return;
    }

    const request = editingId
      ? supabase.from('gdrb_gallery_items').update(payload).eq('id', editingId)
      : supabase.from('gdrb_gallery_items').insert(payload);

    const { error } = await request;

    if (error) {
      console.error('Erro ao guardar imagem da galeria:', error);
      setErrorMessage('Não foi possível guardar a imagem da galeria.');
      setIsSaving(false);
      return;
    }

    setSuccessMessage(editingId ? 'Imagem atualizada com sucesso.' : 'Imagem criada com sucesso.');
    resetForm();
    await loadGalleryItems();
    setIsSaving(false);
  }

  async function toggleVisibility(item: GalleryItem) {
    setErrorMessage('');
    setSuccessMessage('');

    const { error } = await supabase
      .from('gdrb_gallery_items')
      .update({
        is_active: !item.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.id);

    if (error) {
      console.error('Erro ao alterar visibilidade da galeria:', error);
      setErrorMessage('Não foi possível alterar a visibilidade.');
      return;
    }

    setSuccessMessage(item.is_active ? 'Imagem ocultada do site público.' : 'Imagem marcada como visível.');
    await loadGalleryItems();
  }

  async function deleteItem(item: GalleryItem) {
    const confirmed = window.confirm(`Apagar definitivamente a imagem “${item.title}”?`);

    if (!confirmed) {
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');

    const { error } = await supabase
      .from('gdrb_gallery_items')
      .delete()
      .eq('id', item.id);

    if (error) {
      console.error('Erro ao apagar imagem da galeria:', error);
      setErrorMessage('Não foi possível apagar a imagem.');
      return;
    }

    setSuccessMessage('Imagem apagada com sucesso.');
    await loadGalleryItems();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.35em] text-red-700">
            Administração
          </p>
          <h1 className="mt-2 font-serif text-4xl font-light text-[#24180f]">
            Galeria
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Gere as fotografias públicas do clube. Imagens ocultas não aparecem no site.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadGalleryItems()}
            className="inline-flex items-center justify-center gap-2 rounded-sm border border-zinc-300 bg-white px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-zinc-700 transition hover:border-red-700 hover:text-red-700"
          >
            <RefreshCcw size={16} />
            Atualizar
          </button>

          <button
            type="button"
            onClick={() => {
              if (showForm && !editingId) {
                resetForm();
                return;
              }

              setEditingId(null);
              setForm(initialForm);
              setShowForm((currentValue) => !currentValue);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-sm bg-red-700 px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-white transition hover:bg-red-800"
          >
            <Plus size={16} />
            Nova imagem
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-sm border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Total</p>
          <p className="mt-3 text-3xl font-black text-[#24180f]">{counts.total}</p>
        </div>
        <div className="rounded-sm border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Visíveis</p>
          <p className="mt-3 text-3xl font-black text-emerald-700">{counts.active}</p>
        </div>
        <div className="rounded-sm border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">Ocultas</p>
          <p className="mt-3 text-3xl font-black text-zinc-500">{counts.inactive}</p>
        </div>
      </div>

      {successMessage ? (
        <div className="rounded-sm border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {successMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          {errorMessage}
        </div>
      ) : null}

      {showForm ? (
        <form onSubmit={handleSubmit} className="rounded-sm border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-serif text-3xl font-light text-[#24180f]">
                {editingId ? 'Editar imagem' : 'Nova imagem'}
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Preenche a informação que será usada na galeria pública.
              </p>
            </div>

            <button
              type="button"
              onClick={resetForm}
              className="text-sm font-bold uppercase tracking-[0.16em] text-zinc-500 transition hover:text-red-700"
            >
              Cancelar
            </button>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">Título</span>
              <input
                type="text"
                value={form.title}
                onChange={(event) => handleChange('title', event.target.value)}
                className="mt-2 w-full rounded-sm border border-zinc-300 px-4 py-3 text-sm outline-none transition focus:border-red-700"
                placeholder="Ex.: Torneio Fut7 2026"
                required
              />
            </label>

            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">Categoria</span>
              <input
                type="text"
                value={form.category}
                onChange={(event) => handleChange('category', event.target.value)}
                className="mt-2 w-full rounded-sm border border-zinc-300 px-4 py-3 text-sm outline-none transition focus:border-red-700"
                placeholder="Ex.: Jogos, Treinos, Eventos"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">Descrição</span>
              <textarea
                value={form.description}
                onChange={(event) => handleChange('description', event.target.value)}
                rows={3}
                className="mt-2 w-full rounded-sm border border-zinc-300 px-4 py-3 text-sm outline-none transition focus:border-red-700"
                placeholder="Pequena descrição do momento."
              />
            </label>

            <div className="space-y-3 md:col-span-2">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">Imagem</span>

              <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                <input
                  type="url"
                  value={form.image_url}
                  onChange={(event) => handleChange('image_url', event.target.value)}
                  className="w-full rounded-sm border border-zinc-300 px-4 py-3 text-sm outline-none transition focus:border-red-700"
                  placeholder="URL da imagem ou faz upload abaixo"
                  required
                />

                <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-sm border border-zinc-300 bg-white px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-zinc-700 transition hover:border-red-700 hover:text-red-700">
                  <Upload size={16} />
                  {isUploadingImage ? 'A carregar...' : 'Upload'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={isUploadingImage}
                  />
                </label>
              </div>

              {form.image_url ? (
                <div className="overflow-hidden rounded-sm border border-zinc-200 bg-zinc-50">
                  <img
                    src={form.image_url}
                    alt="Pré-visualização"
                    className="h-56 w-full object-cover"
                  />
                </div>
              ) : null}
            </div>

            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">Ordem</span>
              <input
                type="number"
                value={form.sort_order}
                onChange={(event) => handleChange('sort_order', Number(event.target.value))}
                className="mt-2 w-full rounded-sm border border-zinc-300 px-4 py-3 text-sm outline-none transition focus:border-red-700"
              />
            </label>

            <label className="flex items-center gap-3 rounded-sm border border-zinc-200 bg-zinc-50 px-4 py-3">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) => handleChange('is_active', event.target.checked)}
                className="h-4 w-4 accent-red-700"
              />
              <span className="text-sm font-semibold text-zinc-700">Visível no site público</span>
            </label>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={isSaving || isUploadingImage}
              className="inline-flex items-center justify-center gap-2 rounded-sm bg-[#24180f] px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={16} />
              {isSaving ? 'A guardar...' : 'Guardar'}
            </button>
          </div>
        </form>
      ) : null}

      <section className="rounded-sm border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 p-5">
          <div className="grid gap-3 xl:grid-cols-[1.5fr_0.8fr_0.8fr_0.6fr]">
            <label className="relative block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={17} />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full rounded-sm border border-zinc-300 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-red-700"
                placeholder="Pesquisar por título, descrição, categoria ou URL..."
              />
            </label>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="rounded-sm border border-zinc-300 px-4 py-3 text-sm outline-none transition focus:border-red-700"
            >
              {statusFilters.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>

            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="rounded-sm border border-zinc-300 px-4 py-3 text-sm outline-none transition focus:border-red-700"
            >
              <option value="all">Todas as categorias</option>
              {availableCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <select
              value={pageSize}
              onChange={(event) => setPageSize(Number(event.target.value))}
              className="rounded-sm border border-zinc-300 px-4 py-3 text-sm outline-none transition focus:border-red-700"
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option} por página
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <thead className="bg-zinc-50 text-left text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
              <tr>
                <th className="px-5 py-4">Imagem</th>
                <th className="px-5 py-4">Título</th>
                <th className="px-5 py-4">Categoria</th>
                <th className="px-5 py-4">Estado</th>
                <th className="px-5 py-4">Ordem</th>
                <th className="px-5 py-4">Criada</th>
                <th className="px-5 py-4 text-right">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-zinc-500">
                    A carregar galeria...
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-zinc-500">
                    Nenhuma imagem encontrada.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => {
                  const isExpanded = expandedItemId === item.id;

                  return (
                    <tr key={item.id} className="align-top transition hover:bg-zinc-50">
                      <td className="px-5 py-4">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.title}
                            className="h-14 w-20 rounded-sm object-cover"
                          />
                        ) : (
                          <div className="flex h-14 w-20 items-center justify-center rounded-sm bg-zinc-100 text-zinc-400">
                            <Camera size={20} />
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-bold text-[#24180f]">{item.title}</p>
                        {isExpanded ? (
                          <div className="mt-3 max-w-xl space-y-2 rounded-sm bg-zinc-50 p-3 text-xs leading-6 text-zinc-600">
                            <p>{item.description || 'Sem descrição.'}</p>
                            <p>
                              <span className="font-bold text-zinc-700">URL:</span>{' '}
                              {item.image_url || '—'}
                            </p>
                            <p>
                              <span className="font-bold text-zinc-700">Atualizada:</span>{' '}
                              {formatDate(item.updated_at)}
                            </p>
                          </div>
                        ) : null}
                      </td>

                      <td className="px-5 py-4 text-zinc-600">{normalizeCategory(item.category)}</td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.14em] ${
                            item.is_active
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-zinc-100 text-zinc-500'
                          }`}
                        >
                          {item.is_active ? 'Visível' : 'Oculta'}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-zinc-600">{item.sort_order ?? 0}</td>
                      <td className="px-5 py-4 text-zinc-600">{formatDate(item.created_at)}</td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-zinc-200 text-zinc-600 transition hover:border-red-700 hover:text-red-700"
                            title="Detalhes"
                          >
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleEdit(item)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-zinc-200 text-zinc-600 transition hover:border-red-700 hover:text-red-700"
                            title="Editar"
                          >
                            <Edit3 size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() => void toggleVisibility(item)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-zinc-200 text-zinc-600 transition hover:border-red-700 hover:text-red-700"
                            title={item.is_active ? 'Ocultar' : 'Mostrar'}
                          >
                            {item.is_active ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>

                          <button
                            type="button"
                            onClick={() => void deleteItem(item)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-zinc-200 text-zinc-600 transition hover:border-red-700 hover:text-red-700"
                            title="Apagar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-zinc-200 px-5 py-4 text-sm text-zinc-600 md:flex-row md:items-center md:justify-between">
          <span>
            A mostrar {filteredItems.length === 0 ? 0 : startIndex + 1}-{endIndex} de {filteredItems.length}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={safeCurrentPage === 1}
              className="rounded-sm border border-zinc-300 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-zinc-600 transition hover:border-red-700 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
              Página {safeCurrentPage} de {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={safeCurrentPage === totalPages}
              className="rounded-sm border border-zinc-300 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-zinc-600 transition hover:border-red-700 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Seguinte
            </button>
          </div>
        </div>
      </section>

      <div className="rounded-sm border border-dashed border-zinc-300 bg-zinc-50 p-5 text-sm leading-7 text-zinc-600">
        <div className="flex gap-3">
          <ImagePlus className="mt-1 shrink-0 text-red-700" size={20} />
          <p>
            A página pública só carrega imagens com estado <strong>Visível</strong>. Usa <strong>Ocultar</strong> para retirar uma fotografia do site sem apagar o registo.
          </p>
        </div>
      </div>
    </div>
  );
}
