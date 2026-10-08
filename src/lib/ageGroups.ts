import type { GdrbMatch } from '../types/database';

export const AGE_GROUPS = ['ABCs', 'Petizes', 'Traquinas A', 'Traquinas B', 'Benjamins A', 'Benjamins B', 'Sub-12', 'Sub-13', 'Iniciados', 'Juvenis', 'Juniores', 'Seniores', 'equipa de desenvolvimento'];
// Keep the stored catalogue value unchanged; use the label in form options.
export function ageGroupLabel(value: string) {
  return value === 'equipa de desenvolvimento' ? 'Equipa de Desenvolvimento' : value;
}
export function normalizeAgeGroup(value: string) {
  const key = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (key === 'abc') return 'ABCs';
  if (key === 'benjamins') return 'Benjamins B';
  if (key === 'infantis') return 'Sub-13';
  return AGE_GROUPS.find(name => name.toLowerCase().replace(/[^a-z0-9]/g, '') === key) ?? value.trim();
}
export function isOutcomeOnly(value: string) {
  const name = normalizeAgeGroup(value);
  return name === 'equipa de desenvolvimento' || AGE_GROUPS.slice(0, 7).includes(name) || /^(petiz|abc|traquin|benjam|infant)/i.test(name);
}
export function getMatchOutcome(match: Pick<GdrbMatch, 'home_score' | 'away_score' | 'result_outcome'>) {
  if (match.result_outcome === 'win' || match.result_outcome === 'loss') return match.result_outcome;
  if (match.home_score == null || match.away_score == null || match.home_score === match.away_score) return null;
  return match.home_score > match.away_score ? 'win' : 'loss';
}
export function outcomeLabel(match: Parameters<typeof getMatchOutcome>[0]) {
  const outcome = getMatchOutcome(match);
  return outcome === 'win' ? 'Vitória' : outcome === 'loss' ? 'Derrota' : 'Por confirmar';
}
export function hasMatchResult(match: GdrbMatch) {
  return isOutcomeOnly(match.team_name) ? getMatchOutcome(match) !== null :
    Number.isInteger(match.home_score) && Number.isInteger(match.away_score) && match.home_score! >= 0 && match.away_score! >= 0;
}
