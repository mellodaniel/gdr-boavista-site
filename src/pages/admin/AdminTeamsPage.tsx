import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronDown,
  Eye,
  EyeOff,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Trash2,
  Trophy,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useSessionState } from '../../hooks/useSessionState';
import type { GdrbTeam } from '../../types/database';

const initialForm = {
  name: '',
  category: 'Formação',
  football_type: 'Futebol 11',
  description: '',
  image_url: '',
  is_active: true,
  sort_order: 0,
};

const categoryOptions = [
  'Escola de Futebol',
  'Formação',
  'Seniores',
  'Veteranos',
];

const footballTypes = ['Futebol 5', 'Futebol 7', 'Futebol 9', 'Futebol 11'];
const pageSizeOptions = [10, 25, 50];

type TeamStatusFilter = 'active' | 'all' | 'hidden';

function hasSeniorRoster(team: GdrbTeam) {
  const name = normalizeText(team.name).trim();

  return name.includes('senior');
}

function normalizeText(value: string | null | undefined) {
  return (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function AdminTeamsPage() {
  const [teams, setTeams] = useState<GdrbTeam[]>([]);
  const [form, setForm] = useSessionState('admin:teams:form', initialForm);
  const [editingId, setEditingId] = useSessionState<string | null>('admin:teams:editingId', null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showForm, setShowForm] = useSessionState('admin:teams:showForm', false);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<TeamStatusFilter>('active');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [footballTypeFilter, setFootballTypeFilter] = useState('all');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  async function loadTeams() {
    setIsLoading(true);
    setErrorMessage('');

    const { data, error } = await supabase
      .from('gdrb_teams')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Erro ao carregar equipas:', error);
      setErrorMessage('Não foi possível carregar as equipas.');
      setIsLoading(false);
      return;
    }

    setTeams(data ?? []);
    setIsLoading(false);
  }

  useEffect(() => {
    loadTeams();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, categoryFilter, footballTypeFilter, pageSize]);

  const teamCounts = useMemo(() => {
    const active = teams.filter((team) => team.is_active).length;
    const hidden = teams.length - active;

    return {
      total: teams.length,
      active,
      hidden,
    };
  }, [teams]);

  const categories = useMemo(() => {
    return Array.from(new Set(teams.map((team) => team.category).filter(Boolean))).sort();
  }, [teams]);

  const footballTypeOptions = useMemo(() => {
    return Array.from(new Set(teams.map((team) => team.football_type).filter(Boolean))).sort();
  }, [teams]);

  const filteredTeams = useMemo(() => {
    const normalizedSearch = normalizeText(searchTerm.trim());

    return teams.filter((team) => {
      if (statusFilter === 'active' && !team.is_active) return false;
      if (statusFilter === 'hidden' && team.is_active) return false;
      if (categoryFilter !== 'all' && team.category !== categoryFilter) return false;
      if (footballTypeFilter !== 'all' && team.football_type !== footballTypeFilter) return false;

      if (!normalizedSearch) return true;

      const searchableText = normalizeText([
        team.name,
        team.category,
        team.football_type,
        team.description,
        team.image_url,
        String(team.sort_order ?? ''),
      ].join(' '));

      return searchableText.includes(normalizedSearch);
    });
  }, [teams, searchTerm, statusFilter, categoryFilter, footballTypeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredTeams.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedTeams = filteredTeams.slice(startIndex, startIndex + pageSize);
  const firstVisible = filteredTeams.length === 0 ? 0 : startIndex + 1;
  const lastVisible = Math.min(startIndex + pageSize, filteredTeams.length);

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

  function handleEdit(team: GdrbTeam) {
    setEditingId(team.id);
    setForm({
      name: team.name,
      category: team.category,
      football_type: team.football_type,
      description: team.description ?? '',
      image_url: team.image_url ?? '',
      is_active: team.is_active,
      sort_order: team.sort_order ?? 0,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSuccessMessage('');
    setErrorMessage('');

    if (!form.name.trim()) {
      setErrorMessage('Indica o nome do escalão/equipa.');
      return;
    }

    setIsSaving(true);

    const payload = {
      name: form.name.trim(),
      category: form.category,
      football_type: form.football_type,
      description: form.description.trim() || null,
      image_url: form.image_url.trim() || null,
      is_active: form.is_active,
      sort_order: Number(form.sort_order) || 0,
    };

    const result = editingId
      ? await supabase.from('gdrb_teams').update(payload).eq('id', editingId)
      : await supabase.from('gdrb_teams').insert(payload);

    setIsSaving(false);

    if (result.error) {
      console.error('Erro ao guardar equipa:', result.error);
      setErrorMessage('Não foi possível guardar a equipa.');
      return;
    }

    setSuccessMessage(
      editingId ? 'Equipa atualizada com sucesso.' : 'Equipa criada com sucesso.',
    );

    resetForm();
    await loadTeams();
  }

  async function handleToggleActive(team: GdrbTeam) {
    const { error } = await supabase
      .from('gdrb_teams')
      .update({
        is_active: !team.is_active,
      })
      .eq('id', team.id);

    if (error) {
      console.error('Erro ao alterar equipa:', error);
      setErrorMessage('Não foi possível alterar o estado da equipa.');
      return;
    }

    await loadTeams();
  }

  async function handleDelete(team: GdrbTeam) {
    const confirmDelete = window.confirm(
      `Tens a certeza que queres apagar a equipa "${team.name}"?`,
    );

    if (!confirmDelete) {
      return;
    }

    const { error } = await supabase.from('gdrb_teams').delete().eq('id', team.id);

    if (error) {
      console.error('Erro ao apagar equipa:', error);
      setErrorMessage('Não foi possível apagar a equipa.');
      return;
    }

    await loadTeams();
  }

  return (
    <div>
      <section className="relative overflow-hidden rounded-sm bg-[#24180f] p-5 text-white shadow-2xl shadow-zinc-950/10 sm:p-6 md:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_right,rgba(220,38,38,0.28),transparent_34%)]" />

        <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.45em] text-red-400">
              Administração
            </p>

            <h1 className="mt-4 font-serif text-4xl font-light leading-tight sm:text-5xl md:mt-6 md:text-7xl">
              Equipas.
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-300 sm:text-base sm:leading-8 md:mt-6">
              Gere os escalões e equipas que aparecem na página pública de equipas.
            </p>
          </div>

          <div className="grid w-full grid-cols-2 gap-3 md:flex md:w-auto md:flex-wrap">
            <button
              type="button"
              onClick={loadTeams}
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
              Nova equipa
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
                {editingId ? 'Editar equipa' : 'Nova equipa'}
              </h2>

              <p className="mt-2 text-sm text-zinc-500">
                Preenche os dados do escalão/equipa.
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
              <label className="text-sm font-black text-zinc-800">Nome *</label>
              <input
                type="text"
                value={form.name}
                onChange={(event) => handleChange('name', event.target.value)}
                placeholder="Ex: Iniciados"
                className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
              />
            </div>

            <div>
              <label className="text-sm font-black text-zinc-800">Categoria</label>
              <select
                value={form.category}
                onChange={(event) => handleChange('category', event.target.value)}
                className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
              >
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-black text-zinc-800">Tipo de futebol</label>
              <select
                value={form.football_type}
                onChange={(event) => handleChange('football_type', event.target.value)}
                className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
              >
                {footballTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-black text-zinc-800">Ordem</label>
              <input
                type="number"
                value={form.sort_order}
                onChange={(event) => handleChange('sort_order', Number(event.target.value))}
                className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-black text-zinc-800">Descrição</label>
              <textarea
                value={form.description}
                onChange={(event) => handleChange('description', event.target.value)}
                rows={4}
                className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm leading-7 outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-black text-zinc-800">URL da imagem</label>
              <input
                type="url"
                value={form.image_url}
                onChange={(event) => handleChange('image_url', event.target.value)}
                className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
              />
            </div>

            <label className="flex items-center gap-3 rounded-md border border-zinc-200 px-4 py-3 text-sm font-bold text-zinc-700">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) => handleChange('is_active', event.target.checked)}
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
              {isSaving ? 'A guardar...' : 'Guardar equipa'}
            </button>
          </div>
        </form>
      )}

      <section className="mt-8 rounded-sm border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-3 gap-2 md:gap-3">
          <div className="rounded-md bg-zinc-50 p-3 ring-1 ring-zinc-100 md:p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-400 sm:text-xs sm:tracking-[0.22em]">Total</p>
            <p className="mt-1 text-2xl font-black text-[#24180f] md:mt-2 md:text-3xl">{teamCounts.total}</p>
          </div>
          <div className="rounded-md bg-green-50 p-3 ring-1 ring-green-100 md:p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-green-700 sm:text-xs sm:tracking-[0.22em]">Visíveis</p>
            <p className="mt-1 text-2xl font-black text-green-900 md:mt-2 md:text-3xl">{teamCounts.active}</p>
          </div>
          <div className="rounded-md bg-zinc-50 p-3 ring-1 ring-zinc-100 md:p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-400 sm:text-xs sm:tracking-[0.22em]">Ocultas</p>
            <p className="mt-1 text-2xl font-black text-zinc-900 md:mt-2 md:text-3xl">{teamCounts.hidden}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowMobileFilters((current) => !current)}
          className="mt-4 flex w-full items-center justify-between rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-black text-zinc-800 md:hidden"
          aria-expanded={showMobileFilters}
        >
          <span>Filtros e pesquisa</span>
          <ChevronDown
            size={18}
            className={`transition ${showMobileFilters ? 'rotate-180' : ''}`}
          />
        </button>

        <div className={`${showMobileFilters ? 'grid' : 'hidden'} mt-3 gap-3 md:mt-5 md:grid lg:grid-cols-[1.5fr_0.8fr_0.8fr_0.8fr_auto]`}>
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={17} />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Pesquisar por nome, categoria, tipo ou descrição..."
              className="w-full rounded-md border border-zinc-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
            />
          </label>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as TeamStatusFilter)}
            className="rounded-md border border-zinc-200 px-4 py-3 text-sm font-bold text-zinc-700 outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
          >
            <option value="active">Visíveis</option>
            <option value="all">Todas</option>
            <option value="hidden">Ocultas</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="rounded-md border border-zinc-200 px-4 py-3 text-sm font-bold text-zinc-700 outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
          >
            <option value="all">Todas as categorias</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <select
            value={footballTypeFilter}
            onChange={(event) => setFootballTypeFilter(event.target.value)}
            className="rounded-md border border-zinc-200 px-4 py-3 text-sm font-bold text-zinc-700 outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
          >
            <option value="all">Todos os tipos</option>
            {footballTypeOptions.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          <select
            value={pageSize}
            onChange={(event) => setPageSize(Number(event.target.value))}
            className="rounded-md border border-zinc-200 px-4 py-3 text-sm font-bold text-zinc-700 outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}/página
              </option>
            ))}
          </select>
        </div>
      </section>

      {isLoading ? (
        <div className="mt-8 rounded-sm border border-zinc-200 bg-white p-8 text-zinc-600 shadow-sm">
          A carregar equipas...
        </div>
      ) : teams.length === 0 ? (
        <div className="mt-8 rounded-sm border border-dashed border-zinc-300 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-700">
            <Trophy size={28} />
          </div>
          <h2 className="mt-5 font-serif text-3xl font-light text-[#24180f]">Sem equipas</h2>
          <p className="mt-3 text-zinc-500">Ainda não existem equipas criadas.</p>
        </div>
      ) : filteredTeams.length === 0 ? (
        <div className="mt-8 rounded-sm border border-dashed border-zinc-300 bg-white p-10 text-center shadow-sm">
          <h2 className="font-serif text-3xl font-light text-[#24180f]">Sem resultados</h2>
          <p className="mt-3 text-zinc-500">Ajusta a pesquisa ou os filtros.</p>
        </div>
      ) : (
        <section className="mt-8 overflow-hidden rounded-sm border border-zinc-200 bg-white shadow-sm">
          <div className="divide-y divide-zinc-100 md:hidden">
            {paginatedTeams.map((team) => {
              const isExpanded = expandedTeamId === team.id;

              return (
                <article key={team.id} className="p-4">
                  <button
                    type="button"
                    onClick={() => setExpandedTeamId(isExpanded ? null : team.id)}
                    className="flex w-full items-start justify-between gap-3 text-left"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-base font-black text-zinc-900">{team.name}</p>
                      <p className="mt-1 text-xs font-bold text-zinc-500">
                        {team.category} · {team.football_type}
                      </p>
                    </div>
                    <ChevronDown
                      size={18}
                      className={`mt-1 shrink-0 text-zinc-400 transition ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    <span className={`rounded-full px-3 py-1 font-black ${team.is_active ? 'bg-green-50 text-green-700' : 'bg-zinc-100 text-zinc-600'}`}>
                      {team.is_active ? 'Visível' : 'Oculta'}
                    </span>
                    <span className="rounded-full bg-zinc-100 px-3 py-1 font-bold text-zinc-600">
                      Ordem {team.sort_order ?? 0}
                    </span>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 rounded-md bg-zinc-50 p-3 text-xs leading-5 text-zinc-600">
                      <p>{team.description || 'Sem descrição.'}</p>
                      {team.image_url && (
                        <p className="mt-2 break-all text-zinc-400">Imagem: {team.image_url}</p>
                      )}
                    </div>
                  )}

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(team)}
                      className="min-h-11 rounded-md border border-zinc-200 px-3 py-2.5 text-sm font-bold text-zinc-700 hover:border-red-700 hover:text-red-700"
                    >
                      Editar
                    </button>

                    {hasSeniorRoster(team) ? (
                      <Link
                        to="/admin/equipas/seniores/plantel"
                        className="flex min-h-11 items-center justify-center rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-black text-red-700 hover:bg-red-100"
                      >
                        Plantel
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setExpandedTeamId(isExpanded ? null : team.id)}
                        className="min-h-11 rounded-md border border-zinc-200 px-3 py-2.5 text-sm font-bold text-zinc-700"
                      >
                        {isExpanded ? 'Fechar detalhes' : 'Detalhes'}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleToggleActive(team)}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-zinc-200 px-3 py-2.5 text-sm font-bold text-zinc-700 hover:border-red-700 hover:text-red-700"
                    >
                      {team.is_active ? <EyeOff size={16} /> : <Eye size={16} />}
                      {team.is_active ? 'Ocultar' : 'Mostrar'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(team)}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-red-200 px-3 py-2.5 text-sm font-bold text-red-700 hover:bg-red-50"
                    >
                      <Trash2 size={16} />
                      Apagar
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50 text-left text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Equipa</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Ordem</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {paginatedTeams.map((team) => {
                  const isExpanded = expandedTeamId === team.id;

                  return (
                    <tr key={team.id} className="align-top hover:bg-zinc-50/70">
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => setExpandedTeamId(isExpanded ? null : team.id)}
                          className="flex max-w-[320px] items-start gap-2 text-left"
                        >
                          <ChevronDown
                            size={16}
                            className={`mt-1 shrink-0 text-zinc-400 transition ${isExpanded ? 'rotate-180' : ''}`}
                          />
                          <span>
                            <span className="block font-black text-zinc-900">{team.name}</span>
                            {isExpanded && (
                              <span className="mt-2 block text-xs leading-5 text-zinc-500">
                                {team.description || 'Sem descrição.'}
                                {team.image_url && (
                                  <span className="mt-2 block break-all text-zinc-400">
                                    Imagem: {team.image_url}
                                  </span>
                                )}
                              </span>
                            )}
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-4 text-zinc-700">{team.category}</td>
                      <td className="px-4 py-4 text-zinc-700">{team.football_type}</td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-black ${team.is_active ? 'bg-green-50 text-green-700' : 'bg-zinc-100 text-zinc-600'}`}>
                          {team.is_active ? 'Visível' : 'Oculta'}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-bold text-zinc-600">{team.sort_order ?? 0}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setExpandedTeamId(isExpanded ? null : team.id)}
                            className="rounded-md border border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-700 hover:border-red-700 hover:text-red-700"
                          >
                            Detalhes
                          </button>

                          <button
                            type="button"
                            onClick={() => handleEdit(team)}
                            className="rounded-md border border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-700 hover:border-red-700 hover:text-red-700"
                          >
                            Editar
                          </button>

                          {hasSeniorRoster(team) && (
                            <Link
                              to="/admin/equipas/seniores/plantel"
                              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100"
                            >
                              Plantel
                            </Link>
                          )}

                          <button
                            type="button"
                            onClick={() => handleToggleActive(team)}
                            className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-700 hover:border-red-700 hover:text-red-700"
                          >
                            {team.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
                            {team.is_active ? 'Ocultar' : 'Mostrar'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(team)}
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

          <div className="flex flex-col gap-3 border-t border-zinc-200 bg-zinc-50 px-4 py-4 text-sm text-zinc-600 md:flex-row md:items-center md:justify-between">
            <span>
              A mostrar <strong>{firstVisible}</strong>-<strong>{lastVisible}</strong> de{' '}
              <strong>{filteredTeams.length}</strong>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={safeCurrentPage <= 1}
                className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-bold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="px-2 text-sm font-bold text-zinc-700">
                {safeCurrentPage}/{totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={safeCurrentPage >= totalPages}
                className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-bold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Seguinte
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
