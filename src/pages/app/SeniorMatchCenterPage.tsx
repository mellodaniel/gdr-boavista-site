import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileText,
  Flag,
  Goal,
  History,
  Loader2,
  Plus,
  RefreshCcw,
  Save,
  Shield,
  Shirt,
  StickyNote,
  Users,
  XCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { supabase } from '../../lib/supabase';
import type { GdrbRosterPlayer, GdrbSeniorMatch, GdrbSeniorMatchEvent, GdrbSeniorMatchReport, GdrbSeniorMatchSquad, GdrbSeniorOpponentAnalysis } from '../../types/database';

type AppTab = 'ficha' | 'ao-vivo' | 'tatica' | 'substituicoes' | 'adversario' | 'relatorio' | 'historico';
type MatchPeriod = '1P' | 'INT' | '2P' | 'PRO' | 'PEN';
type MatchStatus = 'draft' | 'scheduled' | 'in_progress' | 'halftime' | 'finished' | 'closed';
type SquadRole = 'starter' | 'bench' | 'staff';
type SquadStatus = 'starter' | 'bench' | 'on_field' | 'substituted' | 'unused' | 'injured' | 'sent_off';
type EventType =
  | 'goal'
  | 'assist'
  | 'shot'
  | 'shot_on_target'
  | 'corner'
  | 'free_kick'
  | 'foul_committed'
  | 'foul_received'
  | 'yellow_card'
  | 'red_card'
  | 'save'
  | 'defensive_error'
  | 'ball_loss'
  | 'ball_recovery'
  | 'big_chance'
  | 'injury'
  | 'substitution'
  | 'tactical_note';

const SENIOR_TEAM_KEY = 'senior';
const HOME_TEAM_NAME = 'GDR Boavista';

const formations = ['4-3-3', '4-4-2', '4-2-3-1', '3-5-2', '4-1-4-1', '3-4-3'];

const tacticalTags = [
  'Boa saída de bola',
  'Dificuldade na saída',
  'Falta largura',
  'Falta profundidade',
  'Equipa partida',
  'Espaço entre linhas',
  'Problema no lado direito',
  'Problema no lado esquerdo',
  'Boa reação à perda',
  'Má reação à perda',
  'Bola parada defensiva',
  'Bola parada ofensiva',
  'Jogador cansado',
  'Risco de cartão',
];

const eventButtons: { type: EventType; label: string; icon: typeof Goal; tone: string }[] = [
  { type: 'goal', label: 'Golo', icon: Goal, tone: 'bg-emerald-600 text-white' },
  { type: 'shot', label: 'Remate', icon: Flag, tone: 'bg-white text-zinc-900' },
  { type: 'shot_on_target', label: 'À baliza', icon: Flag, tone: 'bg-white text-zinc-900' },
  { type: 'big_chance', label: 'Ocasião', icon: AlertTriangle, tone: 'bg-amber-500 text-zinc-950' },
  { type: 'yellow_card', label: 'Amarelo', icon: StickyNote, tone: 'bg-yellow-300 text-zinc-950' },
  { type: 'red_card', label: 'Vermelho', icon: XCircle, tone: 'bg-red-700 text-white' },
  { type: 'save', label: 'Defesa GR', icon: Shield, tone: 'bg-blue-700 text-white' },
  { type: 'defensive_error', label: 'Erro def.', icon: AlertTriangle, tone: 'bg-orange-600 text-white' },
  { type: 'ball_recovery', label: 'Recuperação', icon: CheckCircle2, tone: 'bg-white text-zinc-900' },
  { type: 'ball_loss', label: 'Perda bola', icon: XCircle, tone: 'bg-white text-zinc-900' },
  { type: 'corner', label: 'Canto', icon: Flag, tone: 'bg-white text-zinc-900' },
  { type: 'foul_committed', label: 'Falta', icon: AlertTriangle, tone: 'bg-white text-zinc-900' },
];

const eventLabels: Record<EventType, string> = {
  goal: 'Golo',
  assist: 'Assistência',
  shot: 'Remate',
  shot_on_target: 'Remate à baliza',
  corner: 'Canto',
  free_kick: 'Livre',
  foul_committed: 'Falta cometida',
  foul_received: 'Falta sofrida',
  yellow_card: 'Cartão amarelo',
  red_card: 'Cartão vermelho',
  save: 'Defesa do GR',
  defensive_error: 'Erro defensivo',
  ball_loss: 'Perda de bola',
  ball_recovery: 'Recuperação',
  big_chance: 'Oportunidade clara',
  injury: 'Lesão',
  substitution: 'Substituição',
  tactical_note: 'Nota tática',
};

const tabs: { id: AppTab; label: string; icon: typeof ClipboardList }[] = [
  { id: 'ficha', label: 'Ficha', icon: ClipboardList },
  { id: 'ao-vivo', label: 'Ao vivo', icon: Clock3 },
  { id: 'tatica', label: 'Tática', icon: StickyNote },
  { id: 'substituicoes', label: 'Subs', icon: ArrowLeftRight },
  { id: 'adversario', label: 'Adversário', icon: Shield },
  { id: 'relatorio', label: 'Relatório', icon: FileText },
  { id: 'historico', label: 'Histórico', icon: History },
];

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function currentTime() {
  return new Date().toTimeString().slice(0, 5);
}

function normalizeNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function formatMinute(event: Pick<GdrbSeniorMatchEvent, 'minute' | 'period'>) {
  const minute = event.minute ?? 0;
  return `${minute}' ${event.period ?? ''}`.trim();
}

function playerLabel(player?: Pick<GdrbRosterPlayer, 'name' | 'shirt_number'> | null) {
  if (!player) return 'Sem jogador';
  return `${player.shirt_number ? `#${player.shirt_number} ` : ''}${player.name}`;
}

function safeText(value?: string | null) {
  return value?.trim() || '—';
}

export function SeniorMatchCenterPage() {
  const [activeTab, setActiveTab] = useState<AppTab>('ficha');
  const [players, setPlayers] = useState<GdrbRosterPlayer[]>([]);
  const [matches, setMatches] = useState<GdrbSeniorMatch[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<GdrbSeniorMatch | null>(null);
  const [squad, setSquad] = useState<GdrbSeniorMatchSquad[]>([]);
  const [events, setEvents] = useState<GdrbSeniorMatchEvent[]>([]);
  const [opponent, setOpponent] = useState<GdrbSeniorOpponentAnalysis | null>(null);
  const [report, setReport] = useState<GdrbSeniorMatchReport | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [matchForm, setMatchForm] = useState({
    competition: '',
    match_date: todayDate(),
    match_time: currentTime(),
    venue: '',
    home_away: 'home',
    opponent_name: '',
    initial_formation: '4-3-3',
    coach_name: '',
    assistant_name: '',
    pre_match_notes: '',
  });

  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [starterIds, setStarterIds] = useState<string[]>([]);
  const [captainId, setCaptainId] = useState('');
  const [goalkeeperId, setGoalkeeperId] = useState('');

  const [livePeriod, setLivePeriod] = useState<MatchPeriod>('1P');
  const [liveMinute, setLiveMinute] = useState('0');
  const [eventNotes, setEventNotes] = useState('');
  const [selectedEventPlayerId, setSelectedEventPlayerId] = useState('');

  const [subOutId, setSubOutId] = useState('');
  const [subInId, setSubInId] = useState('');
  const [subReason, setSubReason] = useState('Tático');
  const [subNotes, setSubNotes] = useState('');

  const [tacticalTag, setTacticalTag] = useState(tacticalTags[0]);
  const [tacticalPlayerId, setTacticalPlayerId] = useState('');
  const [tacticalNote, setTacticalNote] = useState('');

  const [opponentForm, setOpponentForm] = useState({
    opponent_formation: '',
    strong_side: '',
    weak_side: '',
    danger_player_name: '',
    pressing_style: '',
    build_up_style: '',
    set_pieces_offensive: '',
    set_pieces_defensive: '',
    space_to_exploit: '',
    notes: '',
  });

  const [reportForm, setReportForm] = useState({
    summary: '',
    positive_points: '',
    improvement_points: '',
    players_highlighted: '',
    training_notes: '',
    opponent_notes: '',
  });

  const playerById = useMemo(() => {
    return new Map(players.map((player) => [player.id, player]));
  }, [players]);

  const selectedPlayers = useMemo(() => {
    return selectedPlayerIds
      .map((id) => playerById.get(id))
      .filter((player): player is GdrbRosterPlayer => Boolean(player));
  }, [playerById, selectedPlayerIds]);

  const onFieldPlayerIds = useMemo(() => {
    const fromSquad = squad
      .filter((item) => item.status === 'on_field' || item.status === 'starter')
      .map((item) => item.player_id);

    if (fromSquad.length > 0) return fromSquad;
    return starterIds;
  }, [squad, starterIds]);

  const benchPlayerIds = useMemo(() => {
    const fromSquad = squad.filter((item) => item.status === 'bench').map((item) => item.player_id);
    if (fromSquad.length > 0) return fromSquad;
    return selectedPlayerIds.filter((id) => !starterIds.includes(id));
  }, [selectedPlayerIds, squad, starterIds]);

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const periodOrder: Record<string, number> = { '1P': 1, INT: 2, '2P': 3, PRO: 4, PEN: 5 };
      const aOrder = periodOrder[a.period ?? '1P'] ?? 0;
      const bOrder = periodOrder[b.period ?? '1P'] ?? 0;
      if (aOrder !== bOrder) return bOrder - aOrder;
      return (b.minute ?? 0) - (a.minute ?? 0);
    });
  }, [events]);

  useEffect(() => {
    void loadInitialData();
  }, []);

  async function loadInitialData() {
    setIsLoading(true);
    setError('');

    const [playersResponse, matchesResponse] = await Promise.all([
      supabase
        .from('gdrb_roster_players')
        .select('*')
        .eq('team_key', SENIOR_TEAM_KEY)
        .eq('is_active', true)
        .neq('roster_group', 'Equipa técnica')
        .order('shirt_number', { ascending: true, nullsFirst: false })
        .order('name', { ascending: true }),
      supabase
        .from('senior_matches')
        .select('*')
        .order('match_date', { ascending: false })
        .order('match_time', { ascending: false, nullsFirst: false })
        .limit(30),
    ]);

    if (playersResponse.error) {
      console.error(playersResponse.error);
      setError('Não foi possível carregar o plantel sénior.');
    } else {
      setPlayers((playersResponse.data ?? []) as GdrbRosterPlayer[]);
    }

    if (matchesResponse.error) {
      console.error(matchesResponse.error);
      setError('Não foi possível carregar as fichas de jogo. Confirma se já executaste o SQL do MVP.');
    } else {
      const loadedMatches = (matchesResponse.data ?? []) as GdrbSeniorMatch[];
      setMatches(loadedMatches);
      const openMatch = loadedMatches.find((match) => match.status === 'in_progress' || match.status === 'halftime');
      if (openMatch) {
        await selectMatch(openMatch);
      }
    }

    setIsLoading(false);
  }

  async function selectMatch(match: GdrbSeniorMatch) {
    setSelectedMatch(match);
    setMatchForm({
      competition: match.competition ?? '',
      match_date: match.match_date ?? todayDate(),
      match_time: match.match_time ?? currentTime(),
      venue: match.venue ?? '',
      home_away: match.home_away ?? 'home',
      opponent_name: match.opponent_name ?? '',
      initial_formation: match.initial_formation ?? '4-3-3',
      coach_name: match.coach_name ?? '',
      assistant_name: match.assistant_name ?? '',
      pre_match_notes: match.pre_match_notes ?? '',
    });

    setLivePeriod((match.current_period as MatchPeriod | null) ?? '1P');
    setLiveMinute(String(match.current_minute ?? 0));

    const [squadResponse, eventsResponse, opponentResponse, reportResponse] = await Promise.all([
      supabase.from('senior_match_squad').select('*').eq('match_id', match.id),
      supabase.from('senior_match_events').select('*').eq('match_id', match.id),
      supabase.from('senior_match_opponent_analysis').select('*').eq('match_id', match.id).limit(1),
      supabase.from('senior_match_reports').select('*').eq('match_id', match.id).limit(1),
    ]);

    const loadedSquad = (squadResponse.data ?? []) as GdrbSeniorMatchSquad[];
    const loadedEvents = (eventsResponse.data ?? []) as GdrbSeniorMatchEvent[];
    const loadedOpponent = (opponentResponse.data?.[0] ?? null) as GdrbSeniorOpponentAnalysis | null;
    const loadedReport = (reportResponse.data?.[0] ?? null) as GdrbSeniorMatchReport | null;

    setSquad(loadedSquad);
    setEvents(loadedEvents);
    setOpponent(loadedOpponent);
    setReport(loadedReport);
    setSelectedPlayerIds(loadedSquad.map((item) => item.player_id));
    setStarterIds(loadedSquad.filter((item) => item.is_starting).map((item) => item.player_id));
    setCaptainId(loadedSquad.find((item) => item.is_captain)?.player_id ?? '');
    setGoalkeeperId(loadedSquad.find((item) => item.is_goalkeeper)?.player_id ?? '');

    if (loadedOpponent) {
      setOpponentForm({
        opponent_formation: loadedOpponent.opponent_formation ?? '',
        strong_side: loadedOpponent.strong_side ?? '',
        weak_side: loadedOpponent.weak_side ?? '',
        danger_player_name: loadedOpponent.danger_player_name ?? '',
        pressing_style: loadedOpponent.pressing_style ?? '',
        build_up_style: loadedOpponent.build_up_style ?? '',
        set_pieces_offensive: loadedOpponent.set_pieces_offensive ?? '',
        set_pieces_defensive: loadedOpponent.set_pieces_defensive ?? '',
        space_to_exploit: loadedOpponent.space_to_exploit ?? '',
        notes: loadedOpponent.notes ?? '',
      });
    }

    if (loadedReport) {
      setReportForm({
        summary: loadedReport.summary ?? '',
        positive_points: loadedReport.positive_points ?? '',
        improvement_points: loadedReport.improvement_points ?? '',
        players_highlighted: loadedReport.players_highlighted ?? '',
        training_notes: loadedReport.training_notes ?? '',
        opponent_notes: loadedReport.opponent_notes ?? '',
      });
    }
  }

  function resetNewMatch() {
    setSelectedMatch(null);
    setSquad([]);
    setEvents([]);
    setOpponent(null);
    setReport(null);
    setSelectedPlayerIds([]);
    setStarterIds([]);
    setCaptainId('');
    setGoalkeeperId('');
    setMatchForm({
      competition: '',
      match_date: todayDate(),
      match_time: currentTime(),
      venue: '',
      home_away: 'home',
      opponent_name: '',
      initial_formation: '4-3-3',
      coach_name: '',
      assistant_name: '',
      pre_match_notes: '',
    });
    setActiveTab('ficha');
  }

  function toggleSelectedPlayer(playerId: string) {
    setSelectedPlayerIds((current) => {
      if (current.includes(playerId)) {
        setStarterIds((starters) => starters.filter((id) => id !== playerId));
        if (captainId === playerId) setCaptainId('');
        if (goalkeeperId === playerId) setGoalkeeperId('');
        return current.filter((id) => id !== playerId);
      }
      return [...current, playerId];
    });
  }

  function toggleStarter(playerId: string) {
    if (!selectedPlayerIds.includes(playerId)) return;

    setStarterIds((current) => {
      if (current.includes(playerId)) {
        return current.filter((id) => id !== playerId);
      }
      if (current.length >= 11) {
        setError('O onze inicial já tem 11 jogadores.');
        return current;
      }
      setError('');
      return [...current, playerId];
    });
  }

  async function saveMatch() {
    if (!matchForm.opponent_name.trim()) {
      setError('Indica o nome do adversário.');
      return;
    }

    setIsSaving(true);
    setError('');
    setMessage('');

    const payload = {
      competition: matchForm.competition.trim() || null,
      match_date: matchForm.match_date,
      match_time: matchForm.match_time || null,
      venue: matchForm.venue.trim() || null,
      home_away: matchForm.home_away,
      home_team: matchForm.home_away === 'home' ? HOME_TEAM_NAME : matchForm.opponent_name.trim(),
      away_team: matchForm.home_away === 'home' ? matchForm.opponent_name.trim() : HOME_TEAM_NAME,
      opponent_name: matchForm.opponent_name.trim(),
      initial_formation: matchForm.initial_formation,
      coach_name: matchForm.coach_name.trim() || null,
      assistant_name: matchForm.assistant_name.trim() || null,
      pre_match_notes: matchForm.pre_match_notes.trim() || null,
      status: selectedMatch?.status ?? 'draft',
      current_period: livePeriod,
      current_minute: normalizeNumber(liveMinute) ?? 0,
    };

    const { data, error: saveError } = selectedMatch
      ? await supabase.from('senior_matches').update(payload).eq('id', selectedMatch.id).select('*').single()
      : await supabase.from('senior_matches').insert(payload).select('*').single();

    if (saveError || !data) {
      console.error(saveError);
      setError('Não foi possível guardar a ficha de jogo.');
      setIsSaving(false);
      return;
    }

    const match = data as GdrbSeniorMatch;
    setSelectedMatch(match);

    await supabase.from('senior_match_squad').delete().eq('match_id', match.id);

    if (selectedPlayerIds.length > 0) {
      const squadPayload = selectedPlayerIds.map((playerId) => {
        const player = playerById.get(playerId);
        const isStarting = starterIds.includes(playerId);
        const status: SquadStatus = isStarting ? 'on_field' : 'bench';
        const role: SquadRole = isStarting ? 'starter' : 'bench';

        return {
          match_id: match.id,
          player_id: playerId,
          shirt_number: player?.shirt_number ?? null,
          role,
          position: player?.position ?? null,
          is_starting: isStarting,
          is_captain: captainId === playerId,
          is_goalkeeper: goalkeeperId === playerId,
          status,
        };
      });

      const { error: squadError } = await supabase.from('senior_match_squad').insert(squadPayload);

      if (squadError) {
        console.error(squadError);
        setError('A ficha foi criada, mas não foi possível guardar a convocatória.');
        setIsSaving(false);
        return;
      }
    }

    setMessage('Ficha de jogo guardada com sucesso.');
    await selectMatch(match);
    await refreshMatches();
    setIsSaving(false);
  }

  async function refreshMatches() {
    const { data } = await supabase
      .from('senior_matches')
      .select('*')
      .order('match_date', { ascending: false })
      .order('match_time', { ascending: false, nullsFirst: false })
      .limit(30);

    setMatches((data ?? []) as GdrbSeniorMatch[]);
  }

  async function updateMatchStatus(status: MatchStatus) {
    if (!selectedMatch) return;

    const { data, error: statusError } = await supabase
      .from('senior_matches')
      .update({ status, current_period: livePeriod, current_minute: normalizeNumber(liveMinute) ?? 0 })
      .eq('id', selectedMatch.id)
      .select('*')
      .single();

    if (statusError || !data) {
      console.error(statusError);
      setError('Não foi possível atualizar o estado do jogo.');
      return;
    }

    setSelectedMatch(data as GdrbSeniorMatch);
    await refreshMatches();
  }

  async function addEvent(eventType: EventType, customNotes?: string, customPlayerId?: string) {
    if (!selectedMatch) {
      setError('Guarda primeiro a ficha de jogo.');
      return;
    }

    const playerId = customPlayerId ?? selectedEventPlayerId;
    const payload = {
      match_id: selectedMatch.id,
      event_type: eventType,
      period: livePeriod,
      minute: normalizeNumber(liveMinute) ?? 0,
      second: null,
      player_id: playerId || null,
      related_player_id: null,
      team: HOME_TEAM_NAME,
      zone: null,
      notes: (customNotes ?? eventNotes).trim() || null,
    };

    const { data, error: eventError } = await supabase.from('senior_match_events').insert(payload).select('*').single();

    if (eventError || !data) {
      console.error(eventError);
      setError('Não foi possível registar o evento.');
      return;
    }

    setEvents((current) => [...current, data as GdrbSeniorMatchEvent]);
    setEventNotes('');
    setMessage(`${eventLabels[eventType]} registado.`);
  }

  async function saveSubstitution() {
    if (!selectedMatch || !subOutId || !subInId) {
      setError('Seleciona quem sai e quem entra.');
      return;
    }

    if (subOutId === subInId) {
      setError('O jogador que sai e entra não pode ser o mesmo.');
      return;
    }

    setIsSaving(true);
    setError('');

    const minute = normalizeNumber(liveMinute) ?? 0;

    const { error: substitutionError } = await supabase.from('senior_match_substitutions').insert({
      match_id: selectedMatch.id,
      minute,
      period: livePeriod,
      player_out_id: subOutId,
      player_in_id: subInId,
      reason: subReason,
      notes: subNotes.trim() || null,
    });

    if (substitutionError) {
      console.error(substitutionError);
      setError('Não foi possível guardar a substituição.');
      setIsSaving(false);
      return;
    }

    await Promise.all([
      supabase.from('senior_match_squad').update({ status: 'substituted' }).eq('match_id', selectedMatch.id).eq('player_id', subOutId),
      supabase.from('senior_match_squad').update({ status: 'on_field' }).eq('match_id', selectedMatch.id).eq('player_id', subInId),
      addEvent('substitution', `Sai ${playerLabel(playerById.get(subOutId))} / Entra ${playerLabel(playerById.get(subInId))}. Motivo: ${subReason}. ${subNotes}`.trim(), subInId),
    ]);

    const { data } = await supabase.from('senior_match_squad').select('*').eq('match_id', selectedMatch.id);
    setSquad((data ?? []) as GdrbSeniorMatchSquad[]);
    setSubOutId('');
    setSubInId('');
    setSubNotes('');
    setMessage('Substituição guardada e campo atualizado.');
    setIsSaving(false);
  }

  async function saveTacticalNote() {
    if (!selectedMatch) {
      setError('Guarda primeiro a ficha de jogo.');
      return;
    }

    const note = tacticalNote.trim() || tacticalTag;

    const { error: tacticalError } = await supabase.from('senior_match_tactical_notes').insert({
      match_id: selectedMatch.id,
      minute: normalizeNumber(liveMinute) ?? 0,
      period: livePeriod,
      category: 'general',
      tag: tacticalTag,
      player_id: tacticalPlayerId || null,
      zone: null,
      note,
    });

    if (tacticalError) {
      console.error(tacticalError);
      setError('Não foi possível guardar a observação tática.');
      return;
    }

    await addEvent('tactical_note', `${tacticalTag}: ${note}`, tacticalPlayerId);
    setTacticalNote('');
  }

  async function saveOpponent() {
    if (!selectedMatch) {
      setError('Guarda primeiro a ficha de jogo.');
      return;
    }

    setIsSaving(true);
    const payload = {
      match_id: selectedMatch.id,
      opponent_name: selectedMatch.opponent_name,
      ...opponentForm,
    };

    const { data, error: opponentError } = opponent
      ? await supabase.from('senior_match_opponent_analysis').update(payload).eq('id', opponent.id).select('*').single()
      : await supabase.from('senior_match_opponent_analysis').insert(payload).select('*').single();

    if (opponentError || !data) {
      console.error(opponentError);
      setError('Não foi possível guardar a análise do adversário.');
      setIsSaving(false);
      return;
    }

    setOpponent(data as GdrbSeniorOpponentAnalysis);
    setMessage('Análise do adversário guardada.');
    setIsSaving(false);
  }

  async function saveReport() {
    if (!selectedMatch) {
      setError('Guarda primeiro a ficha de jogo.');
      return;
    }

    setIsSaving(true);
    const generatedText = buildReportText();
    const payload = {
      match_id: selectedMatch.id,
      ...reportForm,
      generated_text: generatedText,
    };

    const { data, error: reportError } = report
      ? await supabase.from('senior_match_reports').update(payload).eq('id', report.id).select('*').single()
      : await supabase.from('senior_match_reports').insert(payload).select('*').single();

    if (reportError || !data) {
      console.error(reportError);
      setError('Não foi possível guardar o relatório.');
      setIsSaving(false);
      return;
    }

    setReport(data as GdrbSeniorMatchReport);
    setMessage('Relatório final guardado.');
    setIsSaving(false);
  }

  function buildReportText() {
    const match = selectedMatch;
    if (!match) return '';

    const starters = starterIds.map((id) => playerLabel(playerById.get(id))).join(', ');
    const mainEvents = [...events]
      .sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0))
      .map((event) => `${formatMinute(event)} — ${eventLabels[event.event_type as EventType] ?? event.event_type} — ${playerLabel(playerById.get(event.player_id ?? ''))}${event.notes ? ` — ${event.notes}` : ''}`)
      .join('\n');

    return [
      `Relatório Final — Sénior`,
      `Jogo: ${match.home_team} x ${match.away_team}`,
      `Data: ${match.match_date}`,
      `Competição: ${safeText(match.competition)}`,
      `Sistema inicial: ${safeText(match.initial_formation)}`,
      `Onze inicial: ${starters || '—'}`,
      '',
      `Resumo:`,
      reportForm.summary || '—',
      '',
      `Pontos positivos:`,
      reportForm.positive_points || '—',
      '',
      `Pontos a melhorar:`,
      reportForm.improvement_points || '—',
      '',
      `Jogadores em destaque:`,
      reportForm.players_highlighted || '—',
      '',
      `Notas para treino:`,
      reportForm.training_notes || '—',
      '',
      `Adversário:`,
      reportForm.opponent_notes || opponentForm.notes || '—',
      '',
      `Eventos principais:`,
      mainEvents || '—',
    ].join('\n');
  }

  function copyReport() {
    void navigator.clipboard.writeText(buildReportText());
    setMessage('Relatório copiado.');
  }

  return (
    <div className="min-h-screen bg-[#120f0c] text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#120f0c]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <Link to="/admin" className="hidden rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-zinc-300 transition hover:bg-white/10 md:inline-flex">
              Administração
            </Link>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white p-2">
              <img src="/logo-gdr-boavista-header-256.png" alt="GDR Boavista" className="h-full w-full object-contain" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.32em] text-red-500">Boa Vista Match Center</p>
              <h1 className="text-xl font-black uppercase md:text-3xl">Jogo Sénior</h1>
            </div>
          </div>

          <button
            type="button"
            onClick={resetNewMatch}
            className="inline-flex items-center gap-2 rounded-2xl bg-red-700 px-4 py-3 text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-red-950/30 transition hover:bg-red-600"
          >
            <Plus size={18} />
            Novo jogo
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 pb-28 lg:grid-cols-[360px_1fr]">
        <aside className="space-y-4">
          <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-4 shadow-2xl shadow-black/20">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-[0.25em] text-zinc-400">Jogos</h2>
              <button type="button" onClick={() => void loadInitialData()} className="rounded-xl border border-white/10 p-2 text-zinc-300 hover:bg-white/10">
                <RefreshCcw size={16} />
              </button>
            </div>

            {isLoading && (
              <div className="flex items-center gap-3 rounded-2xl bg-black/20 p-4 text-sm font-bold text-zinc-300">
                <Loader2 className="animate-spin" size={18} />
                A carregar...
              </div>
            )}

            <div className="grid gap-3">
              {matches.map((match) => (
                <button
                  key={match.id}
                  type="button"
                  onClick={() => void selectMatch(match)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    selectedMatch?.id === match.id ? 'border-red-500 bg-red-950/30' : 'border-white/10 bg-black/20 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-white">{match.home_team} x {match.away_team}</p>
                      <p className="mt-1 text-xs font-bold text-zinc-400">{match.match_date} {match.match_time ? `• ${match.match_time}` : ''}</p>
                    </div>
                    <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-black uppercase text-zinc-300">{match.status}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {selectedMatch && (
            <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-4">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-red-400">Jogo selecionado</p>
              <h2 className="mt-2 text-2xl font-black">{selectedMatch.home_team} x {selectedMatch.away_team}</h2>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-2xl bg-black/20 p-3">
                  <p className="text-zinc-500">Estado</p>
                  <p className="font-black">{selectedMatch.status}</p>
                </div>
                <div className="rounded-2xl bg-black/20 p-3">
                  <p className="text-zinc-500">Sistema</p>
                  <p className="font-black">{selectedMatch.initial_formation ?? '—'}</p>
                </div>
              </div>
            </section>
          )}
        </aside>

        <section className="min-w-0">
          {(message || error) && (
            <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm font-bold ${error ? 'border-red-500/40 bg-red-950/40 text-red-100' : 'border-emerald-500/40 bg-emerald-950/30 text-emerald-100'}`}>
              {error || message}
            </div>
          )}

          <div className="mb-5 overflow-x-auto rounded-3xl border border-white/10 bg-white/[0.06] p-2">
            <div className="flex min-w-max gap-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition ${
                      activeTab === tab.id ? 'bg-red-700 text-white' : 'text-zinc-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon size={16} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {activeTab === 'ficha' && renderFicha()}
          {activeTab === 'ao-vivo' && renderAoVivo()}
          {activeTab === 'tatica' && renderTatica()}
          {activeTab === 'substituicoes' && renderSubstituicoes()}
          {activeTab === 'adversario' && renderAdversario()}
          {activeTab === 'relatorio' && renderRelatorio()}
          {activeTab === 'historico' && renderHistorico()}
        </section>
      </main>
    </div>
  );

  function renderFicha() {
    return (
      <div className="grid gap-5">
        <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
          <div className="mb-5 flex items-center gap-3">
            <CalendarDays className="text-red-500" />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-zinc-400">Ficha de jogo</p>
              <h2 className="text-2xl font-black">Dados principais</h2>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Adversário" value={matchForm.opponent_name} onChange={(value) => setMatchForm({ ...matchForm, opponent_name: value })} />
            <Input label="Competição" value={matchForm.competition} onChange={(value) => setMatchForm({ ...matchForm, competition: value })} />
            <Input label="Data" type="date" value={matchForm.match_date} onChange={(value) => setMatchForm({ ...matchForm, match_date: value })} />
            <Input label="Hora" type="time" value={matchForm.match_time} onChange={(value) => setMatchForm({ ...matchForm, match_time: value })} />
            <Select label="Casa/Fora" value={matchForm.home_away} onChange={(value) => setMatchForm({ ...matchForm, home_away: value })} options={[['home', 'Casa'], ['away', 'Fora']]} />
            <Input label="Campo / Local" value={matchForm.venue} onChange={(value) => setMatchForm({ ...matchForm, venue: value })} />
            <Select label="Sistema inicial" value={matchForm.initial_formation} onChange={(value) => setMatchForm({ ...matchForm, initial_formation: value })} options={formations.map((formation) => [formation, formation])} />
            <Input label="Treinador adjunto" value={matchForm.assistant_name} onChange={(value) => setMatchForm({ ...matchForm, assistant_name: value })} />
            <Input label="Treinador principal" value={matchForm.coach_name} onChange={(value) => setMatchForm({ ...matchForm, coach_name: value })} />
            <Textarea label="Notas pré-jogo" value={matchForm.pre_match_notes} onChange={(value) => setMatchForm({ ...matchForm, pre_match_notes: value })} />
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Users className="text-red-500" />
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-zinc-400">Plantel Sénior</p>
                <h2 className="text-2xl font-black">Convocados e onze</h2>
              </div>
            </div>
            <p className="rounded-full bg-black/30 px-3 py-1 text-xs font-black text-zinc-300">{starterIds.length}/11 titulares</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {players.map((player) => {
              const selected = selectedPlayerIds.includes(player.id);
              const starter = starterIds.includes(player.id);
              return (
                <div key={player.id} className={`rounded-2xl border p-3 ${selected ? 'border-red-500/60 bg-red-950/20' : 'border-white/10 bg-black/20'}`}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-sm font-black text-[#24180f]">
                      {player.photo_url ? <img src={player.photo_url} alt={player.name} className="h-full w-full rounded-2xl object-cover" /> : getInitials(player.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-black">{playerLabel(player)}</p>
                      <p className="truncate text-xs font-bold text-zinc-400">{player.position ?? player.roster_group}</p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => toggleSelectedPlayer(player.id)} className={`rounded-xl px-3 py-2 text-xs font-black ${selected ? 'bg-red-700 text-white' : 'bg-white/10 text-zinc-300'}`}>
                      {selected ? 'Convocado' : 'Convocar'}
                    </button>
                    <button type="button" disabled={!selected} onClick={() => toggleStarter(player.id)} className={`rounded-xl px-3 py-2 text-xs font-black disabled:opacity-30 ${starter ? 'bg-white text-zinc-950' : 'bg-white/10 text-zinc-300'}`}>
                      Titular
                    </button>
                    <button type="button" disabled={!selected} onClick={() => setCaptainId(player.id)} className={`rounded-xl px-3 py-2 text-xs font-black disabled:opacity-30 ${captainId === player.id ? 'bg-amber-400 text-zinc-950' : 'bg-white/10 text-zinc-300'}`}>
                      Capitão
                    </button>
                    <button type="button" disabled={!selected} onClick={() => setGoalkeeperId(player.id)} className={`rounded-xl px-3 py-2 text-xs font-black disabled:opacity-30 ${goalkeeperId === player.id ? 'bg-blue-500 text-white' : 'bg-white/10 text-zinc-300'}`}>
                      GR
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <button type="button" onClick={() => void saveMatch()} disabled={isSaving} className="inline-flex items-center justify-center gap-2 rounded-3xl bg-red-700 px-6 py-4 text-base font-black uppercase tracking-wide text-white shadow-xl shadow-red-950/30 transition hover:bg-red-600 disabled:opacity-60">
          {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
          Guardar ficha de jogo
        </button>
      </div>
    );
  }

  function renderAoVivo() {
    return (
      <div className="grid gap-5">
        <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-red-400">Ao vivo</p>
              <h2 className="text-3xl font-black">{selectedMatch ? `${selectedMatch.home_team} x ${selectedMatch.away_team}` : 'Guarda a ficha para iniciar'}</h2>
            </div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <Select label="Parte" value={livePeriod} onChange={(value) => setLivePeriod(value as MatchPeriod)} options={[['1P', '1ª Parte'], ['INT', 'Intervalo'], ['2P', '2ª Parte'], ['PRO', 'Prolong.'], ['PEN', 'Penáltis']]} />
              <Input label="Minuto" type="number" value={liveMinute} onChange={setLiveMinute} />
              <button type="button" onClick={() => void updateMatchStatus('in_progress')} disabled={!selectedMatch} className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white disabled:opacity-40">Iniciar</button>
              <button type="button" onClick={() => void updateMatchStatus('finished')} disabled={!selectedMatch} className="rounded-2xl bg-red-700 px-4 py-3 text-sm font-black text-white disabled:opacity-40">Terminar</button>
            </div>
          </div>
        </section>

        {renderPitch()}

        <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
          <div className="mb-4 grid gap-3 md:grid-cols-[1fr_1fr]">
            <Select label="Jogador do evento" value={selectedEventPlayerId} onChange={setSelectedEventPlayerId} options={[['', 'Sem jogador'], ...selectedPlayers.map((player) => [player.id, playerLabel(player)] as [string, string])]} />
            <Input label="Nota rápida" value={eventNotes} onChange={setEventNotes} />
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {eventButtons.map((eventButton) => {
              const Icon = eventButton.icon;
              return (
                <button key={eventButton.type} type="button" onClick={() => void addEvent(eventButton.type)} className={`flex min-h-24 flex-col items-center justify-center gap-2 rounded-3xl border border-white/10 p-4 text-center text-sm font-black shadow-lg ${eventButton.tone}`}>
                  <Icon size={24} />
                  {eventButton.label}
                </button>
              );
            })}
          </div>
        </section>

        {renderEventsList()}
      </div>
    );
  }

  function renderPitch() {
    return (
      <section className="overflow-hidden rounded-3xl border border-emerald-400/20 bg-emerald-950 p-4 shadow-2xl shadow-black/20">
        <div className="relative min-h-[520px] rounded-3xl border-2 border-white/25 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_35%),linear-gradient(180deg,rgba(16,185,129,0.22),rgba(6,78,59,0.55))] p-4">
          <div className="absolute left-1/2 top-0 h-full w-px bg-white/20" />
          <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20" />
          <div className="relative z-10 grid h-full min-h-[480px] grid-rows-4 gap-3">
            {[0, 1, 2, 3].map((line) => {
              const linePlayers = onFieldPlayerIds.filter((_, index) => index % 4 === line);
              return (
                <div key={line} className="flex items-center justify-center gap-3">
                  {linePlayers.map((playerId) => {
                    const player = playerById.get(playerId);
                    return (
                      <button key={playerId} type="button" onClick={() => setSelectedEventPlayerId(playerId)} className={`rounded-2xl border px-3 py-2 text-xs font-black shadow-xl transition ${selectedEventPlayerId === playerId ? 'border-red-400 bg-red-700' : 'border-white/20 bg-black/50 hover:bg-black/70'}`}>
                        <Shirt className="mx-auto mb-1" size={18} />
                        {playerLabel(player)}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  function renderTatica() {
    return (
      <div className="grid gap-5">
        <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
          <h2 className="text-2xl font-black">Observações táticas</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Select label="Tag rápida" value={tacticalTag} onChange={setTacticalTag} options={tacticalTags.map((tag) => [tag, tag])} />
            <Select label="Jogador opcional" value={tacticalPlayerId} onChange={setTacticalPlayerId} options={[['', 'Sem jogador'], ...selectedPlayers.map((player) => [player.id, playerLabel(player)] as [string, string])]} />
            <Textarea label="Nota opcional" value={tacticalNote} onChange={setTacticalNote} />
          </div>
          <button type="button" onClick={() => void saveTacticalNote()} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-red-700 px-5 py-3 text-sm font-black text-white hover:bg-red-600">
            <Save size={18} /> Guardar observação
          </button>
        </section>
        {renderEventsList('tactical_note')}
      </div>
    );
  }

  function renderSubstituicoes() {
    return (
      <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
        <h2 className="text-2xl font-black">Substituição rápida</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Select label="Sai" value={subOutId} onChange={setSubOutId} options={[['', 'Selecionar'], ...onFieldPlayerIds.map((id) => [id, playerLabel(playerById.get(id))] as [string, string])]} />
          <Select label="Entra" value={subInId} onChange={setSubInId} options={[['', 'Selecionar'], ...benchPlayerIds.map((id) => [id, playerLabel(playerById.get(id))] as [string, string])]} />
          <Select label="Motivo" value={subReason} onChange={setSubReason} options={['Tático', 'Físico', 'Lesão', 'Cartão', 'Rendimento', 'Gestão', 'Outro'].map((item) => [item, item])} />
          <Input label="Notas" value={subNotes} onChange={setSubNotes} />
        </div>
        <button type="button" onClick={() => void saveSubstitution()} disabled={isSaving} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-red-700 px-5 py-3 text-sm font-black text-white hover:bg-red-600 disabled:opacity-60">
          <ArrowLeftRight size={18} /> Guardar substituição
        </button>
      </section>
    );
  }

  function renderAdversario() {
    return (
      <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
        <h2 className="text-2xl font-black">Análise do adversário</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Input label="Sistema adversário" value={opponentForm.opponent_formation} onChange={(value) => setOpponentForm({ ...opponentForm, opponent_formation: value })} />
          <Input label="Jogador mais perigoso" value={opponentForm.danger_player_name} onChange={(value) => setOpponentForm({ ...opponentForm, danger_player_name: value })} />
          <Select label="Lado forte" value={opponentForm.strong_side} onChange={(value) => setOpponentForm({ ...opponentForm, strong_side: value })} options={[['', 'Selecionar'], ['Direito', 'Direito'], ['Esquerdo', 'Esquerdo'], ['Centro', 'Centro']]} />
          <Select label="Lado fraco" value={opponentForm.weak_side} onChange={(value) => setOpponentForm({ ...opponentForm, weak_side: value })} options={[['', 'Selecionar'], ['Direito', 'Direito'], ['Esquerdo', 'Esquerdo'], ['Centro', 'Centro']]} />
          <Input label="Como pressiona" value={opponentForm.pressing_style} onChange={(value) => setOpponentForm({ ...opponentForm, pressing_style: value })} />
          <Input label="Como sai a jogar" value={opponentForm.build_up_style} onChange={(value) => setOpponentForm({ ...opponentForm, build_up_style: value })} />
          <Textarea label="Bolas paradas ofensivas" value={opponentForm.set_pieces_offensive} onChange={(value) => setOpponentForm({ ...opponentForm, set_pieces_offensive: value })} />
          <Textarea label="Bolas paradas defensivas" value={opponentForm.set_pieces_defensive} onChange={(value) => setOpponentForm({ ...opponentForm, set_pieces_defensive: value })} />
          <Input label="Espaço a explorar" value={opponentForm.space_to_exploit} onChange={(value) => setOpponentForm({ ...opponentForm, space_to_exploit: value })} />
          <Textarea label="Notas gerais" value={opponentForm.notes} onChange={(value) => setOpponentForm({ ...opponentForm, notes: value })} />
        </div>
        <button type="button" onClick={() => void saveOpponent()} disabled={isSaving} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-red-700 px-5 py-3 text-sm font-black text-white hover:bg-red-600 disabled:opacity-60">
          <Save size={18} /> Guardar adversário
        </button>
      </section>
    );
  }

  function renderRelatorio() {
    const reportText = buildReportText();
    return (
      <div className="grid gap-5">
        <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
          <h2 className="text-2xl font-black">Relatório final</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Textarea label="Resumo" value={reportForm.summary} onChange={(value) => setReportForm({ ...reportForm, summary: value })} />
            <Textarea label="Pontos positivos" value={reportForm.positive_points} onChange={(value) => setReportForm({ ...reportForm, positive_points: value })} />
            <Textarea label="Pontos a melhorar" value={reportForm.improvement_points} onChange={(value) => setReportForm({ ...reportForm, improvement_points: value })} />
            <Textarea label="Jogadores em destaque" value={reportForm.players_highlighted} onChange={(value) => setReportForm({ ...reportForm, players_highlighted: value })} />
            <Textarea label="Notas para treino" value={reportForm.training_notes} onChange={(value) => setReportForm({ ...reportForm, training_notes: value })} />
            <Textarea label="Notas do adversário" value={reportForm.opponent_notes} onChange={(value) => setReportForm({ ...reportForm, opponent_notes: value })} />
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={() => void saveReport()} disabled={isSaving} className="inline-flex items-center gap-2 rounded-2xl bg-red-700 px-5 py-3 text-sm font-black text-white hover:bg-red-600 disabled:opacity-60">
              <Save size={18} /> Guardar relatório
            </button>
            <button type="button" onClick={copyReport} className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-zinc-950 hover:bg-zinc-200">
              <FileText size={18} /> Copiar relatório
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-black/30 p-5">
          <h3 className="mb-3 text-sm font-black uppercase tracking-[0.25em] text-zinc-400">Pré-visualização</h3>
          <pre className="whitespace-pre-wrap rounded-2xl bg-white p-4 text-sm leading-7 text-zinc-950">{reportText || 'Guarda ou seleciona uma ficha de jogo para gerar o relatório.'}</pre>
        </section>
      </div>
    );
  }

  function renderHistorico() {
    return (
      <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
        <h2 className="text-2xl font-black">Histórico do Sénior</h2>
        <div className="mt-5 grid gap-3">
          {matches.map((match) => (
            <button key={match.id} type="button" onClick={() => void selectMatch(match)} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-left transition hover:bg-white/10">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-black">{match.home_team} x {match.away_team}</p>
                  <p className="mt-1 text-sm font-bold text-zinc-400">{match.match_date} • {safeText(match.competition)} • {safeText(match.initial_formation)}</p>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase text-zinc-300">{match.status}</span>
              </div>
            </button>
          ))}
        </div>
      </section>
    );
  }

  function renderEventsList(filterType?: EventType) {
    const list = filterType ? sortedEvents.filter((event) => event.event_type === filterType) : sortedEvents;
    return (
      <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
        <h2 className="text-2xl font-black">Eventos registados</h2>
        <div className="mt-5 grid gap-3">
          {list.length === 0 && <p className="rounded-2xl bg-black/20 p-4 text-sm font-bold text-zinc-400">Ainda não há eventos registados.</p>}
          {list.map((event) => (
            <div key={event.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <p className="font-black">{formatMinute(event)} — {eventLabels[event.event_type as EventType] ?? event.event_type}</p>
                <p className="text-sm font-bold text-zinc-400">{playerLabel(playerById.get(event.player_id ?? ''))}</p>
              </div>
              {event.notes && <p className="mt-2 text-sm leading-6 text-zinc-300">{event.notes}</p>}
            </div>
          ))}
        </div>
      </section>
    );
  }
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
};

function Input({ label, value, onChange, type = 'text' }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-zinc-400">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-zinc-600 focus:border-red-500"
      />
    </label>
  );
}

function Textarea({ label, value, onChange }: FieldProps) {
  return (
    <label className="block md:col-span-2">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-zinc-400">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold leading-6 text-white outline-none transition placeholder:text-zinc-600 focus:border-red-500"
      />
    </label>
  );
}

type SelectProps = {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (value: string) => void;
};

function Select({ label, value, options, onChange }: SelectProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-zinc-400">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-red-500"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue} className="bg-zinc-950 text-white">
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
