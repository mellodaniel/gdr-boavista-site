import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  CalendarDays,
  ExternalLink,
  Eye,
  EyeOff,
  MapPin,
  Plus,
  RefreshCcw,
  Save,
  Trash2,
  Trophy,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { GdrbTournament } from '../../types/database';

const initialForm = {
  team_name: '',
  football_type: 'Futebol 11',
  name: '',
  start_date: '',
  end_date: '',
  location: '',
  website_url: '',
  notes: '',
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

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatTournamentDate(tournament: GdrbTournament) {
  if (!tournament.end_date || tournament.end_date === tournament.start_date) {
    return formatDate(tournament.start_date);
  }

  return `${formatDate(tournament.start_date)} a ${formatDate(
    tournament.end_date,
  )}`;
}

export function AdminTournamentsPage() {
  const [tournaments, setTournaments] = useState<GdrbTournament[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

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

    setTournaments(data ?? []);
    setIsLoading(false);
  }

  useEffect(() => {
    loadTournaments();
  }, []);

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

  function handleEdit(tournament: GdrbTournament) {
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
      setErrorMessage(
        'Preenche pelo menos escalão, nome do torneio e data inicial.',
      );
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
      is_visible: form.is_visible,
      sort_order: Number(form.sort_order) || 0,
      updated_at: new Date().toISOString(),
    };

    const result = editingId
      ? await supabase
          .from('gdrb_tournaments')
          .update(payload)
          .eq('id', editingId)
      : await supabase.from('gdrb_tournaments').insert(payload);

    setIsSaving(false);

    if (result.error) {
      console.error('Erro ao guardar torneio:', result.error);
      setErrorMessage('Não foi possível guardar o torneio.');
      return;
    }

    setSuccessMessage(
      editingId
        ? 'Torneio atualizado com sucesso.'
        : 'Torneio criado com sucesso.',
    );

    resetForm();
    await loadTournaments();
  }

  async function handleToggleVisibility(tournament: GdrbTournament) {
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

  async function handleDelete(tournament: GdrbTournament) {
    const confirmDelete = window.confirm(
      `Tens a certeza que queres apagar o torneio "${tournament.name}"?`,
    );

    if (!confirmDelete) {
      return;
    }

    const { error } = await supabase
      .from('gdrb_tournaments')
      .delete()
      .eq('id', tournament.id);

    if (error) {
      console.error('Erro ao apagar torneio:', error);
      setErrorMessage('Não foi possível apagar o torneio.');
      return;
    }

    await loadTournaments();
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
              Torneios.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-300">
              Gere torneios de 1, 2 ou 3 dias, com localização, site oficial e
              notas internas para os escalões do GDR Boavista.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
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
                {editingId ? 'Editar torneio' : 'Novo torneio'}
              </h2>

              <p className="mt-2 text-sm text-zinc-500">
                Preenche os dados principais do torneio.
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
            <div>
              <label className="text-sm font-black text-zinc-800">
                Escalão *
              </label>

              <select
                value={form.team_name}
                onChange={(event) =>
                  handleChange('team_name', event.target.value)
                }
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
              <label className="text-sm font-black text-zinc-800">
                Tipo de futebol
              </label>

              <select
                value={form.football_type}
                onChange={(event) =>
                  handleChange('football_type', event.target.value)
                }
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
              <label className="text-sm font-black text-zinc-800">
                Nome do torneio *
              </label>

              <input
                type="text"
                value={form.name}
                onChange={(event) => handleChange('name', event.target.value)}
                placeholder="Ex: Torneio Cidade de Leiria"
                className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
              />
            </div>

            <div>
              <label className="text-sm font-black text-zinc-800">
                Data inicial *
              </label>

              <input
                type="date"
                value={form.start_date}
                onChange={(event) =>
                  handleChange('start_date', event.target.value)
                }
                className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
              />
            </div>

            <div>
              <label className="text-sm font-black text-zinc-800">
                Data final
              </label>

              <input
                type="date"
                value={form.end_date}
                onChange={(event) =>
                  handleChange('end_date', event.target.value)
                }
                className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-black text-zinc-800">
                Localização
              </label>

              <input
                type="text"
                value={form.location}
                onChange={(event) =>
                  handleChange('location', event.target.value)
                }
                placeholder="Ex: Campo Municipal..."
                className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-black text-zinc-800">
                Site / link do torneio
              </label>

              <input
                type="url"
                value={form.website_url}
                onChange={(event) =>
                  handleChange('website_url', event.target.value)
                }
                placeholder="https://..."
                className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
              />
            </div>

            <div>
              <label className="text-sm font-black text-zinc-800">Ordem</label>

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
                checked={form.is_visible}
                onChange={(event) =>
                  handleChange('is_visible', event.target.checked)
                }
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
              {isSaving ? 'A guardar...' : 'Guardar torneio'}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="mt-8 rounded-sm border border-zinc-200 bg-white p-8 text-zinc-600 shadow-sm">
          A carregar torneios...
        </div>
      ) : tournaments.length === 0 ? (
        <div className="mt-8 rounded-sm border border-dashed border-zinc-300 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-700">
            <Trophy size={28} />
          </div>

          <h2 className="mt-5 font-serif text-3xl font-light text-[#24180f]">
            Sem torneios
          </h2>

          <p className="mt-3 text-zinc-500">
            Ainda não existem torneios criados.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-5">
          {tournaments.map((tournament) => (
            <article
              key={tournament.id}
              className="overflow-hidden rounded-sm border border-zinc-200 bg-white shadow-sm"
            >
              <div
                className={
                  tournament.is_visible ? 'h-1.5 bg-red-700' : 'h-1.5 bg-zinc-300'
                }
              />

              <div className="grid gap-6 p-7 lg:grid-cols-[1fr_auto] lg:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-red-700">
                      {tournament.team_name}
                    </span>

                    <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-700">
                      {tournament.football_type}
                    </span>

                    <span className="rounded-full bg-[#24180f] px-3 py-1 text-xs font-bold uppercase text-white">
                      Torneio
                    </span>

                    {!tournament.is_visible && (
                      <span className="rounded-full bg-zinc-200 px-3 py-1 text-xs font-bold uppercase text-zinc-700">
                        Oculto
                      </span>
                    )}
                  </div>

                  <h3 className="mt-6 font-serif text-4xl font-light text-[#24180f]">
                    {tournament.name}
                  </h3>

                  <div className="mt-5 flex flex-wrap gap-3 text-sm text-zinc-600">
                    <span className="inline-flex items-center gap-2 rounded-md bg-[#f6f2ec] px-4 py-3 font-semibold">
                      <CalendarDays size={16} className="text-red-700" />
                      {formatTournamentDate(tournament)}
                    </span>

                    {tournament.location && (
                      <span className="inline-flex items-center gap-2 rounded-md bg-[#f6f2ec] px-4 py-3 font-semibold">
                        <MapPin size={16} className="text-red-700" />
                        {tournament.location}
                      </span>
                    )}
                  </div>

                  {tournament.website_url && (
                    <a
                      href={tournament.website_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-red-700 hover:text-red-900"
                    >
                      Abrir site do torneio
                      <ExternalLink size={15} />
                    </a>
                  )}

                  {tournament.notes && (
                    <p className="mt-5 rounded-sm bg-[#f6f2ec] px-4 py-3 text-sm leading-7 text-zinc-600">
                      {tournament.notes}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <button
                    type="button"
                    onClick={() => handleEdit(tournament)}
                    className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-bold text-zinc-700 hover:border-red-700 hover:text-red-700"
                  >
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleVisibility(tournament)}
                    className="inline-flex items-center gap-2 rounded-md border border-zinc-200 px-4 py-2 text-sm font-bold text-zinc-700 hover:border-red-700 hover:text-red-700"
                  >
                    {tournament.is_visible ? (
                      <EyeOff size={16} />
                    ) : (
                      <Eye size={16} />
                    )}
                    {tournament.is_visible ? 'Ocultar' : 'Mostrar'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(tournament)}
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