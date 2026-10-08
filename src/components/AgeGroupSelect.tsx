import { ageGroupLabel, AGE_GROUPS, normalizeAgeGroup } from '../lib/ageGroups';
export function AgeGroupSelect({ value, onChange, className }: { value: string; onChange: (value: string) => void; className?: string }) {
  const normalized = normalizeAgeGroup(value);
  return <select aria-label="Escalão" required value={normalized} onChange={event => onChange(event.target.value)} className={className}>
    <option value="">Selecionar escalão</option>
    {normalized && !AGE_GROUPS.includes(normalized) && <option value={normalized}>{normalized} — rever escalão</option>}
    {AGE_GROUPS.map(name => <option key={name} value={name}>{ageGroupLabel(name)}</option>)}
  </select>;
}
