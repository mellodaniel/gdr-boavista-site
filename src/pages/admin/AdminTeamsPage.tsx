import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Plus, RefreshCw, Trophy } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { GdrbTeam } from '../../types/database';

const footballTypes = ['Futebol 5', 'Futebol 7', 'Futebol 9', 'Futebol 11'];

const categoryOptions = [
  'Escola de Futebol',
  'Formação',
  'Seniores',
];

export function AdminTeamsPage() {
  const [teams, setTeams] = useState<GdrbTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('Formação');
  const [footballType, setFootballType] = useState('Futebol 11');
  const [description, setDescription] = useState('');
  const [sortOrder, setSortOrder] = useState('10');
  const [isActive, setIsActive] = useState(true);

  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  async function loadTeams() {
    setLoading(true);
    setErrorMessage('');

    const { data, error } = await supabase
      .from('gdrb_teams')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erro ao carregar equipas:', error);
      setErrorMessage('Não foi possível carregar as equipas.');
    }

    setTeams(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadTeams();
  }, []);

  async function handleCreateTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSuccessMessage('');
    setErrorMessage('');

    if (!name.trim()) {
      setErrorMessage('Indica o nome da equipa/escalão.');
      return;
    }

    setSaving(true);

    const { error } = await supabase.from('gdrb_teams').insert({
      name: name.trim(),
      category,
      football_type: footballType,
      description: description.trim() || null,
      sort_order: Number(sortOrder) || 0,
      is_active: isActive,
    });

    setSaving(false);

    if (error) {
      console.error('Erro ao criar equipa:', error);
      setErrorMessage('Não foi possível criar a equipa.');
      return;
    }

    setName('');
    setCategory('Formação');
    setFootballType('Futebol 11');
    setDescription('');
    setSortOrder('10');
    setIsActive(true);
    setSuccessMessage('Equipa criada com sucesso.');
    loadTeams();
  }

  async function updateTeam(
    id: string,
    changes: Partial<Pick<GdrbTeam, 'category' | 'football_type' | 'description' | 'sort_order' | 'is_active'>>,
  ) {
    setUpdatingId(id);
    setErrorMessage('');
    setSuccessMessage('');

    const { error } = await supabase
      .from('gdrb_teams')
      .update(changes)
      .eq('id', id);

    setUpdatingId(null);

    if (error) {
      console.error('Erro ao atualizar equipa:', error);
      setErrorMessage('Não foi possível atualizar a equipa.');
      return;
    }

    setTeams((currentTeams) =>
      currentTeams.map((team) =>
        team.id === id ? { ...team, ...changes } : team,
      ),
    );
  }

  function getStatusStyle(isTeamActive: boolean) {
    return isTeamActive
      ? 'bg-green-100 text-green-800'
      : 'bg-zinc-200 text-zinc-700';
  }

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-red-600">
            Equipas
          </p>

          <h2 className="mt-2 text-3xl font-black text-zinc-950">
            Gestão de equipas e escalões
          </h2>

          <p className="mt-3 max-w-3xl text-zinc-600">
            Gere os escalões do GDR Boavista por Futebol 5, Futebol 7,
            Futebol 9 e Futebol 11. O site público reflete automaticamente
            as equipas ativas.
          </p>
        </div>

        <button
          type="button"
          onClick={loadTeams}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-zinc-950 px-5 py-3 text-sm font-bold text-white hover:bg-red-600"
        >
          <RefreshCw size={16} />
          Atualizar
        </button>
      </div>

      {successMessage && (
        <div className="mt-6 rounded-xl bg-green-100 px-4 py-3 text-sm font-semibold text-green-800">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="mt-6 rounded-xl bg-red-100 px-4 py-3 text-sm font-semibold text-red-800">
          {errorMessage}
        </div>
      )}

      <div className="mt-8 grid gap-8 xl:grid-cols-[0.8fr_1.2fr]">
        <form
          onSubmit={handleCreateTeam}
          className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-red-100 p-3 text-red-600">
              <Plus size={22} />
            </div>

            <div>
              <h3 className="text-2xl font-black">Nova equipa/escalão</h3>
              <p className="text-sm text-zinc-500">
                Criar nova equipa para aparecer no site público.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            <input
              className="rounded-xl border border-zinc-300 px-4 py-3"
              placeholder="Nome da equipa ou escalão *"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />

            <select
              className="rounded-xl border border-zinc-300 bg-white px-4 py-3"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              {categoryOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            <select
              className="rounded-xl border border-zinc-300 bg-white px-4 py-3"
              value={footballType}
              onChange={(event) => setFootballType(event.target.value)}
            >
              {footballTypes.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            <textarea
              className="min-h-28 rounded-xl border border-zinc-300 px-4 py-3"
              placeholder="Descrição"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />

            <input
              className="rounded-xl border border-zinc-300 px-4 py-3"
              placeholder="Ordem de exibição"
              type="number"
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
            />

            <label className="flex items-center gap-3 rounded-xl bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-700">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(event) => setIsActive(event.target.checked)}
              />
              Equipa ativa no site público
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-red-600 px-6 py-3 font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'A guardar...' : 'Criar equipa'}
          </button>
        </form>

        <div>
          <h3 className="text-2xl font-black text-zinc-950">
            Equipas existentes
          </h3>

          {loading ? (
            <div className="mt-5 rounded-3xl border border-zinc-200 bg-white p-8 text-zinc-600">
              A carregar equipas...
            </div>
          ) : teams.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-zinc-200 bg-white p-8 text-zinc-600">
              Ainda não existem equipas.
            </div>
          ) : (
            <div className="mt-5 grid gap-4">
              {teams.map((team) => (
                <article
                  key={team.id}
                  className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                    <div className="flex gap-4">
                      <div className="h-fit rounded-full bg-red-100 p-3 text-red-600">
                        <Trophy size={22} />
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold uppercase text-zinc-700">
                            {team.football_type}
                          </span>

                          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold uppercase text-zinc-700">
                            {team.category}
                          </span>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${getStatusStyle(
                              team.is_active,
                            )}`}
                          >
                            {team.is_active ? 'Ativa' : 'Inativa'}
                          </span>
                        </div>

                        <h4 className="mt-3 text-lg font-black text-zinc-950">
                          {team.name}
                        </h4>

                        {team.description && (
                          <p className="mt-2 text-sm text-zinc-600">
                            {team.description}
                          </p>
                        )}

                        <p className="mt-2 text-xs text-zinc-500">
                          Ordem: {team.sort_order}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 md:min-w-64">
                      <select
                        value={team.football_type}
                        disabled={updatingId === team.id}
                        onChange={(event) =>
                          updateTeam(team.id, {
                            football_type: event.target.value,
                          })
                        }
                        className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {footballTypes.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>

                      <select
                        value={team.category}
                        disabled={updatingId === team.id}
                        onChange={(event) =>
                          updateTeam(team.id, {
                            category: event.target.value,
                          })
                        }
                        className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {categoryOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>

                      <input
                        value={team.sort_order}
                        disabled={updatingId === team.id}
                        type="number"
                        onChange={(event) =>
                          updateTeam(team.id, {
                            sort_order: Number(event.target.value) || 0,
                          })
                        }
                        className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
                      />

                      <button
                        type="button"
                        disabled={updatingId === team.id}
                        onClick={() =>
                          updateTeam(team.id, {
                            is_active: !team.is_active,
                          })
                        }
                        className={`rounded-full px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60 ${
                          team.is_active
                            ? 'bg-zinc-950 text-white hover:bg-red-600'
                            : 'bg-red-600 text-white hover:bg-red-700'
                        }`}
                      >
                        {team.is_active ? 'Desativar' : 'Ativar'}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}