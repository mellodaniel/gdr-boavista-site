import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { RefreshCw, Trophy } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { calculateTournamentStandings } from '../../lib/tournamentStandings';
import type {
  TournamentManagerGroup,
  TournamentManagerGroupTeam,
  TournamentManagerMatch,
  TournamentManagerRule,
  TournamentManagerTeam,
  TournamentManagerTournament,
} from '../../types/tournamentManager';

function formatLastUpdated(value: Date | null) {
  if (!value) return 'Ainda não atualizado';

  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value);
}

function getProgressLabel(completed: number, total: number) {
  if (total === 0) return 'Sem jogos de grupo';
  return `${completed}/${total} jogos concluídos`;
}

export default function TournamentManagerStandingsPage() {
  const { id } = useParams();

  const [tournament, setTournament] = useState<TournamentManagerTournament | null>(null);
  const [groups, setGroups] = useState<TournamentManagerGroup[]>([]);
  const [teams, setTeams] = useState<TournamentManagerTeam[]>([]);
  const [groupTeams, setGroupTeams] = useState<TournamentManagerGroupTeam[]>([]);
  const [matches, setMatches] = useState<TournamentManagerMatch[]>([]);
  const [rule, setRule] = useState<TournamentManagerRule | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadData = useCallback(async () => {
    if (!id) return;

    setErrorMessage('');

    const [
      tournamentResult,
      groupsResult,
      teamsResult,
      groupTeamsResult,
      matchesResult,
      rulesResult,
    ] = await Promise.all([
      supabase.from('tournaments').select('*').eq('id', id).single(),
      supabase.from('tournament_groups').select('*').eq('tournament_id', id).order('sort_order', { ascending: true }),
      supabase.from('tournament_teams').select('*').eq('tournament_id', id).order('sort_order', { ascending: true }),
      supabase.from('tournament_group_teams').select('*').eq('tournament_id', id).order('sort_order', { ascending: true }),
      supabase.from('tournament_matches').select('*').eq('tournament_id', id).order('match_number', { ascending: true }),
      supabase.from('tournament_rules').select('*').eq('tournament_id', id).maybeSingle(),
    ]);

    if (tournamentResult.error) {
      setErrorMessage('Não foi possível carregar o torneio.');
      return;
    }

    if (groupsResult.error || teamsResult.error || groupTeamsResult.error || matchesResult.error || rulesResult.error) {
      setErrorMessage('Não foi possível carregar os dados da classificação.');
      return;
    }

    setTournament(tournamentResult.data);
    setGroups(groupsResult.data || []);
    setTeams(teamsResult.data || []);
    setGroupTeams(groupTeamsResult.data || []);
    setMatches(matchesResult.data || []);
    setRule((rulesResult.data as TournamentManagerRule | null) || null);
    setLastUpdated(new Date());
  }, [id]);

  useEffect(() => {
    async function run() {
      setLoading(true);
      await loadData();
      setLoading(false);
    }

    run();
  }, [loadData]);

  async function refreshData() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  const standings = useMemo(() => {
    return calculateTournamentStandings({
      groups,
      teams,
      groupTeams,
      matches,
      rule,
    });
  }, [groups, teams, groupTeams, matches, rule]);

  if (loading) {
    return <div className="text-slate-600">A carregar classificação...</div>;
  }

  if (errorMessage) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
        {errorMessage}
      </div>
    );
  }

  if (!tournament) {
    return <div className="text-slate-600">Torneio não encontrado.</div>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Link
            to={`/admin/gestor-torneios/${tournament.id}`}
            className="text-sm font-semibold text-green-700 hover:text-green-800"
          >
            ← Voltar ao torneio
          </Link>

          <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-green-700">
            Gestor de Torneios Boavista
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Classificação automática</h1>
          <p className="mt-2 max-w-3xl text-slate-600">
            Classificação calculada automaticamente com base nos resultados inseridos na página de Jogos.
            Esta página não guarda dados: recalcula sempre a partir dos jogos concluídos.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            to={`/admin/gestor-torneios/${tournament.id}/jogos`}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Ir para jogos
          </Link>
          <button
            type="button"
            onClick={refreshData}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'A atualizar...' : 'Atualizar dados'}
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Torneio</p>
          <p className="mt-2 font-bold text-slate-900">{tournament.name}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Grupos</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{groups.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Jogos de grupo</p>
          <p className="mt-2 font-bold text-slate-900">
            {getProgressLabel(standings.completed_group_matches, standings.total_group_matches)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Atualizado nesta página</p>
          <p className="mt-2 font-bold text-slate-900">{formatLastUpdated(lastUpdated)}</p>
        </div>
      </div>

      {standings.groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
          Ainda não existem grupos configurados para este torneio.
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          {standings.groups.map((groupStanding) => (
            <section key={groupStanding.group.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 p-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Trophy size={18} className="text-green-700" />
                    <h2 className="text-xl font-bold text-slate-900">{groupStanding.group.name}</h2>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {getProgressLabel(groupStanding.completed_matches, groupStanding.scheduled_matches)}
                  </p>
                </div>

                {rule && rule.qualifiers_per_group > 0 && (
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                    Passam {rule.qualifiers_per_group} equipa(s)
                  </span>
                )}
              </div>

              {groupStanding.rows.length === 0 ? (
                <p className="p-6 text-sm text-slate-600">Ainda não existem equipas atribuídas a este grupo.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="bg-white text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">#</th>
                        <th className="px-4 py-3">Equipa</th>
                        <th className="px-4 py-3 text-center">Pts</th>
                        <th className="px-4 py-3 text-center">J</th>
                        <th className="px-4 py-3 text-center">V</th>
                        <th className="px-4 py-3 text-center">E</th>
                        <th className="px-4 py-3 text-center">D</th>
                        <th className="px-4 py-3 text-center">GM</th>
                        <th className="px-4 py-3 text-center">GS</th>
                        <th className="px-4 py-3 text-center">DG</th>
                        <th className="px-4 py-3 text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {groupStanding.rows.map((row) => (
                        <tr key={row.team.id} className={row.qualified ? 'bg-green-50/70' : 'hover:bg-slate-50'}>
                          <td className="px-4 py-3 font-bold text-slate-600">{row.position}</td>
                          <td className="px-4 py-3">
                            <p className="font-bold text-slate-900">{row.team.name}</p>
                            <p className="text-xs text-slate-500">{row.team.club || row.team.location || 'Clube por definir'}</p>
                          </td>
                          <td className="px-4 py-3 text-center text-lg font-bold text-slate-900">{row.points}</td>
                          <td className="px-4 py-3 text-center">{row.played}</td>
                          <td className="px-4 py-3 text-center">{row.wins}</td>
                          <td className="px-4 py-3 text-center">{row.draws}</td>
                          <td className="px-4 py-3 text-center">{row.losses}</td>
                          <td className="px-4 py-3 text-center">{row.goals_for}</td>
                          <td className="px-4 py-3 text-center">{row.goals_against}</td>
                          <td className="px-4 py-3 text-center font-semibold">{row.goal_difference}</td>
                          <td className="px-4 py-3 text-center">
                            {row.qualified ? (
                              <span className="rounded-full bg-green-700 px-3 py-1 text-xs font-bold text-white">Apurado</span>
                            ) : (
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Em disputa</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        <p className="font-bold">Critérios aplicados nesta versão</p>
        <p className="mt-1">
          Pontos, confronto direto entre duas equipas empatadas, diferença de golos, golos marcados,
          golos sofridos e ordem alfabética. Na próxima fase podemos tornar a ordem dos critérios totalmente configurável.
        </p>
      </section>
    </div>
  );
}
