import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
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
  phase: string;
  match_number: number;
  match_date: string | null;
  match_time: string | null;
  status: string;
  score_a: number | null;
  score_b: number | null;
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

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [groups, setGroups] = useState<TournamentGroup[]>([]);
  const [groupTeams, setGroupTeams] = useState<TournamentGroupTeam[]>([]);
  const [fields, setFields] = useState<TournamentField[]>([]);
  const [days, setDays] = useState<TournamentDay[]>([]);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
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

      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('slug', slug)
        .single();

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
      setClubSponsors((clubSponsorsResponse.data || []) as ClubSponsor[]);
      setTournamentSponsors((tournamentSponsorsResponse.data || []) as TournamentSponsor[]);
      setLastUpdatedAt(new Date());
      setLoading(false);
      setRefreshing(false);
    },
    [slug]
  );

  useEffect(() => {
    loadTournament(true);
  }, [loadTournament]);

  const teamById = useMemo(() => {
    return new Map(teams.map((team) => [team.id, team]));
  }, [teams]);

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

  const finishedMatches = useMemo(() => {
    return matches.filter((match) => hasResult(match));
  }, [matches]);

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

  function getGroupName(groupId: string | null) {
    if (!groupId) return 'Sem grupo';
    return groupById.get(groupId)?.name || 'Sem grupo';
  }

  function getFieldName(fieldId: string | null) {
    if (!fieldId) return 'Campo por definir';
    return fieldById.get(fieldId)?.name || 'Campo por definir';
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
          <Link to="/" className="mt-6 inline-flex rounded-xl bg-green-700 px-5 py-3 text-sm font-semibold text-white hover:bg-green-800">
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
          <p className="text-sm font-semibold uppercase tracking-wide text-green-700">Gestor de Torneios Boavista</p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">{tournament.name}</h1>
          <p className="mt-4 text-slate-600">Este torneio ainda não está publicado.</p>
          <Link to="/" className="mt-6 inline-flex rounded-xl bg-green-700 px-5 py-3 text-sm font-semibold text-white hover:bg-green-800">
            Voltar ao site
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="bg-green-800 px-6 py-14 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-green-100">GDR Boavista</p>
          <h1 className="mt-3 text-4xl font-bold md:text-5xl">{tournament.name}</h1>

          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            {tournament.age_group && <span className="rounded-full bg-white/15 px-4 py-2">{tournament.age_group}</span>}
            {tournament.football_type && <span className="rounded-full bg-white/15 px-4 py-2">{tournament.football_type}</span>}
            {tournament.location && <span className="rounded-full bg-white/15 px-4 py-2">{tournament.location}</span>}
            {tournament.edition && <span className="rounded-full bg-white/15 px-4 py-2">Edição {tournament.edition}</span>}
          </div>

          <div className="mt-8 rounded-2xl bg-white/10 p-4 text-sm text-green-50 ring-1 ring-white/20">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold text-white">Atualização dos dados</p>
                <p className="mt-1">
                  Os jogos e resultados são atualizados quando a página é carregada. Para ver alterações recentes feitas pela organização, usa o botão abaixo.
                </p>
                <p className="mt-1 text-xs text-green-100">Última atualização nesta página: {formatLastUpdated(lastUpdatedAt)}</p>
              </div>

              <button
                type="button"
                onClick={() => loadTournament(false)}
                disabled={refreshing}
                className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-bold text-green-800 shadow-sm transition hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {refreshing ? 'A atualizar...' : 'Atualizar dados'}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-10">
        <div className="mx-auto max-w-6xl space-y-8">
          <div className="grid gap-4 md:grid-cols-4">
            <SummaryCard label="Equipas" value={teams.length} />
            <SummaryCard label="Grupos" value={groups.length} />
            <SummaryCard label="Jogos" value={matches.length} />
            <SummaryCard label="Resultados" value={finishedMatches.length} />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-2xl bg-white p-6 shadow-sm lg:col-span-2">
              <h2 className="text-2xl font-bold text-slate-900">Informação do torneio</h2>
              <p className="mt-4 whitespace-pre-line text-slate-600">
                {tournament.description || 'Informação do torneio em breve.'}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">Contactos e local</h2>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <p><strong className="text-slate-900">Local:</strong> {tournament.location || '-'}</p>
                <p><strong className="text-slate-900">Morada:</strong> {tournament.address || '-'}</p>
                <p><strong className="text-slate-900">Telefone:</strong> {tournament.contact_phone || '-'}</p>
                <p><strong className="text-slate-900">Email:</strong> {tournament.contact_email || '-'}</p>
              </div>
            </div>
          </div>

          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-green-700">Ao vivo</p>
                <h2 className="text-2xl font-bold text-slate-900">Próximos jogos</h2>
              </div>
              <p className="text-sm text-slate-500">Jogos por disputar, ordenados por data e hora.</p>
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
                    getGroupName={getGroupName}
                    getFieldName={getFieldName}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-green-700">Resultados</p>
                <h2 className="text-2xl font-bold text-slate-900">Últimos resultados</h2>
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
                    getGroupName={getGroupName}
                    getFieldName={getFieldName}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl bg-white shadow-sm">
            <div className="border-b border-slate-200 p-6">
              <p className="text-sm font-semibold uppercase tracking-wide text-green-700">Calendário</p>
              <h2 className="text-2xl font-bold text-slate-900">Jogos e resultados</h2>
              <p className="mt-2 text-sm text-slate-600">Tabela pública para equipas, atletas, famílias e adeptos acompanharem o torneio.</p>

              <div className="mt-5 rounded-2xl border border-green-100 bg-green-50 p-4 text-sm text-green-900">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <p>
                    Esta página não atualiza em tempo real. Para ver os dados mais recentes, carrega em <strong>Atualizar dados</strong>.
                  </p>
                  <button
                    type="button"
                    onClick={() => loadTournament(false)}
                    disabled={refreshing}
                    className="inline-flex items-center justify-center rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-70"
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
                      <div className="mt-4 overflow-x-auto">
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
                                    <span className="font-semibold text-slate-900">{getTeamName(match.team_a_id)}</span>
                                    <span className="rounded-xl bg-slate-100 px-4 py-2 font-bold text-slate-900">
                                      {hasResult(match) ? `${match.score_a} x ${match.score_b}` : 'x'}
                                    </span>
                                    <span className="font-semibold text-slate-900">{getTeamName(match.team_b_id)}</span>
                                  </div>
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
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            {groups.map((group) => {
              const rows = standingsByGroup.get(group.id) || [];

              return (
                <div key={group.id} className="rounded-2xl bg-white shadow-sm">
                  <div className="border-b border-slate-200 p-6">
                    <p className="text-sm font-semibold uppercase tracking-wide text-green-700">Classificação</p>
                    <h2 className="text-2xl font-bold text-slate-900">{group.name}</h2>
                  </div>

                  {rows.length === 0 ? (
                    <p className="p-6 text-sm text-slate-600">Ainda não existem equipas neste grupo.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[640px] text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                          <tr>
                            <th className="px-4 py-3">#</th>
                            <th className="px-4 py-3">Equipa</th>
                            <th className="px-4 py-3 text-center">J</th>
                            <th className="px-4 py-3 text-center">V</th>
                            <th className="px-4 py-3 text-center">E</th>
                            <th className="px-4 py-3 text-center">D</th>
                            <th className="px-4 py-3 text-center">GM</th>
                            <th className="px-4 py-3 text-center">GS</th>
                            <th className="px-4 py-3 text-center">DG</th>
                            <th className="px-4 py-3 text-center">Pts</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {rows.map((row, index) => (
                            <tr key={row.team.id}>
                              <td className="px-4 py-3 font-semibold text-slate-500">{index + 1}</td>
                              <td className="px-4 py-3 font-semibold text-slate-900">{row.team.name}</td>
                              <td className="px-4 py-3 text-center">{row.played}</td>
                              <td className="px-4 py-3 text-center">{row.wins}</td>
                              <td className="px-4 py-3 text-center">{row.draws}</td>
                              <td className="px-4 py-3 text-center">{row.losses}</td>
                              <td className="px-4 py-3 text-center">{row.goalsFor}</td>
                              <td className="px-4 py-3 text-center">{row.goalsAgainst}</td>
                              <td className="px-4 py-3 text-center">{row.goalDifference}</td>
                              <td className="px-4 py-3 text-center font-bold text-slate-900">{row.points}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-green-700">Participantes</p>
            <h2 className="text-2xl font-bold text-slate-900">Equipas</h2>

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
          </section>

          <MemberCallToAction />

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
    </main>
  );
}


function MemberCallToAction() {
  return (
    <section className="overflow-hidden rounded-3xl bg-gradient-to-r from-green-800 via-green-700 to-red-700 p-1 shadow-sm">
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
            className="inline-flex items-center justify-center rounded-2xl bg-green-700 px-6 py-4 text-sm font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-green-800"
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
          <p className="text-sm font-semibold uppercase tracking-wide text-green-700">{eyebrow}</p>
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
              <div className="flex h-full min-h-36 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center transition hover:border-green-300 hover:bg-green-50">
                {sponsor.logo_url ? (
                  <img
                    src={sponsor.logo_url}
                    alt={sponsor.name}
                    className="max-h-20 max-w-full object-contain"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-lg font-bold text-green-800">
                    {sponsor.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <p className="mt-4 text-sm font-bold text-slate-900">{sponsor.name}</p>
                {sponsor.sponsor_level && (
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-green-700">
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

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
    </div>
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
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
      >
        {children}
      </select>
    </label>
  );
}

function MatchCard({
  match,
  getTeamName,
  getGroupName,
  getFieldName,
}: {
  match: TournamentMatch;
  getTeamName: (teamId: string | null) => string;
  getGroupName: (groupId: string | null) => string;
  getFieldName: (fieldId: string | null) => string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-green-700">Jogo {match.match_number}</p>
          <p className="mt-1 text-sm text-slate-500">{formatShortDate(match.match_date)} · {formatTime(match.match_time)}</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
          {getFieldName(match.field_id)}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
        <span className="font-bold text-slate-900">{getTeamName(match.team_a_id)}</span>
        <span className="rounded-xl bg-white px-4 py-2 font-bold text-slate-900 shadow-sm">
          {hasResult(match) ? `${match.score_a} x ${match.score_b}` : 'x'}
        </span>
        <span className="font-bold text-slate-900">{getTeamName(match.team_b_id)}</span>
      </div>

      <p className="mt-4 text-center text-xs text-slate-500">
        {getGroupName(match.group_id)} · {phaseLabels[match.phase] || match.phase}
      </p>
    </div>
  );
}
