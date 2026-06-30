import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type {
  TournamentManagerPlayer,
  TournamentManagerTeam,
  TournamentManagerTournament,
} from '../../types/tournamentManager';

export default function TournamentManagerPlayersPage() {
  const { id, teamId } = useParams();

  const [tournament, setTournament] = useState<TournamentManagerTournament | null>(null);
  const [team, setTeam] = useState<TournamentManagerTeam | null>(null);
  const [players, setPlayers] = useState<TournamentManagerPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [name, setName] = useState('');
  const [shirtNumber, setShirtNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [showRemovedPlayers, setShowRemovedPlayers] = useState(false);

  const orderedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      const aNumber = a.shirt_number ?? 9999;
      const bNumber = b.shirt_number ?? 9999;
      if (aNumber !== bNumber) return aNumber - bNumber;
      return a.name.localeCompare(b.name, 'pt');
    });
  }, [players]);

  async function loadData() {
    if (!id || !teamId) return;

    setLoading(true);
    setErrorMessage('');

    const [tournamentResult, teamResult, playersResult] = await Promise.all([
      supabase.from('tournaments').select('*').eq('id', id).single(),
      supabase.from('tournament_teams').select('*').eq('id', teamId).eq('tournament_id', id).single(),
      supabase
        .from('tournament_players')
        .select('*')
        .eq('tournament_id', id)
        .eq('team_id', teamId)
        .order('shirt_number', { ascending: true, nullsFirst: false })
        .order('name', { ascending: true }),
    ]);

    if (tournamentResult.error || teamResult.error) {
      setErrorMessage('Não foi possível carregar o torneio ou a equipa.');
      setLoading(false);
      return;
    }

    if (playersResult.error) {
      setErrorMessage('Não foi possível carregar os jogadores. Confirma se o SQL dos jogadores foi executado no Supabase.');
      setLoading(false);
      return;
    }

    setTournament(tournamentResult.data);
    setTeam(teamResult.data);
    setPlayers(playersResult.data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, teamId]);

  function resetForm() {
    setEditingPlayerId(null);
    setName('');
    setShirtNumber('');
    setNotes('');
  }

  function startEditingPlayer(player: TournamentManagerPlayer) {
    setEditingPlayerId(player.id);
    setName(player.name || '');
    setShirtNumber(player.shirt_number === null || player.shirt_number === undefined ? '' : String(player.shirt_number));
    setNotes(player.notes || '');
    setSuccessMessage('');
    setErrorMessage('');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!id || !teamId) return;

    if (!name.trim()) {
      setErrorMessage('O nome do jogador é obrigatório.');
      return;
    }

    const parsedShirtNumber = shirtNumber.trim() ? Number(shirtNumber) : null;

    if (parsedShirtNumber !== null && (!Number.isInteger(parsedShirtNumber) || parsedShirtNumber < 0 || parsedShirtNumber > 999)) {
      setErrorMessage('O número da camisola deve ser um número válido.');
      return;
    }

    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    const payload = {
      name: name.trim(),
      shirt_number: parsedShirtNumber,
      notes: notes.trim() || null,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    const { error } = editingPlayerId
      ? await supabase.from('tournament_players').update(payload).eq('id', editingPlayerId)
      : await supabase.from('tournament_players').insert({
          tournament_id: id,
          team_id: teamId,
          ...payload,
        });

    if (error) {
      setErrorMessage('Não foi possível guardar o jogador. Confirma as permissões RLS e a tabela tournament_players.');
      setSaving(false);
      return;
    }

    resetForm();
    setSuccessMessage(editingPlayerId ? 'Jogador atualizado com sucesso.' : 'Jogador adicionado com sucesso.');
    await loadData();
    setSaving(false);
  }

  async function deactivatePlayer(player: TournamentManagerPlayer) {
    const confirmed = window.confirm(`Queres remover o jogador "${player.name}" da equipa?`);
    if (!confirmed) return;

    setErrorMessage('');
    setSuccessMessage('');

    const { error } = await supabase
      .from('tournament_players')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', player.id);

    if (error) {
      setErrorMessage('Não foi possível remover o jogador.');
      return;
    }

    setSuccessMessage('Jogador removido da lista ativa.');
    await loadData();
  }

  async function reactivatePlayer(player: TournamentManagerPlayer) {
    setErrorMessage('');
    setSuccessMessage('');

    const { error } = await supabase
      .from('tournament_players')
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq('id', player.id);

    if (error) {
      setErrorMessage('Não foi possível reativar o jogador.');
      return;
    }

    setSuccessMessage('Jogador reativado.');
    await loadData();
  }

  if (loading) {
    return <div className="text-slate-600">A carregar jogadores...</div>;
  }

  if (!tournament || !team) {
    return <div className="text-slate-600">Equipa não encontrada.</div>;
  }

  const activePlayers = orderedPlayers.filter((player) => player.is_active);
  const inactivePlayers = orderedPlayers.filter((player) => !player.is_active);
  const visiblePlayers = showRemovedPlayers ? orderedPlayers : activePlayers;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <Link
          to={`/admin/gestor-torneios/${tournament.id}/equipas`}
          className="text-sm font-semibold text-green-700 hover:text-green-800"
        >
          ← Voltar às equipas
        </Link>

        <div className="mt-4 flex flex-col gap-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-red-700">Jogadores</p>
          <h1 className="text-3xl font-bold text-slate-900">{team.name}</h1>
          <p className="text-slate-600">
            Adiciona os jogadores desta equipa. Depois poderás selecionar os marcadores na edição dos jogos.
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">
            {editingPlayerId ? 'Editar jogador' : 'Adicionar jogador'}
          </h2>

          <div className="mt-6 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Nome do jogador *</label>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ex: João Silva"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Número da camisola</label>
              <input
                type="number"
                min="0"
                max="999"
                value={shirtNumber}
                onChange={(event) => setShirtNumber(event.target.value)}
                placeholder="Ex: 10"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Observações</label>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={4}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
                placeholder="Notas internas, se necessário."
              />
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            {editingPlayerId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar edição
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-green-700 px-5 py-3 text-sm font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'A guardar...' : editingPlayerId ? 'Guardar alterações' : 'Adicionar jogador'}
            </button>
          </div>
        </form>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Plantel configurado</h2>
              <p className="mt-1 text-sm text-slate-600">
                {activePlayers.length} jogador(es) ativo(s) · {inactivePlayers.length} removido(s)
              </p>
            </div>

            {inactivePlayers.length > 0 && (
              <button
                type="button"
                onClick={() => setShowRemovedPlayers((current) => !current)}
                className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:w-auto"
              >
                {showRemovedPlayers ? 'Ocultar removidos' : 'Mostrar removidos'}
              </button>
            )}
          </div>

          {orderedPlayers.length === 0 ? (
            <div className="p-6 text-sm text-slate-600">
              Ainda não existem jogadores configurados para esta equipa.
            </div>
          ) : visiblePlayers.length === 0 ? (
            <div className="p-6 text-sm text-slate-600">
              Não existem jogadores ativos neste plantel. Usa “Mostrar removidos” para consultar ou reativar jogadores removidos.
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {visiblePlayers.map((player) => (
                <div key={player.id} className={`p-5 ${player.is_active ? 'bg-white' : 'bg-slate-50 opacity-75'}`}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {player.shirt_number !== null && player.shirt_number !== undefined && (
                          <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-white">
                            #{player.shirt_number}
                          </span>
                        )}
                        <h3 className="text-lg font-bold text-slate-900">{player.name}</h3>
                        {!player.is_active && (
                          <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-600">
                            Removido
                          </span>
                        )}
                      </div>
                      {player.notes && <p className="mt-2 text-sm text-slate-600">{player.notes}</p>}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => startEditingPlayer(player)}
                        className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Editar
                      </button>
                      {player.is_active ? (
                        <button
                          type="button"
                          onClick={() => deactivatePlayer(player)}
                          className="rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                        >
                          Remover
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => reactivatePlayer(player)}
                          className="rounded-xl border border-green-300 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-50"
                        >
                          Reativar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
