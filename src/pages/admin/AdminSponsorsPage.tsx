import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  Handshake,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { GdrbSponsor } from '../../types/database';

const initialForm = {
  name: '',
  description: '',
  logo_url: '',
  website_url: '',
  sponsor_level: 'Parceiro oficial',
  is_active: true,
  sort_order: 0,
};

const sponsorLevels = [
  'Parceiro principal',
  'Parceiro oficial',
  'Parceiro',
  'Apoio institucional',
  'Outro',
];

const statusFilters = [
  { value: 'active', label: 'Ativos' },
  { value: 'all', label: 'Todos' },
  { value: 'inactive', label: 'Ocultos' },
] as const;

const pageSizeOptions = [10, 25, 50];

type StatusFilter = (typeof statusFilters)[number]['value'];

function normalizePartnerLevel(level: string | null | undefined) {
  const normalized: Record<string, string> = {
    'Patrocinador principal': 'Parceiro principal',
    'Patrocinador oficial': 'Parceiro oficial',
    Patrocinador: 'Parceiro',
  };

  return normalized[level ?? ''] ?? level ?? 'Parceiro oficial';
}

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

export function AdminSponsorsPage() {
  const [sponsors, setSponsors] = useState<GdrbSponsor[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [levelFilter, setLevelFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [expandedSponsorId, setExpandedSponsorId] = useState<string | null>(null);

  async function loadSponsors() {
    setIsLoading(true);
    setErrorMessage('');

    const { data, error } = await supabase
      .from('gdrb_sponsors')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Erro ao carregar parceiros:', error);
      setErrorMessage('Não foi possível carregar os parceiros.');
      setIsLoading(false);
      return;
    }

    setSponsors(data ?? []);
    setIsLoading(false);
  }

  useEffect(() => {
    loadSponsors();
  }, []);

  const counts = useMemo(() => {
    const active = sponsors.filter((sponsor) => sponsor.is_active).length;
    const inactive = sponsors.length - active;

    return {
      total: sponsors.length,
      active,
      inactive,
    };
  }, [sponsors]);

  const availableLevels = useMemo(() => {
    const levels = new Set<string>();

    sponsors.forEach((sponsor) => {
      levels.add(normalizePartnerLevel(sponsor.sponsor_level));
    });

    return Array.from(levels).sort((a, b) => a.localeCompare(b, 'pt-PT'));
  }, [sponsors]);

  const filteredSponsors = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return sponsors.filter((sponsor) => {
      const level = normalizePartnerLevel(sponsor.sponsor_level);

      if (statusFilter === 'active' && !sponsor.is_active) {
        return false;
      }

      if (statusFilter === 'inactive' && sponsor.is_active) {
        return false;
      }

      if (levelFilter !== 'all' && level !== levelFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const searchableContent = [
        sponsor.name,
        sponsor.description,
        sponsor.website_url,
        level,
        String(sponsor.sort_order ?? ''),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableContent.includes(normalizedSearch);
    });
  }, [sponsors, searchTerm, statusFilter, levelFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredSponsors.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredSponsors.length);
  const paginatedSponsors = filteredSponsors.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, levelFilter, pageSize]);

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

  function handleEdit(sponsor: GdrbSponsor) {
    setEditingId(sponsor.id);
    setForm({
      name: sponsor.name,
      description: sponsor.description ?? '',
      logo_url: sponsor.logo_url ?? '',
      website_url: sponsor.website_url ?? '',
      sponsor_level: normalizePartnerLevel(sponsor.sponsor_level),
      is_active: sponsor.is_active,
      sort_order: sponsor.sort_order ?? 0,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleLogoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setSuccessMessage('');
    setErrorMessage('');
    setIsUploadingLogo(true);

    const fileExtension = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExtension}`;
    const filePath = `logos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('gdrb-sponsors')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Erro ao enviar logo:', uploadError);
      setErrorMessage('Não foi possível enviar o logo.');
      setIsUploadingLogo(false);
      return;
    }

    const { data } = supabase.storage
      .from('gdrb-sponsors')
      .getPublicUrl(filePath);

    handleChange('logo_url', data.publicUrl);
    setSuccessMessage('Logo enviado com sucesso.');
    setIsUploadingLogo(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSuccessMessage('');
    setErrorMessage('');

    if (!form.name.trim()) {
      setErrorMessage('Indica o nome do parceiro.');
      return;
    }

    setIsSaving(true);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      logo_url: form.logo_url.trim() || null,
      website_url: form.website_url.trim() || null,
      sponsor_level: form.sponsor_level,
      is_active: form.is_active,
      sort_order: Number(form.sort_order) || 0,
    };

    const result = editingId
      ? await supabase
          .from('gdrb_sponsors')
          .update(payload)
          .eq('id', editingId)
      : await supabase.from('gdrb_sponsors').insert(payload);

    setIsSaving(false);

    if (result.error) {
      console.error('Erro ao guardar parceiro:', result.error);
      setErrorMessage('Não foi possível guardar o parceiro.');
      return;
    }

    setSuccessMessage(
      editingId
        ? 'Parceiro atualizado com sucesso.'
        : 'Parceiro criado com sucesso.',
    );

    resetForm();
    await loadSponsors();
  }

  async function handleToggleActive(sponsor: GdrbSponsor) {
    const { error } = await supabase
      .from('gdrb_sponsors')
      .update({
        is_active: !sponsor.is_active,
      })
      .eq('id', sponsor.id);

    if (error) {
      console.error('Erro ao alterar parceiro:', error);
      setErrorMessage('Não foi possível alterar o estado do parceiro.');
      return;
    }

    await loadSponsors();
  }

  async function handleDelete(sponsor: GdrbSponsor) {
    const confirmDelete = window.confirm(
      `Tens a certeza que queres apagar o parceiro "${sponsor.name}"?`,
    );

    if (!confirmDelete) {
      return;
    }

    const { error } = await supabase
      .from('gdrb_sponsors')
      .delete()
      .eq('id', sponsor.id);

    if (error) {
      console.error('Erro ao apagar parceiro:', error);
      setErrorMessage('Não foi possível apagar o parceiro.');
      return;
    }

    await loadSponsors();
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
              Parceiros.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-300">
              Gere as marcas, empresas e entidades parceiras visíveis na página pública do
              site.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={loadSponsors}
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
              Novo parceiro
            </button>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-sm border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
            Total
          </p>
          <p className="mt-2 text-3xl font-black text-[#24180f]">{counts.total}</p>
        </div>

        <div className="rounded-sm border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
            Visíveis no site
          </p>
          <p className="mt-2 text-3xl font-black text-green-700">{counts.active}</p>
        </div>

        <div className="rounded-sm border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
            Ocultos
          </p>
          <p className="mt-2 text-3xl font-black text-zinc-500">{counts.inactive}</p>
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
                {editingId ? 'Editar parceiro' : 'Novo parceiro'}
              </h2>

              <p className="mt-2 text-sm text-zinc-500">
                Preenche os dados da marca, empresa ou entidade parceira.
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
            <div>
              <label className="text-sm font-black text-zinc-800">
                Nome *
              </label>

              <input
                type="text"
                value={form.name}
                onChange={(event) => handleChange('name', event.target.value)}
                className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
              />
            </div>

            <div>
              <label className="text-sm font-black text-zinc-800">
                Tipo de parceria
              </label>

              <select
                value={form.sponsor_level}
                onChange={(event) =>
                  handleChange('sponsor_level', event.target.value)
                }
                className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
              >
                {sponsorLevels.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-black text-zinc-800">
                Descrição
              </label>

              <textarea
                value={form.description}
                onChange={(event) =>
                  handleChange('description', event.target.value)
                }
                rows={4}
                className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm leading-7 outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
              />
            </div>

            <div>
              <label className="text-sm font-black text-zinc-800">
                Logo
              </label>

              <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-zinc-300 bg-[#f6f2ec] px-4 py-4 text-sm font-bold text-zinc-700 transition hover:border-red-700 hover:text-red-700">
                <Upload size={18} />
                {isUploadingLogo ? 'A enviar...' : 'Enviar logo'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div>
              <label className="text-sm font-black text-zinc-800">
                URL do logo
              </label>

              <input
                type="url"
                value={form.logo_url}
                onChange={(event) =>
                  handleChange('logo_url', event.target.value)
                }
                className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
              />
            </div>

            {form.logo_url && (
              <div className="rounded-sm border border-zinc-200 bg-[#f6f2ec] p-5 md:col-span-2">
                <p className="mb-3 text-sm font-black text-zinc-800">
                  Pré-visualização
                </p>

                <img
                  src={form.logo_url}
                  alt="Pré-visualização do logo"
                  className="max-h-28 max-w-full object-contain"
                />
              </div>
            )}

            <div>
              <label className="text-sm font-black text-zinc-800">
                Website
              </label>

              <input
                type="url"
                value={form.website_url}
                onChange={(event) =>
                  handleChange('website_url', event.target.value)
                }
                className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
              />
            </div>

            <div>
              <label className="text-sm font-black text-zinc-800">
                Ordem
              </label>

              <input
                type="number"
                value={form.sort_order}
                onChange={(event) =>
                  handleChange('sort_order', Number(event.target.value))
                }
                className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
              />
            </div>

            <label className="flex items-center gap-3 rounded-md border border-zinc-200 px-4 py-3 text-sm font-bold text-zinc-700">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) =>
                  handleChange('is_active', event.target.checked)
                }
                className="h-4 w-4 accent-red-700"
              />
              Visível no site
            </label>
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
              {isSaving ? 'A guardar...' : 'Guardar parceiro'}
            </button>
          </div>
        </form>
      )}

      <section className="mt-8 rounded-sm border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 p-5">
          <div className="grid gap-4 xl:grid-cols-[1fr_auto_auto_auto] xl:items-end">
            <div>
              <label className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
                Pesquisa
              </label>
              <div className="mt-2 flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-2 focus-within:border-red-700 focus-within:ring-4 focus-within:ring-red-100">
                <Search size={17} className="text-zinc-400" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Nome, descrição, website, tipo ou ordem"
                  className="w-full border-none bg-transparent text-sm outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
                Estado
              </label>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                className="mt-2 w-full rounded-md border border-zinc-200 px-3 py-2 text-sm font-semibold outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100 xl:w-44"
              >
                {statusFilters.map((filter) => (
                  <option key={filter.value} value={filter.value}>
                    {filter.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
                Tipo
              </label>
              <select
                value={levelFilter}
                onChange={(event) => setLevelFilter(event.target.value)}
                className="mt-2 w-full rounded-md border border-zinc-200 px-3 py-2 text-sm font-semibold outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100 xl:w-56"
              >
                <option value="all">Todos os tipos</option>
                {availableLevels.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
                Por página
              </label>
              <select
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
                className="mt-2 w-full rounded-md border border-zinc-200 px-3 py-2 text-sm font-semibold outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100 xl:w-32"
              >
                {pageSizeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-zinc-600">A carregar parceiros...</div>
        ) : filteredSponsors.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-700">
              <Handshake size={28} />
            </div>

            <h2 className="mt-5 font-serif text-3xl font-light text-[#24180f]">
              Sem parceiros nesta vista
            </h2>

            <p className="mt-3 text-zinc-500">
              Ajusta a pesquisa ou os filtros para encontrar outros parceiros.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200 text-left text-sm">
                <thead className="bg-zinc-50 text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                  <tr>
                    <th className="px-5 py-4">Parceiro</th>
                    <th className="px-5 py-4">Tipo</th>
                    <th className="px-5 py-4">Estado</th>
                    <th className="px-5 py-4">Ordem</th>
                    <th className="px-5 py-4">Criado em</th>
                    <th className="px-5 py-4 text-right">Ações</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-zinc-100">
                  {paginatedSponsors.map((sponsor) => {
                    const isExpanded = expandedSponsorId === sponsor.id;
                    const level = normalizePartnerLevel(sponsor.sponsor_level);

                    return (
                      <tr key={sponsor.id} className="align-top">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-[#f6f2ec] p-2">
                              {sponsor.logo_url ? (
                                <img
                                  src={sponsor.logo_url}
                                  alt={sponsor.name}
                                  className="max-h-full max-w-full object-contain"
                                />
                              ) : (
                                <Handshake size={22} className="text-red-700" />
                              )}
                            </div>

                            <div>
                              <p className="font-black text-[#24180f]">{sponsor.name}</p>
                              {sponsor.website_url && (
                                <a
                                  href={sponsor.website_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-red-700 hover:text-red-900"
                                >
                                  Website
                                  <ExternalLink size={12} />
                                </a>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-zinc-700">{level}</td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.14em] ${
                              sponsor.is_active
                                ? 'bg-green-50 text-green-700'
                                : 'bg-zinc-100 text-zinc-600'
                            }`}
                          >
                            {sponsor.is_active ? 'Visível' : 'Oculto'}
                          </span>
                        </td>

                        <td className="px-5 py-4 font-semibold text-zinc-700">
                          {sponsor.sort_order ?? 0}
                        </td>

                        <td className="px-5 py-4 text-zinc-600">
                          {formatDate(sponsor.created_at)}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedSponsorId(isExpanded ? null : sponsor.id)
                              }
                              className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-700 hover:border-red-700 hover:text-red-700"
                            >
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              Detalhes
                            </button>

                            <button
                              type="button"
                              onClick={() => handleEdit(sponsor)}
                              className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-700 hover:border-red-700 hover:text-red-700"
                            >
                              <Edit3 size={14} />
                              Editar
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleActive(sponsor)}
                              className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-700 hover:border-red-700 hover:text-red-700"
                            >
                              {sponsor.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
                              {sponsor.is_active ? 'Ocultar' : 'Mostrar'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(sponsor)}
                              className="inline-flex items-center gap-1 rounded-md border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50"
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

            {paginatedSponsors.map((sponsor) => {
              if (expandedSponsorId !== sponsor.id) {
                return null;
              }

              return (
                <div
                  key={`${sponsor.id}-details`}
                  className="border-t border-zinc-100 bg-[#f6f2ec] px-5 py-5"
                >
                  <div className="grid gap-5 md:grid-cols-[220px_1fr]">
                    <div className="flex min-h-32 items-center justify-center rounded-md border border-zinc-200 bg-white p-5">
                      {sponsor.logo_url ? (
                        <img
                          src={sponsor.logo_url}
                          alt={sponsor.name}
                          className="max-h-28 max-w-full object-contain"
                        />
                      ) : (
                        <Handshake size={34} className="text-red-700" />
                      )}
                    </div>

                    <div className="rounded-md border border-zinc-200 bg-white p-5">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
                            Descrição
                          </p>
                          <p className="mt-2 text-sm leading-7 text-zinc-700">
                            {sponsor.description || 'Sem descrição.'}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
                            URL do logo
                          </p>
                          <p className="mt-2 break-all text-sm leading-7 text-zinc-700">
                            {sponsor.logo_url || '—'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="flex flex-col gap-4 border-t border-zinc-200 p-5 text-sm text-zinc-600 md:flex-row md:items-center md:justify-between">
              <p>
                A mostrar{' '}
                <span className="font-black text-zinc-900">
                  {filteredSponsors.length === 0 ? 0 : startIndex + 1}-{endIndex}
                </span>{' '}
                de{' '}
                <span className="font-black text-zinc-900">{filteredSponsors.length}</span>{' '}
                parceiros
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={safeCurrentPage === 1}
                  className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-bold text-zinc-700 hover:border-red-700 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Anterior
                </button>

                <span className="px-3 text-sm font-bold text-zinc-700">
                  {safeCurrentPage} / {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                  }
                  disabled={safeCurrentPage === totalPages}
                  className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-bold text-zinc-700 hover:border-red-700 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Seguinte
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
