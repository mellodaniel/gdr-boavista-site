export type GdrbTeam = {
  id: string;
  name: string;
  category: string;
  football_type: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

export type GdrbNewsStatus = 'published' | 'draft' | 'archived';

export type GdrbNews = {
  id: string;
  title: string;
  summary: string | null;
  content: string | null;
  source: string;
  image_url: string | null;
  external_url: string | null;
  is_published: boolean;
  status: GdrbNewsStatus;
  published_at: string | null;
  sort_order: number;
  created_at: string;
};

export type GdrbMemberRequest = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  nif: string | null;
  notes: string | null;
  status: string;
  created_at: string;
};

export type GdrbContactRequest = {
  id: string;
  name: string;
  email: string | null;
  subject: string | null;
  message: string;
  status: string;
  created_at: string;
};

export type GdrbSponsor = {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
  sponsor_level: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

export type GdrbSiteContent = {
  id: string;
  content_key: string;
  label: string;
  value: string;
  type: string;
  group_name: string;
  sort_order: number;
  updated_at: string | null;
  created_at: string;
};

export type GdrbMatch = {
  id: string;
  team_name: string;
  football_type: string;
  competition: string;
  opponent: string;
  match_date: string;
  match_time: string | null;
  location: string | null;
  venue_type: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  notes: string | null;
  is_visible: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string | null;
};

export type GdrbTournament = {
  id: string;
  team_name: string;
  football_type: string;
  name: string;
  start_date: string;
  end_date: string | null;
  location: string | null;
  website_url: string | null;
  notes: string | null;
  is_visible: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string | null;
};

export type GdrbRosterGroup =
  | 'Guarda-redes'
  | 'Defesas'
  | 'Médios'
  | 'Avançados'
  | 'Equipa técnica';

export type GdrbRosterPlayer = {
  id: string;
  team_key: string;
  name: string;
  shirt_number: number | null;
  position: string | null;
  roster_group: GdrbRosterGroup;
  photo_url: string | null;
  height: string | null;
  birth_year: number | null;
  nationality: string | null;
  notes: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string | null;
};

export type GdrbSeniorMatch = {
  id: string;
  season: string | null;
  competition: string | null;
  match_date: string;
  match_time: string | null;
  venue: string | null;
  home_away: string;
  home_team: string;
  away_team: string;
  opponent_name: string;
  result_home: number | null;
  result_away: number | null;
  status: string;
  initial_formation: string | null;
  coach_name: string | null;
  assistant_name: string | null;
  pre_match_notes: string | null;
  current_period: string | null;
  current_minute: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
};

export type GdrbSeniorMatchSquad = {
  id: string;
  match_id: string;
  player_id: string;
  shirt_number: number | null;
  role: string;
  position: string | null;
  is_starting: boolean;
  is_captain: boolean;
  is_goalkeeper: boolean;
  status: string;
  created_at: string;
};

export type GdrbSeniorMatchEvent = {
  id: string;
  match_id: string;
  event_type: string;
  period: string | null;
  minute: number | null;
  second: number | null;
  player_id: string | null;
  related_player_id: string | null;
  team: string | null;
  zone: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

export type GdrbSeniorSubstitution = {
  id: string;
  match_id: string;
  minute: number | null;
  period: string | null;
  player_out_id: string;
  player_in_id: string;
  reason: string | null;
  notes: string | null;
  created_at: string;
};

export type GdrbSeniorTacticalNote = {
  id: string;
  match_id: string;
  minute: number | null;
  period: string | null;
  category: string | null;
  tag: string | null;
  player_id: string | null;
  zone: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
};

export type GdrbSeniorOpponentAnalysis = {
  id: string;
  match_id: string;
  opponent_name: string;
  opponent_formation: string | null;
  strong_side: string | null;
  weak_side: string | null;
  danger_player_name: string | null;
  pressing_style: string | null;
  build_up_style: string | null;
  set_pieces_offensive: string | null;
  set_pieces_defensive: string | null;
  space_to_exploit: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
};

export type GdrbSeniorMatchReport = {
  id: string;
  match_id: string;
  summary: string | null;
  positive_points: string | null;
  improvement_points: string | null;
  players_highlighted: string | null;
  training_notes: string | null;
  opponent_notes: string | null;
  generated_text: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
};
