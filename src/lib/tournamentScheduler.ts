export type SchedulerDay = {
  id?: string;
  day_date: string;
  start_time: string;
  end_time: string;
  lunch_start?: string | null;
  lunch_end?: string | null;
};

export type SchedulerField = {
  id: string;
  name: string;
  is_active?: boolean;
};

export type SchedulerTeam = {
  id: string;
  name: string;
  sort_order?: number;
};

export type SchedulerGroup = {
  id: string;
  name: string;
  sort_order?: number;
};

export type SchedulerGroupTeam = {
  group_id: string;
  team_id: string;
  sort_order?: number;
};

export type SchedulerRules = {
  qualifiers_per_group?: number;
  best_thirds_count?: number;
  has_quarter_finals?: boolean;
  has_semi_finals?: boolean;
  has_third_place_match?: boolean;
  has_final?: boolean;
  match_parts?: number;
  minutes_per_part?: number;
  halftime_minutes?: number;
  minutes_between_matches?: number;
  min_rest_minutes?: number;
};

export type SchedulerSlot = {
  match_date: string;
  match_time: string;
  match_end_time: string;
  field_id: string;
  field_name: string;
  start_minutes: number;
  end_minutes: number;
  slot_key: string;
  slot_index: number;
};

export type SchedulerMatchDraft = {
  phase: string;
  match_number: number;
  match_date: string | null;
  match_time: string | null;
  field_id: string | null;
  group_id: string | null;
  team_a_id: string | null;
  team_b_id: string | null;
  team_a_placeholder: string | null;
  team_b_placeholder: string | null;
  team_a_source: string | null;
  team_b_source: string | null;
  round_number: number | null;
  status: 'scheduled';
  score_a: null;
  score_b: null;
  notes: string | null;
};

export type SchedulerCapacityReport = {
  groupMatches: number;
  finalMatches: number;
  totalMatches: number;
  totalSlots: number;
  slotsReservedForFinals: number;
  slotsAvailableForGroups: number;
  scheduledGroupMatches: number;
  unscheduledGroupMatches: number;
  scheduledFinalMatches: number;
  unscheduledFinalMatches: number;
  daySlots: Array<{ date: string; slots: number }>;
};

export type SchedulerResult = {
  matches: SchedulerMatchDraft[];
  groupMatches: SchedulerMatchDraft[];
  finalPhaseMatches: SchedulerMatchDraft[];
  slots: SchedulerSlot[];
  warnings: string[];
  capacityReport: SchedulerCapacityReport;
};

type Pairing = {
  group_id: string;
  round_number: number;
  team_a_id: string;
  team_b_id: string;
};

type FinalTemplate = {
  phase: string;
  team_a_placeholder: string;
  team_b_placeholder: string;
  team_a_source: string;
  team_b_source: string;
  notes: string;
};

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

function getMatchDurationMinutes(rules?: SchedulerRules | null) {
  const matchParts = rules?.match_parts || 1;
  const minutesPerPart = rules?.minutes_per_part || 30;
  const halftimeMinutes = matchParts > 1 ? rules?.halftime_minutes || 0 : 0;
  return matchParts * minutesPerPart + halftimeMinutes;
}

function getSlotDurationMinutes(rules?: SchedulerRules | null) {
  return getMatchDurationMinutes(rules) + (rules?.minutes_between_matches || 0);
}

function normalizeTime(value: string | null | undefined) {
  if (!value) return null;
  return value.slice(0, 5);
}

function orderBySortAndName<T extends { sort_order?: number; name: string }>(items: T[]) {
  return [...items].sort((a, b) => {
    const sortA = a.sort_order ?? 0;
    const sortB = b.sort_order ?? 0;
    if (sortA !== sortB) return sortA - sortB;
    return a.name.localeCompare(b.name, 'pt');
  });
}

function buildSlots(days: SchedulerDay[], fields: SchedulerField[], rules?: SchedulerRules | null): SchedulerSlot[] {
  const activeFields = orderBySortAndName(
    fields.filter((field) => field.is_active !== false).map((field, index) => ({ ...field, sort_order: index + 1 })),
  );
  const orderedDays = [...days].sort((a, b) => a.day_date.localeCompare(b.day_date));
  const matchDuration = getMatchDurationMinutes(rules);
  const slotDuration = getSlotDurationMinutes(rules);
  const slots: SchedulerSlot[] = [];
  let slotIndex = 0;

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
          field_name: field.name,
          start_minutes: current,
          end_minutes: current + matchDuration,
          slot_key: `${day.day_date}-${matchTime}`,
          slot_index: slotIndex,
        });
        slotIndex += 1;
      });

      current += slotDuration;
    }
  });

  return slots.sort((a, b) => {
    const dateCompare = a.match_date.localeCompare(b.match_date);
    if (dateCompare !== 0) return dateCompare;
    const timeCompare = a.match_time.localeCompare(b.match_time);
    if (timeCompare !== 0) return timeCompare;
    return a.field_name.localeCompare(b.field_name, 'pt');
  });
}

function buildRoundRobinRounds(teamIds: string[]) {
  const teams = [...teamIds];
  if (teams.length < 2) return [];
  if (teams.length % 2 !== 0) teams.push('__BYE__');

  const rounds: Array<Array<{ team_a_id: string; team_b_id: string }>> = [];
  const totalRounds = teams.length - 1;
  const matchesPerRound = teams.length / 2;
  let rotation = [...teams];

  for (let roundIndex = 0; roundIndex < totalRounds; roundIndex += 1) {
    const round: Array<{ team_a_id: string; team_b_id: string }> = [];

    for (let matchIndex = 0; matchIndex < matchesPerRound; matchIndex += 1) {
      const first = rotation[matchIndex];
      const second = rotation[rotation.length - 1 - matchIndex];
      if (first === '__BYE__' || second === '__BYE__') continue;

      if (roundIndex % 2 === 0) {
        round.push({ team_a_id: first, team_b_id: second });
      } else {
        round.push({ team_a_id: second, team_b_id: first });
      }
    }

    rounds.push(round);

    const fixed = rotation[0];
    const last = rotation[rotation.length - 1];
    const middle = rotation.slice(1, rotation.length - 1);
    rotation = [fixed, last, ...middle];
  }

  return rounds;
}

function buildGroupPairings(
  groups: SchedulerGroup[],
  teams: SchedulerTeam[],
  assignments: SchedulerGroupTeam[],
): Pairing[] {
  const teamById = teams.reduce<Record<string, SchedulerTeam>>((acc, team) => {
    acc[team.id] = team;
    return acc;
  }, {});

  const orderedGroups = orderBySortAndName(groups);
  const groupRounds = orderedGroups.map((group) => {
    const teamIds = assignments
      .filter((assignment) => assignment.group_id === group.id)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((assignment) => assignment.team_id)
      .filter((teamId) => teamById[teamId]);

    return {
      group,
      rounds: buildRoundRobinRounds(teamIds),
    };
  });

  const maxRounds = Math.max(0, ...groupRounds.map((item) => item.rounds.length));
  const pairings: Pairing[] = [];

  for (let roundIndex = 0; roundIndex < maxRounds; roundIndex += 1) {
    groupRounds.forEach(({ group, rounds }) => {
      (rounds[roundIndex] || []).forEach((match) => {
        pairings.push({
          group_id: group.id,
          round_number: roundIndex + 1,
          team_a_id: match.team_a_id,
          team_b_id: match.team_b_id,
        });
      });
    });
  }

  return pairings;
}

function buildFinalTemplates(groups: SchedulerGroup[], rules?: SchedulerRules | null): FinalTemplate[] {
  const orderedGroups = orderBySortAndName(groups);
  const names = orderedGroups.map((group) => group.name);
  const templates: FinalTemplate[] = [];
  const qualifiersPerGroup = rules?.qualifiers_per_group ?? 2;

  if (rules?.has_quarter_finals && orderedGroups.length >= 4 && qualifiersPerGroup >= 2) {
    const groupA = names[0] || 'Grupo A';
    const groupB = names[1] || 'Grupo B';
    const groupC = names[2] || 'Grupo C';
    const groupD = names[3] || 'Grupo D';

    templates.push(
      {
        phase: 'quarter_final',
        team_a_placeholder: `1.º ${groupA}`,
        team_b_placeholder: `2.º ${groupB}`,
        team_a_source: `winner_group:${groupA}`,
        team_b_source: `runner_up_group:${groupB}`,
        notes: 'Quarto de final 1',
      },
      {
        phase: 'quarter_final',
        team_a_placeholder: `1.º ${groupB}`,
        team_b_placeholder: `2.º ${groupA}`,
        team_a_source: `winner_group:${groupB}`,
        team_b_source: `runner_up_group:${groupA}`,
        notes: 'Quarto de final 2',
      },
      {
        phase: 'quarter_final',
        team_a_placeholder: `1.º ${groupC}`,
        team_b_placeholder: `2.º ${groupD}`,
        team_a_source: `winner_group:${groupC}`,
        team_b_source: `runner_up_group:${groupD}`,
        notes: 'Quarto de final 3',
      },
      {
        phase: 'quarter_final',
        team_a_placeholder: `1.º ${groupD}`,
        team_b_placeholder: `2.º ${groupC}`,
        team_a_source: `winner_group:${groupD}`,
        team_b_source: `runner_up_group:${groupC}`,
        notes: 'Quarto de final 4',
      },
    );

    if (rules?.has_semi_finals !== false) {
      templates.push(
        {
          phase: 'semi_final',
          team_a_placeholder: 'Vencedor QF1',
          team_b_placeholder: 'Vencedor QF2',
          team_a_source: 'winner_match:quarter_final_1',
          team_b_source: 'winner_match:quarter_final_2',
          notes: 'Meia-final 1',
        },
        {
          phase: 'semi_final',
          team_a_placeholder: 'Vencedor QF3',
          team_b_placeholder: 'Vencedor QF4',
          team_a_source: 'winner_match:quarter_final_3',
          team_b_source: 'winner_match:quarter_final_4',
          notes: 'Meia-final 2',
        },
      );
    }
  } else if (rules?.has_semi_finals) {
    if (orderedGroups.length === 2 && qualifiersPerGroup >= 2) {
      const groupA = names[0] || 'Grupo A';
      const groupB = names[1] || 'Grupo B';
      templates.push(
        {
          phase: 'semi_final',
          team_a_placeholder: `1.º ${groupA}`,
          team_b_placeholder: `2.º ${groupB}`,
          team_a_source: `winner_group:${groupA}`,
          team_b_source: `runner_up_group:${groupB}`,
          notes: 'Meia-final 1',
        },
        {
          phase: 'semi_final',
          team_a_placeholder: `1.º ${groupB}`,
          team_b_placeholder: `2.º ${groupA}`,
          team_a_source: `winner_group:${groupB}`,
          team_b_source: `runner_up_group:${groupA}`,
          notes: 'Meia-final 2',
        },
      );
    } else if (orderedGroups.length === 3) {
      const groupA = names[0] || 'Grupo A';
      const groupB = names[1] || 'Grupo B';
      const groupC = names[2] || 'Grupo C';
      templates.push(
        {
          phase: 'semi_final',
          team_a_placeholder: `1.º ${groupA}`,
          team_b_placeholder: 'Melhor 2.º classificado',
          team_a_source: `winner_group:${groupA}`,
          team_b_source: 'best_runner_up',
          notes: 'Meia-final 1',
        },
        {
          phase: 'semi_final',
          team_a_placeholder: `1.º ${groupB}`,
          team_b_placeholder: `1.º ${groupC}`,
          team_a_source: `winner_group:${groupB}`,
          team_b_source: `winner_group:${groupC}`,
          notes: 'Meia-final 2',
        },
      );
    } else if (orderedGroups.length >= 4) {
      const groupA = names[0] || 'Grupo A';
      const groupB = names[1] || 'Grupo B';
      const groupC = names[2] || 'Grupo C';
      const groupD = names[3] || 'Grupo D';
      templates.push(
        {
          phase: 'semi_final',
          team_a_placeholder: `1.º ${groupA}`,
          team_b_placeholder: `1.º ${groupB}`,
          team_a_source: `winner_group:${groupA}`,
          team_b_source: `winner_group:${groupB}`,
          notes: 'Meia-final 1',
        },
        {
          phase: 'semi_final',
          team_a_placeholder: `1.º ${groupC}`,
          team_b_placeholder: `1.º ${groupD}`,
          team_a_source: `winner_group:${groupC}`,
          team_b_source: `winner_group:${groupD}`,
          notes: 'Meia-final 2',
        },
      );
    }
  }

  const hasSemiFinalTemplates = templates.some((template) => template.phase === 'semi_final');

  if (rules?.has_third_place_match && hasSemiFinalTemplates) {
    templates.push({
      phase: 'third_place',
      team_a_placeholder: 'Perdedor Meia-final 1',
      team_b_placeholder: 'Perdedor Meia-final 2',
      team_a_source: 'loser_match:semi_final_1',
      team_b_source: 'loser_match:semi_final_2',
      notes: 'Jogo de 3.º e 4.º lugar',
    });
  }

  if (rules?.has_final) {
    if (hasSemiFinalTemplates) {
      templates.push({
        phase: 'final',
        team_a_placeholder: 'Vencedor Meia-final 1',
        team_b_placeholder: 'Vencedor Meia-final 2',
        team_a_source: 'winner_match:semi_final_1',
        team_b_source: 'winner_match:semi_final_2',
        notes: 'Final',
      });
    } else if (orderedGroups.length >= 1) {
      templates.push({
        phase: 'final',
        team_a_placeholder: '1.º classificado geral',
        team_b_placeholder: '2.º classificado geral',
        team_a_source: 'overall_rank:1',
        team_b_source: 'overall_rank:2',
        notes: 'Final',
      });
    }
  }

  return templates;
}

function slotPenalty(
  pairing: Pairing,
  slot: SchedulerSlot,
  state: {
    usedSlotIndexes: Set<number>;
    teamsBySlotKey: Map<string, Set<string>>;
    lastEndByTeam: Map<string, { date: string; end_minutes: number }>;
    dayLoad: Map<string, number>;
    groupDayLoad: Map<string, Map<string, number>>;
    teamFieldLoad: Map<string, Map<string, number>>;
  },
  rules?: SchedulerRules | null,
) {
  if (state.usedSlotIndexes.has(slot.slot_index)) return Number.POSITIVE_INFINITY;

  const busyTeams = state.teamsBySlotKey.get(slot.slot_key) || new Set<string>();
  if (busyTeams.has(pairing.team_a_id) || busyTeams.has(pairing.team_b_id)) return Number.POSITIVE_INFINITY;

  const minRestMinutes = rules?.min_rest_minutes || 0;
  const lastA = state.lastEndByTeam.get(pairing.team_a_id);
  const lastB = state.lastEndByTeam.get(pairing.team_b_id);

  if (lastA && lastA.date === slot.match_date && slot.start_minutes - lastA.end_minutes < minRestMinutes) {
    return Number.POSITIVE_INFINITY;
  }

  if (lastB && lastB.date === slot.match_date && slot.start_minutes - lastB.end_minutes < minRestMinutes) {
    return Number.POSITIVE_INFINITY;
  }

  const groupLoadForDay = state.groupDayLoad.get(pairing.group_id)?.get(slot.match_date) || 0;
  const dayLoad = state.dayLoad.get(slot.match_date) || 0;
  const teamAFieldLoad = state.teamFieldLoad.get(pairing.team_a_id)?.get(slot.field_id) || 0;
  const teamBFieldLoad = state.teamFieldLoad.get(pairing.team_b_id)?.get(slot.field_id) || 0;

  let restPenalty = 0;

  [lastA, lastB].forEach((last) => {
    if (!last || last.date !== slot.match_date) return;
    const gap = slot.start_minutes - last.end_minutes;
    if (gap < minRestMinutes * 2) restPenalty += 20;
  });

  return dayLoad * 80 + groupLoadForDay * 45 + (teamAFieldLoad + teamBFieldLoad) * 15 + restPenalty + slot.slot_index * 0.001;
}

function reserveSlotsForFinals(slots: SchedulerSlot[], count: number) {
  if (count <= 0) {
    return {
      groupSlots: slots,
      finalSlots: [],
    };
  }

  const finalSlots = slots.slice(Math.max(0, slots.length - count));
  const finalSlotIndexes = new Set(finalSlots.map((slot) => slot.slot_index));

  return {
    groupSlots: slots.filter((slot) => !finalSlotIndexes.has(slot.slot_index)),
    finalSlots,
  };
}

export function generateTournamentSchedule(input: {
  groups: SchedulerGroup[];
  teams: SchedulerTeam[];
  assignments: SchedulerGroupTeam[];
  days: SchedulerDay[];
  fields: SchedulerField[];
  rules?: SchedulerRules | null;
}): SchedulerResult {
  const slots = buildSlots(input.days, input.fields, input.rules);
  const finalTemplates = buildFinalTemplates(input.groups, input.rules);
  const { groupSlots, finalSlots } = reserveSlotsForFinals(slots, finalTemplates.length);
  const pairings = buildGroupPairings(input.groups, input.teams, input.assignments);
  const warnings: string[] = [];

  const state = {
    usedSlotIndexes: new Set<number>(),
    teamsBySlotKey: new Map<string, Set<string>>(),
    lastEndByTeam: new Map<string, { date: string; end_minutes: number }>(),
    dayLoad: new Map<string, number>(),
    groupDayLoad: new Map<string, Map<string, number>>(),
    teamFieldLoad: new Map<string, Map<string, number>>(),
  };

  const groupMatches: SchedulerMatchDraft[] = [];

  pairings.forEach((pairing, index) => {
    let selectedSlot: SchedulerSlot | null = null;
    let selectedPenalty = Number.POSITIVE_INFINITY;

    groupSlots.forEach((slot) => {
      const penalty = slotPenalty(pairing, slot, state, input.rules);
      if (penalty < selectedPenalty) {
        selectedPenalty = penalty;
        selectedSlot = slot;
      }
    });

    if (!selectedSlot) {
      warnings.push(`Não foi possível agendar automaticamente o jogo ${index + 1} da fase de grupos.`);
      groupMatches.push({
        phase: 'group',
        match_number: index + 1,
        match_date: null,
        match_time: null,
        field_id: null,
        group_id: pairing.group_id,
        team_a_id: pairing.team_a_id,
        team_b_id: pairing.team_b_id,
        team_a_placeholder: null,
        team_b_placeholder: null,
        team_a_source: null,
        team_b_source: null,
        round_number: pairing.round_number,
        status: 'scheduled',
        score_a: null,
        score_b: null,
        notes: 'Jogo de fase de grupos gerado sem horário disponível.',
      });
      return;
    }

    const scheduledSlot = selectedSlot as SchedulerSlot;

    state.usedSlotIndexes.add(scheduledSlot.slot_index);

    const busyTeams = state.teamsBySlotKey.get(scheduledSlot.slot_key) || new Set<string>();
    busyTeams.add(pairing.team_a_id);
    busyTeams.add(pairing.team_b_id);
    state.teamsBySlotKey.set(scheduledSlot.slot_key, busyTeams);

    state.lastEndByTeam.set(pairing.team_a_id, {
      date: scheduledSlot.match_date,
      end_minutes: scheduledSlot.end_minutes,
    });
    state.lastEndByTeam.set(pairing.team_b_id, {
      date: scheduledSlot.match_date,
      end_minutes: scheduledSlot.end_minutes,
    });

    state.dayLoad.set(scheduledSlot.match_date, (state.dayLoad.get(scheduledSlot.match_date) || 0) + 1);

    const groupDayLoad = state.groupDayLoad.get(pairing.group_id) || new Map<string, number>();
    groupDayLoad.set(scheduledSlot.match_date, (groupDayLoad.get(scheduledSlot.match_date) || 0) + 1);
    state.groupDayLoad.set(pairing.group_id, groupDayLoad);

    [pairing.team_a_id, pairing.team_b_id].forEach((teamId) => {
      const fieldLoad = state.teamFieldLoad.get(teamId) || new Map<string, number>();
      fieldLoad.set(scheduledSlot.field_id, (fieldLoad.get(scheduledSlot.field_id) || 0) + 1);
      state.teamFieldLoad.set(teamId, fieldLoad);
    });

    groupMatches.push({
      phase: 'group',
      match_number: index + 1,
      match_date: scheduledSlot.match_date,
      match_time: scheduledSlot.match_time,
      field_id: scheduledSlot.field_id,
      group_id: pairing.group_id,
      team_a_id: pairing.team_a_id,
      team_b_id: pairing.team_b_id,
      team_a_placeholder: null,
      team_b_placeholder: null,
      team_a_source: null,
      team_b_source: null,
      round_number: pairing.round_number,
      status: 'scheduled',
      score_a: null,
      score_b: null,
      notes: `Fase de grupos · Ronda ${pairing.round_number}`,
    });
  });

  const finalPhaseMatches: SchedulerMatchDraft[] = finalTemplates.map((template, index) => {
    const slot = finalSlots[index] || null;
    if (!slot) {
      warnings.push(`Não existe slot disponível reservado para ${template.notes}.`);
    }

    return {
      phase: template.phase,
      match_number: groupMatches.length + index + 1,
      match_date: slot?.match_date || null,
      match_time: slot?.match_time || null,
      field_id: slot?.field_id || null,
      group_id: null,
      team_a_id: null,
      team_b_id: null,
      team_a_placeholder: template.team_a_placeholder,
      team_b_placeholder: template.team_b_placeholder,
      team_a_source: template.team_a_source,
      team_b_source: template.team_b_source,
      round_number: null,
      status: 'scheduled',
      score_a: null,
      score_b: null,
      notes: template.notes,
    };
  });

  const matches = [...groupMatches, ...finalPhaseMatches];
  const daySlots = input.days
    .map((day) => ({
      date: day.day_date,
      slots: slots.filter((slot) => slot.match_date === day.day_date).length,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    matches,
    groupMatches,
    finalPhaseMatches,
    slots,
    warnings,
    capacityReport: {
      groupMatches: pairings.length,
      finalMatches: finalTemplates.length,
      totalMatches: pairings.length + finalTemplates.length,
      totalSlots: slots.length,
      slotsReservedForFinals: finalTemplates.length,
      slotsAvailableForGroups: groupSlots.length,
      scheduledGroupMatches: groupMatches.filter((match) => match.match_date && match.match_time && match.field_id).length,
      unscheduledGroupMatches: groupMatches.filter((match) => !match.match_date || !match.match_time || !match.field_id).length,
      scheduledFinalMatches: finalPhaseMatches.filter((match) => match.match_date && match.match_time && match.field_id).length,
      unscheduledFinalMatches: finalPhaseMatches.filter((match) => !match.match_date || !match.match_time || !match.field_id).length,
      daySlots,
    },
  };
}

export function getTournamentMatchDurationMinutes(rules?: SchedulerRules | null) {
  return getMatchDurationMinutes(rules);
}

export function getTournamentMatchEndTime(startTime: string | null | undefined, rules?: SchedulerRules | null) {
  const normalizedTime = normalizeTime(startTime);
  if (!normalizedTime) return '-';
  return minutesToTime(timeToMinutes(normalizedTime) + getMatchDurationMinutes(rules));
}
