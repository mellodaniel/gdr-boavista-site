import type {
  TournamentManagerGroup,
  TournamentManagerGroupTeam,
  TournamentManagerMatch,
  TournamentManagerRule,
  TournamentManagerTeam,
} from '../types/tournamentManager';

export type TournamentStandingRow = {
  team: TournamentManagerTeam;
  group: TournamentManagerGroup | null;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
  position: number;
  qualified: boolean;
};

export type TournamentStandingsByGroup = {
  group: TournamentManagerGroup;
  rows: TournamentStandingRow[];
  completed_matches: number;
  scheduled_matches: number;
};

export type TournamentStandingsSummary = {
  total_group_matches: number;
  completed_group_matches: number;
  pending_group_matches: number;
  groups: TournamentStandingsByGroup[];
};

function hasValidResult(match: TournamentManagerMatch) {
  return match.score_a !== null && match.score_b !== null;
}

function shouldCountMatch(match: TournamentManagerMatch) {
  if (match.phase !== 'group') return false;
  if (match.status === 'cancelled' || match.status === 'postponed') return false;
  if (!match.team_a_id || !match.team_b_id) return false;
  return hasValidResult(match);
}

function getHeadToHeadPoints(
  teamId: string,
  opponentId: string,
  matches: TournamentManagerMatch[],
  rule: TournamentManagerRule | null,
) {
  const winPoints = rule?.win_points ?? 3;
  const drawPoints = rule?.draw_points ?? 1;
  const lossPoints = rule?.loss_points ?? 0;

  return matches.reduce((total, match) => {
    if (!shouldCountMatch(match)) return total;

    const isHome = match.team_a_id === teamId && match.team_b_id === opponentId;
    const isAway = match.team_b_id === teamId && match.team_a_id === opponentId;

    if (!isHome && !isAway) return total;

    const goalsFor = isHome ? match.score_a ?? 0 : match.score_b ?? 0;
    const goalsAgainst = isHome ? match.score_b ?? 0 : match.score_a ?? 0;

    if (goalsFor > goalsAgainst) return total + winPoints;
    if (goalsFor === goalsAgainst) return total + drawPoints;
    return total + lossPoints;
  }, 0);
}

function buildEmptyRow(team: TournamentManagerTeam, group: TournamentManagerGroup): TournamentStandingRow {
  return {
    team,
    group,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goals_for: 0,
    goals_against: 0,
    goal_difference: 0,
    points: 0,
    position: 0,
    qualified: false,
  };
}

function sortRows(
  rows: TournamentStandingRow[],
  matches: TournamentManagerMatch[],
  rule: TournamentManagerRule | null,
) {
  return [...rows].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;

    const aHeadToHead = getHeadToHeadPoints(a.team.id, b.team.id, matches, rule);
    const bHeadToHead = getHeadToHeadPoints(b.team.id, a.team.id, matches, rule);

    if (bHeadToHead !== aHeadToHead) return bHeadToHead - aHeadToHead;
    if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference;
    if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for;
    if (a.goals_against !== b.goals_against) return a.goals_against - b.goals_against;

    return a.team.name.localeCompare(b.team.name, 'pt');
  });
}

export function calculateTournamentStandings(params: {
  groups: TournamentManagerGroup[];
  teams: TournamentManagerTeam[];
  groupTeams: TournamentManagerGroupTeam[];
  matches: TournamentManagerMatch[];
  rule: TournamentManagerRule | null;
}): TournamentStandingsSummary {
  const { groups, teams, groupTeams, matches, rule } = params;

  const teamsById = new Map(teams.map((team) => [team.id, team]));
  const qualifiersPerGroup = Math.max(0, rule?.qualifiers_per_group ?? 0);

  let totalGroupMatches = 0;
  let completedGroupMatches = 0;

  const standingsGroups = groups
    .slice()
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || a.name.localeCompare(b.name, 'pt'))
    .map((group) => {
      const groupMatches = matches.filter((match) => match.group_id === group.id && match.phase === 'group');
      const completedMatches = groupMatches.filter(shouldCountMatch).length;
      const scheduledMatches = groupMatches.length;

      totalGroupMatches += scheduledMatches;
      completedGroupMatches += completedMatches;

      const rowsByTeamId = new Map<string, TournamentStandingRow>();

      groupTeams
        .filter((item) => item.group_id === group.id)
        .slice()
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        .forEach((item) => {
          const team = teamsById.get(item.team_id);
          if (!team) return;
          rowsByTeamId.set(team.id, buildEmptyRow(team, group));
        });

      groupMatches.forEach((match) => {
        if (!shouldCountMatch(match)) return;

        const teamA = match.team_a_id ? rowsByTeamId.get(match.team_a_id) : null;
        const teamB = match.team_b_id ? rowsByTeamId.get(match.team_b_id) : null;

        if (!teamA || !teamB) return;

        const scoreA = match.score_a ?? 0;
        const scoreB = match.score_b ?? 0;

        teamA.played += 1;
        teamB.played += 1;

        teamA.goals_for += scoreA;
        teamA.goals_against += scoreB;
        teamA.goal_difference = teamA.goals_for - teamA.goals_against;

        teamB.goals_for += scoreB;
        teamB.goals_against += scoreA;
        teamB.goal_difference = teamB.goals_for - teamB.goals_against;

        if (scoreA > scoreB) {
          teamA.wins += 1;
          teamB.losses += 1;
          teamA.points += rule?.win_points ?? 3;
          teamB.points += rule?.loss_points ?? 0;
        } else if (scoreA < scoreB) {
          teamB.wins += 1;
          teamA.losses += 1;
          teamB.points += rule?.win_points ?? 3;
          teamA.points += rule?.loss_points ?? 0;
        } else {
          teamA.draws += 1;
          teamB.draws += 1;
          teamA.points += rule?.draw_points ?? 1;
          teamB.points += rule?.draw_points ?? 1;
        }
      });

      const sortedRows = sortRows(Array.from(rowsByTeamId.values()), groupMatches, rule).map((row, index) => ({
        ...row,
        position: index + 1,
        qualified: qualifiersPerGroup > 0 && index < qualifiersPerGroup,
      }));

      return {
        group,
        rows: sortedRows,
        completed_matches: completedMatches,
        scheduled_matches: scheduledMatches,
      };
    });

  return {
    total_group_matches: totalGroupMatches,
    completed_group_matches: completedGroupMatches,
    pending_group_matches: Math.max(0, totalGroupMatches - completedGroupMatches),
    groups: standingsGroups,
  };
}
