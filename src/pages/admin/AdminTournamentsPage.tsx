import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Archive,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Eye,
  EyeOff,
  Plus,
  RefreshCcw,
  RotateCcw,
  Save,
  Search,
  SlidersHorizontal,
  Trash2,
  Trophy,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { GdrbTournament } from '../../types/database';

type TournamentKind = 'organized' | 'external';
type TournamentVisibilityFilter = 'active' | 'visible' | 'hidden' | 'archived' | 'all';

type AdminTournament = GdrbTournament & {
  tournament_type?: TournamentKind | null;
  is_archived?: boolean | null;
};

const initialForm = {
  team_name: '',
  football_type: 'Futebol 11',
  name: '',
  start_date: '',
  end_date: '',
  location: '',
  website_url: '',
  notes: '',
  tournament_type: 'external' as TournamentKind,
  is_visible: true,
  sort_order: 0,
};

const footballTypes = ['Futebol 5', 'Futebol 7', 'Futebol 9', 'Futebol 11'];

const teamOptions = [
  'Petizes / ABC',
  'Traquinas',
  'Benjamins',
  'Infantis',
  'Iniciados',
  'Juvenis',
  'Juniores',
  'Seniores',
  'Veteranos',
];

const tournamentTypes: { value: TournamentKind; label: string; description: string }[] = [
  {
    value: 'external',
    label: 'Participação externa',
    description: 'Torneio onde um escalão do GDR Boavista participa.',
  },
  {
    value: 'organized',
    label: 'Organizado pelo GDR Boavista',
    description: 'Torneio administrado/organizado pelo clube.',
  },
];

const visibilityFilters: { value: TournamentVisibilityFilter; label: string }[] = [
  { value: 'active', label: 'Ativos' },
  { value: 'visible', label: 'Visíveis' },
  { value: 'hidden', label: 'Ocultos' },
  { value: 'archived', label: 'Arquivados' },
  { value: 'all', label: 'Todos' },
];

const pageSizeOptions = [10, 25, 50];

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatTournamentDate(tournament: AdminTournament) {
  if (!tournament.end_date || tournament.end_date === tournament.start_date) {
    return formatDate(tournament.start_date);
  }

  return `${formatDate(tournament.start_date)} a ${formatDate(tournament.end_date)}`;
}

function getTournamentType(tournament: AdminTournament): TournamentKind {
  return tournament.tournament_type === 'organized' ? 'organized' : 'external';
}

function getTournamentTypeLabel(tournament: AdminTournament) {
  return getTournamentType(tournament) === 'organized'
    ? 'Organizado pelo clube'
    : 'Participação externa';
}

function isArchived(tournament: AdminTournament) {
  return Boolean(tournament.is_archived);
}

export function AdminTournamentsPage() {
  const [tournaments, setTournaments] = useState<AdminTournament[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<TournamentVisibilityFilter>('active');
  const [typeFilter, setTypeFilter] = useState<'all' | TournamentKind>('all');
  const [teamFilter, setTeamFilter] = useState('Todos');
  const [footballTypeFilter, setFootballTypeFilter] = useState('Todos');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  async function loadTournaments() {
    setIsLoading(true);
    setErrorMessage('');

    const { data, error } = await supabase
      .from('gdrb_tournaments')
      .select('*')
      .order('start_date', { ascending: true })
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Erro ao carregar torneios:', error);
      setErrorMessage('Não foi possível carregar os torneios.');
      setIsLoading(false);
      return;
    }

    setTournaments((data ?? []) as AdminTournament[]);
    setIsLoading(false);
  }

  useEffect(() => {
    loadTournaments();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, visibilityFilter, typeFilter, teamFilter, footballTypeFilter, pageSize]);

  function handleChange(field: keyof typeof initialForm, value: string | boolean | number) {
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

  function handleEdit(tournament: AdminTournament) {
    setEditingId(tournament.id);
    setForm({
      team_name: tournament.team_name,
      football_type: tournament.football_type,
      name: tournament.name,
      start_date: tournament.start_date,
      end_date: tournament.end_date ?? '',
      location: tournament.location ?? '',
      website_url: tournament.website_url ?? '',
      notes: tournament.notes ?? '',
      tournament_type: getTournamentType(tournament),
      is_visible: tournament.is_visible,
      sort_order: tournament.sort_order ?? 0,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSuccessMessage('');
    setErrorMessage('');

    if (!form.team_name.trim() || !form.name.trim() || !form.start_date) {
      setErrorMessage('Preenche pelo menos escalão, nome do torneio e data inicial.');
      return;
    }

    setIsSaving(true);

    const payload = {
      team_name: form.team_name.trim(),
      football_type: form.football_type,
      name: form.name.trim(),
      start_date: form.start_date,
      end_date: form.end_date || null,
      location: form.location.trim() || null,
      website_url: form.website_url.trim() || null,
      notes: form.notes.trim() || null,
      tournament_type: form.tournament_type,
      is_visible: form.is_visible,
      sort_order: Number(form.sort_order) || 0,
      updated_at: new Date().toISOString(),
    };

    const result = editingId
      ? await supabase.from('gdrb_tournaments').update(payload).eq('id', editingId)
      : await supabase.from('gdrb_tournaments').insert(payload);

    setIsSaving(false);

    if (result.error) {
      console.error('Erro ao guardar torneio:', result.error);
      setErrorMessage('Não foi possível guardar o torneio.');
      return;
    }

    setSuccessMessage(editingId ? 'Torneio atualizado com sucesso.' : 'Torneio criado com sucesso.');

    resetForm();
    await loadTournaments();
  }

  async function handleToggleVisibility(tournament: AdminTournament) {
    setSuccessMessage('');
    setErrorMessage('');

    const { error } = await supabase
      .from('gdrb_tournaments')
      .update({
        is_visible: !tournament.is_visible,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tournament.id);

    if (error) {
      console.error('Erro ao alterar visibilidade:', error);
      setErrorMessage('Não foi possível alterar a visibilidade do torneio.');
      return;
    }

    await loadTournaments();
  }

  async function handleArchive(tournament: AdminTournament) {
    const confirmArchive = window.confirm(
      `Arquivar o torneio "${tournament.name}"?\n\nEle deixa de aparecer na vista normal e também sai do site público, mas fica guardado para consulta.`,
    );

    if (!confirmArchive) {
      return;
    }

    setSuccessMessage('');
    setErrorMessage('');

    const { error } = await supabase
      .from('gdrb_tournaments')
      .update({
        is_archived: true,
        is_visible: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tournament.id);

    if (error) {
      console.error('Erro ao arquivar torneio:', error);
      setErrorMessage('Não foi possível arquivar o torneio.');
      return;
    }

    setSuccessMessage('Torneio arquivado com sucesso.');
    await loadTournaments();
  }

  async function handleRestore(tournament: AdminTournament) {
    const confirmRestore = window.confirm(
      `Reativar o torneio "${tournament.name}"?\n\nEle volta à gestão normal, mas continua oculto até escolheres mostrar.`,
    );

    if (!confirmRestore) {
      return;
    }

    setSuccessMessage('');
    setErrorMessage('');

    const { error } = await supabase
      .from('gdrb_tournaments')
      .update({
        is_archived: false,
        is_visible: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tournament.id);

    if (error) {
      console.error('Erro ao reativar torneio:', error);
      setErrorMessage('Não foi possível reativar o torneio.');
      return;
    }

    setSuccessMessage('Torneio reativado com sucesso.');
    await loadTournaments();
  }

  async function handleDelete(tournament: AdminTournament) {
    const confirmDelete = window.confirm(
      `Tens a certeza que queres apagar definitivamente o torneio "${tournament.name}"?\n\nPara histórico, o recomendado é arquivar em vez de apagar.`,
    );

    if (!confirmDelete) {
      return;
    }

    setSuccessMessage('');
    setErrorMessage('');

    const { error } = await supabase.from('gdrb_tournaments').delete().eq('id', tournament.id);

    if (error) {
      console.error('Erro ao apagar torneio:', error);
      setErrorMessage('Não foi possível apagar o torneio.');
      return;
    }

    await loadTournaments();
  }

  const counts = useMemo(
    () => ({
      total: tournaments.length,
      active: tournaments.filter((tournament) => !isArchived(tournament)).length,
      visible: tournaments.filter((tournament) => !isArchived(tournament) && tournament.is_visible).length,
      hidden: tournaments.filter((tournament) => !isArchived(tournament) && !tournament.is_visible).length,
      archived: tournaments.filter((tournament) => isArchived(tournament)).length,
      organized: tournaments.filter((tournament) => !isArchived(tournament) && getTournamentType(tournament) === 'organized').length,
      external: tournaments.filter((tournament) => !isArchived(tournament) && getTournamentType(tournament) === 'external').length,
    }),
    [tournaments],
  );

  const filteredTournaments = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return tournaments.filter((tournament) => {
      const archived = isArchived(tournament);
      const tournamentType = getTournamentType(tournament);

      const matchesVisibility =
        visibilityFilter === 'all' ||
        (visibilityFilter === 'active' && !archived) ||
        (visibilityFilter === 'visible' && !archived && tournament.is_visible) ||
        (visibilityFilter === 'hidden' && !archived && !tournament.is_visible) ||
        (visibilityFilter === 'archived' && archived);

      const matchesType = typeFilter === 'all' || tournamentType === typeFilter;
      const matchesTeam = teamFilter === 'Todos' || tournament.team_name === teamFilter;
      const matchesFootballType =
        footballTypeFilter === 'Todos' || tournament.football_type === footballTypeFilter;

      const haystack = [
        tournament.name,
        tournament.team_name,
        tournament.football_type,
        tournament.location,
        tournament.website_url,
        tournament.notes,
        getTournamentTypeLabel(tournament),
        archived ? 'arquivado' : tournament.is_visible ? 'visível' : 'oculto',
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch);

      return matchesVisibility && matchesType && matchesTeam && matchesFootballType && matchesSearch;
    });
  }, [footballTypeFilter, searchTerm, teamFilter, tournaments, typeFilter, visibilityFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredTournaments.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedTournaments = filteredTournaments.slice(pageStartIndex, pageStartIndex + pageSize);
  const showingFrom = filteredTournaments.length === 0 ? 0 : pageStartIndex + 1;
  const showingTo = Math.min(pageStartIndex + pageSize, filteredTournaments.length);

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
              Torneios.
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-300 sm:text-base sm:leading-7 md:mt-6 md:leading-8">
              Gere torneios organizados pelo clube e participações externas dos escalões,
              separando visibilidade pública, ocultos e histórico arquivado.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
            <button
              type="button"
              onClick={loadTournaments}
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
              Novo torneio
            </button>
          </div>
        </div>
      </section>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:gap-3 md:mt-6 md:grid-cols-2 md:gap-4 xl:grid-cols-4">
        <div className="rounded-sm border border-zinc-200 bg-white p-3.5 shadow-sm sm:p-4 md:p-5">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-zinc-400">Ativos</p>
          <p className="mt-1 text-2xl font-black md:mt-2 md:text-3xl text-[#24180f]">{counts.active}</p>
        </div>
        <div className="rounded-sm border border-zinc-200 bg-white p-3.5 shadow-sm sm:p-4 md:p-5">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-zinc-400">Visíveis</p>
          <p className="mt-1 text-2xl font-black md:mt-2 md:text-3xl text-green-700">{counts.visible}</p>
        </div>
        <div className="rounded-sm border border-zinc-200 bg-white p-3.5 shadow-sm sm:p-4 md:p-5">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-zinc-400">Ocultos</p>
          <p className="mt-1 text-2xl font-black md:mt-2 md:text-3xl text-zinc-700">{counts.hidden}</p>
        </div>
        <div className="rounded-sm border border-zinc-200 bg-white p-3.5 shadow-sm sm:p-4 md:p-5">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-zinc-400">Arquivados</p>
          <p className="mt-1 text-2xl font-black md:mt-2 md:text-3xl text-red-700">{counts.archived}</p>
        </div>
      </div>

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
        <form onSubmit={handleSubmit} className="mt-6 rounded-sm border border-zinc-200 bg-white p-4 shadow-sm sm:p-5 md:mt-8 md:p-7">
          <div className="flex items-center justify-between gap-4 border-b border-zinc-200 pb-5">
            <div>
              <h2 className="font-serif text-3xl font-light text-[#24180f] md:text-4xl">
                {editingId ? 'Editar torneio' : 'Novo torneio'}
              </h2>

              <p className="mt-2 text-sm text-zinc-500">
                Define se é um torneio organizado pelo clube ou uma participação externa.
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

          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <div className="md:col-span-2">
              <label className="text-sm font-black text-zinc-800">Tipo de torneio</label>

              <div className="mt-2 grid gap-3 md:grid-cols-2">
                {tournamentTypes.map((type) => (
                  <label
                    key={type.value}
                    className={`cursor-pointer rounded-md border px-4 py-3 text-sm transition ${
                      form.tournament_type === type.value
                        ? 'border-red-700 bg-red-50 text-red-900'
                        : 'border-zinc-200 bg-white text-zinc-700 hover:border-red-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="tournament_type"
                      value={type.value}
                      checked={form.tournament_type === type.value}
                      onChange={(event) =>
                        handleChange('tournament_type', event.target.value as TournamentKind)
                      }
                      className="sr-only"
                    />
                    <span className="block font-black">{type.label}</span>
                    <span className="mt-1 block text-xs leading-5 text-zinc-500">{type.description}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-black text-zinc-800">Escalão *</label>

              <select
                value={form.team_name}
                onChange={(event) => handleChange('team_name', event.target.value)}
                className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
              >
                <option value="">Selecionar</option>
                {teamOptions.map((team) => (
                  <option key={team} value={team}>
                    {team}
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

            <div className="md:col-span-2">
              <label className="text-sm font-black text-zinc-800">Nome do torneio *</label>

              <input
                type="text"
                value={form.name}
                onChange={(event) => handleChange('name', event.target.value)}
                placeholder="Ex: Mértola Cup"
                className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
              />
            </div>

            <div>
              <label className="text-sm font-black text-zinc-800">Data inicial *</label>

              <input
                type="date"
                value={form.start_date}
                onChange={(event) => handleChange('start_date', event.target.value)}
                className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
              />
            </div>

            <div>
              <label className="text-sm font-black text-zinc-800">Data final</label>

              <input
                type="date"
                value={form.end_date}
                onChange={(event) => handleChange('end_date', event.target.value)}
                className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-black text-zinc-800">Localização</label>

              <input
                type="text"
                value={form.location}
                onChange={(event) => handleChange('location', event.target.value)}
                placeholder="Ex: Pombal"
                className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-black text-zinc-800">Site / link do torneio</label>

              <input
                type="url"
                value={form.website_url}
                onChange={(event) => handleChange('website_url', event.target.value)}
                placeholder="https://..."
                className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
              />
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

            <label className="flex items-center gap-3 rounded-md border border-zinc-200 px-4 py-3 text-sm font-bold text-zinc-700">
              <input
                type="checkbox"
                checked={form.is_visible}
                onChange={(event) => handleChange('is_visible', event.target.checked)}
                className="h-4 w-4 accent-red-700"
              />
              Visível no site
            </label>

            <div className="md:col-span-2 xl:col-span-4">
              <label className="text-sm font-black text-zinc-800">Notas</label>

              <textarea
                value={form.notes}
                onChange={(event) => handleChange('notes', event.target.value)}
                rows={4}
                placeholder="Informação adicional sobre o torneio..."
                className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm leading-7 outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
              />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2 sm:flex sm:justify-end sm:gap-3">
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
              {isSaving ? 'A guardar...' : 'Guardar torneio'}
            </button>
          </div>
        </form>
      )}

      <section className="mt-6 rounded-sm border border-zinc-200 bg-white p-4 shadow-sm md:mt-8 md:p-5">
        <button
          type="button"
          onClick={() => setShowFilters((value) => !value)}
          className="flex min-h-11 w-full items-center justify-between rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3 text-left text-sm font-black text-[#24180f] md:hidden"
        >
          <span className="inline-flex items-center gap-2">
            <SlidersHorizontal size={17} className="text-red-700" />
            Filtros e pesquisa
          </span>
          {showFilters ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        <div className={`${showFilters ? 'grid' : 'hidden'} mt-4 gap-3 md:mt-0 md:grid md:gap-4 xl:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_auto]`}>
          <label className="relative block">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={17} />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Pesquisar por nome, escalão, local, tipo..."
              className="w-full rounded-md border border-zinc-200 py-3 pl-11 pr-4 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
            />
          </label>

          <select
            value={visibilityFilter}
            onChange={(event) => setVisibilityFilter(event.target.value as TournamentVisibilityFilter)}
            className="rounded-md border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700 outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
          >
            {visibilityFilters.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as 'all' | TournamentKind)}
            className="rounded-md border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700 outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
          >
            <option value="all">Todos os tipos</option>
            <option value="external">Participação externa</option>
            <option value="organized">Organizados pelo clube</option>
          </select>

          <select
            value={teamFilter}
            onChange={(event) => setTeamFilter(event.target.value)}
            className="rounded-md border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700 outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
          >
            <option value="Todos">Todos os escalões</option>
            {teamOptions.map((team) => (
              <option key={team} value={team}>
                {team}
              </option>
            ))}
          </select>

          <select
            value={footballTypeFilter}
            onChange={(event) => setFootballTypeFilter(event.target.value)}
            className="rounded-md border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700 outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
          >
            <option value="Todos">Todos futebol</option>
            {footballTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex flex-col gap-3 text-sm text-zinc-500 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <span>
            A mostrar <strong>{showingFrom}-{showingTo}</strong> de <strong>{filteredTournaments.length}</strong> torneios.
          </span>

          <div className="flex items-center gap-2">
            <span className="font-semibold">Por página</span>
            <select
              value={pageSize}
              onChange={(event) => setPageSize(Number(event.target.value))}
              className="rounded-md border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700"
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="mt-8 rounded-sm border border-zinc-200 bg-white p-8 text-zinc-600 shadow-sm">
          A carregar torneios...
        </div>
      ) : tournaments.length === 0 ? (
        <div className="mt-8 rounded-sm border border-dashed border-zinc-300 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-700">
            <Trophy size={28} />
          </div>

          <h2 className="mt-5 font-serif text-3xl font-light text-[#24180f]">Sem torneios</h2>

          <p className="mt-3 text-zinc-500">Ainda não existem torneios criados.</p>
        </div>
      ) : filteredTournaments.length === 0 ? (
        <div className="mt-8 rounded-sm border border-zinc-200 bg-white p-8 text-center text-zinc-500 shadow-sm">
          Não existem torneios para os filtros selecionados.
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-sm border border-zinc-200 bg-white shadow-sm md:mt-8">
          <div className="hidden grid-cols-[1.3fr_0.9fr_0.8fr_0.8fr_0.7fr_0.9fr] gap-4 border-b border-zinc-200 bg-zinc-50 px-5 py-4 text-xs font-black uppercase tracking-[0.2em] text-zinc-500 lg:grid">
            <span>Torneio</span>
            <span>Escalão</span>
            <span>Tipo</span>
            <span>Datas</span>
            <span>Estado</span>
            <span className="text-right">Ações</span>
          </div>

          {paginatedTournaments.map((tournament) => {
            const archived = isArchived(tournament);
            const expanded = expandedId === tournament.id;

            return (
              <article key={tournament.id} className="border-b border-zinc-100 bg-white last:border-b-0">
                <div className="grid gap-3 px-4 py-4 sm:px-5 sm:py-5 lg:grid-cols-[1.3fr_0.9fr_0.8fr_0.8fr_0.7fr_0.9fr] lg:items-center">
                  <div>
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : tournament.id)}
                      className="text-left font-serif text-xl font-light text-[#24180f] hover:text-red-700 sm:text-2xl"
                    >
                      {tournament.name}
                    </button>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="rounded-full bg-[#24180f] px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-white">
                        {getTournamentTypeLabel(tournament)}
                      </span>
                      {archived && (
                        <span className="rounded-full bg-zinc-200 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-zinc-700">
                          Arquivado
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-sm font-semibold text-zinc-700">{tournament.team_name}</div>
                  <div className="text-sm text-zinc-600">{tournament.football_type}</div>
                  <div className="text-sm text-zinc-600">{formatTournamentDate(tournament)}</div>

                  <div>
                    {archived ? (
                      <span className="rounded-full bg-zinc-200 px-3 py-1 text-xs font-black uppercase text-zinc-700">
                        Arquivado
                      </span>
                    ) : tournament.is_visible ? (
                      <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-black uppercase text-green-700">
                        Visível
                      </span>
                    ) : (
                      <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-black uppercase text-zinc-600">
                        Oculto
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:justify-end">
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : tournament.id)}
                      className="min-h-11 rounded-md border border-zinc-200 px-3 py-2.5 text-xs font-bold text-zinc-700 hover:border-red-700 hover:text-red-700 sm:min-h-0 sm:py-2"
                    >
                      Detalhes
                    </button>

                    {!archived && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleEdit(tournament)}
                          className="min-h-11 rounded-md border border-zinc-200 px-3 py-2.5 text-xs font-bold text-zinc-700 hover:border-red-700 hover:text-red-700 sm:min-h-0 sm:py-2"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleVisibility(tournament)}
                          className="inline-flex min-h-11 items-center justify-center gap-1 rounded-md border border-zinc-200 px-3 py-2.5 text-xs font-bold text-zinc-700 hover:border-red-700 hover:text-red-700 sm:min-h-0 sm:py-2"
                        >
                          {tournament.is_visible ? <EyeOff size={14} /> : <Eye size={14} />}
                          {tournament.is_visible ? 'Ocultar' : 'Mostrar'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleArchive(tournament)}
                          className="inline-flex min-h-11 items-center justify-center gap-1 rounded-md border border-amber-200 px-3 py-2.5 text-xs font-bold text-amber-700 hover:bg-amber-50 sm:min-h-0 sm:py-2"
                        >
                          <Archive size={14} />
                          Arquivar
                        </button>
                      </>
                    )}

                    {archived && (
                      <button
                        type="button"
                        onClick={() => handleRestore(tournament)}
                        className="inline-flex min-h-11 items-center justify-center gap-1 rounded-md border border-green-200 px-3 py-2.5 text-xs font-bold text-green-700 hover:bg-green-50 sm:min-h-0 sm:py-2"
                      >
                        <RotateCcw size={14} />
                        Reativar
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDelete(tournament)}
                      className="inline-flex min-h-11 items-center justify-center gap-1 rounded-md border border-red-200 px-3 py-2.5 text-xs font-bold text-red-700 hover:bg-red-50 sm:min-h-0 sm:py-2"
                    >
                      <Trash2 size={14} />
                      Apagar
                    </button>
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-zinc-100 bg-[#f6f2ec] px-4 py-4 sm:px-5 sm:py-5">
                    <div className="grid gap-4 text-sm md:grid-cols-3">
                      <div>
                        <p className="font-black uppercase tracking-[0.2em] text-zinc-400">Local</p>
                        <p className="mt-1 font-semibold text-zinc-700">{tournament.location || '—'}</p>
                      </div>
                      <div>
                        <p className="font-black uppercase tracking-[0.2em] text-zinc-400">Ordem</p>
                        <p className="mt-1 font-semibold text-zinc-700">{tournament.sort_order ?? 0}</p>
                      </div>
                      <div>
                        <p className="font-black uppercase tracking-[0.2em] text-zinc-400">Link</p>
                        {tournament.website_url ? (
                          <a
                            href={tournament.website_url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-flex items-center gap-2 font-bold text-red-700 hover:text-red-900"
                          >
                            Abrir site
                            <ExternalLink size={14} />
                          </a>
                        ) : (
                          <p className="mt-1 font-semibold text-zinc-700">—</p>
                        )}
                      </div>
                    </div>

                    {tournament.notes && (
                      <div className="mt-4 rounded-sm bg-white px-4 py-3 text-sm leading-7 text-zinc-600">
                        {tournament.notes}
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}

          <div className="flex flex-col gap-3 border-t border-zinc-200 bg-zinc-50 px-4 py-4 text-sm text-zinc-600 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5">
            <span>
              Página <strong>{safeCurrentPage}</strong> de <strong>{totalPages}</strong>
            </span>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={safeCurrentPage === 1}
                className="rounded-md border border-zinc-200 bg-white px-4 py-2 font-bold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={safeCurrentPage === totalPages}
                className="rounded-md border border-zinc-200 bg-white px-4 py-2 font-bold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Seguinte
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
