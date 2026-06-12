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

export type GdrbNews = {
  id: string;
  title: string;
  summary: string | null;
  content: string | null;
  source: string;
  image_url: string | null;
  external_url: string | null;
  is_published: boolean;
  published_at: string | null;
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