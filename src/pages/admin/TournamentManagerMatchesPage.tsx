import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
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
  status: string;
  score_a: string;
  score_b: string;
  notes: string;
};

type Slot = {
  match_date: string;
  match_time: string;
  match_end_time: string;
  field_id: string;
  start_minutes: number;
  end_minutes: number;
  slot_key: string;
};

type Pairing = {
  group_id: string;
  team_a_id: string;
  team_b_id: string;
};

type ScheduledPairing = Pairing & Slot;

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

function minutesToTime(value: number) {
  const normalized = ((value % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function rangesOverlap(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && startB < endA;
}

function getMatchDurationMinutes(rules: TournamentManagerRule | null) {
  const matchParts = rules?.match_parts || 2;
  const minutesPerPart = rules?.minutes_per_part || 12;
  const halftimeMinutes = matchParts > 1 ? rules?.halftime_minutes || 0 : 0;
  return matchParts * minutesPerPart + halftimeMinutes;
}

function getSlotDurationMinutes(rules: TournamentManagerRule | null) {
  return getMatchDurationMinutes(rules) + (rules?.minutes_between_matches || 0);
}

function getMatchEndTime(startTime: string | null, rules: TournamentManagerRule | null) {
  if (!startTime) return '-';
  return minutesToTime(timeToMinutes(startTime) + getMatchDurationMinutes(rules));
}

function matchToDraft(match: TournamentManagerMatch): MatchDraft {
  return {
    phase: match.phase || 'group',
    match_date: match.match_date || '',
    match_time: match.match_time ? formatTime(match.match_time) : '',
    field_id: match.field_id || '',
    team_a_id: match.team_a_id || '',
    team_b_id: match.team_b_id || '',
    status: match.status || 'scheduled',
    score_a: match.score_a === null || match.score_a === undefined ? '' : String(match.score_a),
    score_b: match.score_b === null || match.score_b === undefined ? '' : String(match.score_b),
    notes: match.notes || '',
  };
}

function buildSlots(days: TournamentManagerDay[], fields: TournamentManagerField[], rules: TournamentManagerRule | null): Slot[] {
  const activeFields = fields.filter((field) => field.is_active);
  const orderedDays = [...days].sort((a, b) => a.day_date.localeCompare(b.day_date));

  const matchDuration = getMatchDurationMinutes(rules);
  const slotDuration = getSlotDurationMinutes(rules);
  const slots: Slot[] = [];

  orderedDays.forEach((day) => {
    const dayStart = timeToMinutes(day.start_time);
    const dayEnd = timeToMinutes(day.end_time);
    const lunchStart = day.lunch_start ? timeToMinutes(day.lunch_start) : null;
    const lunchEnd = day.lunch_end ? timeToMinutes(day.lunch_end) : null;

    let current = dayStart;

    while (current + matchDuration <= dayEnd) {
      if (
        lunchStart !== null &&
        lunchEnd !== null &&
        current < lunchEnd &&
        current + matchDuration > lunchStart
      ) {
        current = lunchEnd;
        continue;
      }

      activeFields.forEach((field) => {
        const matchTime = minutesToTime(current);
        slots.push({
          match_date: day.day_date,
          match_time: matchTime,
          match_end_time: minutesToTime(current + matchDuration),
          field_id: field.id,
          start_minutes: current,
          end_minutes: current + matchDuration,
          slot_key: `${day.day_date}-${matchTime}`,
        });
      });

      current += slotDuration;
    }
  });

  return slots;
}

function buildRoundRobinRounds(teamIds: string[]) {
  const teams = [...teamIds];
  if (teams.length < 2) return [];

  if (teams.length % 2 !== 0) {
    teams.push('BYE');
  }

  const rounds: Array<Array<{ team_a_id: string; team_b_id: string }>> = [];
  const totalRounds = teams.length - 1;
  const matchesPerRound = teams.length / 2;
  let rotating = [...teams];

  for (let round = 0; round < totalRounds; round += 1) {
    const roundMatches: Array<{ team_a_id: string; team_b_id: string }> = [];

    for (let index = 0; index < matchesPerRound; index += 1) {
      const first = rotating[index];
      const second = rotating[rotating.length - 1 - index];

      if (first !== 'BYE' && second !== 'BYE') {
        if (round % 2 === 0) {
          roundMatches.push({ team_a_id: first, team_b_id: second });
        } else {
          roundMatches.push({ team_a_id: second, team_b_id: first });
        }
      }
    }

    rounds.push(roundMatches);

    const fixed = rotating[0];
    const last = rotating[rotating.length - 1];
    const middle = rotating.slice(1, rotating.length - 1);
    rotating = [fixed, last, ...middle];
  }

  return rounds;
}

function buildBalancedGroupPairings(
  groups: TournamentManagerGroup[],
  teamsByGroupId: Record<string, TournamentManagerTeam[]>
): Pairing[] {
  const groupRounds = groups.map((group) => ({
    group,
    rounds: buildRoundRobinRounds((teamsByGroupId[group.id] || []).map((team) => team.id)),
  }));

  const maxRounds = Math.max(0, ...groupRounds.map((item) => item.rounds.length));
  const pairings: Pairing[] = [];

  for (let roundIndex = 0; roundIndex < maxRounds; roundIndex += 1) {
    groupRounds.forEach(({ group, rounds }) => {
      (rounds[roundIndex] || []).forEach((match) => {
        pairings.push({
          group_id: group.id,
          team_a_id: match.team_a_id,
          team_b_id: match.team_b_id,
        });
      });
    });
  }

  return pairings;
}

function schedulePairings(pairings: Pairing[], slots: Slot[], rules: TournamentManagerRule | null) {
  const usedSlotIndexes = new Set<number>();
  const teamsBySlotKey = new Map<string, Set<string>>();
  const lastEndByTeam = new Map<string, { date: string; end_minutes: number }>();
  const minRestMinutes = rules?.min_rest_minutes || 0;
  const scheduled: ScheduledPairing[] = [];

  for (const pairing of pairings) {
    let selectedSlotIndex = -1;

    for (let slotIndex = 0; slotIndex < slots.length; slotIndex += 1) {
      if (usedSlotIndexes.has(slotIndex)) continue;

      const slot = slots[slotIndex];
      const busyTeams = teamsBySlotKey.get(slot.slot_key) || new Set<string>();

      if (busyTeams.has(pairing.team_a_id) || busyTeams.has(pairing.team_b_id)) {
        continue;
      }

      const lastA = lastEndByTeam.get(pairing.team_a_id);
      const lastB = lastEndByTeam.get(pairing.team_b_id);

      const teamAHasRest = !lastA || lastA.date !== slot.match_date || slot.start_minutes - lastA.end_minutes >= minRestMinutes;
      const teamBHasRest = !lastB || lastB.date !== slot.match_date || slot.start_minutes - lastB.end_minutes >= minRestMinutes;

      if (!teamAHasRest || !teamBHasRest) {
        continue;
      }

      selectedSlotIndex = slotIndex;
      break;
    }

    if (selectedSlotIndex === -1) {
      return {
        scheduled,
        unscheduledCount: pairings.length - scheduled.length,
      };
    }

    const selectedSlot = slots[selectedSlotIndex];
    usedSlotIndexes.add(selectedSlotIndex);

    const busyTeams = teamsBySlotKey.get(selectedSlot.slot_key) || new Set<string>();
    busyTeams.add(pairing.team_a_id);
    busyTeams.add(pairing.team_b_id);
    teamsBySlotKey.set(selectedSlot.slot_key, busyTeams);

    lastEndByTeam.set(pairing.team_a_id, {
      date: selectedSlot.match_date,
      end_minutes: selectedSlot.end_minutes,
    });
    lastEndByTeam.set(pairing.team_b_id, {
      date: selectedSlot.match_date,
      end_minutes: selectedSlot.end_minutes,
    });

    scheduled.push({
      ...pairing,
      ...selectedSlot,
    });
  }

  return {
    scheduled,
    unscheduledCount: 0,
  };
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

  const orderedFields = useMemo(() => {
    return [...fields].sort((a, b) => a.name.localeCompare(b.name, 'pt'));
  }, [fields]);

  const activeFields = useMemo(() => {
    return orderedFields.filter((field) => field.is_active);
  }, [orderedFields]);

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

  const teamsByGroupId = useMemo(() => {
    return orderedGroups.reduce<Record<string, TournamentManagerTeam[]>>((acc, group) => {
      const teamIds = assignments
        .filter((assignment) => assignment.group_id === group.id)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((assignment) => assignment.team_id);

      acc[group.id] = teamIds
        .map((teamId) => teamById[teamId])
        .filter(Boolean);

      return acc;
    }, {});
  }, [assignments, orderedGroups, teamById]);

  const availableSlots = useMemo(() => {
    return buildSlots(days, activeFields, rules);
  }, [days, activeFields, rules]);

  const plannedPairingsCount = useMemo(() => {
    return buildBalancedGroupPairings(orderedGroups, teamsByGroupId).length;
  }, [orderedGroups, teamsByGroupId]);

  const dayByDate = useMemo(() => {
    return days.reduce<Record<string, TournamentManagerDay>>((acc, day) => {
      acc[day.day_date] = day;
      return acc;
    }, {});
  }, [days]);

  const calendarValidation = useMemo(() => {
    const issues: CalendarIssue[] = [];
    const issuesByMatchId: Record<string, CalendarIssue[]> = {};
    const matchDurationMinutes = getMatchDurationMinutes(rules);
    const restMinutes = rules?.min_rest_minutes || 0;

    function addIssue(matchId: string, severity: CalendarIssue['severity'], message: string) {
      const issue = { matchId, severity, message };
      issues.push(issue);
      issuesByMatchId[matchId] = [...(issuesByMatchId[matchId] || []), issue];
    }

    const scheduledMatches = orderedMatches.map((match) => {
      const startMinutes = match.match_time ? timeToMinutes(match.match_time) : null;
      const endMinutes = startMinutes === null ? null : startMinutes + matchDurationMinutes;

      return {
        match,
        startMinutes,
        endMinutes,
      };
    });

    scheduledMatches.forEach(({ match, startMinutes, endMinutes }) => {
      if (!match.team_a_id || !match.team_b_id) {
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

        const overlaps = rangesOverlap(
          first.startMinutes,
          first.endMinutes,
          second.startMinutes,
          second.endMinutes
        );

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

        if (restGap >= 0 && restGap < restMinutes) {
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
  }, [dayByDate, orderedMatches, rules]);

  const matchDuration = getMatchDurationMinutes(rules);
  const intervalBetweenMatches = rules?.minutes_between_matches || 0;
  const minRestMinutes = rules?.min_rest_minutes || 0;

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
      supabase
        .from('tournament_days')
        .select('*')
        .eq('tournament_id', id)
        .order('day_date', { ascending: true }),
      supabase
        .from('tournament_fields')
        .select('*')
        .eq('tournament_id', id)
        .order('name', { ascending: true }),
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
      supabase
        .from('tournament_rules')
        .select('*')
        .eq('tournament_id', id)
        .maybeSingle(),
      supabase
        .from('tournament_matches')
        .select('*')
        .eq('tournament_id', id)
        .order('match_number', { ascending: true }),
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
      setErrorMessage('Não foi possível carregar a configuração de jogos. Confirma se os SQLs das entregas anteriores foram executados.');
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
    setDrafts(
      loadedMatches.reduce<Record<string, MatchDraft>>((acc, match) => {
        acc[match.id] = matchToDraft(match);
        return acc;
      }, {})
    );
    setLoading(false);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function updateDraft(matchId: string, key: keyof MatchDraft, value: string) {
    setDrafts((current) => ({
      ...current,
      [matchId]: {
        ...current[matchId],
        [key]: value,
      },
    }));
  }

  function getTeamName(teamId: string | null) {
    if (!teamId) return 'Por definir';
    return teamById[teamId]?.name || 'Equipa removida';
  }

  function getFieldName(fieldId: string | null) {
    if (!fieldId) return 'Por definir';
    return fieldById[fieldId]?.name || 'Campo removido';
  }

  function getGroupName(groupId: string | null) {
    if (!groupId) return '-';
    return groupById[groupId]?.name || 'Grupo removido';
  }

  function validateBeforeGenerate() {
    if (days.length === 0) {
      return 'Configura pelo menos um dia do torneio antes de gerar jogos.';
    }

    if (activeFields.length === 0) {
      return 'Configura pelo menos um campo ativo antes de gerar jogos.';
    }

    if (orderedGroups.length === 0) {
      return 'Cria pelo menos um grupo antes de gerar jogos.';
    }

    const groupsWithoutEnoughTeams = orderedGroups.filter((group) => (teamsByGroupId[group.id] || []).length < 2);

    if (groupsWithoutEnoughTeams.length > 0) {
      return `Os seguintes grupos não têm equipas suficientes: ${groupsWithoutEnoughTeams.map((group) => group.name).join(', ')}.`;
    }

    if (plannedPairingsCount === 0) {
      return 'Não existem jogos possíveis para gerar. Confirma as equipas atribuídas aos grupos.';
    }

    if (availableSlots.length < plannedPairingsCount) {
      return `Não existem horários/campos suficientes para todos os jogos. Jogos necessários: ${plannedPairingsCount}. Horários disponíveis: ${availableSlots.length}.`;
    }

    return '';
  }

  async function generateGroupMatches() {
    if (!id) return;

    const validationError = validateBeforeGenerate();

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    const pairings = buildBalancedGroupPairings(orderedGroups, teamsByGroupId);
    const schedulingResult = schedulePairings(pairings, availableSlots, rules);

    if (schedulingResult.unscheduledCount > 0) {
      setErrorMessage(
        `Não foi possível encaixar ${schedulingResult.unscheduledCount} jogo(s) respeitando descanso mínimo e horários disponíveis. Sugestão: aumenta os horários, reduz a duração dos jogos, reduz o descanso mínimo ou adiciona mais campos.`
      );
      return;
    }

    const confirmed = matches.length === 0
      ? true
      : window.confirm('Já existem jogos neste torneio. Queres apagar os jogos atuais e gerar uma nova proposta?');

    if (!confirmed) return;

    setGenerating(true);
    setErrorMessage('');
    setSuccessMessage('');

    if (matches.length > 0) {
      const { error: deleteError } = await supabase
        .from('tournament_matches')
        .delete()
        .eq('tournament_id', id);

      if (deleteError) {
        setErrorMessage('Não foi possível remover os jogos existentes. Confirma as permissões RLS.');
        setGenerating(false);
        return;
      }
    }

    const payload = schedulingResult.scheduled.map((match, index) => ({
      tournament_id: id,
      group_id: match.group_id,
      team_a_id: match.team_a_id,
      team_b_id: match.team_b_id,
      field_id: match.field_id,
      phase: 'group',
      match_number: index + 1,
      match_date: match.match_date,
      match_time: match.match_time,
      status: 'scheduled',
      score_a: null,
      score_b: null,
      notes: null,
    }));

    const { error: insertError } = await supabase.from('tournament_matches').insert(payload);

    if (insertError) {
      setErrorMessage('Não foi possível criar os jogos. Confirma se o SQL da Entrega 5 foi executado e as permissões RLS.');
      setGenerating(false);
      return;
    }

    await supabase
      .from('tournaments')
      .update({
        status: 'calendar_generated',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    setSuccessMessage('Proposta de jogos gerada com horários paralelos por campo e proteção contra equipas a jogar em sequência sem descanso.');
    await loadData();
    setGenerating(false);
  }

  async function addManualMatch() {
    if (!id) return;

    setErrorMessage('');
    setSuccessMessage('');

    const nextNumber = matches.length + 1;
    const firstSlot = availableSlots[0];

    const { error } = await supabase.from('tournament_matches').insert({
      tournament_id: id,
      group_id: null,
      field_id: firstSlot?.field_id || null,
      team_a_id: null,
      team_b_id: null,
      phase: 'manual',
      match_number: nextNumber,
      match_date: firstSlot?.match_date || null,
      match_time: firstSlot?.match_time || null,
      status: 'scheduled',
      score_a: null,
      score_b: null,
      notes: 'Jogo criado manualmente',
    });

    if (error) {
      setErrorMessage('Não foi possível criar o jogo manual.');
      return;
    }

    setSuccessMessage('Jogo manual criado com sucesso.');
    await loadData();
  }

  async function saveMatch(matchId: string) {
    const draft = drafts[matchId];

    if (!draft) return;

    if (draft.team_a_id && draft.team_b_id && draft.team_a_id === draft.team_b_id) {
      setErrorMessage('A equipa A e a equipa B não podem ser a mesma equipa.');
      return;
    }

    setSavingMatchId(matchId);
    setErrorMessage('');
    setSuccessMessage('');

    const { error } = await supabase
      .from('tournament_matches')
      .update({
        phase: draft.phase || 'group',
        match_date: draft.match_date || null,
        match_time: draft.match_time || null,
        field_id: draft.field_id || null,
        team_a_id: draft.team_a_id || null,
        team_b_id: draft.team_b_id || null,
        status: draft.status || 'scheduled',
        score_a: draft.score_a === '' ? null : Number(draft.score_a),
        score_b: draft.score_b === '' ? null : Number(draft.score_b),
        notes: draft.notes.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', matchId);

    if (error) {
      setErrorMessage('Não foi possível guardar o jogo. Confirma as permissões RLS.');
      setSavingMatchId(null);
      return;
    }

    setSuccessMessage('Jogo atualizado com sucesso.');
    await loadData();
    setSavingMatchId(null);
  }

  async function deleteMatch(match: TournamentManagerMatch) {
    const confirmed = window.confirm(`Queres remover o jogo ${match.match_number}?`);

    if (!confirmed) return;

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
        <Link
          to={`/admin/gestor-torneios/${tournament.id}`}
          className="text-sm font-semibold text-green-700 hover:text-green-800"
        >
          ← Voltar ao torneio
        </Link>

        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
              Gestor de Torneios Boavista
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Jogos</h1>
            <p className="mt-2 max-w-3xl text-slate-600">
              Gera a proposta inicial da fase de grupos com horários paralelos por campo, descanso mínimo por equipa e edição manual.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={addManualMatch}
              className="rounded-xl border border-green-700 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-50"
            >
              Adicionar jogo manual
            </button>

            <button
              type="button"
              disabled={generating}
              onClick={generateGroupMatches}
              className="rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {generating ? 'A gerar...' : 'Gerar jogos'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <SummaryCard label="Dias" value={days.length} />
        <SummaryCard label="Campos ativos" value={activeFields.length} />
        <SummaryCard label="Equipas" value={teams.length} />
        <SummaryCard label="Grupos" value={groups.length} />
        <SummaryCard label="Jogos" value={matches.length} />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-4">
          <InfoCard label="Duração do jogo" value={`${matchDuration} min`} />
          <InfoCard label="Intervalo entre jogos" value={`${intervalBetweenMatches} min`} />
          <InfoCard label="Descanso mínimo" value={`${minRestMinutes} min`} />
          <InfoCard label="Horários disponíveis" value={availableSlots.length} />
        </div>
        <p className="mt-4 text-sm text-slate-600">
          Exemplo de lógica aplicada: se o jogo dura {matchDuration} min e o intervalo é de {intervalBetweenMatches} min, os jogos começam em blocos de {getSlotDurationMinutes(rules)} min. Em vários campos, os jogos podem começar à mesma hora, desde que a mesma equipa não esteja em dois jogos simultâneos e respeite o descanso mínimo definido.
        </p>
      </section>

      {successMessage && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-700">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {errorMessage}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Pré-validação</h2>
            <p className="mt-1 text-sm text-slate-600">
              Antes de gerar os jogos, confirma se datas, campos, equipas, grupos e regras estão configurados.
            </p>
          </div>

          <Link
            to={`/admin/gestor-torneios/${tournament.id}/regras`}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Ver regras
          </Link>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {orderedGroups.map((group) => (
            <div key={group.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">{group.name}</p>
              <p className="mt-1 text-sm text-slate-600">
                {(teamsByGroupId[group.id] || []).length} equipa(s)
              </p>
            </div>
          ))}
        </div>
      </section>

      {orderedMatches.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Validação do calendário</h2>
              <p className="mt-1 text-sm text-slate-600">
                Confirma automaticamente conflitos de campo, equipas em simultâneo, descanso mínimo, pausas e horários fora dos dias configurados.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${calendarValidation.errorCount > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                {calendarValidation.errorCount} erro(s)
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${calendarValidation.warningCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                {calendarValidation.warningCount} aviso(s)
              </span>
            </div>
          </div>

          {calendarValidation.issues.length === 0 ? (
            <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
              Não foram encontrados conflitos no calendário atual.
            </div>
          ) : (
            <div className="mt-5 space-y-2">
              {calendarValidation.issues.slice(0, 10).map((issue, index) => {
                const match = matches.find((item) => item.id === issue.matchId);

                return (
                  <div
                    key={`${issue.matchId}-${index}`}
                    className={`rounded-xl border p-3 text-sm ${issue.severity === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}
                  >
                    <strong>Jogo {match?.match_number || '-'}</strong>: {issue.message}
                  </div>
                );
              })}

              {calendarValidation.issues.length > 10 && (
                <p className="text-sm text-slate-500">
                  Existem mais {calendarValidation.issues.length - 10} conflito(s)/aviso(s). Consulta as marcações em cada linha da tabela.
                </p>
              )}
            </div>
          )}
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-xl font-bold text-slate-900">Calendário de jogos</h2>
          <p className="mt-1 text-sm text-slate-600">
            A proposta automática pode ser ajustada manualmente. Usa os botões Guardar/Remover dentro da coluna do jogo; o resultado fica no centro do confronto.
          </p>
        </div>

        {orderedMatches.length === 0 ? (
          <div className="p-6 text-slate-600">
            Ainda não existem jogos. Clica em <strong>Gerar jogos</strong> para criar a fase de grupos.
          </div>
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
                  <th className="px-4 py-3">Observações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {orderedMatches.map((match) => {
                  const draft = drafts[match.id] || matchToDraft(match);
                  const endTime = getMatchEndTime(draft.match_time, rules);
                  const rowIssues = calendarValidation.issuesByMatchId[match.id] || [];
                  const hasErrors = rowIssues.some((issue) => issue.severity === 'error');
                  const hasWarnings = rowIssues.some((issue) => issue.severity === 'warning');

                  return (
                    <tr
                      key={match.id}
                      className={`align-top hover:bg-slate-50 ${hasErrors ? 'bg-red-50/70' : hasWarnings ? 'bg-amber-50/70' : ''}`}
                    >
                      <td className="px-4 py-4">
                        <p className="font-bold text-slate-900">Jogo {match.match_number}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatDate(draft.match_date || null)} · {draft.match_time || '--:--'}–{endTime}
                        </p>

                        {rowIssues.length > 0 && (
                          <div className="mt-3 space-y-1">
                            {rowIssues.slice(0, 3).map((issue, index) => (
                              <p
                                key={`${match.id}-issue-${index}`}
                                className={`rounded-lg px-2 py-1 text-xs font-semibold ${issue.severity === 'error' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}
                              >
                                {issue.message}
                              </p>
                            ))}
                          </div>
                        )}

                        <div className="mt-4 flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => saveMatch(match.id)}
                            disabled={savingMatchId === match.id}
                            className="rounded-lg bg-green-700 px-3 py-2 text-xs font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {savingMatchId === match.id ? 'A guardar...' : 'Guardar'}
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteMatch(match)}
                            disabled={deletingMatchId === match.id}
                            className="rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deletingMatchId === match.id ? 'A remover...' : 'Remover'}
                          </button>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <p className="mb-2 text-sm font-semibold text-slate-700">{getGroupName(match.group_id)}</p>
                        <select
                          value={draft.phase}
                          onChange={(event) => updateDraft(match.id, 'phase', event.target.value)}
                          className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        >
                          {Object.entries(phaseLabels).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </td>

                      <td className="px-4 py-4">
                        <div className="space-y-2">
                          <select
                            value={draft.match_date}
                            onChange={(event) => updateDraft(match.id, 'match_date', event.target.value)}
                            className="w-36 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                          >
                            <option value="">Sem data</option>
                            {days.map((day) => (
                              <option key={day.id} value={day.day_date}>{formatDate(day.day_date)}</option>
                            ))}
                          </select>

                          <div className="flex items-center gap-2">
                            <input
                              type="time"
                              value={draft.match_time}
                              onChange={(event) => updateDraft(match.id, 'match_time', event.target.value)}
                              className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            />
                            <span className="text-xs text-slate-500">até {endTime}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <select
                          value={draft.field_id}
                          onChange={(event) => updateDraft(match.id, 'field_id', event.target.value)}
                          className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        >
                          <option value="">Sem campo</option>
                          {orderedFields.map((field) => (
                            <option key={field.id} value={field.id}>{field.name}</option>
                          ))}
                        </select>
                      </td>

                      <td className="px-4 py-4">
                        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                          <select
                            value={draft.team_a_id}
                            onChange={(event) => updateDraft(match.id, 'team_a_id', event.target.value)}
                            className="w-52 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                          >
                            <option value="">Equipa A</option>
                            {orderedTeams.map((team) => (
                              <option key={team.id} value={team.id}>{team.name}</option>
                            ))}
                          </select>

                          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                            <input
                              type="number"
                              min="0"
                              aria-label="Golos equipa A"
                              value={draft.score_a}
                              onChange={(event) => updateDraft(match.id, 'score_a', event.target.value)}
                              className="w-12 rounded-lg border border-slate-300 px-2 py-1 text-center text-sm font-bold"
                            />
                            <span className="text-xs font-semibold text-slate-500">x</span>
                            <input
                              type="number"
                              min="0"
                              aria-label="Golos equipa B"
                              value={draft.score_b}
                              onChange={(event) => updateDraft(match.id, 'score_b', event.target.value)}
                              className="w-12 rounded-lg border border-slate-300 px-2 py-1 text-center text-sm font-bold"
                            />
                          </div>

                          <select
                            value={draft.team_b_id}
                            onChange={(event) => updateDraft(match.id, 'team_b_id', event.target.value)}
                            className="w-52 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                          >
                            <option value="">Equipa B</option>
                            {orderedTeams.map((team) => (
                              <option key={team.id} value={team.id}>{team.name}</option>
                            ))}
                          </select>
                        </div>

                        <p className="mt-2 text-xs text-slate-500">
                          Visual: {getTeamName(draft.team_a_id)} x {getTeamName(draft.team_b_id)}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <select
                          value={draft.status}
                          onChange={(event) => updateDraft(match.id, 'status', event.target.value)}
                          className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        >
                          {statusOptions.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </td>

                      <td className="px-4 py-4">
                        <textarea
                          value={draft.notes}
                          onChange={(event) => updateDraft(match.id, 'notes', event.target.value)}
                          rows={2}
                          className="w-44 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                          placeholder="Notas..."
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

      {orderedMatches.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Resumo por horário</h2>
          <p className="mt-1 text-sm text-slate-600">
            Esta vista ajuda a confirmar os jogos paralelos por campo e se o calendário está equilibrado.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {orderedMatches.map((match) => (
              <div key={match.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {formatDate(match.match_date)} · {formatTime(match.match_time)}–{getMatchEndTime(match.match_time, rules)} · {getFieldName(match.field_id)}
                </p>
                <p className="mt-2 font-semibold text-slate-900">
                  Jogo {match.match_number}: {getTeamName(match.team_a_id)} x {getTeamName(match.team_b_id)}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {getGroupName(match.group_id)} · {phaseLabels[match.phase] || match.phase}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
    </div>
  );
}
