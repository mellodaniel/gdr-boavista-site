export type SheetTeam = { age_group: string; roster_key: string | null; field_size: number; period_minutes: number; periods: number; reentry: boolean; record_goals: boolean };
export type RosterPlayer = { id: string; name: string; shirt_number: number | null; position: string | null; photo_url: string | null };
export type SquadPlayer = RosterPlayer & { starter: boolean; captain: boolean };
export type EventKind = 'goal' | 'yellow' | 'second_yellow' | 'red' | 'substitution' | 'note';
export type SheetEvent = { id: string; kind: EventKind; side: 'club' | 'opponent'; period: number; minute: number; added: number; player: string; incoming: string; ownGoal: boolean; note: string; createdAt: string };
export type MatchSheet = {
  schema: 1; id: string; ageGroup: string; season: string; calendarId: string | null;
  opponent: string; date: string; time: string; venue: string; competition: string; home: boolean;
  recorder: string; notes: string; status: 'draft' | 'live' | 'interval' | 'finished'; outcome: '' | 'win' | 'loss';
  rules: { fieldSize: number; periodMinutes: number; periods: number; reentry: boolean; recordGoals: boolean };
  clock: { period: number; elapsedMs: number; startedAt: number | null };
  squad: SquadPlayer[]; events: SheetEvent[];
};
export type StoredSheet = { document: MatchSheet; revision: number; localVersion: number; dirty: boolean; owner: string; updatedAt: string; error?: string; conflict?: boolean };
export type SheetRow = { id: string; age_group: string; recorder_id: string; revision: number; document: MatchSheet; updated_at: string };
export type SheetDelivery = { id: string; revision: number; recipients: string[]; status: string; created_at: string };
