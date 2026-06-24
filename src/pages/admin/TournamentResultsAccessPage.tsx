import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CalendarDays, Clock, Lock, RefreshCw, Save, Trophy } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { calculateTournamentStandings } from '../../lib/tournamentStandings';
import type {
  TournamentManagerField,
  TournamentManagerGroup,
  TournamentManagerGroupTeam,
  TournamentManagerMatch,
  TournamentManagerRule,
  TournamentManagerTeam,
  TournamentManagerTournament,
} from '../../types/tournamentManager';

type ResultAccessRow = {
  tournament_id: string;
  user_email: string;
  display_name: string | null;
  is_active: boolean;
};

type ResultDraft = {
  status: string;
  score_a: string;
  score_b: string;
  penalty_score_a: string;
  penalty_score_b: string;
  notes: string;
};

type FinalUpdate = {
  matchId: string;
  team_a_id?: string | null;
  team_b_id?: string | null;
};

const statusOptions = [
  { value: 'scheduled', label: 'Agendado' },
  { value: 'in_progress', label: 'A decorrer' },
  { value: 'finished', label: 'Terminado' },
  { value: 'postponed', label: 'Adiado' },
  { value: 'cancelled', label: 'Cancelado' },
  { value: 'no_show', label: 'Falta de comparência' },
];

const phaseLabels: Record<string, string> = {
  group: 'Fase de grupos',
  quarter_final: 'Quartos de final',
  semi_final: 'Meias-finais',
  third_place: '3.º e 4.º lugar',
  final: 'Final',
  manual: 'Manual',
};

function formatDate(value: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`));
}

function formatTime(value: string | null) {
  if (!value) return '-';
  return value.slice(0, 5);
}

function hasResult(match: Pick<TournamentManagerMatch, 'score_a' | 'score_b'>) {
  return match.score_a !== null && match.score_a !== undefined && match.score_b !== null && match.score_b !== undefined;
}

function isFinalPhase(phase: string | null | undefined) {
  return phase === 'quarter_final' || phase === 'semi_final' || phase === 'third_place' || phase === 'final';
}

function hasPenaltyResult(match: Pick<TournamentManagerMatch, 'penalty_score_a' | 'penalty_score_b'>) {
  return (
    match.penalty_score_a !== null &&
    match.penalty_score_a !== undefined &&
    match.penalty_score_b !== null &&
    match.penalty_score_b !== undefined
  );
}

function getWinnerId(match: TournamentManagerMatch) {
  if (!hasResult(match) || !match.team_a_id || !match.team_b_id) return null;

  if ((match.score_a ?? 0) > (match.score_b ?? 0)) return match.team_a_id;
  if ((match.score_a ?? 0) < (match.score_b ?? 0)) return match.team_b_id;

  if (isFinalPhase(match.phase) && hasPenaltyResult(match) && match.penalty_score_a !== match.penalty_score_b) {
    return (match.penalty_score_a ?? 0) > (match.penalty_score_b ?? 0) ? match.team_a_id : match.team_b_id;
  }

  return null;
}

function getLoserId(match: TournamentManagerMatch) {
  if (!hasResult(match) || !match.team_a_id || !match.team_b_id) return null;

  if ((match.score_a ?? 0) < (match.score_b ?? 0)) return match.team_a_id;
  if ((match.score_a ?? 0) > (match.score_b ?? 0)) return match.team_b_id;

  if (isFinalPhase(match.phase) && hasPenaltyResult(match) && match.penalty_score_a !== match.penalty_score_b) {
    return (match.penalty_score_a ?? 0) < (match.penalty_score_b ?? 0) ? match.team_a_id : match.team_b_id;
  }

  return null;
}

function matchToDraft(match: TournamentManagerMatch): ResultDraft {
  return {
    status: match.status || 'scheduled',
    score_a: match.score_a === null || match.score_a === undefined ? '' : String(match.score_a),
    score_b: match.score_b === null || match.score_b === undefined ? '' : String(match.score_b),
    penalty_score_a: match.penalty_score_a === null || match.penalty_score_a === undefined ? '' : String(match.penalty_score_a),
    penalty_score_b: match.penalty_score_b === null || match.penalty_score_b === undefined ? '' : String(match.penalty_score_b),
    notes: match.notes || '',
  };
}

function normalizeScore(value: string) {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getPhaseBadgeClass(phase: string) {
  if (phase === 'final') return 'bg-yellow-100 text-yellow-800 ring-yellow-200';
  if (phase === 'semi_final') return 'bg-purple-100 text-purple-800 ring-purple-200';
  if (phase === 'third_place') return 'bg-orange-100 text-orange-800 ring-orange-200';
  if (phase === 'quarter_final') return 'bg-indigo-100 text-indigo-800 ring-indigo-200';
  if (phase === 'manual') return 'bg-slate-100 text-slate-700 ring-slate-200';
  return 'bg-green-100 text-green-800 ring-green-200';
}

function getStatusBadgeClass(status: string) {
  if (status === 'finished') return 'bg-green-100 text-green-800 ring-green-200';
  if (status === 'in_progress') return 'bg-blue-100 text-blue-800 ring-blue-200';
  if (status === 'cancelled' || status === 'postponed') return 'bg-red-100 text-red-700 ring-red-200';
  return 'bg-slate-100 text-slate-700 ring-slate-200';
}

function getTeamName(teamId: string | null | undefined, teamById: Record<string, TournamentManagerTeam>, placeholder?: string | null) {
  if (teamId && teamById[teamId]) return teamById[teamId].name;
  return placeholder || 'Por definir';
}

function getDraftMatch(match: TournamentManagerMatch, draft: ResultDraft): TournamentManagerMatch {
  return {
    ...match,
    status: draft.status as TournamentManagerMatch['status'],
    score_a: normalizeScore(draft.score_a),
    score_b: normalizeScore(draft.score_b),
    penalty_score_a: normalizeScore(draft.penalty_score_a),
    penalty_score_b: normalizeScore(draft.penalty_score_b),
    notes: draft.notes.trim() || null,
  };
}

export default function TournamentResultsAccessPage() {
  const { id } = useParams();

  const [access, setAccess] = useState<ResultAccessRow | null>(null);
  const [tournament, setTournament] = useState<TournamentManagerTournament | null>(null);
  const [fields, setFields] = useState<TournamentManagerField[]>([]);
  const [teams, setTeams] = useState<TournamentManagerTeam[]>([]);
  const [groups, setGroups] = useState<TournamentManagerGroup[]>([]);
  const [groupTeams, setGroupTeams] = useState<TournamentManagerGroupTeam[]>([]);
  const [rule, setRule] = useState<TournamentManagerRule | null>(null);
  const [matches, setMatches] = useState<TournamentManagerMatch[]>([]);
  const [drafts, setDrafts] = useState<Record<string, ResultDraft>>({});

  const [loading, setLoading] = useState(true);
  const [savingMatchId, setSavingMatchId] = useState<string | null>(null);
  const [updatingFinals, setUpdatingFinals] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const teamById = useMemo(() => {
    return teams.reduce<Record<string, TournamentManagerTeam>>((accumulator, team) => {
      accumulator[team.id] = team;
      return accumulator;
    }, {});
  }, [teams]);

  const fieldById = useMemo(() => {
    return fields.reduce<Record<string, TournamentManagerField>>((accumulator, field) => {
      accumulator[field.id] = field;
      return accumulator;
    }, {});
  }, [fields]);

  const groupById = useMemo(() => {
    return groups.reduce<Record<string, TournamentManagerGroup>>((accumulator, group) => {
      accumulator[group.id] = group;
      return accumulator;
    }, {});
  }, [groups]);

  const orderedMatches = useMemo(() => {
    return [...matches].sort((a, b) => {
      const dateCompare = (a.match_date || '').localeCompare(b.match_date || '');
      if (dateCompare !== 0) return dateCompare;
      const timeCompare = (a.match_time || '').localeCompare(b.match_time || '');
      if (timeCompare !== 0) return timeCompare;
      return a.match_number - b.match_number;
    });
  }, [matches]);

  async function loadData() {
    if (!id) return;

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const email = session?.user.email?.trim().toLowerCase();

    if (!email) {
      setErrorMessage('Sessão inválida. Faz login novamente.');
      setLoading(false);
      return;
    }

    const { data: accessData, error: accessError } = await supabase
      .from('tournament_result_access')
      .select('*')
      .eq('tournament_id', id)
      .eq('user_email', email)
      .eq('is_active', true)
      .maybeSingle();

    if (accessError || !accessData) {
      setAccess(null);
      setErrorMessage('Este utilizador não tem permissão para lançar resultados deste torneio.');
      setLoading(false);
      return;
    }

    const [
      tournamentResponse,
      fieldsResponse,
      teamsResponse,
      groupsResponse,
      groupTeamsResponse,
      ruleResponse,
      matchesResponse,
    ] = await Promise.all([
      supabase.from('tournaments').select('*').eq('id', id).single(),
      supabase.from('tournament_fields').select('*').eq('tournament_id', id).order('name'),
      supabase.from('tournament_teams').select('*').eq('tournament_id', id).order('sort_order'),
      supabase.from('tournament_groups').select('*').eq('tournament_id', id).order('sort_order'),
      supabase.from('tournament_group_teams').select('*').eq('tournament_id', id).order('sort_order'),
      supabase.from('tournament_rules').select('*').eq('tournament_id', id).maybeSingle(),
      supabase.from('tournament_matches').select('*').eq('tournament_id', id).order('match_date').order('match_time').order('match_number'),
    ]);

    if (tournamentResponse.error) {
      setErrorMessage('Não foi possível carregar o torneio.');
      setLoading(false);
      return;
    }

    const loadedMatches = (matchesResponse.data || []) as TournamentManagerMatch[];

    setAccess(accessData as ResultAccessRow);
    setTournament(tournamentResponse.data as TournamentManagerTournament);
    setFields((fieldsResponse.data || []) as TournamentManagerField[]);
    setTeams((teamsResponse.data || []) as TournamentManagerTeam[]);
    setGroups((groupsResponse.data || []) as TournamentManagerGroup[]);
    setGroupTeams((groupTeamsResponse.data || []) as TournamentManagerGroupTeam[]);
    setRule((ruleResponse.data || null) as TournamentManagerRule | null);
    setMatches(loadedMatches);
    setDrafts(
      loadedMatches.reduce<Record<string, ResultDraft>>((accumulator, match) => {
        accumulator[match.id] = matchToDraft(match);
        return accumulator;
      }, {})
    );

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [id]);

  function updateDraft(matchId: string, field: keyof ResultDraft, value: string) {
    setDrafts((currentDrafts) => ({
      ...currentDrafts,
      [matchId]: {
        ...currentDrafts[matchId],
        [field]: value,
      },
    }));
  }

  function buildFinalUpdates(currentMatches: TournamentManagerMatch[]): FinalUpdate[] {
    const groupMatches = currentMatches.filter((match) => match.phase === 'group');
    const standings = calculateTournamentStandings({
      groups,
      teams,
      groupTeams,
      matches: groupMatches,
      rule,
    });

    const firstByGroupName = new Map<string, string>();
    const secondByGroupName = new Map<string, string>();

    standings.groups.forEach((groupStanding) => {
      const group = groupStanding.group;
      const groupName = group?.name || '-';
      const rows = groupStanding.rows;

      if (rows[0]) firstByGroupName.set(groupName, rows[0].team.id);
      if (rows[1]) secondByGroupName.set(groupName, rows[1].team.id);
    });

    const updates: FinalUpdate[] = [];

    currentMatches.forEach((match) => {
      if (match.phase !== 'semi_final') return;

      const update: FinalUpdate = { matchId: match.id };

      if (match.team_a_source?.startsWith('winner_group:')) {
        const groupName = match.team_a_source.replace('winner_group:', '');
        update.team_a_id = firstByGroupName.get(groupName) || null;
      }

      if (match.team_b_source?.startsWith('runner_up_group:')) {
        const groupName = match.team_b_source.replace('runner_up_group:', '');
        update.team_b_id = secondByGroupName.get(groupName) || null;
      }

      if (match.team_a_source?.startsWith('runner_up_group:')) {
        const groupName = match.team_a_source.replace('runner_up_group:', '');
        update.team_a_id = secondByGroupName.get(groupName) || null;
      }

      if (match.team_b_source?.startsWith('winner_group:')) {
        const groupName = match.team_b_source.replace('winner_group:', '');
        update.team_b_id = firstByGroupName.get(groupName) || null;
      }

      if ('team_a_id' in update || 'team_b_id' in update) {
        updates.push(update);
      }
    });

    const semiFinals = currentMatches
      .filter((match) => match.phase === 'semi_final')
      .sort((a, b) => a.match_number - b.match_number);

    const finalMatch = currentMatches.find((match) => match.phase === 'final');
    const thirdPlaceMatch = currentMatches.find((match) => match.phase === 'third_place');

    if (semiFinals.length >= 2) {
      const firstWinner = getWinnerId(semiFinals[0]);
      const secondWinner = getWinnerId(semiFinals[1]);
      const firstLoser = getLoserId(semiFinals[0]);
      const secondLoser = getLoserId(semiFinals[1]);

      if (finalMatch && firstWinner && secondWinner) {
        updates.push({ matchId: finalMatch.id, team_a_id: firstWinner, team_b_id: secondWinner });
      }

      if (thirdPlaceMatch && firstLoser && secondLoser) {
        updates.push({ matchId: thirdPlaceMatch.id, team_a_id: firstLoser, team_b_id: secondLoser });
      }
    }

    return updates;
  }

  async function applyFinalUpdates(currentMatches: TournamentManagerMatch[]) {
    const updates = buildFinalUpdates(currentMatches);

    for (const update of updates) {
      const payload: Record<string, string | null> = {};

      if ('team_a_id' in update) payload.team_a_id = update.team_a_id || null;
      if ('team_b_id' in update) payload.team_b_id = update.team_b_id || null;

      if (Object.keys(payload).length === 0) continue;

      await supabase.from('tournament_matches').update(payload).eq('id', update.matchId);
    }
  }

  async function handleUpdateFinals() {
    setUpdatingFinals(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const currentMatches = matches.map((match) => {
        const draft = drafts[match.id];
        return draft ? getDraftMatch(match, draft) : match;
      });

      await applyFinalUpdates(currentMatches);
      await loadData();
      setSuccessMessage('Fase final atualizada com sucesso.');
    } catch (error) {
      console.error('Erro ao atualizar fase final:', error);
      setErrorMessage('Não foi possível atualizar a fase final.');
    } finally {
      setUpdatingFinals(false);
    }
  }

  async function saveMatch(match: TournamentManagerMatch) {
    const draft = drafts[match.id];
    if (!draft) return;

    setSavingMatchId(match.id);
    setErrorMessage('');
    setSuccessMessage('');

    const scoreA = normalizeScore(draft.score_a);
    const scoreB = normalizeScore(draft.score_b);
    const penaltyA = normalizeScore(draft.penalty_score_a);
    const penaltyB = normalizeScore(draft.penalty_score_b);

    const { error } = await supabase
      .from('tournament_matches')
      .update({
        status: draft.status,
        score_a: scoreA,
        score_b: scoreB,
        penalty_score_a: penaltyA,
        penalty_score_b: penaltyB,
        notes: draft.notes.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', match.id);

    if (error) {
      console.error('Erro ao guardar resultado:', error);
      setErrorMessage('Não foi possível guardar o resultado.');
      setSavingMatchId(null);
      return;
    }

    const updatedMatches = matches.map((item) =>
      item.id === match.id
        ? {
            ...item,
            status: draft.status as TournamentManagerMatch['status'],
            score_a: scoreA,
            score_b: scoreB,
            penalty_score_a: penaltyA,
            penalty_score_b: penaltyB,
            notes: draft.notes.trim() || null,
          }
        : item
    );

    await applyFinalUpdates(updatedMatches);
    await loadData();

    setSuccessMessage('Resultado guardado com sucesso.');
    setSavingMatchId(null);
  }

  if (loading) {
    return <div className="text-sm font-semibold text-zinc-600">A carregar jogos...</div>;
  }

  if (errorMessage && !access) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
        <div className="flex items-center gap-3">
          <Lock size={22} />
          <div>
            <h1 className="text-lg font-black">Sem permissão</h1>
            <p className="mt-1 text-sm font-semibold">{errorMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-red-700">
            Resultados
          </p>
          <h1 className="mt-2 font-serif text-4xl font-light text-[#24180f]">
            {tournament?.name || 'Torneio'}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-zinc-600">
            Área dedicada exclusivamente ao lançamento de resultados deste torneio.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {tournament?.slug && (
            <Link
              to={`/torneios/${tournament.slug}`}
              target="_blank"
              className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-black text-zinc-700 transition hover:border-red-700 hover:text-red-700"
            >
              Ver página pública
            </Link>
          )}

          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-black text-zinc-700 transition hover:border-red-700 hover:text-red-700"
          >
            <RefreshCw size={16} />
            Atualizar dados
          </button>

          <button
            type="button"
            disabled={updatingFinals}
            onClick={handleUpdateFinals}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#24180f] px-4 py-2 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Trophy size={16} />
            {updatingFinals ? 'A atualizar...' : 'Atualizar fase final'}
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700">
          {successMessage}
        </div>
      )}

      {errorMessage && access && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="grid gap-5">
        {orderedMatches.map((match) => {
          const draft = drafts[match.id] || matchToDraft(match);
          const finalPhaseTie =
            isFinalPhase(match.phase) &&
            normalizeScore(draft.score_a) !== null &&
            normalizeScore(draft.score_b) !== null &&
            normalizeScore(draft.score_a) === normalizeScore(draft.score_b);

          const teamAName = getTeamName(match.team_a_id, teamById, match.team_a_placeholder);
          const teamBName = getTeamName(match.team_b_id, teamById, match.team_b_placeholder);
          const fieldName = match.field_id ? fieldById[match.field_id]?.name || 'Campo' : 'Campo por definir';
          const groupName = match.group_id ? groupById[match.group_id]?.name || '-' : '-';

          return (
            <article key={match.id} className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <div className="flex flex-col gap-4 border-b border-zinc-100 p-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-black text-zinc-950">Jogo {match.match_number}</h2>
                    <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${getPhaseBadgeClass(match.phase)}`}>
                      {phaseLabels[match.phase] || match.phase}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${getStatusBadgeClass(draft.status)}`}>
                      {statusOptions.find((item) => item.value === draft.status)?.label || draft.status}
                    </span>
                    {groupName !== '-' && (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700 ring-1 ring-slate-200">
                        {groupName}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-4 text-sm font-semibold text-slate-600">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays size={15} />
                      {formatDate(match.match_date)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock size={15} />
                      {formatTime(match.match_time)}
                    </span>
                    <span>{fieldName}</span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={savingMatchId === match.id}
                  onClick={() => saveMatch(match)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-700 px-4 py-3 text-sm font-black text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save size={16} />
                  {savingMatchId === match.id ? 'A guardar...' : 'Guardar resultado'}
                </button>
              </div>

              <div className="grid gap-5 p-5 lg:grid-cols-[1fr_260px]">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                    Confronto e resultado
                  </p>

                  <div className="mt-4 grid items-center gap-4 md:grid-cols-[1fr_170px_1fr]">
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Equipa A</p>
                      <p className="mt-2 text-base font-black text-slate-950">{teamAName}</p>
                    </div>

                    <div className="rounded-2xl bg-slate-950 p-4 text-center text-white shadow-lg">
                      <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-300">Resultado</p>
                      <div className="mt-3 flex items-center justify-center gap-3">
                        <input
                          type="number"
                          min="0"
                          value={draft.score_a}
                          onChange={(event) => updateDraft(match.id, 'score_a', event.target.value)}
                          className="h-14 w-16 rounded-xl border border-white/20 bg-white text-center text-2xl font-black text-slate-950 outline-none focus:ring-4 focus:ring-red-200"
                        />
                        <span className="text-xl font-black">x</span>
                        <input
                          type="number"
                          min="0"
                          value={draft.score_b}
                          onChange={(event) => updateDraft(match.id, 'score_b', event.target.value)}
                          className="h-14 w-16 rounded-xl border border-white/20 bg-white text-center text-2xl font-black text-slate-950 outline-none focus:ring-4 focus:ring-red-200"
                        />
                      </div>

                      {finalPhaseTie && (
                        <div className="mt-4 rounded-xl bg-white/10 p-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-300">Penáltis</p>
                          <div className="mt-2 flex items-center justify-center gap-2">
                            <input
                              type="number"
                              min="0"
                              value={draft.penalty_score_a}
                              onChange={(event) => updateDraft(match.id, 'penalty_score_a', event.target.value)}
                              className="h-11 w-14 rounded-lg border border-white/20 bg-white text-center text-lg font-black text-slate-950 outline-none focus:ring-4 focus:ring-red-200"
                            />
                            <span className="text-sm font-black">x</span>
                            <input
                              type="number"
                              min="0"
                              value={draft.penalty_score_b}
                              onChange={(event) => updateDraft(match.id, 'penalty_score_b', event.target.value)}
                              className="h-11 w-14 rounded-lg border border-white/20 bg-white text-center text-lg font-black text-slate-950 outline-none focus:ring-4 focus:ring-red-200"
                            />
                          </div>
                          <p className="mt-2 text-[10px] font-bold text-slate-300">Define quem avança.</p>
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Equipa B</p>
                      <p className="mt-2 text-base font-black text-slate-950">{teamBName}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <label className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                    Estado
                  </label>
                  <select
                    value={draft.status}
                    onChange={(event) => updateDraft(match.id, 'status', event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <label className="mt-4 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                    Notas
                  </label>
                  <textarea
                    value={draft.notes}
                    onChange={(event) => updateDraft(match.id, 'notes', event.target.value)}
                    rows={5}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
                  />
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
