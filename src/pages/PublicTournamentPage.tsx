import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

type Tournament = {
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
  status: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

type TournamentTeam = {
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
  sort_order: number | null;
};

type TournamentGroup = {
  id: string;
  tournament_id: string;
  name: string;
  sort_order: number | null;
};

type TournamentGroupTeam = {
  id: string;
  tournament_id: string;
  group_id: string;
  team_id: string;
  sort_order: number | null;
};

type TournamentField = {
  id: string;
  tournament_id: string;
  name: string;
  field_type: string | null;
  surface: string | null;
  is_active: boolean | null;
  notes: string | null;
};

type TournamentDay = {
  id: string;
  tournament_id: string;
  day_date: string;
  start_time: string;
  end_time: string;
  lunch_start: string | null;
  lunch_end: string | null;
  notes: string | null;
};

type TournamentMatch = {
  id: string;
  tournament_id: string;
  group_id: string | null;
  field_id: string | null;
  team_a_id: string | null;
  team_b_id: string | null;
  team_a_placeholder: string | null;
  team_b_placeholder: string | null;
  team_a_source: string | null;
  team_b_source: string | null;
  round_number: number | null;
  phase: string;
  match_number: number;
  match_date: string | null;
  match_time: string | null;
  status: string;
  score_a: number | null;
  score_b: number | null;
  penalty_score_a: number | null;
  penalty_score_b: number | null;
  notes: string | null;
};

type ClubSponsor = {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
  sponsor_level: string | null;
  is_active: boolean | null;
  sort_order: number | null;
};

type TournamentSponsor = {
  id: string;
  tournament_id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
  sponsor_level: string | null;
  is_active: boolean | null;
  sort_order: number | null;
};

type TournamentPlayer = {
  id: string;
  tournament_id: string;
  team_id: string;
  name: string;
  shirt_number: number | null;
  is_active: boolean | null;
  notes: string | null;
};

type TournamentMatchGoal = {
  id: string;
  tournament_id: string;
  match_id: string;
  team_id: string;
  player_id: string;
  minute: number | null;
  is_own_goal: boolean | null;
  notes: string | null;
  created_at: string;
};

type ScorerSummary = {
  player: TournamentPlayer;
  team: TournamentTeam | null;
  goals: number;
};

type StandingRow = {
  team: TournamentTeam;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
};

const statusLabels: Record<string, string> = {
  scheduled: 'Agendado',
  in_progress: 'A decorrer',
  finished: 'Terminado',
  postponed: 'Adiado',
  cancelled: 'Cancelado',
  no_show: 'Falta de comparência',
};

const phaseLabels: Record<string, string> = {
  group: 'Fase de grupos',
  quarter_final: 'Quartos de final',
  semi_final: 'Meia-final',
  third_place: '3.º e 4.º lugar',
  final: 'Final',
  manual: 'Manual',
};

const tournamentInterviewVideos = [
  {
    id: 'Lh2rZLupPIc',
    title: 'Melhor guarda-redes',
    person: 'Lukene',
    description: 'Entrevista conduzida por Valdemar, Diretor do GDR Boavista, após a distinção de melhor guarda-redes do torneio.',
  },
  {
    id: 'TX9sTricB_E',
    title: 'Melhor marcador',
    person: 'Pedro Faustino',
    description: 'O melhor marcador do torneio partilha a emoção do prémio e do percurso vivido dentro de campo.',
  },
  {
    id: 'UxpfEp-_vKY',
    title: 'Treinador do Saka',
    person: 'Bocas',
    description: 'O treinador do Saka deixa o seu testemunho sobre a participação da equipa e o espírito vivido no torneio.',
  },
  {
    id: '_S5kgDobxWU',
    title: 'Treinador do ABC',
    person: 'David Lopes',
    description: 'O treinador do ABC fala sobre a equipa, a competição e a importância destes momentos para o futebol local.',
  },
];

const tournamentMemoryPhotos = [
  {
    src: '/tournaments/fut7-2026/memorias/trofeus-mesa.webp',
    title: 'A mesa dos troféus',
    description: 'Os prémios que marcaram o encerramento do torneio.',
    featured: true,
  },
  {
    src: '/tournaments/fut7-2026/memorias/premio-melhor-guarda-redes-lukene.webp',
    title: 'Melhor guarda-redes',
    description: 'Lukene recebeu o prémio de melhor guarda-redes do torneio.',
  },
  {
    src: '/tournaments/fut7-2026/memorias/premio-melhor-marcador-pedro-faustino.webp',
    title: 'Melhor marcador',
    description: 'Pedro Faustino foi distinguido como melhor marcador.',
  },
  {
    src: '/tournaments/fut7-2026/memorias/campeoes-abc.webp',
    title: 'Campeões do torneio',
    description: 'A equipa vencedora celebra o título no relvado.',
  },
  {
    src: '/tournaments/fut7-2026/memorias/segundo-lugar-equipa.webp',
    title: 'Finalistas',
    description: 'A equipa finalista no momento da entrega de prémios. Parabéns ao SAKA pela 2º classificação.',
  },
  {
    src: '/tournaments/fut7-2026/memorias/terceiro-lugar-grupo.webp',
    title: 'Pódio do torneio 3º classificação',
    description: 'Mais um momento de reconhecimento e celebração. Parabéns aos Cozinheiros da bola.',
  },
  {
    src: '/tournaments/fut7-2026/memorias/ultra-porqueiros-bandeira.webp',
    title: 'Espírito de equipa',
    description: 'A festa, a identidade e a boa disposição das equipas.',
  },
  {
    src: '/tournaments/fut7-2026/memorias/ultra-porqueiros-festa.webp',
    title: 'Celebração no relvado, 7º classificação',
    description: 'A alegria de quem viveu o torneio até ao fim. Parabéns Ultras Porqueiros.',
  },
  {
    src: '/tournaments/fut7-2026/memorias/campeoes-celebracao.webp',
    title: 'Festa dos vencedores do Bar',
    description: 'O momento de celebração que encerrou a competição e com o Bar :)',
  },
  {
    src: '/tournaments/fut7-2026/memorias/entrega-premios-mesa.webp',
    title: 'Entrega de prémios',
    description: 'Organização, equipas e prémios numa noite de futebol.',
  },
  {
    src: '/tournaments/fut7-2026/memorias/treinador-saka-bocas.webp',
    title: 'Reconhecimento',
    description: 'Um dos testemunhos que marcou o encerramento do torneio. Obrigado Paulo, o nosso Fisioterapeuta.',
  },
  {
    src: '/tournaments/fut7-2026/memorias/premio-quarto-lugar.webp',
    title: 'Momento especial 4º classificação',
    description: 'Entrega de prémio e espírito de confraternização. Parabéns NJCar.',
  },
  {
    src: '/tournaments/fut7-2026/memorias/premio-sexto-lugar-peladinhas-caxieira.webp',
    title: '6.º classificação',
    description: 'Entrega do prémio à equipa Peladinhas da Caxieira pelo 6.º lugar no torneio.',
  },
];

function formatDate(value: string | null) {
  if (!value) return 'Data por definir';

  const date = new Date(`${value}T00:00:00`);

  return new Intl.DateTimeFormat('pt-PT', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function formatShortDate(value: string | null) {
  if (!value) return '-';

  const date = new Date(`${value}T00:00:00`);

  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: '2-digit',
  }).format(date);
}

function formatTime(value: string | null) {
  if (!value) return '--:--';
  return value.slice(0, 5);
}

function sortMatches(a: TournamentMatch, b: TournamentMatch) {
  const dateA = a.match_date || '9999-12-31';
  const dateB = b.match_date || '9999-12-31';

  if (dateA !== dateB) return dateA.localeCompare(dateB);

  const timeA = a.match_time || '99:99:99';
  const timeB = b.match_time || '99:99:99';

  if (timeA !== timeB) return timeA.localeCompare(timeB);

  return (a.match_number || 0) - (b.match_number || 0);
}

function sortMatchesDescending(a: TournamentMatch, b: TournamentMatch) {
  return sortMatches(b, a);
}

function hasResult(match: TournamentMatch) {
  return match.score_a !== null && match.score_b !== null;
}

function isFinalPhase(phase: string | null | undefined) {
  return phase === 'quarter_final' || phase === 'semi_final' || phase === 'third_place' || phase === 'final';
}

function hasPenaltyResult(match: TournamentMatch) {
  return match.penalty_score_a !== null && match.penalty_score_b !== null;
}

function formatMatchResult(match: TournamentMatch) {
  if (!hasResult(match)) return 'x';

  const baseResult = `${match.score_a} x ${match.score_b}`;

  if (
    isFinalPhase(match.phase) &&
    match.score_a === match.score_b &&
    hasPenaltyResult(match)
  ) {
    return `${baseResult} · pen. ${match.penalty_score_a} x ${match.penalty_score_b}`;
  }

  return baseResult;
}

function getMatchDateTime(match: TournamentMatch) {
  if (!match.match_date || !match.match_time) return null;
  return new Date(`${match.match_date}T${match.match_time}`);
}

function isUpcomingMatch(match: TournamentMatch) {
  if (hasResult(match)) return false;
  if (match.status === 'cancelled' || match.status === 'finished') return false;

  const matchDateTime = getMatchDateTime(match);

  if (!matchDateTime) return true;

  return matchDateTime.getTime() >= Date.now();
}

function formatLastUpdated(value: Date | null) {
  if (!value) return 'Ainda não atualizado';

  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value);
}

function normalizePartnerLabel(value: string | null) {
  if (!value) return '';

  return value
    .replace(/patrocinador/gi, 'parceiro')
    .replace(/patrocinadores/gi, 'parceiros')
    .replace(/sponsor/gi, 'parceiro')
    .replace(/sponsors/gi, 'parceiros');
}

// public-program-all-days-v3
// public-tournament-partners-members-v4
export default function PublicTournamentPage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [groups, setGroups] = useState<TournamentGroup[]>([]);
  const [groupTeams, setGroupTeams] = useState<TournamentGroupTeam[]>([]);
  const [fields, setFields] = useState<TournamentField[]>([]);
  const [days, setDays] = useState<TournamentDay[]>([]);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [players, setPlayers] = useState<TournamentPlayer[]>([]);
  const [matchGoals, setMatchGoals] = useState<TournamentMatchGoal[]>([]);
  const [clubSponsors, setClubSponsors] = useState<ClubSponsor[]>([]);
  const [tournamentSponsors, setTournamentSponsors] = useState<TournamentSponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const [teamFilter, setTeamFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');
  const [fieldFilter, setFieldFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  const loadTournament = useCallback(
    async (showFullLoading = false) => {
      if (!slug) return;

      if (showFullLoading) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setErrorMessage('');

      const lookupSlugs = slug === 'fut7-boavista-2026' ? ['fut7-boavista-2026', 'teste-2026'] : [slug];

      const { data: tournamentRows, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .in('slug', lookupSlugs)
        .limit(1);

      const tournamentData = tournamentRows?.[0] ?? null;

      if (tournamentError || !tournamentData) {
        setErrorMessage('Torneio não encontrado.');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const loadedTournament = tournamentData as Tournament;
      setTournament(loadedTournament);

      if (!loadedTournament.is_public) {
        setTeams([]);
        setGroups([]);
        setGroupTeams([]);
        setFields([]);
        setDays([]);
        setMatches([]);
        setPlayers([]);
        setMatchGoals([]);
        setClubSponsors([]);
        setTournamentSponsors([]);
        setLastUpdatedAt(new Date());
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const [
        teamsResponse,
        groupsResponse,
        groupTeamsResponse,
        fieldsResponse,
        daysResponse,
        matchesResponse,
        playersResponse,
        matchGoalsResponse,
        clubSponsorsResponse,
        tournamentSponsorsResponse,
      ] = await Promise.all([
          supabase
            .from('tournament_teams')
            .select('*')
            .eq('tournament_id', loadedTournament.id)
            .order('sort_order', { ascending: true })
            .order('name', { ascending: true }),
          supabase
            .from('tournament_groups')
            .select('*')
            .eq('tournament_id', loadedTournament.id)
            .order('sort_order', { ascending: true })
            .order('name', { ascending: true }),
          supabase
            .from('tournament_group_teams')
            .select('*')
            .eq('tournament_id', loadedTournament.id)
            .order('sort_order', { ascending: true }),
          supabase
            .from('tournament_fields')
            .select('*')
            .eq('tournament_id', loadedTournament.id)
            .order('name', { ascending: true }),
          supabase
            .from('tournament_days')
            .select('*')
            .eq('tournament_id', loadedTournament.id)
            .order('day_date', { ascending: true }),
          supabase
            .from('tournament_matches')
            .select('*')
            .eq('tournament_id', loadedTournament.id)
            .order('match_date', { ascending: true })
            .order('match_time', { ascending: true })
            .order('match_number', { ascending: true }),
          supabase
            .from('tournament_players')
            .select('*')
            .eq('tournament_id', loadedTournament.id)
            .eq('is_active', true)
            .order('shirt_number', { ascending: true, nullsFirst: false })
            .order('name', { ascending: true }),
          supabase
            .from('tournament_match_goals')
            .select('*')
            .eq('tournament_id', loadedTournament.id)
            .eq('is_own_goal', false)
            .order('created_at', { ascending: true }),
          supabase
            .from('gdrb_sponsors')
            .select('*')
            .eq('is_active', true)
            .order('sort_order', { ascending: true })
            .order('name', { ascending: true }),
          supabase
            .from('tournament_sponsors')
            .select('*')
            .eq('tournament_id', loadedTournament.id)
            .eq('is_active', true)
            .order('sort_order', { ascending: true })
            .order('name', { ascending: true }),
        ]);

      if (
        teamsResponse.error ||
        groupsResponse.error ||
        groupTeamsResponse.error ||
        fieldsResponse.error ||
        daysResponse.error ||
        matchesResponse.error ||
        playersResponse.error ||
        matchGoalsResponse.error ||
        clubSponsorsResponse.error ||
        tournamentSponsorsResponse.error
      ) {
        setErrorMessage('Não foi possível carregar os dados públicos do torneio.');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setTeams((teamsResponse.data || []) as TournamentTeam[]);
      setGroups((groupsResponse.data || []) as TournamentGroup[]);
      setGroupTeams((groupTeamsResponse.data || []) as TournamentGroupTeam[]);
      setFields((fieldsResponse.data || []) as TournamentField[]);
      setDays((daysResponse.data || []) as TournamentDay[]);
      setMatches(((matchesResponse.data || []) as TournamentMatch[]).sort(sortMatches));
      setPlayers((playersResponse.data || []) as TournamentPlayer[]);
      setMatchGoals((matchGoalsResponse.data || []) as TournamentMatchGoal[]);
      setClubSponsors((clubSponsorsResponse.data || []) as ClubSponsor[]);
      setTournamentSponsors((tournamentSponsorsResponse.data || []) as TournamentSponsor[]);
      setLastUpdatedAt(new Date());
      setLoading(false);
      setRefreshing(false);
    },
    [slug]
  );

  useEffect(() => {
    if (slug === 'teste-2026') {
      navigate('/torneios/fut7-boavista-2026', { replace: true });
    }
  }, [navigate, slug]);

  useEffect(() => {
    loadTournament(true);
  }, [loadTournament]);

  const teamById = useMemo(() => {
    return new Map(teams.map((team) => [team.id, team]));
  }, [teams]);

  const playerById = useMemo(() => {
    return new Map(players.map((player) => [player.id, player]));
  }, [players]);

  const goalsByMatchId = useMemo(() => {
    const map = new Map<string, TournamentMatchGoal[]>();
    matchGoals.forEach((goal) => {
      const current = map.get(goal.match_id) || [];
      current.push(goal);
      map.set(goal.match_id, current);
    });
    return map;
  }, [matchGoals]);

  const topScorers = useMemo<ScorerSummary[]>(() => {
    const goalsByPlayer = new Map<string, number>();

    matchGoals.forEach((goal) => {
      if (goal.is_own_goal) return;
      goalsByPlayer.set(goal.player_id, (goalsByPlayer.get(goal.player_id) || 0) + 1);
    });

    return Array.from(goalsByPlayer.entries())
      .map(([playerId, goals]) => {
        const player = playerById.get(playerId);
        if (!player) return null;
        return {
          player,
          team: teamById.get(player.team_id) || null,
          goals,
        };
      })
      .filter((item): item is ScorerSummary => Boolean(item))
      .sort((a, b) => {
        if (b.goals !== a.goals) return b.goals - a.goals;
        return a.player.name.localeCompare(b.player.name, 'pt');
      });
  }, [matchGoals, playerById, teamById]);

  const groupById = useMemo(() => {
    return new Map(groups.map((group) => [group.id, group]));
  }, [groups]);

  const fieldById = useMemo(() => {
    return new Map(fields.map((field) => [field.id, field]));
  }, [fields]);

  const scheduleDates = useMemo(() => {
    const configuredDayDates = days
      .map((day) => day.day_date)
      .filter(Boolean);

    const matchDayDates = matches
      .filter((match) => match.match_date)
      .map((match) => match.match_date as string);

    return Array.from(new Set([...configuredDayDates, ...matchDayDates])).sort();
  }, [days, matches]);

  const filteredMatches = useMemo(() => {
    return matches
      .filter((match) => {
        if (teamFilter !== 'all' && match.team_a_id !== teamFilter && match.team_b_id !== teamFilter) {
          return false;
        }

        if (groupFilter !== 'all' && match.group_id !== groupFilter) {
          return false;
        }

        if (fieldFilter !== 'all' && match.field_id !== fieldFilter) {
          return false;
        }

        if (statusFilter !== 'all') {
          if (statusFilter === 'with_result' && !hasResult(match)) return false;
          if (statusFilter === 'without_result' && hasResult(match)) return false;
          if (statusFilter !== 'with_result' && statusFilter !== 'without_result' && match.status !== statusFilter) return false;
        }

        if (dateFilter !== 'all' && match.match_date !== dateFilter) {
          return false;
        }

        return true;
      })
      .sort(sortMatches);
  }, [matches, teamFilter, groupFilter, fieldFilter, statusFilter, dateFilter]);

  const groupedMatches = useMemo(() => {
    const map = new Map<string, TournamentMatch[]>();

    filteredMatches.forEach((match) => {
      const key = match.match_date || 'Data por definir';
      const current = map.get(key) || [];
      current.push(match);
      map.set(key, current);
    });

    const datesToShow = dateFilter === 'all'
      ? scheduleDates
      : [dateFilter];

    const groupsToShow = datesToShow
      .filter((date) => date && date !== 'all')
      .map((date) => ({
        date,
        matches: (map.get(date) || []).sort(sortMatches),
      }));

    const undatedMatches = map.get('Data por definir') || [];

    if ((dateFilter === 'all' || dateFilter === 'undated') && undatedMatches.length > 0) {
      groupsToShow.push({
        date: 'Data por definir',
        matches: undatedMatches.sort(sortMatches),
      });
    }

    return groupsToShow;
  }, [filteredMatches, scheduleDates, dateFilter]);

  const totalGoals = useMemo(() => {
    return matches.reduce((total, match) => {
      if (!hasResult(match)) return total;
      return total + (match.score_a || 0) + (match.score_b || 0);
    }, 0);
  }, [matches]);

  const tournamentNumbers = useMemo(() => [
    {
      label: 'Jogos',
      value: matches.length,
      description: 'partidas programadas ao longo do torneio',
    },
    {
      label: 'Equipas',
      value: teams.length,
      description: 'equipas participantes na competição',
    },
    {
      label: 'Atletas',
      value: players.length,
      description: 'jogadores registados nas equipas',
    },
    {
      label: 'Golos',
      value: totalGoals,
      description: 'golos marcados nos jogos com resultado',
    },
  ], [matches.length, players.length, teams.length, totalGoals]);

  const latestResults = useMemo(() => {
    return matches.filter((match) => hasResult(match)).sort(sortMatchesDescending).slice(0, 6);
  }, [matches]);

  const upcomingMatches = useMemo(() => {
    return matches.filter(isUpcomingMatch).sort(sortMatches).slice(0, 6);
  }, [matches]);

  const standingsByGroup = useMemo(() => {
    const standings = new Map<string, StandingRow[]>();

    groups.forEach((group) => {
      const groupTeamIds = groupTeams
        .filter((item) => item.group_id === group.id)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        .map((item) => item.team_id);

      const rows = groupTeamIds
        .map((teamId) => teamById.get(teamId))
        .filter((team): team is TournamentTeam => Boolean(team))
        .map((team) => ({
          team,
          played: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          points: 0,
        }));

      const rowByTeamId = new Map(rows.map((row) => [row.team.id, row]));

      matches
        .filter((match) => match.group_id === group.id && hasResult(match) && match.team_a_id && match.team_b_id)
        .forEach((match) => {
          const teamA = rowByTeamId.get(match.team_a_id as string);
          const teamB = rowByTeamId.get(match.team_b_id as string);

          if (!teamA || !teamB || match.score_a === null || match.score_b === null) return;

          teamA.played += 1;
          teamB.played += 1;

          teamA.goalsFor += match.score_a;
          teamA.goalsAgainst += match.score_b;
          teamB.goalsFor += match.score_b;
          teamB.goalsAgainst += match.score_a;

          if (match.score_a > match.score_b) {
            teamA.wins += 1;
            teamA.points += 3;
            teamB.losses += 1;
          } else if (match.score_a < match.score_b) {
            teamB.wins += 1;
            teamB.points += 3;
            teamA.losses += 1;
          } else {
            teamA.draws += 1;
            teamB.draws += 1;
            teamA.points += 1;
            teamB.points += 1;
          }
        });

      rows.forEach((row) => {
        row.goalDifference = row.goalsFor - row.goalsAgainst;
      });

      rows.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
        if (a.goalsAgainst !== b.goalsAgainst) return a.goalsAgainst - b.goalsAgainst;
        return a.team.name.localeCompare(b.team.name);
      });

      standings.set(group.id, rows);
    });

    return standings;
  }, [groups, groupTeams, matches, teamById]);

  function clearFilters() {
    setTeamFilter('all');
    setGroupFilter('all');
    setFieldFilter('all');
    setStatusFilter('all');
    setDateFilter('all');
  }

  function getTeamName(teamId: string | null) {
    if (!teamId) return 'Por definir';
    return teamById.get(teamId)?.name || 'Por definir';
  }

  function getMatchTeamName(match: TournamentMatch, side: 'a' | 'b') {
    const teamId = side === 'a' ? match.team_a_id : match.team_b_id;
    const placeholder = side === 'a' ? match.team_a_placeholder : match.team_b_placeholder;

    if (teamId) return getTeamName(teamId);
    return placeholder || 'Por definir';
  }

  function getGroupName(groupId: string | null) {
    if (!groupId) return 'Sem grupo';
    return groupById.get(groupId)?.name || 'Sem grupo';
  }

  function getFieldName(fieldId: string | null) {
    if (!fieldId) return 'Campo por definir';
    return fieldById.get(fieldId)?.name || 'Campo por definir';
  }

  function getMatchGoals(matchId: string) {
    return goalsByMatchId.get(matchId) || [];
  }


  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-16">
        <div className="mx-auto max-w-6xl text-slate-600">A carregar torneio...</div>
      </main>
    );
  }

  if (errorMessage || !tournament) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-16">
        <div className="mx-auto max-w-5xl rounded-2xl bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Torneio não encontrado</h1>
          <p className="mt-2 text-slate-600">O torneio que procuras não existe ou foi removido.</p>
          <Link to="/" className="mt-6 inline-flex rounded-xl bg-red-700 px-5 py-3 text-sm font-semibold text-white hover:bg-[#24170f]">
            Voltar ao site
          </Link>
        </div>
      </main>
    );
  }

  if (!tournament.is_public) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-16">
        <div className="mx-auto max-w-5xl rounded-2xl bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-red-700">Gestor de Torneios Boavista</p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">{tournament.name}</h1>
          <p className="mt-4 text-slate-600">Este torneio ainda não está publicado.</p>
          <Link to="/" className="mt-6 inline-flex rounded-xl bg-red-700 px-5 py-3 text-sm font-semibold text-white hover:bg-[#24170f]">
            Voltar ao site
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50">
      <section className="bg-gradient-to-br from-[#24170f] via-[#3b2118] to-red-900 px-4 py-8 text-white sm:px-6 md:py-14">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-100">GDR Boavista</p>
          <h1 className="mt-3 text-3xl font-bold leading-tight md:text-5xl">{tournament.name}</h1>

          <div className="mt-5 flex flex-wrap gap-2 text-xs sm:text-sm md:gap-3">
            {tournament.age_group && <span className="rounded-full bg-white/15 px-4 py-2">{tournament.age_group}</span>}
            {tournament.football_type && <span className="rounded-full bg-white/15 px-4 py-2">{tournament.football_type}</span>}
            {tournament.location && <span className="rounded-full bg-white/15 px-4 py-2">{tournament.location}</span>}
            {tournament.edition && <span className="rounded-full bg-white/15 px-4 py-2">Edição {tournament.edition}</span>}
          </div>

          <div className="mt-6 rounded-2xl bg-white/10 p-4 text-sm text-red-50 ring-1 ring-white/20 md:mt-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold text-white">Atualização dos dados</p>
                <p className="mt-1">
                  Os jogos e resultados são atualizados quando a página é carregada. Para ver alterações recentes feitas pela organização, usa o botão abaixo.
                </p>
                <p className="mt-1 text-xs text-red-100">Última atualização nesta página: {formatLastUpdated(lastUpdatedAt)}</p>
              </div>

              <button
                type="button"
                onClick={() => loadTournament(false)}
                disabled={refreshing}
                className="inline-flex w-full items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-bold text-red-800 shadow-sm transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70 md:w-auto"
              >
                {refreshing ? 'A atualizar...' : 'Atualizar dados'}
              </button>
            </div>
          </div>
        </div>
      </section>

      <nav className="sticky top-0 z-20 border-y border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto pb-1 text-xs font-bold uppercase tracking-wide text-slate-700 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <a href="#numeros" className="shrink-0 rounded-full bg-slate-100 px-4 py-2 hover:bg-red-50 hover:text-red-700">Números</a>
          <a href="#jogos" className="shrink-0 rounded-full bg-slate-100 px-4 py-2 hover:bg-red-50 hover:text-red-700">Jogos</a>
          <a href="#memorias" className="shrink-0 rounded-full bg-slate-100 px-4 py-2 hover:bg-red-50 hover:text-red-700">Memórias</a>
          <a href="#entrevistas" className="shrink-0 rounded-full bg-slate-100 px-4 py-2 hover:bg-red-50 hover:text-red-700">Entrevistas</a>
          <a href="#classificacao" className="shrink-0 rounded-full bg-slate-100 px-4 py-2 hover:bg-red-50 hover:text-red-700">Classificação</a>
          <a href="#marcadores" className="shrink-0 rounded-full bg-slate-100 px-4 py-2 hover:bg-red-50 hover:text-red-700">Marcadores</a>
          <a href="#equipas" className="shrink-0 rounded-full bg-slate-100 px-4 py-2 hover:bg-red-50 hover:text-red-700">Equipas</a>
        </div>
      </nav>

      <section className="px-4 py-6 sm:px-6 md:py-10">
        <div className="mx-auto max-w-6xl space-y-6 md:space-y-8">
          <TournamentNumbersSection numbers={tournamentNumbers} />

          <div id="local" className="scroll-mt-20 grid gap-4 lg:grid-cols-3 md:gap-6">
            <div className="rounded-2xl bg-white p-5 shadow-sm md:p-6 lg:col-span-2">
              <h2 className="text-2xl font-bold text-slate-900">Informação do torneio</h2>
              <p className="mt-4 whitespace-pre-line text-slate-600">
                {tournament.description || 'Informação do torneio em breve.'}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm md:p-6">
              <h2 className="text-xl font-bold text-slate-900">Contactos e local</h2>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <p><strong className="text-slate-900">Local:</strong> {tournament.location || '-'}</p>
                <p><strong className="text-slate-900">Morada:</strong> {tournament.address || '-'}</p>
                <p><strong className="text-slate-900">Telefone:</strong> {tournament.contact_phone || '-'}</p>
                <p><strong className="text-slate-900">Email:</strong> {tournament.contact_email || '-'}</p>
              </div>
            </div>
          </div>

          <section id="jogos" className="scroll-mt-20 rounded-2xl bg-white p-5 shadow-sm md:p-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-red-700 md:text-sm">Ao vivo</p>
                <h2 className="text-xl font-bold text-slate-900 md:text-2xl">Próximos jogos</h2>
              </div>
            </div>

            {upcomingMatches.length === 0 ? (
              <p className="mt-5 text-sm text-slate-600">Não existem próximos jogos agendados.</p>
            ) : (
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {upcomingMatches.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    getTeamName={getTeamName}
                    getMatchTeamName={getMatchTeamName}
                    getGroupName={getGroupName}
                    getFieldName={getFieldName}
                    goals={getMatchGoals(match.id)}
                    playerById={playerById}
                  />
                ))}
              </div>
            )}
          </section>

          <details className="group rounded-2xl bg-white p-5 shadow-sm md:p-6">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-red-700 md:text-sm">Resultados</p>
                <h2 className="text-xl font-bold text-slate-900 md:text-2xl">Últimos resultados</h2>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 group-open:hidden">Abrir</span>
              <span className="hidden rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700 group-open:inline">Fechar</span>
            </summary>

            <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div className="sr-only">
              </div>
              <p className="text-sm text-slate-500">Jogos com resultado preenchido mais recentemente no calendário.</p>
            </div>

            {latestResults.length === 0 ? (
              <p className="mt-5 text-sm text-slate-600">Ainda não existem resultados publicados.</p>
            ) : (
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {latestResults.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    getTeamName={getTeamName}
                    getMatchTeamName={getMatchTeamName}
                    getGroupName={getGroupName}
                    getFieldName={getFieldName}
                    goals={getMatchGoals(match.id)}
                    playerById={playerById}
                  />
                ))}
              </div>
            )}
          </details>

          <details id="calendario" className="group scroll-mt-20 rounded-2xl bg-white shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 border-b border-slate-200 p-5 md:p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-red-700 md:text-sm">Calendário</p>
                <h2 className="text-xl font-bold text-slate-900 md:text-2xl">Jogos e resultados</h2>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 group-open:hidden">Abrir</span>
              <span className="hidden rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700 group-open:inline">Fechar</span>
            </summary>
            <div className="p-5 md:p-6">
              <p className="text-sm text-slate-600">Tabela pública para equipas, atletas, famílias e adeptos acompanharem o torneio.</p>

              <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-900">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <p>
                    Esta página não atualiza em tempo real. Para ver os dados mais recentes, carrega em <strong>Atualizar dados</strong>.
                  </p>
                  <button
                    type="button"
                    onClick={() => loadTournament(false)}
                    disabled={refreshing}
                    className="inline-flex items-center justify-center rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-[#24170f] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {refreshing ? 'A atualizar...' : 'Atualizar dados'}
                  </button>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <FilterSelect label="Equipa" value={teamFilter} onChange={setTeamFilter}>
                  <option value="all">Todas as equipas</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </FilterSelect>

                <FilterSelect label="Grupo" value={groupFilter} onChange={setGroupFilter}>
                  <option value="all">Todos os grupos</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>{group.name}</option>
                  ))}
                </FilterSelect>

                <FilterSelect label="Campo" value={fieldFilter} onChange={setFieldFilter}>
                  <option value="all">Todos os campos</option>
                  {fields.map((field) => (
                    <option key={field.id} value={field.id}>{field.name}</option>
                  ))}
                </FilterSelect>

                <FilterSelect label="Estado" value={statusFilter} onChange={setStatusFilter}>
                  <option value="all">Todos os estados</option>
                  <option value="without_result">Sem resultado</option>
                  <option value="with_result">Com resultado</option>
                  {Object.entries(statusLabels).map(([status, label]) => (
                    <option key={status} value={status}>{label}</option>
                  ))}
                </FilterSelect>

                <FilterSelect label="Dia" value={dateFilter} onChange={setDateFilter}>
                  <option value="all">Todos os dias</option>
                  {scheduleDates.map((date) => (
                    <option key={date} value={date}>{formatShortDate(date)}</option>
                  ))}
                </FilterSelect>
              </div>

              <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <p className="text-sm text-slate-500">
                  A mostrar {filteredMatches.length} de {matches.length} jogo(s), em {scheduleDates.length} dia(s) de programa.
                </p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Limpar filtros
                </button>
              </div>
            </div>

            {matches.length === 0 ? (
              <div className="p-6 text-sm text-slate-600">O calendário de jogos ainda não está disponível.</div>
            ) : groupedMatches.length === 0 ? (
              <div className="p-6 text-sm text-slate-600">Não existem dias configurados ou jogos para apresentar.</div>
            ) : (
              <div className="divide-y divide-slate-200">
                {groupedMatches.map((group) => (
                  <div key={group.date} className="p-6">
                    <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                      <h3 className="text-lg font-bold capitalize text-slate-900">{formatDate(group.date === 'Data por definir' ? null : group.date)}</h3>
                      <span className="text-sm font-semibold text-slate-500">{group.matches.length} jogo(s)</span>
                    </div>

                    {group.matches.length === 0 ? (
                      <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                        Ainda não existem jogos agendados para este dia. A organização pode distribuir jogos para esta data no gestor de torneios.
                      </div>
                    ) : (
                      <>
                        <div className="mt-4 grid gap-3 lg:hidden">
                          {group.matches.map((match) => (
                            <div key={match.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-xs font-bold uppercase tracking-wide text-red-700">Jogo {match.match_number}</p>
                                  <p className="mt-1 text-sm font-semibold text-slate-900">{formatTime(match.match_time)}</p>
                                </div>
                                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                                  {statusLabels[match.status] || match.status}
                                </span>
                              </div>

                              <div className="mt-4 space-y-3">
                                <div className="rounded-xl bg-white p-3 text-center shadow-sm">
                                  <p className="text-sm font-bold text-slate-900">{getMatchTeamName(match, 'a')}</p>
                                  <p className="my-2 text-lg font-black text-red-700">{formatMatchResult(match)}</p>
                                  <p className="text-sm font-bold text-slate-900">{getMatchTeamName(match, 'b')}</p>
                                  <ScorersDisplay
                                    match={match}
                                    goals={getMatchGoals(match.id)}
                                    playerById={playerById}
                                    teamById={teamById}
                                  />
                                </div>

                                <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                                  <span className="rounded-full bg-white px-3 py-1 font-semibold">{getFieldName(match.field_id)}</span>
                                  <span className="rounded-full bg-white px-3 py-1 font-semibold">{getGroupName(match.group_id)}</span>
                                  <span className="rounded-full bg-white px-3 py-1 font-semibold">{phaseLabels[match.phase] || match.phase}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="mt-4 hidden overflow-x-auto lg:block">
                          <table className="w-full min-w-[920px] text-left text-sm">
                            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                              <tr>
                                <th className="px-4 py-3">Jogo</th>
                                <th className="px-4 py-3">Hora</th>
                                <th className="px-4 py-3">Campo</th>
                                <th className="px-4 py-3">Grupo/Fase</th>
                                <th className="px-4 py-3 text-center">Confronto</th>
                                <th className="px-4 py-3">Estado</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {group.matches.map((match) => (
                                <tr key={match.id} className="hover:bg-slate-50">
                                  <td className="px-4 py-4 font-semibold text-slate-900">Jogo {match.match_number}</td>
                                  <td className="px-4 py-4 text-slate-700">{formatTime(match.match_time)}</td>
                                  <td className="px-4 py-4 text-slate-700">{getFieldName(match.field_id)}</td>
                                  <td className="px-4 py-4 text-slate-700">
                                    <div className="font-semibold">{getGroupName(match.group_id)}</div>
                                    <div className="text-xs text-slate-500">{phaseLabels[match.phase] || match.phase}</div>
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
                                      <span className="font-semibold text-slate-900">{getMatchTeamName(match, 'a')}</span>
                                      <span className="rounded-xl bg-slate-100 px-4 py-2 font-bold text-slate-900">
                                        {formatMatchResult(match)}
                                      </span>
                                      <span className="font-semibold text-slate-900">{getMatchTeamName(match, 'b')}</span>
                                    </div>
                                    <ScorersDisplay
                                      match={match}
                                      goals={getMatchGoals(match.id)}
                                      playerById={playerById}
                                      teamById={teamById}
                                    />
                                  </td>
                                  <td className="px-4 py-4">
                                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                      {statusLabels[match.status] || match.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </details>

          <section id="marcadores" className="scroll-mt-20 rounded-2xl bg-white p-5 shadow-sm md:p-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-red-700 md:text-sm">Melhor marcador</p>
                <h2 className="text-xl font-bold text-slate-900 md:text-2xl">Melhores marcadores</h2>
              </div>
              <p className="text-sm text-slate-500">Ranking calculado automaticamente pelos golos registados nos jogos.</p>
            </div>

            {topScorers.length === 0 ? (
              <p className="mt-5 text-sm text-slate-600">Ainda não existem marcadores registados.</p>
            ) : (
              <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {topScorers.slice(0, 12).map((item, index) => (
                  <div key={item.player.id} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-700 text-sm font-black text-white">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-slate-900">{item.player.name}</p>
                      <p className="truncate text-sm text-slate-600">{item.team?.name || 'Equipa não identificada'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-slate-900">{item.goals}</p>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">golo{item.goals === 1 ? '' : 's'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <TournamentMemoriesSection />

          <details id="classificacao" className="group scroll-mt-20 rounded-2xl bg-white shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 border-b border-slate-200 p-5 md:p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-red-700 md:text-sm">Classificação</p>
                <h2 className="text-xl font-bold text-slate-900 md:text-2xl">Grupos e pontuação</h2>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 group-open:hidden">Abrir</span>
              <span className="hidden rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700 group-open:inline">Fechar</span>
            </summary>

            <section className="grid gap-4 p-5 xl:grid-cols-2 md:gap-6 md:p-6">
            {groups.map((group) => {
              const rows = standingsByGroup.get(group.id) || [];

              return (
                <div key={group.id} className="rounded-2xl bg-white shadow-sm">
                  <div className="border-b border-slate-200 p-6">
                    <p className="text-sm font-semibold uppercase tracking-wide text-red-700">Classificação</p>
                    <h2 className="text-2xl font-bold text-slate-900">{group.name}</h2>
                  </div>

                  {rows.length === 0 ? (
                    <p className="p-6 text-sm text-slate-600">Ainda não existem equipas neste grupo.</p>
                  ) : (
                    <>
                      <div className="grid gap-3 p-4 lg:hidden">
                        {rows.map((row, index) => (
                          <div key={row.team.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">#{index + 1}</p>
                                <p className="truncate text-base font-black text-slate-900">{row.team.name}</p>
                              </div>
                              <div className="rounded-2xl bg-white px-4 py-2 text-center shadow-sm">
                                <p className="text-2xl font-black text-red-700">{row.points}</p>
                                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">pts</p>
                              </div>
                            </div>

                            <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs text-slate-600">
                              <div className="rounded-xl bg-white p-2"><strong className="block text-sm text-slate-900">{row.played}</strong>J</div>
                              <div className="rounded-xl bg-white p-2"><strong className="block text-sm text-slate-900">{row.wins}</strong>V</div>
                              <div className="rounded-xl bg-white p-2"><strong className="block text-sm text-slate-900">{row.draws}</strong>E</div>
                              <div className="rounded-xl bg-white p-2"><strong className="block text-sm text-slate-900">{row.losses}</strong>D</div>
                            </div>

                            <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs text-slate-600">
                              <div className="rounded-xl bg-white p-2"><strong className="block text-sm text-slate-900">{row.goalsFor}</strong>GM</div>
                              <div className="rounded-xl bg-white p-2"><strong className="block text-sm text-slate-900">{row.goalsAgainst}</strong>GS</div>
                              <div className="rounded-xl bg-white p-2"><strong className="block text-sm text-slate-900">{row.goalDifference}</strong>DG</div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="hidden overflow-x-auto lg:block">
                        <table className="w-full min-w-[640px] text-left text-sm">
                          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                            <tr>
                              <th className="px-4 py-3">#</th>
                              <th className="px-4 py-3">Equipa</th>
                              <th className="px-4 py-3 text-center">Pts</th>
                              <th className="px-4 py-3 text-center">J</th>
                              <th className="px-4 py-3 text-center">V</th>
                              <th className="px-4 py-3 text-center">E</th>
                              <th className="px-4 py-3 text-center">D</th>
                              <th className="px-4 py-3 text-center">GM</th>
                              <th className="px-4 py-3 text-center">GS</th>
                              <th className="px-4 py-3 text-center">DG</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {rows.map((row, index) => (
                              <tr key={row.team.id}>
                                <td className="px-4 py-3 font-semibold text-slate-500">{index + 1}</td>
                                <td className="px-4 py-3 font-semibold text-slate-900">{row.team.name}</td>
                                <td className="px-4 py-3 text-center text-lg font-bold text-slate-900">{row.points}</td>
                                <td className="px-4 py-3 text-center">{row.played}</td>
                                <td className="px-4 py-3 text-center">{row.wins}</td>
                                <td className="px-4 py-3 text-center">{row.draws}</td>
                                <td className="px-4 py-3 text-center">{row.losses}</td>
                                <td className="px-4 py-3 text-center">{row.goalsFor}</td>
                                <td className="px-4 py-3 text-center">{row.goalsAgainst}</td>
                                <td className="px-4 py-3 text-center">{row.goalDifference}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
            </section>
          </details>

          <details id="equipas" className="group scroll-mt-20 rounded-2xl bg-white p-5 shadow-sm md:p-6">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-red-700 md:text-sm">Participantes</p>
                <h2 className="text-xl font-bold text-slate-900 md:text-2xl">Equipas</h2>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 group-open:hidden">Abrir</span>
              <span className="hidden rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700 group-open:inline">Fechar</span>
            </summary>

            {teams.length === 0 ? (
              <p className="mt-4 text-sm text-slate-600">Ainda não existem equipas publicadas para este torneio.</p>
            ) : (
              <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {teams.map((team) => (
                  <div key={team.id} className="rounded-xl border border-slate-200 p-4">
                    <p className="font-bold text-slate-900">{team.name}</p>
                    <p className="mt-1 text-sm text-slate-600">{team.club || team.location || 'Clube por definir'}</p>
                  </div>
                ))}
              </div>
            )}
          </details>

          <MemberCallToAction />

          <section id="parceiros" className="scroll-mt-20 rounded-2xl bg-white p-5 shadow-sm md:p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-red-700 md:text-sm">Apoios</p>
              <h2 className="text-xl font-bold text-slate-900 md:text-2xl">Parceiros</h2>
              <p className="mt-2 text-sm text-slate-500">Parceiros e apoiadores do torneio e do GDR Boavista.</p>
            </div>

            <div className="mt-5 space-y-6">
              <SponsorSection
                eyebrow="Parceiros do torneio"
                title="Parceiros e apoiadores do torneio"
                description="Marcas, empresas e entidades associadas especificamente a este torneio."
                sponsors={tournamentSponsors}
              />

              <SponsorSection
                eyebrow="Parceiros do clube"
                title="Parceiros do GDR Boavista"
                description="Marcas e entidades que apoiam o clube. Clica no logo para abrir o website do parceiro."
                sponsors={clubSponsors}
              />
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}



function TournamentNumbersSection({
  numbers,
}: {
  numbers: Array<{ label: string; value: number; description: string }>;
}) {
  return (
    <section id="numeros" className="scroll-mt-20 overflow-hidden rounded-3xl bg-[#24170f] text-white shadow-sm">
      <div className="relative p-5 md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(220,38,38,0.35),transparent_34%)]" />
        <div className="relative">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.32em] text-red-300 md:text-sm">O torneio em números</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">A dimensão de uma grande noite de futebol.</h2>
            </div>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {numbers.map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-sm backdrop-blur">
                <p className="text-4xl font-black text-white md:text-5xl">{item.value}</p>
                <p className="mt-2 text-sm font-black uppercase tracking-[0.18em] text-red-300">{item.label}</p>
                <p className="mt-3 text-sm leading-6 text-white/65">{item.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/70">
            Mais do que um torneio, vivemos uma noite de união, amizade e paixão pelo futebol. Obrigado a todos os que fizeram parte desta história do GDR Boavista.
          </div>
        </div>
      </div>
    </section>
  );
}

function TournamentMemoriesSection() {
  return (
    <section id="memorias" className="scroll-mt-20 space-y-6">
      <section className="overflow-hidden rounded-3xl bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="p-6 md:p-8 lg:p-10">
            <p className="text-xs font-black uppercase tracking-[0.32em] text-red-700 md:text-sm">Memórias do torneio</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-900 md:text-5xl">
              Uma noite de prémios, entrevistas e futebol vivido em comunidade.
            </h2>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">
              O 1.º Torneio Fut 7 GDR Boavista terminou, mas ficam os momentos, as equipas, os testemunhos e o orgulho de todos os que fizeram parte desta grande festa do futebol.
            </p>
          </div>
          <div className="relative min-h-[300px] overflow-hidden bg-[#24170f]">
            <img
              src="/tournaments/fut7-2026/memorias/trofeus-mesa.webp"
              alt="Troféus do 1.º Torneio Fut 7 GDR Boavista"
              className="h-full min-h-[300px] w-full object-cover opacity-90"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#24170f]/80 via-transparent to-transparent" />
            <div className="absolute bottom-5 left-5 right-5 rounded-2xl bg-white/90 p-4 shadow-lg backdrop-blur">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-red-700">Entrega de prémios</p>
              <p className="mt-1 text-lg font-black text-slate-900">Os momentos que encerraram o torneio.</p>
            </div>
          </div>
        </div>
      </section>

      <TournamentInterviewsSection />
      <TournamentAwardsGallery />

      <section className="rounded-3xl bg-gradient-to-r from-[#24170f] via-[#3b2118] to-red-800 p-6 text-white shadow-sm md:p-8">
        <p className="text-xs font-black uppercase tracking-[0.32em] text-red-200">Obrigado</p>
        <h2 className="mt-3 text-3xl font-black md:text-4xl">Mais do que resultados, ficam as pessoas.</h2>
        <p className="mt-4 max-w-4xl text-sm leading-7 text-white/75 md:text-base">
          Obrigado a todos os atletas, equipas, treinadores, famílias, parceiros e amigos que fizeram parte do 1.º Torneio Fut 7 GDR Boavista. A força do clube também se constrói nestes momentos de união, convívio e paixão pelo futebol.
        </p>
      </section>
    </section>
  );
}

function TournamentInterviewsSection() {
  return (
    <section id="entrevistas" className="scroll-mt-20 rounded-3xl bg-white p-5 shadow-sm md:p-6 lg:p-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.32em] text-red-700 md:text-sm">Vozes do torneio</p>
          <h2 className="mt-3 text-2xl font-black text-slate-900 md:text-3xl">Entrevistas e testemunhos</h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-slate-500">
          Conversas conduzidas por Valdemar, Diretor do GDR Boavista, com alguns dos protagonistas do torneio.
        </p>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {tournamentInterviewVideos.map((video) => (
          <article key={video.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 shadow-sm">
            <div className="bg-[#24170f] p-3">
              <div className="aspect-[9/16] overflow-hidden rounded-2xl bg-black">
                <iframe
                  src={`https://www.youtube.com/embed/${video.id}`}
                  title={`${video.title} - ${video.person}`}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  loading="lazy"
                />
              </div>
            </div>
            <div className="p-5">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-red-700">{video.title}</p>
              <h3 className="mt-2 text-xl font-black text-slate-900">{video.person}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{video.description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function TournamentAwardsGallery() {
  const featuredPhoto = tournamentMemoryPhotos.find((photo) => photo.featured) || tournamentMemoryPhotos[0];
  const otherPhotos = tournamentMemoryPhotos.filter((photo) => photo !== featuredPhoto);
  const [selectedPhoto, setSelectedPhoto] = useState<(typeof tournamentMemoryPhotos)[number] | null>(null);

  const openPhoto = (photo: (typeof tournamentMemoryPhotos)[number]) => {
    setSelectedPhoto(photo);
  };

  const closePhoto = () => {
    setSelectedPhoto(null);
  };

  return (
    <section id="premios" className="scroll-mt-20 rounded-3xl bg-white p-5 shadow-sm md:p-6 lg:p-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.32em] text-red-700 md:text-sm">Entrega de prémios</p>
          <h2 className="mt-3 text-2xl font-black text-slate-900 md:text-3xl">Galeria de campeões e momentos</h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-slate-500">
          Uma seleção de imagens da entrega de prémios e dos momentos finais do torneio. Clica numa fotografia para ampliar.
        </p>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <button
          type="button"
          onClick={() => openPhoto(featuredPhoto)}
          className="group relative min-h-[360px] overflow-hidden rounded-3xl bg-[#24170f] text-left shadow-sm outline-none ring-offset-2 transition focus-visible:ring-2 focus-visible:ring-red-700"
          aria-label={`Ampliar fotografia: ${featuredPhoto.title}`}
        >
          <img
            src={featuredPhoto.src}
            alt={featuredPhoto.title}
            className="h-full min-h-[360px] w-full object-cover transition duration-700 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
          <div className="absolute right-5 top-5 rounded-full bg-white/90 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-slate-900 opacity-0 shadow-sm backdrop-blur transition group-hover:opacity-100 group-focus-visible:opacity-100">
            Ampliar
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-red-300">Destaque</p>
            <h3 className="mt-2 text-3xl font-black">{featuredPhoto.title}</h3>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/75">{featuredPhoto.description}</p>
          </div>
        </button>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          {otherPhotos.slice(0, 3).map((photo) => (
            <button
              key={photo.src}
              type="button"
              onClick={() => openPhoto(photo)}
              className="group grid grid-cols-[120px_1fr] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 text-left shadow-sm outline-none ring-offset-2 transition hover:border-red-200 hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-700"
              aria-label={`Ampliar fotografia: ${photo.title}`}
            >
              <div className="relative h-full min-h-[130px] overflow-hidden">
                <img src={photo.src} alt={photo.title} className="h-full min-h-[130px] w-full object-cover transition duration-700 group-hover:scale-105" loading="lazy" />
              </div>
              <div className="p-4">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-red-700">Momento</p>
                <h3 className="mt-1 font-black text-slate-900">{photo.title}</h3>
                <p className="mt-2 text-sm leading-5 text-slate-600">{photo.description}</p>
                <span className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 shadow-sm transition group-hover:text-red-700">
                  Ver maior
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {otherPhotos.slice(3).map((photo) => (
          <button
            key={photo.src}
            type="button"
            onClick={() => openPhoto(photo)}
            className="group overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 text-left shadow-sm outline-none ring-offset-2 transition hover:border-red-200 hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-700"
            aria-label={`Ampliar fotografia: ${photo.title}`}
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-slate-200">
              <img src={photo.src} alt={photo.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" loading="lazy" />
              <span className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-800 opacity-0 shadow-sm backdrop-blur transition group-hover:opacity-100 group-focus-visible:opacity-100">
                Ampliar
              </span>
            </div>
            <div className="p-4">
              <h3 className="font-black text-slate-900">{photo.title}</h3>
              <p className="mt-2 text-sm leading-5 text-slate-600">{photo.description}</p>
            </div>
          </button>
        ))}
      </div>

      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={selectedPhoto.title}
          onClick={closePhoto}
        >
          <div
            className="relative max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={closePhoto}
              className="absolute right-4 top-4 z-10 rounded-full bg-white/95 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-900 shadow-lg transition hover:bg-red-700 hover:text-white"
            >
              Fechar
            </button>
            <div className="max-h-[78vh] bg-black">
              <img
                src={selectedPhoto.src}
                alt={selectedPhoto.title}
                className="mx-auto max-h-[78vh] w-full object-contain"
              />
            </div>
            <div className="border-t border-slate-200 p-5 md:p-6">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-red-700">Entrega de prémios</p>
              <h3 className="mt-2 text-2xl font-black text-slate-900">{selectedPhoto.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{selectedPhoto.description}</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function MemberCallToAction() {
  return (
    <section className="overflow-hidden rounded-3xl bg-gradient-to-r from-[#24170f] via-[#3b2118] to-red-700 p-1 shadow-sm">
      <div className="rounded-[1.35rem] bg-white/95 p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-red-700">Faz parte do clube</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-900 md:text-4xl">Torna-te sócio do GDR Boavista.</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 md:text-base">
              Apoia o clube, ajuda-nos a crescer e acompanha de perto a formação, as equipas e os eventos do Boavista. Envia os teus dados através da página de sócios.
            </p>
          </div>

          <Link
            to="/socios"
            className="inline-flex items-center justify-center rounded-2xl bg-red-700 px-6 py-4 text-sm font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-[#24170f]"
          >
            Quero ser sócio
          </Link>
        </div>
      </div>
    </section>
  );
}

function SponsorSection({
  eyebrow,
  title,
  description,
  sponsors,
}: {
  eyebrow: string;
  title: string;
  description: string;
  sponsors: Array<ClubSponsor | TournamentSponsor>;
}) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-red-700">{eyebrow}</p>
          <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
          <p className="mt-2 text-sm text-slate-600">{description}</p>
        </div>
      </div>

      {sponsors.length === 0 ? (
        <p className="mt-5 text-sm text-slate-600">Ainda não existem parceiros publicados nesta secção.</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {sponsors.map((sponsor) => {
            const content = (
              <div className="flex h-full min-h-36 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center transition hover:border-red-300 hover:bg-red-50">
                {sponsor.logo_url ? (
                  <img
                    src={sponsor.logo_url}
                    alt={sponsor.name}
                    className="max-h-20 max-w-full object-contain"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-lg font-bold text-red-800">
                    {sponsor.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <p className="mt-4 text-sm font-bold text-slate-900">{sponsor.name}</p>
                {sponsor.sponsor_level && (
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-red-700">
                    {normalizePartnerLabel(sponsor.sponsor_level)}
                  </p>
                )}
              </div>
            );

            if (!sponsor.website_url) {
              return <div key={sponsor.id}>{content}</div>;
            }

            return (
              <a
                key={sponsor.id}
                href={sponsor.website_url}
                target="_blank"
                rel="noreferrer"
                aria-label={`Abrir website de ${sponsor.name}`}
              >
                {content}
              </a>
            );
          })}
        </div>
      )}
    </section>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-red-700 focus:ring-2 focus:ring-red-100"
      >
        {children}
      </select>
    </label>
  );
}

function ScorersDisplay({
  match,
  goals,
  playerById,
  teamById: _teamById,
}: {
  match: TournamentMatch;
  goals: TournamentMatchGoal[];
  playerById: Map<string, TournamentPlayer>;
  teamById: Map<string, TournamentTeam>;
}) {
  if (goals.length === 0) return null;

  const goalsByTeam = new Map<string, Map<string, number>>();

  goals.forEach((goal) => {
    const teamGoals = goalsByTeam.get(goal.team_id) || new Map<string, number>();
    teamGoals.set(goal.player_id, (teamGoals.get(goal.player_id) || 0) + 1);
    goalsByTeam.set(goal.team_id, teamGoals);
  });

  function renderTeamScorers(teamId: string | null) {
    if (!teamId) return null;
    const teamGoals = goalsByTeam.get(teamId);
    if (!teamGoals || teamGoals.size === 0) return null;

    const scorers = Array.from(teamGoals.entries())
      .map(([playerId, total]) => ({ player: playerById.get(playerId), total }))
      .filter((item) => Boolean(item.player))
      .map((item) => `${item.player?.name}${item.total > 1 ? ` ${item.total}` : ''}`)
      .join(', ');

    if (!scorers) return null;

    return <p className="text-xs text-slate-600">⚽ {scorers}</p>;
  }

  return (
    <div className="mt-3 space-y-1 rounded-xl bg-white/70 p-3 text-left">
      {renderTeamScorers(match.team_a_id)}
      {renderTeamScorers(match.team_b_id)}
    </div>
  );
}

function MatchCard({
  match,
  getTeamName: _getTeamName,
  getMatchTeamName,
  getGroupName,
  getFieldName,
  goals,
  playerById,
}: {
  match: TournamentMatch;
  getTeamName: (teamId: string | null) => string;
  getMatchTeamName: (match: TournamentMatch, side: 'a' | 'b') => string;
  getGroupName: (groupId: string | null) => string;
  getFieldName: (fieldId: string | null) => string;
  goals: TournamentMatchGoal[];
  playerById: Map<string, TournamentPlayer>;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-red-700">Jogo {match.match_number}</p>
          <p className="mt-1 text-sm text-slate-500">{formatShortDate(match.match_date)} · {formatTime(match.match_time)}</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
          {getFieldName(match.field_id)}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
        <span className="min-w-0 break-words text-sm font-bold leading-snug text-slate-900 md:text-base">{getMatchTeamName(match, 'a')}</span>
        <span className="shrink-0 rounded-xl bg-white px-3 py-2 text-sm font-bold text-slate-900 shadow-sm md:px-4 md:text-base">
          {formatMatchResult(match)}
        </span>
        <span className="min-w-0 break-words text-sm font-bold leading-snug text-slate-900 md:text-base">{getMatchTeamName(match, 'b')}</span>
      </div>

      <ScorersDisplay
        match={match}
        goals={goals}
        playerById={playerById}
        teamById={new Map()}
      />

      <p className="mt-4 text-center text-xs text-slate-500">
        {getGroupName(match.group_id)} · {phaseLabels[match.phase] || match.phase}
      </p>
    </div>
  );
}
