export function lisbonDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const value = type => parts.find(p => p.type === type).value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}
export function upcomingMatches(matches, today = lisbonDate()) {
  return matches.filter(m => m.match_date >= today && !['terminado', 'arquivado', 'cancelado'].includes(m.status))
    .sort((a, b) => a.match_date.localeCompare(b.match_date) || (a.match_time || '99:99').localeCompare(b.match_time || '99:99') || a.opponent.localeCompare(b.opponent, 'pt'));
}
