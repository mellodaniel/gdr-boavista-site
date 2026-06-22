import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type {
  TournamentManagerGroup,
  TournamentManagerGroupTeam,
  TournamentManagerTeam,
  TournamentManagerTournament,
} from '../../types/tournamentManager';

export default function TournamentManagerGroupsPage() {
  const { id } = useParams();

  const [tournament, setTournament] = useState<TournamentManagerTournament | null>(null);
  const [teams, setTeams] = useState<TournamentManagerTeam[]>([]);
  const [groups, setGroups] = useState<TournamentManagerGroup[]>([]);
  const [assignments, setAssignments] = useState<TournamentManagerGroupTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingGroup, setSavingGroup] = useState(false);
  const [savingAssignmentTeamId, setSavingAssignmentTeamId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [groupName, setGroupName] = useState('');

  const orderedTeams = useMemo(() => {
    return [...teams].sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return a.name.localeCompare(b.name, 'pt');
    });
  }, [teams]);

  const orderedGroups = useMemo(() => {
    return [...groups].sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return a.name.localeCompare(b.name, 'pt');
    });
  }, [groups]);

  const groupByTeamId = useMemo(() => {
    return assignments.reduce<Record<string, string>>((acc, assignment) => {
      acc[assignment.team_id] = assignment.group_id;
      return acc;
    }, {});
  }, [assignments]);

  const teamsByGroupId = useMemo(() => {
    return orderedGroups.reduce<Record<string, TournamentManagerTeam[]>>((acc, group) => {
      const groupTeams = orderedTeams.filter((team) => groupByTeamId[team.id] === group.id);
      acc[group.id] = groupTeams;
      return acc;
    }, {});
  }, [orderedGroups, orderedTeams, groupByTeamId]);

  const unassignedTeams = useMemo(() => {
    return orderedTeams.filter((team) => !groupByTeamId[team.id]);
  }, [orderedTeams, groupByTeamId]);

  async function loadData() {
    if (!id) return;

    setLoading(true);
    setErrorMessage('');

    const [tournamentResult, teamsResult, groupsResult, assignmentsResult] = await Promise.all([
      supabase.from('tournaments').select('*').eq('id', id).single(),
      supabase
        .from('tournament_teams')
        .select('*')
        .eq('tournament_id', id)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true }),
      supabase
        .from('tournament_groups')
        .select('*')
        .eq('tournament_id', id)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true }),
      supabase
        .from('tournament_group_teams')
        .select('*')
        .eq('tournament_id', id)
        .order('sort_order', { ascending: true }),
    ]);

    if (tournamentResult.error) {
      setErrorMessage('Não foi possível carregar o torneio.');
      setLoading(false);
      return;
    }

    if (teamsResult.error || groupsResult.error || assignmentsResult.error) {
      setErrorMessage('Não foi possível carregar equipas/grupos. Confirma se o SQL da Entrega 3 foi executado.');
      setLoading(false);
      return;
    }

    setTournament(tournamentResult.data);
    setTeams(teamsResult.data || []);
    setGroups(groupsResult.data || []);
    setAssignments(assignmentsResult.data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleCreateGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!id) return;

    if (!groupName.trim()) {
      setErrorMessage('O nome do grupo é obrigatório.');
      return;
    }

    setSavingGroup(true);
    setErrorMessage('');
    setSuccessMessage('');

    const { error } = await supabase.from('tournament_groups').insert({
      tournament_id: id,
      name: groupName.trim(),
      sort_order: groups.length + 1,
    });

    if (error) {
      setErrorMessage('Não foi possível criar o grupo. Confirma as permissões RLS e as colunas da tabela.');
      setSavingGroup(false);
      return;
    }

    setGroupName('');
    setSuccessMessage('Grupo criado com sucesso.');
    await loadData();
    setSavingGroup(false);
  }

  async function deleteGroup(group: TournamentManagerGroup) {
    const confirmed = window.confirm(`Queres remover o grupo "${group.name}"? As equipas deste grupo ficam sem grupo.`);

    if (!confirmed) return;

    setErrorMessage('');
    setSuccessMessage('');

    const { error } = await supabase
      .from('tournament_groups')
      .delete()
      .eq('id', group.id);

    if (error) {
      setErrorMessage('Não foi possível remover o grupo.');
      return;
    }

    setSuccessMessage('Grupo removido com sucesso.');
    await loadData();
  }

  async function updateTeamGroup(teamId: string, nextGroupId: string) {
    if (!id) return;

    setSavingAssignmentTeamId(teamId);
    setErrorMessage('');
    setSuccessMessage('');

    const existingAssignment = assignments.find((assignment) => assignment.team_id === teamId);

    if (!nextGroupId) {
      if (existingAssignment) {
        const { error } = await supabase
          .from('tournament_group_teams')
          .delete()
          .eq('id', existingAssignment.id);

        if (error) {
          setErrorMessage('Não foi possível remover a equipa do grupo.');
          setSavingAssignmentTeamId(null);
          return;
        }
      }

      setSuccessMessage('Equipa removida do grupo.');
      await loadData();
      setSavingAssignmentTeamId(null);
      return;
    }

    if (existingAssignment) {
      const { error } = await supabase
        .from('tournament_group_teams')
        .update({
          group_id: nextGroupId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingAssignment.id);

      if (error) {
        setErrorMessage('Não foi possível alterar o grupo da equipa.');
        setSavingAssignmentTeamId(null);
        return;
      }
    } else {
      const { error } = await supabase.from('tournament_group_teams').insert({
        tournament_id: id,
        group_id: nextGroupId,
        team_id: teamId,
        sort_order: assignments.length + 1,
      });

      if (error) {
        setErrorMessage('Não foi possível adicionar a equipa ao grupo.');
        setSavingAssignmentTeamId(null);
        return;
      }
    }

    setSuccessMessage('Grupo da equipa atualizado com sucesso.');
    await loadData();
    setSavingAssignmentTeamId(null);
  }

  if (loading) {
    return <div className="text-slate-600">A carregar grupos...</div>;
  }

  if (!tournament) {
    return <div className="text-slate-600">Torneio não encontrado.</div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <Link
          to={`/admin/gestor-torneios/${tournament.id}`}
          className="text-sm font-semibold text-green-700 hover:text-green-800"
        >
          ← Voltar ao torneio
        </Link>

        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Grupos</h1>
            <p className="mt-2 text-slate-600">
              Cria grupos e distribui as equipas participantes. Esta estrutura será usada depois para gerar jogos.
            </p>
          </div>

          <Link
            to={`/admin/gestor-torneios/${tournament.id}/equipas`}
            className="inline-flex rounded-xl border border-green-700 px-5 py-3 text-sm font-semibold text-green-700 hover:bg-green-50"
          >
            Gerir equipas
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">{tournament.name}</h2>
        <p className="mt-1 text-sm text-slate-600">
          {orderedTeams.length} equipa(s) · {orderedGroups.length} grupo(s) · {unassignedTeams.length} sem grupo
        </p>
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

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-6">
          <form onSubmit={handleCreateGroup} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Criar grupo</h2>
            <p className="mt-2 text-sm text-slate-600">
              Exemplo: Grupo A, Grupo B, Série 1.
            </p>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-semibold text-slate-700">Nome do grupo *</label>
              <input
                type="text"
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
                placeholder="Ex: Grupo A"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
              />
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={savingGroup}
                className="rounded-xl bg-green-700 px-5 py-3 text-sm font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingGroup ? 'A criar...' : 'Criar grupo'}
              </button>
            </div>
          </form>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Grupos criados</h2>

            {orderedGroups.length === 0 ? (
              <p className="mt-4 text-sm text-slate-600">Ainda não existem grupos criados.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {orderedGroups.map((group) => (
                  <div key={group.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
                    <div>
                      <p className="font-semibold text-slate-900">{group.name}</p>
                      <p className="text-xs text-slate-500">
                        {(teamsByGroupId[group.id] || []).length} equipa(s)
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => deleteGroup(group)}
                      className="rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-xl font-bold text-slate-900">Distribuição das equipas</h2>
            <p className="mt-1 text-sm text-slate-600">
              Escolhe o grupo de cada equipa.
            </p>
          </div>

          {orderedTeams.length === 0 ? (
            <div className="p-6 text-sm text-slate-600">
              Ainda não existem equipas. Primeiro adiciona equipas ao torneio.
            </div>
          ) : orderedGroups.length === 0 ? (
            <div className="p-6 text-sm text-slate-600">
              Ainda não existem grupos. Cria pelo menos um grupo para distribuir as equipas.
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {orderedTeams.map((team) => (
                <div key={team.id} className="grid gap-4 p-6 md:grid-cols-[1fr_260px] md:items-center">
                  <div>
                    <h3 className="font-bold text-slate-900">{team.name}</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {team.club || 'Clube não indicado'} {team.location ? `· ${team.location}` : ''}
                    </p>
                  </div>

                  <select
                    value={groupByTeamId[team.id] || ''}
                    disabled={savingAssignmentTeamId === team.id}
                    onChange={(event) => updateTeamGroup(team.id, event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="">Sem grupo</option>
                    {orderedGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">Resumo por grupo</h2>

        {orderedGroups.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">Ainda não há grupos para apresentar.</p>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {orderedGroups.map((group) => (
              <div key={group.id} className="rounded-xl border border-slate-200 p-4">
                <h3 className="font-bold text-slate-900">{group.name}</h3>

                {(teamsByGroupId[group.id] || []).length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">Sem equipas.</p>
                ) : (
                  <ul className="mt-3 space-y-2 text-sm text-slate-700">
                    {(teamsByGroupId[group.id] || []).map((team) => (
                      <li key={team.id} className="rounded-lg bg-slate-50 px-3 py-2">
                        {team.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
