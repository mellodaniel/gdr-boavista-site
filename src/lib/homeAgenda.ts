import type { GdrbMatch, GdrbTournament } from '../types/database';

export function getLisbonDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
}

export function addCalendarDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function selectUpcomingMatches(matches: GdrbMatch[], today: string) {
  const end = addCalendarDays(today, 6);
  const upcoming = matches.filter((match) =>
    match.is_visible && !match.is_archived && match.status === 'agendado' && match.match_date >= today,
  ).sort((a, b) =>
    `${a.match_date} ${a.match_time ?? '23:59'}`.localeCompare(`${b.match_date} ${b.match_time ?? '23:59'}`) || a.id.localeCompare(b.id),
  );
  const representedTeams = new Set<string>();
  return upcoming.filter((match) => {
    const team = JSON.stringify([match.team_name.trim().toLowerCase(), match.football_type.trim().toLowerCase()]);
    const include = match.match_date <= end || !representedTeams.has(team);
    representedTeams.add(team);
    return include;
  });
}

export function selectPostponedMatches(matches: GdrbMatch[]) {
  return matches.filter((match) => match.is_visible && !match.is_archived && match.status === 'adiado');
}

export function isTournamentUpcoming(tournament: GdrbTournament, today: string) {
  return tournament.is_visible && !tournament.is_archived &&
    tournament.start_date <= addCalendarDays(today, 6) &&
    (tournament.end_date || tournament.start_date) >= today;
}
