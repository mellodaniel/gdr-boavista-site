import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import {
  Camera,
  ChevronDown,
  Eye,
  EyeOff,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Shirt,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { supabase } from '../../lib/supabase';
import { useSessionState } from '../../hooks/useSessionState';
import type { GdrbRosterGroup, GdrbRosterPlayer } from '../../types/database';

const ROSTER_STORAGE_BUCKET = 'gdrb-roster-images';
const SENIOR_TEAM_KEY = 'senior';
const PRIVATE_ROSTER_PATH = '/equipas/seniores/plantel-2026-gdrb-7f4k';

const rosterGroups: GdrbRosterGroup[] = [
  'Guarda-redes',
  'Defesas',
  'Médios',
  'Avançados',
  'Equipa técnica',
];

const initialForm = {
  name: '',
  shirt_number: '',
  position: '',
  roster_group: 'Avançados' as GdrbRosterGroup,
  photo_url: '',
  height: '',
  birth_year: '',
  nationality: '',
  notes: '',
  is_active: true,
  sort_order: 0,
};

const pageSizeOptions = [10, 25, 50];
type PlayerStatusFilter = 'active' | 'all' | 'hidden';

function getPlayerInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function formatPlayerNumber(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return '—';
  }

  return `#${value}`;
}

function normalizeText(value: string | null | undefined) {
  return (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function AdminSeniorRosterPage() {
  const [players, setPlayers] = useState<GdrbRosterPlayer[]>([]);
  const [form, setForm] = useSessionState('admin:roster:form', initialForm);
  const [editingId, setEditingId] = useSessionState<string | null>('admin:roster:editingId', null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showForm, setShowForm] = useSessionState('admin:roster:showForm', false);

  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<PlayerStatusFilter>('active');
  const [groupFilter, setGroupFilter] = useState<GdrbRosterGroup | 'all'>('all');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const activePlayers = useMemo(
    () => players.filter((player) => player.is_active),
    [players],
  );

  const inactivePlayers = useMemo(
    () => players.filter((player) => !player.is_active),
    [players],
  );

  const playerCounts = useMemo(() => {
    return {
      total: players.length,
      active: activePlayers.length,
      hidden: inactivePlayers.length,
      groups: rosterGroups.reduce<Record<GdrbRosterGroup, number>>((acc, group) => {
        acc[group] = players.filter((player) => player.roster_group === group && player.is_active).length;
        return acc;
      }, {
        'Guarda-redes': 0,
        Defesas: 0,
        Médios: 0,
        Avançados: 0,
        'Equipa técnica': 0,
      }),
    };
  }, [players, activePlayers.length, inactivePlayers.length]);

  const filteredPlayers = useMemo(() => {
    const normalizedSearch = normalizeText(searchTerm.trim());

    return players.filter((player) => {
      if (statusFilter === 'active' && !player.is_active) return false;
      if (statusFilter === 'hidden' && player.is_active) return false;
      if (groupFilter !== 'all' && player.roster_group !== groupFilter) return false;

      if (!normalizedSearch) return true;

      const searchableText = normalizeText([
        player.name,
        player.position,
        player.roster_group,
        player.height,
        player.nationality,
        player.notes,
        String(player.shirt_number ?? ''),
        String(player.birth_year ?? ''),
        String(player.sort_order ?? ''),
      ].join(' '));

      return searchableText.includes(normalizedSearch);
    });
  }, [players, searchTerm, statusFilter, groupFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredPlayers.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedPlayers = filteredPlayers.slice(startIndex, startIndex + pageSize);
  const firstVisible = filteredPlayers.length === 0 ? 0 : startIndex + 1;
  const lastVisible = Math.min(startIndex + pageSize, filteredPlayers.length);

  useEffect(() => {
    return () => {
      if (photoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, groupFilter, pageSize]);

  function setPreviewUrl(nextPreview: string) {
    setPhotoPreview((currentPreview) => {
      if (currentPreview.startsWith('blob:')) {
        URL.revokeObjectURL(currentPreview);
      }

      return nextPreview;
    });
  }

  async function loadPlayers() {
    setIsLoading(true);
    setErrorMessage('');

    const { data, error } = await supabase
      .from('gdrb_roster_players')
      .select('*')
      .eq('team_key', SENIOR_TEAM_KEY)
      .order('roster_group', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('shirt_number', { ascending: true, nullsFirst: false })
      .order('name', { ascending: true });

    if (error) {
      console.error('Erro ao carregar plantel sénior:', error);
      setErrorMessage('Não foi possível carregar o plantel sénior.');
      setIsLoading(false);
      return;
    }

    setPlayers((data ?? []) as GdrbRosterPlayer[]);
    setIsLoading(false);
  }

  useEffect(() => {
    loadPlayers();
  }, []);

  function handleChange(
    field: keyof typeof initialForm,
    value: string | boolean | number | GdrbRosterGroup,
  ) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Escolhe um ficheiro de imagem válido.');
      event.target.value = '';
      return;
    }

    const maxSizeInMb = 8;
    const maxSizeInBytes = maxSizeInMb * 1024 * 1024;

    if (file.size > maxSizeInBytes) {
      setErrorMessage(`A imagem deve ter no máximo ${maxSizeInMb}MB.`);
      event.target.value = '';
      return;
    }

    setErrorMessage('');
    setSelectedPhotoFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function handleRemovePhoto() {
    setSelectedPhotoFile(null);
    setPreviewUrl('');
    handleChange('photo_url', '');
  }

  async function uploadSelectedPhoto() {
    if (!selectedPhotoFile) {
      return form.photo_url.trim() || null;
    }

    const extension = selectedPhotoFile.name.split('.').pop()?.toLowerCase() || 'jpg';
    const uniqueId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const filePath = `senior/${uniqueId}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(ROSTER_STORAGE_BUCKET)
      .upload(filePath, selectedPhotoFile, {
        cacheControl: '3600',
        contentType: selectedPhotoFile.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Erro ao fazer upload da foto do jogador:', uploadError);
      throw new Error(
        'Não foi possível fazer upload da foto. Confirma se o bucket gdrb-roster-images existe no Supabase.',
      );
    }

    const { data } = supabase.storage
      .from(ROSTER_STORAGE_BUCKET)
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  function resetForm() {
    setForm(initialForm);
    setSelectedPhotoFile(null);
    setPreviewUrl('');
    setEditingId(null);
    setShowForm(false);
  }

  function handleEdit(player: GdrbRosterPlayer) {
    setEditingId(player.id);
    setForm({
      name: player.name,
      shirt_number: player.shirt_number === null ? '' : String(player.shirt_number),
      position: player.position ?? '',
      roster_group: player.roster_group,
      photo_url: player.photo_url ?? '',
      height: player.height ?? '',
      birth_year: player.birth_year === null ? '' : String(player.birth_year),
      nationality: player.nationality ?? '',
      notes: player.notes ?? '',
      is_active: player.is_active,
      sort_order: player.sort_order ?? 0,
    });
    setSelectedPhotoFile(null);
    setPreviewUrl(player.photo_url ?? '');
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSuccessMessage('');
    setErrorMessage('');

    if (!form.name.trim()) {
      setErrorMessage('Indica o nome do jogador.');
      return;
    }

    setIsSaving(true);

    let uploadedPhotoUrl: string | null = null;

    try {
      uploadedPhotoUrl = await uploadSelectedPhoto();
    } catch (error) {
      setIsSaving(false);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar a fotografia.',
      );
      return;
    }

    const shirtNumber = String(form.shirt_number).trim()
      ? Number(form.shirt_number)
      : null;
    const birthYear = String(form.birth_year).trim()
      ? Number(form.birth_year)
      : null;

    const payload = {
      team_key: SENIOR_TEAM_KEY,
      name: form.name.trim(),
      shirt_number: Number.isNaN(shirtNumber) ? null : shirtNumber,
      position: form.position.trim() || null,
      roster_group: form.roster_group,
      photo_url: uploadedPhotoUrl,
      height: form.height.trim() || null,
      birth_year: Number.isNaN(birthYear) ? null : birthYear,
      nationality: form.nationality.trim() || null,
      notes: form.notes.trim() || null,
      is_active: form.is_active,
      sort_order: Number(form.sort_order) || 0,
    };

    const result = editingId
      ? await supabase.from('gdrb_roster_players').update(payload).eq('id', editingId)
      : await supabase.from('gdrb_roster_players').insert(payload);

    setIsSaving(false);

    if (result.error) {
      console.error('Erro ao guardar jogador:', result.error);
      setErrorMessage('Não foi possível guardar o jogador.');
      return;
    }

    setSuccessMessage(
      editingId ? 'Jogador atualizado com sucesso.' : 'Jogador criado com sucesso.',
    );
    resetForm();
    await loadPlayers();
  }

  async function handleToggleActive(player: GdrbRosterPlayer) {
    const { error } = await supabase
      .from('gdrb_roster_players')
      .update({ is_active: !player.is_active })
      .eq('id', player.id);

    if (error) {
      console.error('Erro ao alterar jogador:', error);
      setErrorMessage('Não foi possível alterar o estado do jogador.');
      return;
    }

    await loadPlayers();
  }

  async function handleDelete(player: GdrbRosterPlayer) {
    const confirmDelete = window.confirm(
      `Tens a certeza que queres apagar "${player.name}" do plantel?`,
    );

    if (!confirmDelete) {
      return;
    }

    const { error } = await supabase
      .from('gdrb_roster_players')
      .delete()
      .eq('id', player.id);

    if (error) {
      console.error('Erro ao apagar jogador:', error);
      setErrorMessage('Não foi possível apagar o jogador.');
      return;
    }

    await loadPlayers();
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
              Plantel Sénior.
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-300 sm:text-base sm:leading-8 md:mt-6">
              Gere os jogadores e equipa técnica da página privada do plantel sénior.
              A página pública continua a mostrar apenas elementos ativos.
            </p>
          </div>

          <div className="grid w-full grid-cols-2 gap-3 md:flex md:w-auto md:flex-wrap">
            <Link
              to={PRIVATE_ROSTER_PATH}
              target="_blank"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
            >
              <Eye size={17} />
              Ver página
            </Link>

            <button
              type="button"
              onClick={loadPlayers}
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
                setSelectedPhotoFile(null);
                setPreviewUrl('');
                setShowForm(!showForm);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-red-700 px-6 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-red-800"
            >
              <Plus size={18} />
              Novo elemento
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
          <div className="flex flex-col justify-between gap-4 border-b border-zinc-200 pb-5 md:flex-row md:items-start">
            <div>
              <h2 className="font-serif text-4xl font-light text-[#24180f]">
                {editingId ? 'Editar elemento' : 'Novo elemento'}
              </h2>
              <p className="mt-2 text-sm text-zinc-500">
                Jogadores inativos ficam fora da página pública do plantel.
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

          <div className="mt-6 grid gap-6 xl:grid-cols-[260px_1fr]">
            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-sm font-black text-zinc-800">Fotografia</p>

              <div className="mt-4 overflow-hidden rounded-md border border-zinc-200 bg-white">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Pré-visualização"
                    className="h-64 w-full object-cover object-top"
                  />
                ) : (
                  <div className="flex h-64 w-full items-center justify-center bg-zinc-100 text-4xl font-black text-zinc-400">
                    {form.name ? getPlayerInitials(form.name) : <Camera size={38} />}
                  </div>
                )}
              </div>

              <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-700 hover:border-red-700 hover:text-red-700">
                <Upload size={17} />
                Carregar foto
                <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
              </label>

              {(photoPreview || form.photo_url) && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-red-200 px-4 py-3 text-sm font-bold text-red-700 hover:bg-red-50"
                >
                  <X size={16} />
                  Remover foto
                </button>
              )}

              <input
                type="url"
                value={form.photo_url}
                onChange={(event) => {
                  handleChange('photo_url', event.target.value);
                  setPreviewUrl(event.target.value);
                  setSelectedPhotoFile(null);
                }}
                placeholder="Ou colar URL da foto"
                className="mt-3 w-full rounded-md border border-zinc-200 px-4 py-3 text-xs outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="text-sm font-black text-zinc-800">Nome *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => handleChange('name', event.target.value)}
                  className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
                />
              </div>

              <div>
                <label className="text-sm font-black text-zinc-800">Número</label>
                <input
                  type="number"
                  value={form.shirt_number}
                  onChange={(event) => handleChange('shirt_number', event.target.value)}
                  className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
                />
              </div>

              <div>
                <label className="text-sm font-black text-zinc-800">Grupo</label>
                <select
                  value={form.roster_group}
                  onChange={(event) => handleChange('roster_group', event.target.value as GdrbRosterGroup)}
                  className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
                >
                  {rosterGroups.map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-black text-zinc-800">Posição</label>
                <input
                  type="text"
                  value={form.position}
                  onChange={(event) => handleChange('position', event.target.value)}
                  placeholder="Ex: Avançado"
                  className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
                />
              </div>

              <div>
                <label className="text-sm font-black text-zinc-800">Altura</label>
                <input
                  type="text"
                  value={form.height}
                  onChange={(event) => handleChange('height', event.target.value)}
                  placeholder="Ex: 1,82 m"
                  className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
                />
              </div>

              <div>
                <label className="text-sm font-black text-zinc-800">Ano de nascimento</label>
                <input
                  type="number"
                  value={form.birth_year}
                  onChange={(event) => handleChange('birth_year', event.target.value)}
                  className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
                />
              </div>

              <div>
                <label className="text-sm font-black text-zinc-800">Nacionalidade</label>
                <input
                  type="text"
                  value={form.nationality}
                  onChange={(event) => handleChange('nationality', event.target.value)}
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

              <div className="md:col-span-2">
                <label className="text-sm font-black text-zinc-800">Notas internas</label>
                <textarea
                  value={form.notes}
                  onChange={(event) => handleChange('notes', event.target.value)}
                  rows={4}
                  className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm leading-7 outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
                />
              </div>

              <label className="flex items-center gap-3 rounded-md border border-zinc-200 px-4 py-3 text-sm font-bold text-zinc-700">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) => handleChange('is_active', event.target.checked)}
                  className="h-4 w-4 accent-red-700"
                />
                Visível na página pública
              </label>
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
              {isSaving ? 'A guardar...' : 'Guardar elemento'}
            </button>
          </div>
        </form>
      )}

      <section className="mt-8 rounded-sm border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-3 gap-2 md:grid-cols-3 md:gap-3 xl:grid-cols-6">
          <div className="rounded-md bg-zinc-50 p-3 ring-1 ring-zinc-100 md:p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-zinc-400 sm:text-xs sm:tracking-[0.22em]">Total</p>
            <p className="mt-1 text-2xl font-black text-[#24180f] md:mt-2 md:text-3xl">{playerCounts.total}</p>
          </div>
          <div className="rounded-md bg-green-50 p-3 ring-1 ring-green-100 md:p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-green-700 sm:text-xs sm:tracking-[0.22em]">Ativos</p>
            <p className="mt-1 text-2xl font-black text-green-900 md:mt-2 md:text-3xl">{playerCounts.active}</p>
          </div>
          <div className="rounded-md bg-zinc-50 p-3 ring-1 ring-zinc-100 md:p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-zinc-400 sm:text-xs sm:tracking-[0.22em]">Ocultos</p>
            <p className="mt-1 text-2xl font-black text-zinc-900 md:mt-2 md:text-3xl">{playerCounts.hidden}</p>
          </div>
          {rosterGroups.slice(0, 3).map((group) => (
            <div key={group} className="rounded-md bg-zinc-50 p-3 ring-1 ring-zinc-100 md:p-4">
              <p className="truncate text-[10px] font-black uppercase tracking-[0.12em] text-zinc-400 sm:text-xs sm:tracking-[0.22em]">{group}</p>
              <p className="mt-1 text-2xl font-black text-zinc-900 md:mt-2 md:text-3xl">{playerCounts.groups[group]}</p>
            </div>
          ))}
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

        <div className={`${showMobileFilters ? 'grid' : 'hidden'} mt-3 gap-3 md:mt-5 md:grid lg:grid-cols-[1.5fr_0.8fr_0.8fr_auto]`}>
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={17} />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Pesquisar por nome, posição, número, nacionalidade ou notas..."
              className="w-full rounded-md border border-zinc-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
            />
          </label>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as PlayerStatusFilter)}
            className="rounded-md border border-zinc-200 px-4 py-3 text-sm font-bold text-zinc-700 outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
          >
            <option value="active">Ativos</option>
            <option value="all">Todos</option>
            <option value="hidden">Ocultos</option>
          </select>

          <select
            value={groupFilter}
            onChange={(event) => setGroupFilter(event.target.value as GdrbRosterGroup | 'all')}
            className="rounded-md border border-zinc-200 px-4 py-3 text-sm font-bold text-zinc-700 outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
          >
            <option value="all">Todos os grupos</option>
            {rosterGroups.map((group) => (
              <option key={group} value={group}>
                {group}
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
          A carregar plantel...
        </div>
      ) : players.length === 0 ? (
        <div className="mt-8 rounded-sm border border-dashed border-zinc-300 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-700">
            <Shirt size={28} />
          </div>
          <h2 className="mt-5 font-serif text-3xl font-light text-[#24180f]">Plantel vazio</h2>
          <p className="mt-3 text-zinc-500">Ainda não existem jogadores criados.</p>
        </div>
      ) : filteredPlayers.length === 0 ? (
        <div className="mt-8 rounded-sm border border-dashed border-zinc-300 bg-white p-10 text-center shadow-sm">
          <h2 className="font-serif text-3xl font-light text-[#24180f]">Sem resultados</h2>
          <p className="mt-3 text-zinc-500">Ajusta a pesquisa ou os filtros.</p>
        </div>
      ) : (
        <section className="mt-8 overflow-hidden rounded-sm border border-zinc-200 bg-white shadow-sm">
          <div className="divide-y divide-zinc-100 md:hidden">
            {paginatedPlayers.map((player) => {
              const isExpanded = expandedPlayerId === player.id;

              return (
                <article key={player.id} className="p-4">
                  <button
                    type="button"
                    onClick={() => setExpandedPlayerId(isExpanded ? null : player.id)}
                    className="flex w-full items-start gap-3 text-left"
                  >
                    {player.photo_url ? (
                      <img
                        src={player.photo_url}
                        alt=""
                        className="h-14 w-14 shrink-0 rounded-md object-cover object-top ring-1 ring-zinc-200"
                      />
                    ) : (
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-xs font-black text-zinc-500 ring-1 ring-zinc-200">
                        {getPlayerInitials(player.name)}
                      </span>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-base font-black text-zinc-900">{player.name}</p>
                          <p className="mt-1 text-xs font-bold text-zinc-500">
                            {formatPlayerNumber(player.shirt_number)}
                            {player.position ? ` · ${player.position}` : ''}
                          </p>
                        </div>
                        <ChevronDown
                          size={18}
                          className={`mt-1 shrink-0 text-zinc-400 transition ${isExpanded ? 'rotate-180' : ''}`}
                        />
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-bold text-zinc-600">
                          {player.roster_group}
                        </span>
                        <span className={`rounded-full px-2.5 py-1 font-black ${player.is_active ? 'bg-green-50 text-green-700' : 'bg-zinc-100 text-zinc-600'}`}>
                          {player.is_active ? 'Ativo' : 'Oculto'}
                        </span>
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="mt-3 rounded-md bg-zinc-50 p-3 text-xs leading-5 text-zinc-600">
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                        <p><strong>Nacionalidade:</strong> {player.nationality || '—'}</p>
                        <p><strong>Ordem:</strong> {player.sort_order ?? 0}</p>
                        <p><strong>Altura:</strong> {player.height || '—'}</p>
                        <p><strong>Ano:</strong> {player.birth_year || '—'}</p>
                      </div>
                      <p className="mt-2"><strong>Notas:</strong> {player.notes || 'Sem notas internas.'}</p>
                    </div>
                  )}

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setExpandedPlayerId(isExpanded ? null : player.id)}
                      className="min-h-11 rounded-md border border-zinc-200 px-3 py-2.5 text-sm font-bold text-zinc-700 hover:border-red-700 hover:text-red-700"
                    >
                      {isExpanded ? 'Fechar detalhes' : 'Detalhes'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleEdit(player)}
                      className="min-h-11 rounded-md border border-zinc-200 px-3 py-2.5 text-sm font-bold text-zinc-700 hover:border-red-700 hover:text-red-700"
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleActive(player)}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-zinc-200 px-3 py-2.5 text-sm font-bold text-zinc-700 hover:border-red-700 hover:text-red-700"
                    >
                      {player.is_active ? <EyeOff size={16} /> : <Eye size={16} />}
                      {player.is_active ? 'Ocultar' : 'Mostrar'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(player)}
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
                  <th className="px-4 py-3">Elemento</th>
                  <th className="px-4 py-3">Grupo</th>
                  <th className="px-4 py-3">Posição</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Ordem</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {paginatedPlayers.map((player) => {
                  const isExpanded = expandedPlayerId === player.id;

                  return (
                    <tr key={player.id} className="align-top hover:bg-zinc-50/70">
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => setExpandedPlayerId(isExpanded ? null : player.id)}
                          className="flex max-w-[360px] items-start gap-3 text-left"
                        >
                          {player.photo_url ? (
                            <img
                              src={player.photo_url}
                              alt=""
                              className="h-12 w-12 shrink-0 rounded-md object-cover object-top ring-1 ring-zinc-200"
                            />
                          ) : (
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-xs font-black text-zinc-500 ring-1 ring-zinc-200">
                              {getPlayerInitials(player.name)}
                            </span>
                          )}

                          <span>
                            <span className="flex items-center gap-2 font-black text-zinc-900">
                              <ChevronDown
                                size={15}
                                className={`text-zinc-400 transition ${isExpanded ? 'rotate-180' : ''}`}
                              />
                              {player.name}
                            </span>
                            <span className="mt-1 block text-xs font-bold text-zinc-500">
                              {formatPlayerNumber(player.shirt_number)}
                              {player.nationality ? ` · ${player.nationality}` : ''}
                            </span>
                            {isExpanded && (
                              <span className="mt-2 block text-xs leading-5 text-zinc-500">
                                {player.height ? `Altura: ${player.height}. ` : ''}
                                {player.birth_year ? `Ano: ${player.birth_year}. ` : ''}
                                {player.notes || 'Sem notas internas.'}
                              </span>
                            )}
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-4 text-zinc-700">{player.roster_group}</td>
                      <td className="px-4 py-4 text-zinc-700">{player.position || '—'}</td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-black ${player.is_active ? 'bg-green-50 text-green-700' : 'bg-zinc-100 text-zinc-600'}`}>
                          {player.is_active ? 'Ativo' : 'Oculto'}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-bold text-zinc-600">{player.sort_order ?? 0}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setExpandedPlayerId(isExpanded ? null : player.id)}
                            className="rounded-md border border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-700 hover:border-red-700 hover:text-red-700"
                          >
                            Detalhes
                          </button>

                          <button
                            type="button"
                            onClick={() => handleEdit(player)}
                            className="rounded-md border border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-700 hover:border-red-700 hover:text-red-700"
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleActive(player)}
                            className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-700 hover:border-red-700 hover:text-red-700"
                          >
                            {player.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
                            {player.is_active ? 'Ocultar' : 'Mostrar'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(player)}
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
              <strong>{filteredPlayers.length}</strong>
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
