import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Eye,
  EyeOff,
  Plus,
  RefreshCcw,
  Save,
  Trash2,
  Trophy,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
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

export function AdminTeamsPage() {
  const [teams, setTeams] = useState<GdrbTeam[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

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
      <section className="relative overflow-hidden rounded-sm bg-[#24180f] p-8 text-white shadow-2xl shadow-zinc-950/10 md:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_right,rgba(220,38,38,0.28),transparent_34%)]" />

        <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.45em] text-red-400">
              Administração
            </p>

            <h1 className="mt-6 font-serif text-5xl font-light leading-tight md:text-7xl">
              Equipas.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-300">
              Gere os escalões e equipas que aparecem na página pública de
              equipas.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
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
              <label className="text-sm font-black text-zinc-800">
                Nome *
              </label>

              <input
                type="text"
                value={form.name}
                onChange={(event) => handleChange('name', event.target.value)}
                placeholder="Ex: Iniciados"
                className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
              />
            </div>

            <div>
              <label className="text-sm font-black text-zinc-800">
                Categoria
              </label>

              <select
                value={form.category}
                onChange={(event) =>
                  handleChange('category', event.target.value)
                }
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

            <div className="md:col-span-2">
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
              {isSaving ? 'A guardar...' : 'Guardar equipa'}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="mt-8 rounded-sm border border-zinc-200 bg-white p-8 text-zinc-600 shadow-sm">
          A carregar equipas...
        </div>
      ) : teams.length === 0 ? (
        <div className="mt-8 rounded-sm border border-dashed border-zinc-300 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-700">
            <Trophy size={28} />
          </div>

          <h2 className="mt-5 font-serif text-3xl font-light text-[#24180f]">
            Sem equipas
          </h2>

          <p className="mt-3 text-zinc-500">
            Ainda não existem equipas criadas.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {teams.map((team) => (
            <article
              key={team.id}
              className="overflow-hidden rounded-sm border border-zinc-200 bg-white shadow-sm"
            >
              <div className={team.is_active ? 'h-1.5 bg-red-700' : 'h-1.5 bg-zinc-300'} />

              <div className="p-7">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-red-700">
                    {team.football_type}
                  </span>

                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-700">
                    {team.category}
                  </span>

                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-700">
                    {team.is_active ? 'Visível' : 'Oculto'}
                  </span>
                </div>

                <h3 className="mt-6 font-serif text-4xl font-light text-[#24180f]">
                  {team.name}
                </h3>

                {team.description && (
                  <p className="mt-4 text-sm leading-7 text-zinc-600">
                    {team.description}
                  </p>
                )}

                <div className="mt-7 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(team)}
                    className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-bold text-zinc-700 hover:border-red-700 hover:text-red-700"
                  >
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleActive(team)}
                    className="inline-flex items-center gap-2 rounded-md border border-zinc-200 px-4 py-2 text-sm font-bold text-zinc-700 hover:border-red-700 hover:text-red-700"
                  >
                    {team.is_active ? <EyeOff size={16} /> : <Eye size={16} />}
                    {team.is_active ? 'Ocultar' : 'Mostrar'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(team)}
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