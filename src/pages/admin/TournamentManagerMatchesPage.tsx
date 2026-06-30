import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, CalendarDays, CheckCircle2, Clock, MapPin, RefreshCw, Save, Trash2, Trophy } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  generateTournamentSchedule,
  getTournamentMatchDurationMinutes,
  getTournamentMatchEndTime,
} from '../../lib/tournamentScheduler';
import { calculateTournamentStandings } from '../../lib/tournamentStandings';
import type {
  TournamentManagerDay,
  TournamentManagerField,
  TournamentManagerGroup,
  TournamentManagerGroupTeam,
  TournamentManagerMatch,
  TournamentManagerMatchGoal,
  TournamentManagerPlayer,
  TournamentManagerRule,
  TournamentManagerTeam,
  TournamentManagerTournament,
} from '../../types/tournamentManager';

type MatchDraft = {
  phase: string;
  match_date: string;
  match_time: string;
  field_id: string;
  team_a_id: string;
  team_b_id: string;
  team_a_placeholder: string;
  team_b_placeholder: string;
  team_a_source: string;
  team_b_source: string;
  round_number: string;
  status: string;
  score_a: string;
  score_b: string;
  penalty_score_a: string;
  penalty_score_b: string;
  notes: string;
};

type CalendarIssue = {
  matchId: string;
  severity: 'error' | 'warning';
  message: string;
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

function timeToMinutes(value: string) {
  const [hours, minutes] = value.slice(0, 5).split(':').map(Number);
  return hours * 60 + minutes;
}

function rangesOverlap(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && startB < endA;
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

function matchToDraft(match: TournamentManagerMatch): MatchDraft {
  return {
    phase: match.phase || 'group',
    match_date: match.match_date || '',
    match_time: match.match_time ? formatTime(match.match_time) : '',
    field_id: match.field_id || '',
    team_a_id: match.team_a_id || '',
    team_b_id: match.team_b_id || '',
    team_a_placeholder: match.team_a_placeholder || '',
    team_b_placeholder: match.team_b_placeholder || '',
    team_a_source: match.team_a_source || '',
    team_b_source: match.team_b_source || '',
    round_number: match.round_number ? String(match.round_number) : '',
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

function getDraftTeamName(draft: MatchDraft, side: 'a' | 'b', teamById: Record<string, TournamentManagerTeam>) {
  const teamId = side === 'a' ? draft.team_a_id : draft.team_b_id;
  const placeholder = side === 'a' ? draft.team_a_placeholder : draft.team_b_placeholder;
  if (teamId && teamById[teamId]) return teamById[teamId].name;
  return placeholder || 'Por definir';
}

export default function TournamentManagerMatchesPage() {
  const { id } = useParams();

  const [tournament, setTournament] = useState<TournamentManagerTournament | null>(null);
  const [days, setDays] = useState<TournamentManagerDay[]>([]);
  const [fields, setFields] = useState<TournamentManagerField[]>([]);
  const [teams, setTeams] = useState<TournamentManagerTeam[]>([]);
  const [groups, setGroups] = useState<TournamentManagerGroup[]>([]);
  const [assignments, setAssignments] = useState<TournamentManagerGroupTeam[]>([]);
  const [rules, setRules] = useState<TournamentManagerRule | null>(null);
  const [matches, setMatches] = useState<TournamentManagerMatch[]>([]);
  const [players, setPlayers] = useState<TournamentManagerPlayer[]>([]);
  const [matchGoals, setMatchGoals] = useState<TournamentManagerMatchGoal[]>([]);
  const [drafts, setDrafts] = useState<Record<string, MatchDraft>>({});

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [updatingFinals, setUpdatingFinals] = useState(false);
  const [savingMatchId, setSavingMatchId] = useState<string | null>(null);
  const [deletingMatchId, setDeletingMatchId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [lastCapacityReport, setLastCapacityReport] = useState<string[]>([]);

  const orderedFields = useMemo(() => [...fields].sort((a, b) => a.name.localeCompare(b.name, 'pt')), [fields]);
  const activeFields = useMemo(() => orderedFields.filter((field) => field.is_active), [orderedFields]);

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

  const teamById = useMemo(() => {
    return orderedTeams.reduce<Record<string, TournamentManagerTeam>>((acc, team) => {
      acc[team.id] = team;
      return acc;
    }, {});
  }, [orderedTeams]);

  const playersByTeamId = useMemo(() => {
    return players.reduce<Record<string, TournamentManagerPlayer[]>>((acc, player) => {
      if (!player.is_active) return acc;
      if (!acc[player.team_id]) acc[player.team_id] = [];
      acc[player.team_id].push(player);
      return acc;
    }, {});
  }, [players]);

  const playerById = useMemo(() => {
    return players.reduce<Record<string, TournamentManagerPlayer>>((acc, player) => {
      acc[player.id] = player;
      return acc;
    }, {});
  }, [players]);

  const goalsByMatchId = useMemo(() => {
    return matchGoals.reduce<Record<string, TournamentManagerMatchGoal[]>>((acc, goal) => {
      if (!acc[goal.match_id]) acc[goal.match_id] = [];
      acc[goal.match_id].push(goal);
      return acc;
    }, {});
  }, [matchGoals]);

  const fieldById = useMemo(() => {
    return orderedFields.reduce<Record<string, TournamentManagerField>>((acc, field) => {
      acc[field.id] = field;
      return acc;
    }, {});
  }, [orderedFields]);

  const groupById = useMemo(() => {
    return orderedGroups.reduce<Record<string, TournamentManagerGroup>>((acc, group) => {
      acc[group.id] = group;
      return acc;
    }, {});
  }, [orderedGroups]);

  const orderedMatches = useMemo(() => {
    return [...matches].sort((a, b) => {
      if (a.match_number !== b.match_number) return a.match_number - b.match_number;
      const dateCompare = (a.match_date || '').localeCompare(b.match_date || '');
      if (dateCompare !== 0) return dateCompare;
      const timeCompare = (a.match_time || '').localeCompare(b.match_time || '');
      if (timeCompare !== 0) return timeCompare;
      return (a.id || '').localeCompare(b.id || '');
    });
  }, [matches]);

  const dayByDate = useMemo(() => {
    return days.reduce<Record<string, TournamentManagerDay>>((acc, day) => {
      acc[day.day_date] = day;
      return acc;
    }, {});
  }, [days]);

  const matchDuration = getTournamentMatchDurationMinutes(rules);
  const minRestMinutes = rules?.min_rest_minutes || 0;

  const schedulerPreview = useMemo(() => {
    return generateTournamentSchedule({
      groups: orderedGroups,
      teams: orderedTeams,
      assignments,
      days,
      fields: activeFields,
      rules,
    });
  }, [activeFields, assignments, days, orderedGroups, orderedTeams, rules]);

  const calendarValidation = useMemo(() => {
    const issues: CalendarIssue[] = [];
    const issuesByMatchId: Record<string, CalendarIssue[]> = {};

    function addIssue(matchId: string, severity: 'error' | 'warning', message: string) {
      const issue = { matchId, severity, message };
      issues.push(issue);
      issuesByMatchId[matchId] = [...(issuesByMatchId[matchId] || []), issue];
    }

    const normalizedMatches = orderedMatches
      .filter((match) => match.match_date && match.match_time)
      .map((match) => {
        const startMinutes = timeToMinutes(match.match_time || '00:00');
        return {
          match,
          date: match.match_date || '',
          startMinutes,
          endMinutes: startMinutes + matchDuration,
          teams: [match.team_a_id, match.team_b_id].filter(Boolean) as string[],
        };
      });

    normalizedMatches.forEach((item) => {
      const day = dayByDate[item.date];
      if (!day) {
        addIssue(item.match.id, 'warning', 'Jogo marcado num dia não configurado no torneio.');
        return;
      }

      const dayStart = timeToMinutes(day.start_time);
      const dayEnd = timeToMinutes(day.end_time);
      if (item.startMinutes < dayStart || item.endMinutes > dayEnd) {
        addIssue(item.match.id, 'error', 'Jogo fora do horário configurado para este dia.');
      }

      if (day.lunch_start && day.lunch_end) {
        const lunchStart = timeToMinutes(day.lunch_start);
        const lunchEnd = timeToMinutes(day.lunch_end);
        if (rangesOverlap(item.startMinutes, item.endMinutes, lunchStart, lunchEnd)) {
          addIssue(item.match.id, 'warning', 'Jogo sobreposto com a pausa configurada.');
        }
      }
    });

    for (let firstIndex = 0; firstIndex < normalizedMatches.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < normalizedMatches.length; secondIndex += 1) {
        const first = normalizedMatches[firstIndex];
        const second = normalizedMatches[secondIndex];
        if (first.date !== second.date) continue;

        const overlaps = rangesOverlap(first.startMinutes, first.endMinutes, second.startMinutes, second.endMinutes);
        if (overlaps && first.match.field_id && second.match.field_id && first.match.field_id === second.match.field_id) {
          addIssue(first.match.id, 'error', `Conflito de campo com o jogo ${second.match.match_number}.`);
          addIssue(second.match.id, 'error', `Conflito de campo com o jogo ${first.match.match_number}.`);
        }

        const sharedTeam = first.teams.find((teamId) => second.teams.includes(teamId));
        if (!sharedTeam) continue;

        if (overlaps) {
          addIssue(first.match.id, 'error', `Equipa com jogo simultâneo no jogo ${second.match.match_number}.`);
          addIssue(second.match.id, 'error', `Equipa com jogo simultâneo no jogo ${first.match.match_number}.`);
          continue;
        }

        const firstBeforeSecond = first.endMinutes <= second.startMinutes;
        const restGap = firstBeforeSecond
          ? second.startMinutes - first.endMinutes
          : first.startMinutes - second.endMinutes;

        if (restGap >= 0 && restGap < minRestMinutes) {
          addIssue(first.match.id, 'warning', `Descanso inferior ao mínimo definido em relação ao jogo ${second.match.match_number}.`);
          addIssue(second.match.id, 'warning', `Descanso inferior ao mínimo definido em relação ao jogo ${first.match.match_number}.`);
        }
      }
    }

    return {
      issues,
      issuesByMatchId,
      errorCount: issues.filter((issue) => issue.severity === 'error').length,
      warningCount: issues.filter((issue) => issue.severity === 'warning').length,
    };
  }, [dayByDate, matchDuration, minRestMinutes, orderedMatches]);

  async function loadData() {
    if (!id) return;
    setLoading(true);
    setErrorMessage('');

    const [
      tournamentResult,
      daysResult,
      fieldsResult,
      teamsResult,
      groupsResult,
      assignmentsResult,
      rulesResult,
      matchesResult,
      playersResult,
      matchGoalsResult,
    ] = await Promise.all([
      supabase.from('tournaments').select('*').eq('id', id).single(),
      supabase.from('tournament_days').select('*').eq('tournament_id', id).order('day_date', { ascending: true }),
      supabase.from('tournament_fields').select('*').eq('tournament_id', id).order('name', { ascending: true }),
      supabase.from('tournament_teams').select('*').eq('tournament_id', id).order('sort_order', { ascending: true }).order('name', { ascending: true }),
      supabase.from('tournament_groups').select('*').eq('tournament_id', id).order('sort_order', { ascending: true }).order('name', { ascending: true }),
      supabase.from('tournament_group_teams').select('*').eq('tournament_id', id).order('sort_order', { ascending: true }),
      supabase.from('tournament_rules').select('*').eq('tournament_id', id).maybeSingle(),
      supabase.from('tournament_matches').select('*').eq('tournament_id', id).order('match_number', { ascending: true }),
      supabase
        .from('tournament_players')
        .select('*')
        .eq('tournament_id', id)
        .order('team_id', { ascending: true })
        .order('shirt_number', { ascending: true, nullsFirst: false })
        .order('name', { ascending: true }),
      supabase
        .from('tournament_match_goals')
        .select('*')
        .eq('tournament_id', id)
        .order('created_at', { ascending: true }),
    ]);

    if (tournamentResult.error) {
      setErrorMessage('Não foi possível carregar o torneio.');
      setLoading(false);
      return;
    }

    if (
      daysResult.error ||
      fieldsResult.error ||
      teamsResult.error ||
      groupsResult.error ||
      assignmentsResult.error ||
      rulesResult.error ||
      matchesResult.error ||
      playersResult.error ||
      matchGoalsResult.error
    ) {
      setErrorMessage('Não foi possível carregar todos os dados necessários para os jogos.');
      setLoading(false);
      return;
    }

    const loadedMatches = matchesResult.data || [];
    setTournament(tournamentResult.data);
    setDays(daysResult.data || []);
    setFields(fieldsResult.data || []);
    setTeams(teamsResult.data || []);
    setGroups(groupsResult.data || []);
    setAssignments(assignmentsResult.data || []);
    setRules(rulesResult.data || null);
    setMatches(loadedMatches);
    setPlayers(playersResult.data || []);
    setMatchGoals(matchGoalsResult.data || []);
    setDrafts(loadedMatches.reduce<Record<string, MatchDraft>>((acc, match) => {
      acc[match.id] = matchToDraft(match);
      return acc;
    }, {}));
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [id]);

  function updateDraft(matchId: string, field: keyof MatchDraft, value: string) {
    setDrafts((current) => ({
      ...current,
      [matchId]: {
        ...current[matchId],
        [field]: value,
      },
    }));
  }

  function getResolvedTeamIdFromSource(source: string | null, currentMatches: TournamentManagerMatch[]) {
    if (!source) return null;

    const standings = calculateTournamentStandings({
      groups: orderedGroups,
      teams: orderedTeams,
      groupTeams: assignments,
      matches: currentMatches,
      rule: rules,
    });

    if (source.startsWith('winner_group:') || source.startsWith('runner_up_group:')) {
      if (standings.pending_group_matches > 0) return null;
      const groupName = source.split(':')[1];
      const group = standings.groups.find((item) => item.group.name === groupName);
      if (!group) return null;
      const index = source.startsWith('winner_group:') ? 0 : 1;
      return group.rows[index]?.team.id || null;
    }

    if (source === 'best_runner_up') {
      if (standings.pending_group_matches > 0) return null;
      const candidates = standings.groups
        .map((item) => item.rows[1])
        .filter((row): row is NonNullable<typeof row> => Boolean(row))
        .sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference;
          if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for;
          return a.goals_against - b.goals_against;
        });
      return candidates[0]?.team.id || null;
    }

    if (source.startsWith('overall_rank:')) {
      if (standings.pending_group_matches > 0) return null;
      const rank = Number(source.split(':')[1]);
      const rows = standings.groups
        .flatMap((item) => item.rows)
        .sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference;
          if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for;
          return a.goals_against - b.goals_against;
        });
      return rows[rank - 1]?.team.id || null;
    }

    const matchSourceMatch = source.match(/^(winner|loser)_match:([a-z_]+)_(\d+)$/);
    if (matchSourceMatch) {
      const [, resultType, phase, indexText] = matchSourceMatch;
      const index = Number(indexText) - 1;
      const sourceMatch = currentMatches
        .filter((match) => match.phase === phase)
        .sort((a, b) => a.match_number - b.match_number)[index];
      if (!sourceMatch) return null;
      return resultType === 'winner' ? getWinnerId(sourceMatch) : getLoserId(sourceMatch);
    }

    return null;
  }

  async function autofillFinalPhase(currentMatches: TournamentManagerMatch[], options?: { force?: boolean }) {
    const force = options?.force === true;
    const updates: FinalUpdate[] = [];

    currentMatches
      .filter((match) => match.phase !== 'group' && match.phase !== 'manual')
      .forEach((match) => {
        const nextTeamA = getResolvedTeamIdFromSource(match.team_a_source, currentMatches);
        const nextTeamB = getResolvedTeamIdFromSource(match.team_b_source, currentMatches);
        const update: FinalUpdate = { matchId: match.id };

        if ((force || !match.team_a_id) && nextTeamA && match.team_a_id !== nextTeamA) update.team_a_id = nextTeamA;
        if ((force || !match.team_b_id) && nextTeamB && match.team_b_id !== nextTeamB) update.team_b_id = nextTeamB;

        if ('team_a_id' in update || 'team_b_id' in update) updates.push(update);
      });

    if (updates.length === 0) return 0;

    await Promise.all(
      updates.map((update) => {
        const payload: Record<string, string | null> = { updated_at: new Date().toISOString() };
        if ('team_a_id' in update) payload.team_a_id = update.team_a_id ?? null;
        if ('team_b_id' in update) payload.team_b_id = update.team_b_id ?? null;
        return supabase.from('tournament_matches').update(payload).eq('id', update.matchId);
      }),
    );

    return updates.length;
  }

  async function refreshFinalPhase(force = true) {
    if (!id) return;
    setUpdatingFinals(true);
    setErrorMessage('');
    setSuccessMessage('');

    const { data, error } = await supabase
      .from('tournament_matches')
      .select('*')
      .eq('tournament_id', id)
      .order('match_number', { ascending: true });

    if (error) {
      setErrorMessage('Não foi possível carregar os jogos para atualizar a fase final.');
      setUpdatingFinals(false);
      return;
    }

    const count = await autofillFinalPhase(data || [], { force });
    setSuccessMessage(count > 0 ? `Fase final atualizada em ${count} jogo(s).` : 'Fase final já estava atualizada ou ainda faltam resultados.');
    await loadData();
    setUpdatingFinals(false);
  }

  async function generateMatches() {
    if (!id) return;

    if (schedulerPreview.matches.length === 0) {
      setErrorMessage('Não existem jogos para gerar. Confirma equipas, grupos e regras.');
      return;
    }

    if (matches.length > 0) {
      const confirmRegenerate = window.confirm(
        'Já existem jogos neste torneio. Ao gerar novamente, os jogos atuais serão removidos. Queres continuar?',
      );
      if (!confirmRegenerate) return;
    }

    setGenerating(true);
    setErrorMessage('');
    setSuccessMessage('');

    const { error: deleteError } = await supabase.from('tournament_matches').delete().eq('tournament_id', id);
    if (deleteError) {
      setGenerating(false);
      setErrorMessage('Não foi possível remover os jogos atuais.');
      return;
    }

    const payload = schedulerPreview.matches.map((match) => ({
      tournament_id: id,
      group_id: match.group_id,
      field_id: match.field_id,
      team_a_id: match.team_a_id,
      team_b_id: match.team_b_id,
      team_a_placeholder: match.team_a_placeholder,
      team_b_placeholder: match.team_b_placeholder,
      team_a_source: match.team_a_source,
      team_b_source: match.team_b_source,
      round_number: match.round_number,
      phase: match.phase,
      match_number: match.match_number,
      match_date: match.match_date,
      match_time: match.match_time ? `${match.match_time}:00` : null,
      status: 'scheduled',
      score_a: null,
      score_b: null,
      penalty_score_a: null,
      penalty_score_b: null,
      notes: match.notes,
    }));

    const { error: insertError } = await supabase.from('tournament_matches').insert(payload);

    if (insertError) {
      setGenerating(false);
      setErrorMessage('Não foi possível gerar os jogos. Confirma as permissões e as colunas da tabela tournament_matches.');
      return;
    }

    const capacity = schedulerPreview.capacityReport;
    setLastCapacityReport([
      `Jogos da fase de grupos: ${capacity.scheduledGroupMatches}/${capacity.groupMatches}`,
      `Jogos da fase final: ${capacity.scheduledFinalMatches}/${capacity.finalMatches}`,
      `Slots disponíveis: ${capacity.totalSlots}`,
      ...schedulerPreview.warnings,
    ]);
    setSuccessMessage('Jogos gerados com sucesso. Revê a proposta e ajusta manualmente se necessário.');
    await loadData();
    setGenerating(false);
  }

  async function addManualMatch() {
    if (!id) return;
    const firstDay = days[0];
    const firstField = activeFields[0];
    const maxMatchNumber = matches.reduce((max, match) => Math.max(max, match.match_number), 0);

    const { error } = await supabase.from('tournament_matches').insert({
      tournament_id: id,
      group_id: null,
      field_id: firstField?.id || null,
      team_a_id: null,
      team_b_id: null,
      team_a_placeholder: 'Grupo A',
      team_b_placeholder: 'Grupo B',
      team_a_source: null,
      team_b_source: null,
      round_number: null,
      phase: 'manual',
      match_number: maxMatchNumber + 1,
      match_date: firstDay?.day_date || null,
      match_time: firstDay?.start_time || null,
      status: 'scheduled',
      score_a: null,
      score_b: null,
      penalty_score_a: null,
      penalty_score_b: null,
      notes: 'Jogo manual',
    });

    if (error) {
      setErrorMessage('Não foi possível criar jogo manual.');
      return;
    }

    setSuccessMessage('Jogo manual criado com sucesso.');
    await loadData();
  }

  async function addGoal(match: TournamentManagerMatch, teamId: string | null, playerId: string) {
    if (!id || !teamId || !playerId) {
      setErrorMessage('Seleciona uma equipa e um jogador para registar o golo.');
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');

    const { error } = await supabase.from('tournament_match_goals').insert({
      tournament_id: id,
      match_id: match.id,
      team_id: teamId,
      player_id: playerId,
      is_own_goal: false,
    });

    if (error) {
      setErrorMessage('Não foi possível registar o marcador. Confirma se o SQL dos marcadores foi executado.');
      return;
    }

    setSuccessMessage('Marcador adicionado ao jogo.');
    await loadData();
  }

  async function removeGoal(goal: TournamentManagerMatchGoal) {
    const playerName = playerById[goal.player_id]?.name || 'este marcador';
    const confirmed = window.confirm(`Queres remover o golo de ${playerName}?`);

    if (!confirmed) return;

    setErrorMessage('');
    setSuccessMessage('');

    const { error } = await supabase.from('tournament_match_goals').delete().eq('id', goal.id);

    if (error) {
      setErrorMessage('Não foi possível remover o marcador.');
      return;
    }

    setSuccessMessage('Marcador removido do jogo.');
    await loadData();
  }

  async function saveMatch(match: TournamentManagerMatch) {
    const draft = drafts[match.id];
    if (!draft) return;

    setSavingMatchId(match.id);
    setErrorMessage('');
    setSuccessMessage('');

    const scoreA = normalizeScore(draft.score_a);
    const scoreB = normalizeScore(draft.score_b);
    const isPenaltyPhase = isFinalPhase(draft.phase);
    const penaltyScoreA = isPenaltyPhase ? normalizeScore(draft.penalty_score_a) : null;
    const penaltyScoreB = isPenaltyPhase ? normalizeScore(draft.penalty_score_b) : null;

    if (isPenaltyPhase && scoreA !== null && scoreB !== null && scoreA === scoreB) {
      if (penaltyScoreA === null || penaltyScoreB === null) {
        setErrorMessage('Em jogos da fase final empatados, indica o resultado dos penáltis antes de guardar.');
        return;
      }

      if (penaltyScoreA === penaltyScoreB) {
        setErrorMessage('O resultado dos penáltis não pode terminar empatado.');
        return;
      }
    }

    const shouldAutoFinish = scoreA !== null && scoreB !== null && draft.status === 'scheduled';

    const { error } = await supabase
      .from('tournament_matches')
      .update({
        phase: draft.phase,
        group_id: draft.phase === 'group' ? match.group_id : null,
        match_date: draft.match_date || null,
        match_time: draft.match_time ? `${draft.match_time}:00` : null,
        field_id: draft.field_id || null,
        team_a_id: draft.team_a_id || null,
        team_b_id: draft.team_b_id || null,
        team_a_placeholder: draft.team_a_placeholder || null,
        team_b_placeholder: draft.team_b_placeholder || null,
        team_a_source: draft.team_a_source || null,
        team_b_source: draft.team_b_source || null,
        round_number: draft.round_number ? Number(draft.round_number) : null,
        status: shouldAutoFinish ? 'finished' : draft.status,
        score_a: scoreA,
        score_b: scoreB,
        penalty_score_a: isPenaltyPhase && scoreA !== null && scoreB !== null && scoreA === scoreB ? penaltyScoreA : null,
        penalty_score_b: isPenaltyPhase && scoreA !== null && scoreB !== null && scoreA === scoreB ? penaltyScoreB : null,
        notes: draft.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', match.id);

    if (error) {
      setErrorMessage('Não foi possível guardar o jogo.');
      setSavingMatchId(null);
      return;
    }

    const { data: currentMatches, error: matchesError } = await supabase
      .from('tournament_matches')
      .select('*')
      .eq('tournament_id', id)
      .order('match_number', { ascending: true });

    if (!matchesError && currentMatches) {
      await autofillFinalPhase(currentMatches, { force: false });
    }

    setSuccessMessage('Jogo guardado com sucesso.');
    await loadData();
    setSavingMatchId(null);
  }

  async function deleteMatch(match: TournamentManagerMatch) {
    const confirmDelete = window.confirm(`Remover o jogo ${match.match_number}?`);
    if (!confirmDelete) return;

    setDeletingMatchId(match.id);
    setErrorMessage('');
    setSuccessMessage('');

    const { error } = await supabase.from('tournament_matches').delete().eq('id', match.id);

    if (error) {
      setErrorMessage('Não foi possível remover o jogo.');
      setDeletingMatchId(null);
      return;
    }

    setSuccessMessage('Jogo removido com sucesso.');
    await loadData();
    setDeletingMatchId(null);
  }

  if (loading) {
    return <div className="text-slate-600">A carregar jogos...</div>;
  }

  if (!tournament) {
    return <div className="text-slate-600">Torneio não encontrado.</div>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div>
        <Link to={`/admin/gestor-torneios/${tournament.id}`} className="text-sm font-semibold text-green-700 hover:text-green-800">
          ← Voltar ao torneio
        </Link>
        <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-green-700">Gestor de Torneios</p>
            <h1 className="text-3xl font-bold text-slate-900">Jogos e resultados</h1>
            <p className="mt-2 max-w-3xl text-slate-600">
              Gera a proposta de calendário, ajusta os jogos, lança resultados e atualiza automaticamente a fase final quando possível.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={generateMatches}
              disabled={generating}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-700 px-4 py-3 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60"
            >
              <RefreshCw className="h-4 w-4" />
              {generating ? 'A gerar...' : matches.length > 0 ? 'Gerar novamente' : 'Gerar jogos'}
            </button>
            <button
              type="button"
              onClick={() => refreshFinalPhase(true)}
              disabled={updatingFinals}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm font-semibold text-yellow-800 hover:bg-yellow-100 disabled:opacity-60"
            >
              <Trophy className="h-4 w-4" />
              {updatingFinals ? 'A atualizar...' : 'Atualizar fase final'}
            </button>
            <button
              type="button"
              onClick={addManualMatch}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Adicionar jogo manual
            </button>
          </div>
        </div>
      </div>

      {errorMessage && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{errorMessage}</div>}
      {successMessage && <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-700">{successMessage}</div>}

      <div className="grid gap-4 lg:grid-cols-4">
        <SummaryCard title="Jogos" value={String(matches.length)} icon={<CalendarDays className="h-5 w-5" />} />
        <SummaryCard title="Com resultado" value={String(matches.filter(hasResult).length)} icon={<CheckCircle2 className="h-5 w-5" />} />
        <SummaryCard title="Erros" value={String(calendarValidation.errorCount)} icon={<AlertTriangle className="h-5 w-5" />} />
        <SummaryCard title="Avisos" value={String(calendarValidation.warningCount)} icon={<AlertTriangle className="h-5 w-5" />} />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">Validação do calendário</h2>
        <p className="mt-1 text-sm text-slate-600">
          Erros: {calendarValidation.errorCount} · Avisos: {calendarValidation.warningCount}
        </p>
        {lastCapacityReport.length > 0 && (
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {lastCapacityReport.map((item) => (
              <div key={item} className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                {item}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        {orderedMatches.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-slate-600">
            Ainda não existem jogos. Clica em <strong>Gerar jogos</strong> para criar uma proposta inicial.
          </div>
        ) : (
          orderedMatches.map((match) => {
            const draft = drafts[match.id] || matchToDraft(match);
            const issues = calendarValidation.issuesByMatchId[match.id] || [];
            const endTime = draft.match_time ? getTournamentMatchEndTime(draft.match_time, rules) : '-';
            const group = match.group_id ? groupById[match.group_id] : null;
            const teamAName = getDraftTeamName(draft, 'a', teamById);
            const teamBName = getDraftTeamName(draft, 'b', teamById);
            const matchGoalList = goalsByMatchId[match.id] || [];
            const teamAGoals = match.team_a_id ? matchGoalList.filter((goal) => goal.team_id === match.team_a_id) : [];
            const teamBGoals = match.team_b_id ? matchGoalList.filter((goal) => goal.team_id === match.team_b_id) : [];
            const expectedScoreA = draft.score_a === '' ? null : Number(draft.score_a);
            const expectedScoreB = draft.score_b === '' ? null : Number(draft.score_b);
            const hasGoalWarningA = expectedScoreA !== null && expectedScoreA !== teamAGoals.length;
            const hasGoalWarningB = expectedScoreB !== null && expectedScoreB !== teamBGoals.length;

            return (
              <article key={match.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">Jogo {match.match_number}</h3>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${getPhaseBadgeClass(draft.phase)}`}>
                        {phaseLabels[draft.phase] || draft.phase}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${getStatusBadgeClass(draft.status)}`}>
                        {statusOptions.find((item) => item.value === draft.status)?.label || draft.status}
                      </span>
                      {group && <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">{group.name}</span>}
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1"><CalendarDays className="h-4 w-4" /> {formatDate(draft.match_date)}</span>
                      <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" /> {formatTime(draft.match_time)}–{endTime}</span>
                      <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" /> {draft.field_id ? fieldById[draft.field_id]?.name || 'Campo' : 'Campo por definir'}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => saveMatch(match)}
                      disabled={savingMatchId === match.id}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-700 px-3 py-2 text-xs font-semibold text-white hover:bg-green-800 disabled:opacity-60"
                    >
                      <Save className="h-4 w-4" />
                      {savingMatchId === match.id ? 'A guardar...' : 'Guardar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteMatch(match)}
                      disabled={deletingMatchId === match.id}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                    >
                      <Trash2 className="h-4 w-4" />
                      {deletingMatchId === match.id ? 'A remover...' : 'Remover'}
                    </button>
                  </div>
                </div>

                {issues.length > 0 && (
                  <div className="border-b border-slate-200 bg-amber-50 px-5 py-3">
                    <div className="flex flex-wrap gap-2">
                      {issues.map((issue) => (
                        <span
                          key={`${issue.severity}-${issue.message}`}
                          className={`rounded-lg px-3 py-2 text-xs font-semibold ${issue.severity === 'error' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-800'}`}
                        >
                          {issue.message}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid gap-4 p-4 xl:grid-cols-[210px_minmax(520px,1fr)_210px]">
                  <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Dados do jogo</h4>
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                      <Field label="Fase">
                        <select value={draft.phase} onChange={(event) => updateDraft(match.id, 'phase', event.target.value)} className="input-control">
                          <option value="group">Fase de grupos</option>
                          <option value="quarter_final">Quartos de final</option>
                          <option value="semi_final">Meias-finais</option>
                          <option value="third_place">3.º e 4.º lugar</option>
                          <option value="final">Final</option>
                          <option value="manual">Manual</option>
                        </select>
                      </Field>
                      <Field label="Data">
                        <select value={draft.match_date} onChange={(event) => updateDraft(match.id, 'match_date', event.target.value)} className="input-control">
                          <option value="">Selecionar</option>
                          {days.map((day) => <option key={day.id} value={day.day_date}>{formatDate(day.day_date)}</option>)}
                        </select>
                      </Field>
                      <Field label="Hora">
                        <input type="time" value={draft.match_time} onChange={(event) => updateDraft(match.id, 'match_time', event.target.value)} className="input-control" />
                      </Field>
                      <Field label="Campo">
                        <select value={draft.field_id} onChange={(event) => updateDraft(match.id, 'field_id', event.target.value)} className="input-control">
                          <option value="">Selecionar</option>
                          {activeFields.map((field) => <option key={field.id} value={field.id}>{field.name}</option>)}
                        </select>
                      </Field>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h4 className="text-xs font-bold uppercase tracking-wide text-slate-600">Confronto e resultado</h4>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">{teamAName} x {teamBName}</span>
                    </div>

                    <div className="grid items-center gap-3 lg:grid-cols-[1fr_150px_1fr]">
                      <TeamPanel
                        label="Equipa A"
                        teamId={draft.team_a_id}
                        placeholder={draft.team_a_placeholder}
                        teams={orderedTeams}
                        onTeamChange={(value) => updateDraft(match.id, 'team_a_id', value)}
                        onPlaceholderChange={(value) => updateDraft(match.id, 'team_a_placeholder', value)}
                      />

                      <div className="rounded-xl bg-slate-950 p-3 text-center text-white shadow-lg">
                        <p className="mb-2 text-[9px] font-black uppercase tracking-[0.22em] text-slate-300">Resultado</p>
                        <div className="flex items-center justify-center gap-2">
                          <input
                            type="number"
                            min="0"
                            value={draft.score_a}
                            onChange={(event) => updateDraft(match.id, 'score_a', event.target.value)}
                            className="h-12 w-14 rounded-lg border-0 bg-white text-center text-xl font-black text-slate-900 outline-none ring-2 ring-white/20 focus:ring-green-300"
                          />
                          <span className="text-xl font-black">x</span>
                          <input
                            type="number"
                            min="0"
                            value={draft.score_b}
                            onChange={(event) => updateDraft(match.id, 'score_b', event.target.value)}
                            className="h-12 w-14 rounded-lg border-0 bg-white text-center text-xl font-black text-slate-900 outline-none ring-2 ring-white/20 focus:ring-green-300"
                          />
                        </div>

                        {isFinalPhase(draft.phase) && draft.score_a !== '' && draft.score_b !== '' && draft.score_a === draft.score_b && (
                          <div className="mt-3 rounded-lg bg-white/10 p-2">
                            <p className="mb-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-slate-300">Penáltis</p>
                            <div className="flex items-center justify-center gap-2">
                              <input
                                type="number"
                                min="0"
                                value={draft.penalty_score_a}
                                onChange={(event) => updateDraft(match.id, 'penalty_score_a', event.target.value)}
                                className="h-9 w-12 rounded-md border-0 bg-white text-center text-sm font-black text-slate-900 outline-none ring-2 ring-white/20 focus:ring-green-300"
                              />
                              <span className="text-sm font-black">x</span>
                              <input
                                type="number"
                                min="0"
                                value={draft.penalty_score_b}
                                onChange={(event) => updateDraft(match.id, 'penalty_score_b', event.target.value)}
                                className="h-9 w-12 rounded-md border-0 bg-white text-center text-sm font-black text-slate-900 outline-none ring-2 ring-white/20 focus:ring-green-300"
                              />
                            </div>
                            <p className="mt-1 text-[10px] font-semibold text-slate-300">Usado apenas para definir quem avança.</p>
                          </div>
                        )}
                      </div>

                      <TeamPanel
                        label="Equipa B"
                        teamId={draft.team_b_id}
                        placeholder={draft.team_b_placeholder}
                        teams={orderedTeams}
                        onTeamChange={(value) => updateDraft(match.id, 'team_b_id', value)}
                        onPlaceholderChange={(value) => updateDraft(match.id, 'team_b_placeholder', value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Estado e notas</h4>
                    <Field label="Estado">
                      <select value={draft.status} onChange={(event) => updateDraft(match.id, 'status', event.target.value)} className="input-control">
                        {statusOptions.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                      </select>
                    </Field>
                    <Field label="Notas">
                      <textarea
                        value={draft.notes}
                        onChange={(event) => updateDraft(match.id, 'notes', event.target.value)}
                        rows={3}
                        className="input-control min-h-[88px] resize-y text-sm"
                        placeholder="Notas internas, ronda, observações..."
                      />
                    </Field>
                  </div>
                </div>

                <MatchScorersEditor
                  match={match}
                  teamAName={teamAName}
                  teamBName={teamBName}
                  teamAPlayers={match.team_a_id ? playersByTeamId[match.team_a_id] || [] : []}
                  teamBPlayers={match.team_b_id ? playersByTeamId[match.team_b_id] || [] : []}
                  teamAGoals={teamAGoals}
                  teamBGoals={teamBGoals}
                  playerById={playerById}
                  expectedScoreA={expectedScoreA}
                  expectedScoreB={expectedScoreB}
                  hasGoalWarningA={hasGoalWarningA}
                  hasGoalWarningB={hasGoalWarningB}
                  onAddGoal={addGoal}
                  onRemoveGoal={removeGoal}
                />
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}

function MatchScorersEditor({
  match,
  teamAName,
  teamBName,
  teamAPlayers,
  teamBPlayers,
  teamAGoals,
  teamBGoals,
  playerById,
  expectedScoreA,
  expectedScoreB,
  hasGoalWarningA,
  hasGoalWarningB,
  onAddGoal,
  onRemoveGoal,
}: {
  match: TournamentManagerMatch;
  teamAName: string;
  teamBName: string;
  teamAPlayers: TournamentManagerPlayer[];
  teamBPlayers: TournamentManagerPlayer[];
  teamAGoals: TournamentManagerMatchGoal[];
  teamBGoals: TournamentManagerMatchGoal[];
  playerById: Record<string, TournamentManagerPlayer>;
  expectedScoreA: number | null;
  expectedScoreB: number | null;
  hasGoalWarningA: boolean;
  hasGoalWarningB: boolean;
  onAddGoal: (match: TournamentManagerMatch, teamId: string | null, playerId: string) => void;
  onRemoveGoal: (goal: TournamentManagerMatchGoal) => void;
}) {
  const [selectedPlayerA, setSelectedPlayerA] = useState('');
  const [selectedPlayerB, setSelectedPlayerB] = useState('');

  function handleAddA() {
    onAddGoal(match, match.team_a_id, selectedPlayerA);
    setSelectedPlayerA('');
  }

  function handleAddB() {
    onAddGoal(match, match.team_b_id, selectedPlayerB);
    setSelectedPlayerB('');
  }

  return (
    <div className="border-t border-slate-200 bg-white p-4">
      <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <div>
          <h4 className="text-sm font-black uppercase tracking-wide text-slate-700">Marcadores do jogo</h4>
          <p className="text-xs text-slate-500">Seleciona os jogadores que marcaram. Esta informação aparece no site público e alimenta o melhor marcador.</p>
        </div>
      </div>

      {(hasGoalWarningA || hasGoalWarningB) && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
          Atenção: o resultado manual e o número de marcadores ainda não coincidem.
          {hasGoalWarningA && <span> {teamAName}: resultado {expectedScoreA}, marcadores {teamAGoals.length}.</span>}
          {hasGoalWarningB && <span> {teamBName}: resultado {expectedScoreB}, marcadores {teamBGoals.length}.</span>}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <ScorersTeamPanel
          title={teamAName}
          teamId={match.team_a_id}
          players={teamAPlayers}
          goals={teamAGoals}
          playerById={playerById}
          selectedPlayerId={selectedPlayerA}
          onSelectedPlayerChange={setSelectedPlayerA}
          onAddGoal={handleAddA}
          onRemoveGoal={onRemoveGoal}
        />

        <ScorersTeamPanel
          title={teamBName}
          teamId={match.team_b_id}
          players={teamBPlayers}
          goals={teamBGoals}
          playerById={playerById}
          selectedPlayerId={selectedPlayerB}
          onSelectedPlayerChange={setSelectedPlayerB}
          onAddGoal={handleAddB}
          onRemoveGoal={onRemoveGoal}
        />
      </div>
    </div>
  );
}

function ScorersTeamPanel({
  title,
  teamId,
  players,
  goals,
  playerById,
  selectedPlayerId,
  onSelectedPlayerChange,
  onAddGoal,
  onRemoveGoal,
}: {
  title: string;
  teamId: string | null;
  players: TournamentManagerPlayer[];
  goals: TournamentManagerMatchGoal[];
  playerById: Record<string, TournamentManagerPlayer>;
  selectedPlayerId: string;
  onSelectedPlayerChange: (value: string) => void;
  onAddGoal: () => void;
  onRemoveGoal: (goal: TournamentManagerMatchGoal) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <h5 className="font-bold text-slate-900">{title}</h5>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600">{goals.length} golo(s)</span>
      </div>

      {!teamId ? (
        <p className="mt-4 text-sm text-slate-500">Seleciona primeiro a equipa neste jogo.</p>
      ) : players.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">Esta equipa ainda não tem jogadores. Adiciona-os na página de equipas.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <select
            value={selectedPlayerId}
            onChange={(event) => onSelectedPlayerChange(event.target.value)}
            className="input-control"
          >
            <option value="">Selecionar jogador</option>
            {players.map((player) => (
              <option key={player.id} value={player.id}>
                {player.shirt_number ? `#${player.shirt_number} · ` : ''}{player.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onAddGoal}
            disabled={!selectedPlayerId}
            className="rounded-xl bg-green-700 px-4 py-2 text-sm font-bold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Adicionar golo
          </button>
        </div>
      )}

      {goals.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {goals.map((goal) => {
            const player = playerById[goal.player_id];
            return (
              <button
                key={goal.id}
                type="button"
                onClick={() => onRemoveGoal(goal)}
                className="rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-red-50 hover:text-red-700"
                title="Remover este golo"
              >
                ⚽ {player?.shirt_number ? `#${player.shirt_number} ` : ''}{player?.name || 'Jogador removido'} ×
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{value}</p>
        </div>
        <div className="rounded-2xl bg-green-50 p-3 text-green-700">{icon}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function TeamPanel({
  label,
  teamId,
  placeholder,
  teams,
  onTeamChange,
  onPlaceholderChange,
}: {
  label: string;
  teamId: string;
  placeholder: string;
  teams: TournamentManagerTeam[];
  onTeamChange: (value: string) => void;
  onPlaceholderChange: (value: string) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-slate-500">{label}</p>
      <select value={teamId} onChange={(event) => onTeamChange(event.target.value)} className="input-control">
        <option value="">Por definir</option>
        {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
      </select>
      <input
        type="text"
        value={placeholder}
        onChange={(event) => onPlaceholderChange(event.target.value)}
        className="input-control mt-2 text-xs"
        placeholder="Placeholder: 1.º Grupo A, Vencedor MF1..."
      />
    </div>
  );
}
