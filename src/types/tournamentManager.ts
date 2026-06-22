export type TournamentManagerStatus =
  | 'draft'
  | 'setup'
  | 'calendar_generated'
  | 'published'
  | 'in_progress'
  | 'finished'
  | 'archived';

export type TournamentManagerTournament = {
  id: string;
  name: string;
  slug: string;
  edition: string | null;
  age_group: string | null;
  birth_year: string | null;
  football_type: string | null;
  gender: string | null;
  location: string | null;
  address: string | null;
  description: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  status: TournamentManagerStatus;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

export type TournamentManager = TournamentManagerTournament;

export type TournamentManagerDay = {
  id: string;
  tournament_id: string;
  day_date: string;
  start_time: string;
  end_time: string;
  lunch_start: string | null;
  lunch_end: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type TournamentManagerField = {
  id: string;
  tournament_id: string;
  name: string;
  field_type: string | null;
  surface: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type TournamentManagerTeam = {
  id: string;
  tournament_id: string;
  name: string;
  club: string | null;
  location: string | null;
  logo_url: string | null;
  coach_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type TournamentManagerGroup = {
  id: string;
  tournament_id: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type TournamentManagerGroupTeam = {
  id: string;
  tournament_id: string;
  group_id: string;
  team_id: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type TournamentManagerRule = {
  id: string;
  tournament_id: string;
  format_type: string;
  group_count: number;
  teams_per_group: number;
  qualifiers_per_group: number;
  best_thirds_count: number;
  has_quarter_finals: boolean;
  has_semi_finals: boolean;
  has_third_place_match: boolean;
  has_final: boolean;
  match_parts: number;
  minutes_per_part: number;
  halftime_minutes: number;
  minutes_between_matches: number;
  min_rest_minutes: number;
  win_points: number;
  draw_points: number;
  loss_points: number;
  no_show_points: number;
  no_show_score_for: number;
  no_show_score_against: number;
  tiebreakers: string[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
