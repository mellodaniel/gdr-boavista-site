export const rosters = [
  { key: 'senior', label: 'Seniores', adminPath: '/admin/equipas/seniores/plantel', publicPath: '/equipas/seniores/plantel-2026-gdrb-7f4k' },
  { key: 'junior', label: 'Juniores', adminPath: '/admin/equipas/juniores/plantel', publicPath: '/equipas/juniores/plantel' },
  { key: 'juvenil', label: 'Juvenis', adminPath: '/admin/equipas/juvenis/plantel', publicPath: '/equipas/juvenis/plantel' },
] as const;

export type RosterKey = typeof rosters[number]['key'];

export function getRosterForTeam(name: string) {
  const normalized = name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (normalized.includes('senior')) return rosters[0];
  if (normalized.includes('junior')) return rosters[1];
  if (normalized === 'juvenis' || normalized === 'juvenis a') return rosters[2];
  return undefined;
}
