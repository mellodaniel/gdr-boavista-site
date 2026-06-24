import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, RefreshCw, Save, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  generateTournamentSchedule,
  getTournamentMatchDurationMinutes,
  getTournamentMatchEndTime,
} from '../../lib/tournamentScheduler';
import type {
  TournamentManagerDay,
  TournamentManagerField,
  TournamentManagerGroup,
  TournamentManagerGroupTeam,
  TournamentManagerMatch,
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
  notes: string;
};

type CalendarIssue = {
  matchId: string;
  severity: 'error' | 'warning';
  message: string;
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

function getTeamDisplay(match: TournamentManagerMatch, side: 'a' | 'b', teamById: Record<string, TournamentManagerTeam>) {
  const teamId = side === 'a' ? match.team_a_id : match.team_b_id;
  const placeholder = side === 'a' ? match.team_a_placeholder : match.team_b_placeholder;
  if (teamId && teamById[teamId]) return teamById[teamId].name;
  return placeholder || 'Por definir';
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
    notes: match.notes || '',
  };
}

function normalizeScore(value: string) {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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
  const [drafts, setDrafts] = useState<Record<string, MatchDraft>>({});

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [savingMatchId, setSavingMatchId] = useState<string | null>(null);
  const [deletingMatchId, setDeletingMatchId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [lastCapacityReport, setLastCapacityReport] = useState<string[]>([]);

  const orderedFields = useMemo(() => {
    return [...fields].sort((a, b) => a.name.localeCompare(b.name, 'pt'));
  }, [fields]);

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
      const dateCompare = (a.match_date || '').localeCompare(b.match_date || '');
      if (dateCompare !== 0) return dateCompare;
      const timeCompare = (a.match_time || '').localeCompare(b.match_time || '');
      if (timeCompare !== 0) return timeCompare;
      const fieldA = a.field_id ? fieldById[a.field_id]?.name || '' : '';
      const fieldB = b.field_id ? fieldById[b.field_id]?.name || '' : '';
      const fieldCompare = fieldA.localeCompare(fieldB, 'pt');
      if (fieldCompare !== 0) return fieldCompare;
      return a.match_number - b.match_number;
    });
  }, [matches, fieldById]);

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

    function addIssue(matchId: string, severity: CalendarIssue['severity'], message: string) {
      const issue = { matchId, severity, message };
      issues.push(issue);
      issuesByMatchId[matchId] = [...(issuesByMatchId[matchId] || []), issue];
    }

    const scheduledMatches = orderedMatches.map((match) => {
      const startMinutes = match.match_time ? timeToMinutes(match.match_time) : null;
      const endMinutes = startMinutes === null ? null : startMinutes + matchDuration;
      return { match, startMinutes, endMinutes };
    });

    scheduledMatches.forEach(({ match, startMinutes, endMinutes }) => {
      const hasTeamOrPlaceholderA = Boolean(match.team_a_id || match.team_a_placeholder);
      const hasTeamOrPlaceholderB = Boolean(match.team_b_id || match.team_b_placeholder);

      if (!hasTeamOrPlaceholderA || !hasTeamOrPlaceholderB) {
        addIssue(match.id, 'warning', 'Jogo com uma ou duas equipas por definir.');
      }

      if (match.team_a_id && match.team_b_id && match.team_a_id === match.team_b_id) {
        addIssue(match.id, 'error', 'A mesma equipa está definida dos dois lados do confronto.');
      }

      if (!match.match_date || !match.match_time) {
        addIssue(match.id, 'warning', 'Jogo sem data ou hora definida.');
        return;
      }

      if (!match.field_id) {
        addIssue(match.id, 'warning', 'Jogo sem campo definido.');
      }

      const day = dayByDate[match.match_date];
      if (!day) {
        addIssue(match.id, 'error', 'Jogo marcado num dia que não está configurado no torneio.');
        return;
      }

      if (startMinutes === null || endMinutes === null) return;

      const dayStart = timeToMinutes(day.start_time);
      const dayEnd = timeToMinutes(day.end_time);

      if (startMinutes < dayStart || endMinutes > dayEnd) {
        addIssue(match.id, 'error', 'Jogo fora do horário permitido para este dia.');
      }

      if (day.lunch_start && day.lunch_end) {
        const lunchStart = timeToMinutes(day.lunch_start);
        const lunchEnd = timeToMinutes(day.lunch_end);
        if (rangesOverlap(startMinutes, endMinutes, lunchStart, lunchEnd)) {
          addIssue(match.id, 'error', 'Jogo sobrepõe a pausa configurada para este dia.');
        }
      }
    });

    for (let firstIndex = 0; firstIndex < scheduledMatches.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < scheduledMatches.length; secondIndex += 1) {
        const first = scheduledMatches[firstIndex];
        const second = scheduledMatches[secondIndex];

        if (
          !first.match.match_date ||
          !second.match.match_date ||
          first.match.match_date !== second.match.match_date ||
          first.startMinutes === null ||
          first.endMinutes === null ||
          second.startMinutes === null ||
          second.endMinutes === null
        ) {
          continue;
        }

        const overlaps = rangesOverlap(first.startMinutes, first.endMinutes, second.startMinutes, second.endMinutes);

        if (overlaps && first.match.field_id && first.match.field_id === second.match.field_id) {
          addIssue(first.match.id, 'error', `Conflito de campo com o jogo ${second.match.match_number}.`);
          addIssue(second.match.id, 'error', `Conflito de campo com o jogo ${first.match.match_number}.`);
        }

        const firstTeams = [first.match.team_a_id, first.match.team_b_id].filter(Boolean);
        const secondTeams = [second.match.team_a_id, second.match.team_b_id].filter(Boolean);
        const sharedTeam = firstTeams.find((teamId) => secondTeams.includes(teamId));

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
    ] = await Promise.all([
      supabase.from('tournaments').select('*').eq('id', id).single(),
      supabase.from('tournament_days').select('*').eq('tournament_id', id).order('day_date', { ascending: true }),
      supabase.from('tournament_fields').select('*').eq('tournament_id', id).order('name', { ascending: true }),
      supabase.from('tournament_teams').select('*').eq('tournament_id', id).order('sort_order', { ascending: true }).order('name', { ascending: true }),
      supabase.from('tournament_groups').select('*').eq('tournament_id', id).order('sort_order', { ascending: true }).order('name', { ascending: true }),
      supabase.from('tournament_group_teams').select('*').eq('tournament_id', id).order('sort_order', { ascending: true }),
      supabase.from('tournament_rules').select('*').eq('tournament_id', id).maybeSingle(),
      supabase.from('tournament_matches').select('*').eq('tournament_id', id).order('match_number', { ascending: true }),
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
      matchesResult.error
    ) {
      setErrorMessage('Não foi possível carregar todos os dados necessários para os jogos.');
      setLoading(false);
      return;
    }

    setTournament(tournamentResult.data);
    setDays(daysResult.data || []);
    setFields(fieldsResult.data || []);
    setTeams(teamsResult.data || []);
    setGroups(groupsResult.data || []);
    setAssignments(assignmentsResult.data || []);
    setRules(rulesResult.data || null);
    setMatches(matchesResult.data || []);

    const draftMap = (matchesResult.data || []).reduce<Record<string, MatchDraft>>((acc, match) => {
      acc[match.id] = matchToDraft(match);
      return acc;
    }, {});
    setDrafts(draftMap);
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
      notes: match.notes,
    }));

    const { error: insertError } = await supabase.from('tournament_matches').insert(payload);

    if (insertError) {
      setGenerating(false);
      setErrorMessage('Não foi possível gerar os jogos. Confirma as permissões e as colunas da tabela tournament_matches.');
      return;
    }

    await supabase
      .from('tournaments')
      .update({ status: 'calendar_generated', updated_at: new Date().toISOString() })
      .eq('id', id);

    const report = schedulerPreview.capacityReport;
    setLastCapacityReport([
      `Jogos de grupos: ${report.groupMatches}`,
      `Jogos de fase final: ${report.finalMatches}`,
      `Slots disponíveis: ${report.totalSlots}`,
      `Slots reservados para finais: ${report.slotsReservedForFinals}`,
      `Jogos não agendados: ${report.unscheduledGroupMatches + report.unscheduledFinalMatches}`,
    ]);

    setSuccessMessage('Calendário gerado com scheduler inteligente, incluindo fase de grupos e placeholders da fase final.');
    await loadData();
    setGenerating(false);
  }

  async function addManualMatch() {
    if (!id) return;

    const nextNumber = matches.length === 0 ? 1 : Math.max(...matches.map((match) => match.match_number)) + 1;
    const firstDay = days[0];
    const firstField = activeFields[0];

    const { error } = await supabase.from('tournament_matches').insert({
      tournament_id: id,
      group_id: null,
      field_id: firstField?.id || null,
      team_a_id: null,
      team_b_id: null,
      team_a_placeholder: 'Equipa A',
      team_b_placeholder: 'Equipa B',
      team_a_source: null,
      team_b_source: null,
      round_number: null,
      phase: 'manual',
      match_number: nextNumber,
      match_date: firstDay?.day_date || null,
      match_time: firstDay?.start_time || null,
      status: 'scheduled',
      score_a: null,
      score_b: null,
      notes: 'Jogo criado manualmente.',
    });

    if (error) {
      setErrorMessage('Não foi possível criar o jogo manual.');
      return;
    }

    setSuccessMessage('Jogo manual criado.');
    await loadData();
  }

  async function saveMatch(match: TournamentManagerMatch) {
    const draft = drafts[match.id];
    if (!draft) return;

    setSavingMatchId(match.id);
    setErrorMessage('');
    setSuccessMessage('');

    const payload = {
      phase: draft.phase,
      match_date: draft.match_date || null,
      match_time: draft.match_time ? `${draft.match_time}:00` : null,
      field_id: draft.field_id || null,
      team_a_id: draft.team_a_id || null,
      team_b_id: draft.team_b_id || null,
      team_a_placeholder: draft.team_a_id ? null : draft.team_a_placeholder.trim() || null,
      team_b_placeholder: draft.team_b_id ? null : draft.team_b_placeholder.trim() || null,
      team_a_source: draft.team_a_source.trim() || null,
      team_b_source: draft.team_b_source.trim() || null,
      round_number: draft.round_number ? Number(draft.round_number) : null,
      status: draft.status,
      score_a: normalizeScore(draft.score_a),
      score_b: normalizeScore(draft.score_b),
      notes: draft.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('tournament_matches').update(payload).eq('id', match.id);

    if (error) {
      setErrorMessage('Não foi possível guardar o jogo.');
      setSavingMatchId(null);
      return;
    }

    setSuccessMessage(`Jogo ${match.match_number} guardado.`);
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

    setSuccessMessage(`Jogo ${match.match_number} removido.`);
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
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Link to={`/admin/gestor-torneios/${tournament.id}`} className="text-sm font-semibold text-green-700 hover:text-green-800">
            ← Voltar ao torneio
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-slate-900">Jogos do torneio</h1>
          <p className="mt-2 max-w-4xl text-slate-600">
            Gera, valida e ajusta os jogos. O scheduler cria rondas equilibradas, distribui carga entre dias e campos,
            respeita descanso mínimo e reserva placeholders para meias-finais, final e 3.º/4.º lugar.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={generateMatches}
            disabled={generating}
            className="inline-flex items-center gap-2 rounded-xl bg-green-700 px-5 py-3 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60"
          >
            <RefreshCw className="h-4 w-4" />
            {generating ? 'A gerar...' : 'Gerar jogos'}
          </button>
          <button
            type="button"
            onClick={addManualMatch}
            className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Adicionar jogo manual
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{errorMessage}</div>
      )}

      {successMessage && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700">{successMessage}</div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-1 h-5 w-5 text-green-700" />
          <div>
            <h2 className="text-xl font-bold text-slate-900">Relatório do scheduler</h2>
            <p className="mt-1 text-sm text-slate-600">
              Capacidade estimada: {schedulerPreview.capacityReport.totalSlots} slots · Jogos de grupos:{' '}
              {schedulerPreview.capacityReport.groupMatches} · Fase final: {schedulerPreview.capacityReport.finalMatches}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {schedulerPreview.capacityReport.daySlots.map((item) => (
            <div key={item.date} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-bold text-slate-900">{formatDate(item.date)}</p>
              <p className="mt-1 text-sm text-slate-600">{item.slots} slot(s) disponíveis</p>
            </div>
          ))}
        </div>

        {schedulerPreview.warnings.length > 0 && (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-bold">Avisos de geração</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {schedulerPreview.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        {lastCapacityReport.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {lastCapacityReport.map((item) => (
              <span key={item} className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-800">
                {item}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-xl font-bold text-slate-900">Validação do calendário</h2>
          <p className="mt-1 text-sm text-slate-600">
            Erros: {calendarValidation.errorCount} · Avisos: {calendarValidation.warningCount}
          </p>
        </div>

        {orderedMatches.length === 0 ? (
          <div className="p-6 text-slate-600">Ainda não existem jogos. Clica em “Gerar jogos”.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Jogo e ações</th>
                  <th className="px-4 py-3">Grupo/Fase</th>
                  <th className="px-4 py-3">Horário</th>
                  <th className="px-4 py-3">Campo</th>
                  <th className="px-4 py-3">Confronto e resultado</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {orderedMatches.map((match) => {
                  const draft = drafts[match.id] || matchToDraft(match);
                  const issues = calendarValidation.issuesByMatchId[match.id] || [];
                  const hasError = issues.some((issue) => issue.severity === 'error');
                  const hasWarning = issues.some((issue) => issue.severity === 'warning');

                  return (
                    <tr key={match.id} className={hasError ? 'bg-red-50' : hasWarning ? 'bg-amber-50' : 'bg-white'}>
                      <td className="px-4 py-4 align-top">
                        <div className="font-bold text-slate-900">Jogo {match.match_number}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {formatDate(draft.match_date)} · {formatTime(draft.match_time)}–{getTournamentMatchEndTime(draft.match_time, rules)}
                        </div>
                        <div className="mt-3 flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => saveMatch(match)}
                            disabled={savingMatchId === match.id}
                            className="inline-flex items-center justify-center gap-1 rounded-lg bg-green-700 px-3 py-2 text-xs font-semibold text-white hover:bg-green-800 disabled:opacity-60"
                          >
                            <Save className="h-3 w-3" /> Guardar
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteMatch(match)}
                            disabled={deletingMatchId === match.id}
                            className="inline-flex items-center justify-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                          >
                            <Trash2 className="h-3 w-3" /> Remover
                          </button>
                        </div>
                        {issues.length > 0 && (
                          <div className="mt-3 space-y-1">
                            {issues.map((issue) => (
                              <div
                                key={`${match.id}-${issue.message}`}
                                className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${
                                  issue.severity === 'error'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-amber-100 text-amber-700'
                                }`}
                              >
                                <AlertTriangle className="mr-1 inline h-3 w-3" />
                                {issue.message}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-4 align-top">
                        <select
                          value={draft.phase}
                          onChange={(event) => updateDraft(match.id, 'phase', event.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        >
                          {Object.entries(phaseLabels).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                        <div className="mt-2 text-xs text-slate-500">
                          {match.group_id ? groupById[match.group_id]?.name || '-' : '-'}
                        </div>
                      </td>

                      <td className="px-4 py-4 align-top">
                        <select
                          value={draft.match_date}
                          onChange={(event) => updateDraft(match.id, 'match_date', event.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        >
                          <option value="">Sem data</option>
                          {days.map((day) => (
                            <option key={day.id} value={day.day_date}>{formatDate(day.day_date)}</option>
                          ))}
                        </select>
                        <input
                          type="time"
                          value={draft.match_time}
                          onChange={(event) => updateDraft(match.id, 'match_time', event.target.value)}
                          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                        <div className="mt-1 text-xs text-slate-500">até {getTournamentMatchEndTime(draft.match_time, rules)}</div>
                      </td>

                      <td className="px-4 py-4 align-top">
                        <select
                          value={draft.field_id}
                          onChange={(event) => updateDraft(match.id, 'field_id', event.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        >
                          <option value="">Sem campo</option>
                          {activeFields.map((field) => (
                            <option key={field.id} value={field.id}>{field.name}</option>
                          ))}
                        </select>
                      </td>

                      <td className="px-4 py-4 align-top">
                        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                          <div>
                            <select
                              value={draft.team_a_id}
                              onChange={(event) => updateDraft(match.id, 'team_a_id', event.target.value)}
                              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            >
                              <option value="">Por definir</option>
                              {orderedTeams.map((team) => (
                                <option key={team.id} value={team.id}>{team.name}</option>
                              ))}
                            </select>
                            {!draft.team_a_id && (
                              <input
                                type="text"
                                value={draft.team_a_placeholder}
                                onChange={(event) => updateDraft(match.id, 'team_a_placeholder', event.target.value)}
                                placeholder="Placeholder"
                                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                              />
                            )}
                          </div>

                          <div className="rounded-xl bg-slate-50 px-3 py-2 text-center">
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                value={draft.score_a}
                                onChange={(event) => updateDraft(match.id, 'score_a', event.target.value)}
                                className="w-12 rounded-lg border border-slate-300 px-2 py-2 text-center text-sm"
                              />
                              <span className="text-xs font-bold text-slate-500">x</span>
                              <input
                                type="number"
                                min="0"
                                value={draft.score_b}
                                onChange={(event) => updateDraft(match.id, 'score_b', event.target.value)}
                                className="w-12 rounded-lg border border-slate-300 px-2 py-2 text-center text-sm"
                              />
                            </div>
                          </div>

                          <div>
                            <select
                              value={draft.team_b_id}
                              onChange={(event) => updateDraft(match.id, 'team_b_id', event.target.value)}
                              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            >
                              <option value="">Por definir</option>
                              {orderedTeams.map((team) => (
                                <option key={team.id} value={team.id}>{team.name}</option>
                              ))}
                            </select>
                            {!draft.team_b_id && (
                              <input
                                type="text"
                                value={draft.team_b_placeholder}
                                onChange={(event) => updateDraft(match.id, 'team_b_placeholder', event.target.value)}
                                placeholder="Placeholder"
                                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                              />
                            )}
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-slate-500">
                          Visual: {getTeamDisplay(match, 'a', teamById)} x {getTeamDisplay(match, 'b', teamById)}
                        </div>
                      </td>

                      <td className="px-4 py-4 align-top">
                        <select
                          value={draft.status}
                          onChange={(event) => updateDraft(match.id, 'status', event.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        >
                          {statusOptions.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </td>

                      <td className="px-4 py-4 align-top">
                        <textarea
                          value={draft.notes}
                          onChange={(event) => updateDraft(match.id, 'notes', event.target.value)}
                          rows={4}
                          className="w-full min-w-[220px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
