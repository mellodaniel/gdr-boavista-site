import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Camera, Eye, EyeOff, Plus, RefreshCcw, Save, Shirt, Trash2, Upload, X } from 'lucide-react';
import { Link } from 'react-router-dom';

import { supabase } from '../../lib/supabase';
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

export function AdminSeniorRosterPage() {
  const [players, setPlayers] = useState<GdrbRosterPlayer[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');

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

  const displayedPlayers = showInactive ? players : activePlayers;

  const groupedPlayers = useMemo(() => {
    return rosterGroups.map((group) => ({
      group,
      players: displayedPlayers.filter((player) => player.roster_group === group),
    }));
  }, [displayedPlayers]);

  useEffect(() => {
    return () => {
      if (photoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

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
          : 'Não foi possível fazer upload da foto.',
      );
      return;
    }

    const shirtNumber = form.shirt_number.trim()
      ? Number(form.shirt_number)
      : null;
    const birthYear = form.birth_year.trim() ? Number(form.birth_year) : null;

    const payload = {
      team_key: SENIOR_TEAM_KEY,
      name: form.name.trim(),
      shirt_number: Number.isFinite(shirtNumber) ? shirtNumber : null,
      position: form.position.trim() || null,
      roster_group: form.roster_group,
      photo_url: uploadedPhotoUrl,
      height: form.height.trim() || null,
      birth_year: Number.isFinite(birthYear) ? birthYear : null,
      nationality: form.nationality.trim() || null,
      notes: form.notes.trim() || null,
      is_active: form.is_active,
      sort_order: Number(form.sort_order) || 0,
      updated_at: new Date().toISOString(),
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
      editingId ? 'Jogador atualizado com sucesso.' : 'Jogador adicionado ao plantel.',
    );

    resetForm();
    await loadPlayers();
  }

  async function handleToggleActive(player: GdrbRosterPlayer) {
    const { error } = await supabase
      .from('gdrb_roster_players')
      .update({
        is_active: !player.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', player.id);

    if (error) {
      console.error('Erro ao alterar estado do jogador:', error);
      setErrorMessage('Não foi possível alterar o estado do jogador.');
      return;
    }

    await loadPlayers();
  }

  async function handleDelete(player: GdrbRosterPlayer) {
    const confirmDelete = window.confirm(
      `Tens a certeza que queres apagar definitivamente "${player.name}"? Esta ação não deve ser usada se quiseres apenas ocultar o jogador.`,
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
      <section className="relative overflow-hidden rounded-sm bg-[#24180f] p-8 text-white shadow-2xl shadow-zinc-950/10 md:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_right,rgba(220,38,38,0.28),transparent_34%)]" />

        <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.45em] text-red-400">
              Plantel Sénior
            </p>

            <h1 className="mt-6 font-serif text-5xl font-light leading-tight md:text-7xl">
              Roster da equipa.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-300">
              Gere os jogadores da equipa Sénior, fotos, números, posições e ordem
              de apresentação da página privada do plantel.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to={PRIVATE_ROSTER_PATH}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
            >
              <Eye size={17} />
              Ver página privada
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
              Novo jogador
            </button>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-sm border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
            Ativos
          </p>
          <p className="mt-2 text-3xl font-black text-zinc-950">
            {activePlayers.length}
          </p>
        </div>

        <div className="rounded-sm border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
            Ocultos
          </p>
          <p className="mt-2 text-3xl font-black text-zinc-950">
            {inactivePlayers.length}
          </p>
        </div>

        <div className="rounded-sm border border-zinc-200 bg-white p-5 shadow-sm md:col-span-2">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
            Link privado
          </p>
          <p className="mt-2 break-all text-sm font-bold text-zinc-800">
            {PRIVATE_ROSTER_PATH}
          </p>
          <p className="mt-2 text-xs leading-5 text-zinc-500">
            A página não aparece nos menus públicos, mas qualquer pessoa com este
            link consegue aceder.
          </p>
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
        <form
          onSubmit={handleSubmit}
          className="mt-8 rounded-sm border border-zinc-200 bg-white p-7 shadow-sm"
        >
          <div className="flex flex-col justify-between gap-4 border-b border-zinc-200 pb-5 md:flex-row md:items-start">
            <div>
              <h2 className="font-serif text-4xl font-light text-[#24180f]">
                {editingId ? 'Editar jogador' : 'Novo jogador'}
              </h2>

              <p className="mt-2 text-sm text-zinc-500">
                Preenche os dados públicos do atleta ou elemento técnico.
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

          <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
            <div>
              <label className="text-sm font-black text-zinc-800">
                Foto do jogador
              </label>

              <div className="mt-3 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Pré-visualização"
                    className="aspect-[4/5] w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-3 text-zinc-400">
                    <Camera size={42} />
                    <p className="text-sm font-bold">Sem foto</p>
                  </div>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-[#24180f] px-4 py-2 text-sm font-black uppercase tracking-wide text-white transition hover:bg-red-700">
                  <Upload size={16} />
                  Upload
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>

                {(photoPreview || form.photo_url) && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="inline-flex items-center gap-2 rounded-md border border-zinc-200 px-4 py-2 text-sm font-bold text-zinc-600 hover:border-red-700 hover:text-red-700"
                  >
                    <X size={16} />
                    Remover
                  </button>
                )}
              </div>

              <p className="mt-3 text-xs leading-5 text-zinc-500">
                Ideal: foto vertical com o atleta em meio-corpo ou corpo inteiro,
                fundo limpo e boa luz.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="text-sm font-black text-zinc-800">
                  Nome *
                </label>

                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => handleChange('name', event.target.value)}
                  placeholder="Ex: João Silva"
                  className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
                />
              </div>

              <div>
                <label className="text-sm font-black text-zinc-800">
                  Número
                </label>

                <input
                  type="number"
                  value={form.shirt_number}
                  onChange={(event) =>
                    handleChange('shirt_number', event.target.value)
                  }
                  placeholder="Ex: 10"
                  min={0}
                  max={999}
                  className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
                />
              </div>

              <div>
                <label className="text-sm font-black text-zinc-800">
                  Grupo
                </label>

                <select
                  value={form.roster_group}
                  onChange={(event) =>
                    handleChange('roster_group', event.target.value as GdrbRosterGroup)
                  }
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
                <label className="text-sm font-black text-zinc-800">
                  Posição
                </label>

                <input
                  type="text"
                  value={form.position}
                  onChange={(event) =>
                    handleChange('position', event.target.value)
                  }
                  placeholder="Ex: Avançado"
                  className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
                />
              </div>

              <div>
                <label className="text-sm font-black text-zinc-800">
                  Altura
                </label>

                <input
                  type="text"
                  value={form.height}
                  onChange={(event) => handleChange('height', event.target.value)}
                  placeholder="Ex: 1,82 m"
                  className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
                />
              </div>

              <div>
                <label className="text-sm font-black text-zinc-800">
                  Ano de nascimento
                </label>

                <input
                  type="number"
                  value={form.birth_year}
                  onChange={(event) =>
                    handleChange('birth_year', event.target.value)
                  }
                  placeholder="Ex: 1998"
                  min={1900}
                  max={2100}
                  className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
                />
              </div>

              <div>
                <label className="text-sm font-black text-zinc-800">
                  Nacionalidade/localidade
                </label>

                <input
                  type="text"
                  value={form.nationality}
                  onChange={(event) =>
                    handleChange('nationality', event.target.value)
                  }
                  placeholder="Ex: Portugal"
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

              <div className="md:col-span-2">
                <label className="text-sm font-black text-zinc-800">
                  Observações internas
                </label>

                <textarea
                  value={form.notes}
                  onChange={(event) => handleChange('notes', event.target.value)}
                  rows={3}
                  className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm leading-7 outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
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
                Mostrar na página privada
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
              {isSaving ? 'A guardar...' : 'Guardar jogador'}
            </button>
          </div>
        </form>
      )}

      <section className="mt-8 rounded-sm border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-zinc-200 p-6 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-black text-zinc-950">Plantel configurado</h2>
            <p className="mt-1 text-sm text-zinc-500">
              {activePlayers.length} jogador(es) visível(is)
              {inactivePlayers.length > 0 ? ` · ${inactivePlayers.length} oculto(s)` : ''}
            </p>
          </div>

          {inactivePlayers.length > 0 && (
            <button
              type="button"
              onClick={() => setShowInactive((current) => !current)}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-zinc-200 px-4 py-2 text-sm font-bold text-zinc-700 hover:border-red-700 hover:text-red-700"
            >
              {showInactive ? <EyeOff size={16} /> : <Eye size={16} />}
              {showInactive ? 'Ocultar inativos' : 'Mostrar inativos'}
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="p-8 text-sm font-semibold text-zinc-500">
            A carregar plantel...
          </div>
        ) : displayedPlayers.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-700">
              <Shirt size={28} />
            </div>

            <h3 className="mt-5 font-serif text-3xl font-light text-[#24180f]">
              Sem jogadores
            </h3>

            <p className="mt-3 text-zinc-500">
              Adiciona o primeiro jogador da equipa Sénior.
            </p>
          </div>
        ) : (
          <div className="grid gap-8 p-6">
            {groupedPlayers.map(({ group, players: groupPlayers }) => {
              if (groupPlayers.length === 0) {
                return null;
              }

              return (
                <div key={group}>
                  <div className="mb-4 flex items-center gap-3">
                    <h3 className="text-sm font-black uppercase tracking-[0.25em] text-red-700">
                      {group}
                    </h3>
                    <div className="h-px flex-1 bg-zinc-200" />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {groupPlayers.map((player) => (
                      <article
                        key={player.id}
                        className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 shadow-sm"
                      >
                        <div className="grid grid-cols-[116px_1fr]">
                          {player.photo_url ? (
                            <img
                              src={player.photo_url}
                              alt={player.name}
                              className="h-full min-h-[160px] w-full object-cover"
                            />
                          ) : (
                            <div className="flex min-h-[160px] items-center justify-center bg-[#24180f] text-3xl font-black text-white">
                              {getPlayerInitials(player.name)}
                            </div>
                          )}

                          <div className="p-5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-[#24180f] px-3 py-1 text-xs font-black text-white">
                                {formatPlayerNumber(player.shirt_number)}
                              </span>

                              <span
                                className={`rounded-full px-3 py-1 text-xs font-bold ${
                                  player.is_active
                                    ? 'bg-green-50 text-green-700'
                                    : 'bg-zinc-200 text-zinc-600'
                                }`}
                              >
                                {player.is_active ? 'Visível' : 'Oculto'}
                              </span>
                            </div>

                            <h4 className="mt-4 text-lg font-black leading-tight text-zinc-950">
                              {player.name}
                            </h4>

                            <p className="mt-1 text-sm font-semibold text-zinc-500">
                              {player.position || player.roster_group}
                            </p>

                            <div className="mt-5 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => handleEdit(player)}
                                className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-bold text-zinc-700 hover:border-red-700 hover:text-red-700"
                              >
                                Editar
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggleActive(player)}
                                className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-bold text-zinc-700 hover:border-red-700 hover:text-red-700"
                              >
                                {player.is_active ? 'Ocultar' : 'Mostrar'}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDelete(player)}
                                className="rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
