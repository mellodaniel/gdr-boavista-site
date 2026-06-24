import { useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import type { ReactNode } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  FileText,
  Link as LinkIcon,
  Loader2,
  ShieldCheck,
  Sparkles,
  Trophy,
  Upload,
  Users,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { generateTournamentSchedule } from '../../lib/tournamentScheduler';

type PilotStep = 'basic' | 'schedule' | 'format' | 'partners' | 'results' | 'summary';

type CreatedTournament = {
  id: string;
  slug: string;
  publicUrl: string;
  adminUrl: string;
  matchesUrl: string;
  resultsUrl: string;
  resultsAccessCreated: boolean;
  resultsUsername?: string;
  resultsEmail?: string;
  resultsPassword?: string;
};

type PilotForm = {
  tournamentName: string;
  edition: string;
  ageGroup: string;
  birthYear: string;
  footballType: string;
  gender: string;
  location: string;
  address: string;
  description: string;
  contactPhone: string;
  contactEmail: string;
  totalTeams: number;
  isConsecutiveDays: boolean;
  startDate: string;
  daysCount: number;
  manualDates: string;
  startTime: string;
  endTime: string;
  hasLunchBreak: boolean;
  lunchStart: string;
  lunchEnd: string;
  fieldsCount: number;
  groupCount: number;
  qualifiersPerGroup: number;
  hasSemiFinals: boolean;
  hasThirdPlaceMatch: boolean;
  hasFinal: boolean;
  matchDurationMinutes: number;
  minutesBetweenMatches: number;
  minRestMinutes: number;
  hasTournamentPartner: boolean;
  partnerName: string;
  partnerWebsite: string;
  partnerLevel: string;
  partnerDescription: string;
  createResultsAccess: boolean;
  resultsUsername: string;
  resultsPassword: string;
};

type TournamentDayDraft = {
  day_date: string;
  start_time: string;
  end_time: string;
  lunch_start: string | null;
  lunch_end: string | null;
};

type GroupDraft = {
  name: string;
  sort_order: number;
};

type TeamDraft = {
  name: string;
  sort_order: number;
};

type FieldDraft = {
  name: string;
  sort_order: number;
};

type Slot = {
  match_date: string;
  match_time: string;
  field_index: number;
  start_minutes: number;
  end_minutes: number;
};

type Pairing = {
  groupIndex: number;
  teamAIndex: number;
  teamBIndex: number;
};

const initialForm: PilotForm = {
  tournamentName: '',
  edition: String(new Date().getFullYear()),
  ageGroup: 'Sub-9',
  birthYear: '',
  footballType: 'Futebol 7',
  gender: 'Masculino',
  location: 'Campo do GDR Boavista',
  address: 'Boa Vista, Leiria',
  description: '',
  contactPhone: '',
  contactEmail: '',
  totalTeams: 8,
  isConsecutiveDays: true,
  startDate: '',
  daysCount: 2,
  manualDates: '',
  startTime: '09:00',
  endTime: '18:00',
  hasLunchBreak: true,
  lunchStart: '12:30',
  lunchEnd: '14:00',
  fieldsCount: 2,
  groupCount: 2,
  qualifiersPerGroup: 2,
  hasSemiFinals: true,
  hasThirdPlaceMatch: true,
  hasFinal: true,
  matchDurationMinutes: 30,
  minutesBetweenMatches: 10,
  minRestMinutes: 40,
  hasTournamentPartner: false,
  partnerName: '',
  partnerWebsite: '',
  partnerLevel: 'Parceiro do torneio',
  partnerDescription: '',
  createResultsAccess: true,
  resultsUsername: 'resultados-torneio',
  resultsPassword: '',
};

const steps: Array<{ id: PilotStep; title: string; description: string }> = [
  {
    id: 'basic',
    title: 'Dados do torneio',
    description: 'Nome, escalão, local e número de equipas.',
  },
  {
    id: 'schedule',
    title: 'Dias e horários',
    description: 'Datas, campos, horários e pausas.',
  },
  {
    id: 'format',
    title: 'Formato e regras',
    description: 'Grupos, duração, descanso e apuramento.',
  },
  {
    id: 'partners',
    title: 'Parceiros',
    description: 'Parceiros próprios do torneio.',
  },
  {
    id: 'results',
    title: 'Resultados',
    description: 'Acesso para lançar resultados.',
  },
  {
    id: 'summary',
    title: 'Resumo',
    description: 'Validação e criação do torneio oficial.',
  },
];

function createSlug(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

function addDays(date: string, amount: number) {
  const [year, month, day] = date.split('-').map(Number);
  const baseDate = new Date(year, month - 1, day);
  baseDate.setDate(baseDate.getDate() + amount);
  const nextYear = baseDate.getFullYear();
  const nextMonth = String(baseDate.getMonth() + 1).padStart(2, '0');
  const nextDay = String(baseDate.getDate()).padStart(2, '0');
  return `${nextYear}-${nextMonth}-${nextDay}`;
}

function normalizeTime(value: string) {
  return value ? `${value.slice(0, 5)}:00` : null;
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.slice(0, 5).split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(value: number) {
  const normalized = ((value % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function formatDate(value: string) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`));
}

function getPublicBaseUrl() {
  if (typeof window === 'undefined') return '';
  return window.location.origin;
}

function normalizeWebsiteUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return `https://${trimmed}`;
}

function getDates(form: PilotForm) {
  if (form.isConsecutiveDays) {
    if (!form.startDate) return [];
    return Array.from({ length: Math.max(1, form.daysCount) }, (_, index) => addDays(form.startDate, index));
  }

  return form.manualDates
    .split(/[\n,;]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item, index, allItems) => allItems.indexOf(item) === index)
    .sort((a, b) => a.localeCompare(b));
}

function getTeams(form: PilotForm): TeamDraft[] {
  return Array.from({ length: Math.max(1, form.totalTeams) }, (_, index) => ({
    name: `Equipa ${index + 1}`,
    sort_order: index + 1,
  }));
}

function getGroups(form: PilotForm): GroupDraft[] {
  return Array.from({ length: Math.max(1, form.groupCount) }, (_, index) => ({
    name: `Grupo ${String.fromCharCode(65 + index)}`,
    sort_order: index + 1,
  }));
}

function getFields(form: PilotForm): FieldDraft[] {
  return Array.from({ length: Math.max(1, form.fieldsCount) }, (_, index) => ({
    name: `Campo ${index + 1}`,
    sort_order: index + 1,
  }));
}

function distributeTeams(totalTeams: number, groupCount: number) {
  const distribution: number[][] = Array.from({ length: Math.max(1, groupCount) }, () => []);

  Array.from({ length: Math.max(1, totalTeams) }, (_, index) => index).forEach((teamIndex, index) => {
    distribution[index % distribution.length].push(teamIndex);
  });

  return distribution;
}

function getPairings(form: PilotForm): Pairing[] {
  const distribution = distributeTeams(form.totalTeams, form.groupCount);
  const pairings: Pairing[] = [];

  distribution.forEach((teamIndexes, groupIndex) => {
    for (let i = 0; i < teamIndexes.length; i += 1) {
      for (let j = i + 1; j < teamIndexes.length; j += 1) {
        pairings.push({
          groupIndex,
          teamAIndex: teamIndexes[i],
          teamBIndex: teamIndexes[j],
        });
      }
    }
  });

  return pairings;
}

function getDaysDraft(form: PilotForm): TournamentDayDraft[] {
  return getDates(form).map((date) => ({
    day_date: date,
    start_time: normalizeTime(form.startTime) || '09:00:00',
    end_time: normalizeTime(form.endTime) || '18:00:00',
    lunch_start: form.hasLunchBreak ? normalizeTime(form.lunchStart) : null,
    lunch_end: form.hasLunchBreak ? normalizeTime(form.lunchEnd) : null,
  }));
}

function buildSlots(form: PilotForm): Slot[] {
  const days = getDaysDraft(form);
  const fields = getFields(form);
  const slots: Slot[] = [];
  const matchDuration = Math.max(1, form.matchDurationMinutes);
  const slotDuration = matchDuration + Math.max(0, form.minutesBetweenMatches);

  days.forEach((day) => {
    const dayStart = timeToMinutes(day.start_time);
    const dayEnd = timeToMinutes(day.end_time);
    const lunchStart = day.lunch_start ? timeToMinutes(day.lunch_start) : null;
    const lunchEnd = day.lunch_end ? timeToMinutes(day.lunch_end) : null;

    let current = dayStart;

    while (current + matchDuration <= dayEnd) {
      if (
        lunchStart !== null &&
        lunchEnd !== null &&
        current < lunchEnd &&
        current + matchDuration > lunchStart
      ) {
        current = lunchEnd;
        continue;
      }

      fields.forEach((_field, fieldIndex) => {
        slots.push({
          match_date: day.day_date,
          match_time: minutesToTime(current),
          field_index: fieldIndex,
          start_minutes: current,
          end_minutes: current + matchDuration,
        });
      });

      current += slotDuration;
    }
  });

  return slots;
}

function schedulePairings(form: PilotForm) {
  const pairings = getPairings(form);
  const slots = buildSlots(form);
  const teamLastEnd = new Map<number, { date: string; end: number }>();
  const scheduled: Array<Pairing & Slot> = [];
  const unscheduled: Pairing[] = [];

  pairings.forEach((pairing) => {
    const slot = slots.find((candidate) => {
      const teamALast = teamLastEnd.get(pairing.teamAIndex);
      const teamBLast = teamLastEnd.get(pairing.teamBIndex);
      const minRest = Math.max(0, form.minRestMinutes);

      const teamAOk =
        !teamALast ||
        teamALast.date !== candidate.match_date ||
        candidate.start_minutes - teamALast.end >= minRest;

      const teamBOk =
        !teamBLast ||
        teamBLast.date !== candidate.match_date ||
        candidate.start_minutes - teamBLast.end >= minRest;

      const slotAlreadyUsed = scheduled.some(
        (match) =>
          match.match_date === candidate.match_date &&
          match.match_time === candidate.match_time &&
          match.field_index === candidate.field_index,
      );

      return teamAOk && teamBOk && !slotAlreadyUsed;
    });

    if (!slot) {
      unscheduled.push(pairing);
      return;
    }

    scheduled.push({ ...pairing, ...slot });
    teamLastEnd.set(pairing.teamAIndex, { date: slot.match_date, end: slot.end_minutes });
    teamLastEnd.set(pairing.teamBIndex, { date: slot.match_date, end: slot.end_minutes });
  });

  return { scheduled, unscheduled };
}

function getCapacity(form: PilotForm) {
  return buildSlots(form).length;
}

function getEstimatedFinalMatches(form: PilotForm) {
  let total = 0;
  if (form.hasSemiFinals) total += 2;
  if (form.hasThirdPlaceMatch) total += 1;
  if (form.hasFinal) total += 1;
  return total;
}

function getValidationMessages(form: PilotForm) {
  const messages: Array<{ type: 'ok' | 'warning' | 'error'; text: string }> = [];
  const dates = getDates(form);
  const groupDistribution = distributeTeams(form.totalTeams, form.groupCount);
  const groupGames = getPairings(form).length;
  const finalGames = getEstimatedFinalMatches(form);
  const capacity = getCapacity(form);
  const totalExpectedGames = groupGames + finalGames;
  const { unscheduled } = schedulePairings(form);

  if (!form.tournamentName.trim()) {
    messages.push({ type: 'error', text: 'O nome do torneio é obrigatório.' });
  }

  if (dates.length === 0) {
    messages.push({ type: 'error', text: 'É obrigatório indicar pelo menos um dia do torneio.' });
  }

  if (form.totalTeams < 2) {
    messages.push({ type: 'error', text: 'O torneio precisa de pelo menos 2 equipas.' });
  }

  if (form.groupCount < 1) {
    messages.push({ type: 'error', text: 'É necessário configurar pelo menos 1 grupo.' });
  }

  if (form.fieldsCount < 1) {
    messages.push({ type: 'error', text: 'É necessário configurar pelo menos 1 campo.' });
  }

  if (form.startTime >= form.endTime) {
    messages.push({ type: 'error', text: 'O horário de início tem de ser anterior ao horário de fim.' });
  }

  if (form.hasLunchBreak && form.lunchStart && form.lunchEnd && form.lunchStart >= form.lunchEnd) {
    messages.push({ type: 'error', text: 'O início da pausa deve ser anterior ao fim da pausa.' });
  }

  if (form.hasTournamentPartner && !form.partnerName.trim()) {
    messages.push({ type: 'error', text: 'Indicou que há parceiro do torneio, mas falta o nome do parceiro.' });
  }

  if (form.createResultsAccess && !form.resultsUsername.trim()) {
    messages.push({ type: 'error', text: 'Indicou acesso de resultados, mas falta definir o nome do utilizador.' });
  }

  if (form.createResultsAccess && form.resultsPassword.trim().length < 6) {
    messages.push({ type: 'error', text: 'A palavra-passe do utilizador de resultados deve ter pelo menos 6 caracteres.' });
  }

  if (capacity < groupGames) {
    messages.push({
      type: 'error',
      text: `A fase de grupos precisa de ${groupGames} jogo(s), mas só cabem ${capacity} slot(s) nos dias/campos configurados.`,
    });
  } else {
    messages.push({
      type: 'ok',
      text: `A fase de grupos cabe no calendário: ${groupGames} jogo(s) para ${capacity} slot(s) disponíveis.`,
    });
  }

  if (capacity < totalExpectedGames) {
    messages.push({
      type: 'warning',
      text: `Com fase final, estima-se ${totalExpectedGames} jogo(s). Pode ser necessário reservar horários adicionais para finais.`,
    });
  }

  if (unscheduled.length > 0) {
    messages.push({
      type: 'warning',
      text: `${unscheduled.length} jogo(s) da fase de grupos podem não respeitar o descanso mínimo com a configuração atual.`,
    });
  }

  groupDistribution.forEach((group, index) => {
    if (group.length < 2) {
      messages.push({
        type: 'warning',
        text: `O Grupo ${String.fromCharCode(65 + index)} fica com menos de 2 equipas.`,
      });
    }
  });

  return messages;
}

function getInputClass() {
  return 'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100';
}

function getSelectClass() {
  return 'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100';
}

function getTextareaClass() {
  return 'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100';
}

function getStepIndex(step: PilotStep) {
  return steps.findIndex((item) => item.id === step);
}

export function AdminTournamentSelfServicePage() {
  const [currentStep, setCurrentStep] = useState<PilotStep>('basic');
  const [form, setForm] = useState<PilotForm>(initialForm);
  const [partnerLogoFile, setPartnerLogoFile] = useState<File | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createdTournament, setCreatedTournament] = useState<CreatedTournament | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const dates = useMemo(() => getDates(form), [form]);
  const teams = useMemo(() => getTeams(form), [form]);
  const groups = useMemo(() => getGroups(form), [form]);
  const fields = useMemo(() => getFields(form), [form]);
  const pairings = useMemo(() => getPairings(form), [form]);
  const validationMessages = useMemo(() => getValidationMessages(form), [form]);
  const hasBlockingErrors = validationMessages.some((message) => message.type === 'error');

  function updateField<K extends keyof PilotForm>(field: K, value: PilotForm[K]) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
    setCreatedTournament(null);
    setErrorMessage('');
    setSuccessMessage('');
  }

  function nextStep() {
    const currentIndex = getStepIndex(currentStep);
    const next = steps[currentIndex + 1];
    if (next) setCurrentStep(next.id);
  }

  function previousStep() {
    const currentIndex = getStepIndex(currentStep);
    const previous = steps[currentIndex - 1];
    if (previous) setCurrentStep(previous.id);
  }

  function handlePartnerLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    setPartnerLogoFile(file);
    setCreatedTournament(null);
  }

  async function getUniqueSlug(baseValue: string) {
    const baseSlug = createSlug(baseValue || 'torneio');
    let candidate = baseSlug;
    let counter = 2;

    while (true) {
      const { data, error } = await supabase
        .from('tournaments')
        .select('id')
        .eq('slug', candidate)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) return candidate;

      candidate = `${baseSlug}-${counter}`;
      counter += 1;
    }
  }

  async function createTournamentResultsUser(tournamentId: string) {
    if (!form.createResultsAccess) return null;

    const username = form.resultsUsername.trim();
    const password = form.resultsPassword.trim();

    if (!username || password.length < 6) {
      throw new Error('Define um utilizador e uma palavra-passe com pelo menos 6 caracteres para o acesso de resultados.');
    }

    const { data, error } = await supabase.functions.invoke('create-tournament-results-user', {
      body: {
        tournament_id: tournamentId,
        username,
        password,
        display_name: 'Lançamento de resultados',
      },
    });

    if (error) {
      throw new Error(error.message || 'Não foi possível criar o utilizador de resultados.');
    }

    return data as {
      username: string;
      email: string;
      tournament_id: string;
      display_name: string;
    };
  }

  async function uploadPartnerLogo(tournamentId: string) {
    if (!partnerLogoFile) return null;

    const extension = partnerLogoFile.name.split('.').pop() || 'png';
    const filePath = `${tournamentId}/${Date.now()}-${createSlug(partnerLogoFile.name)}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from('gdrb-tournament-sponsors')
      .upload(filePath, partnerLogoFile, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('gdrb-tournament-sponsors')
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  async function handleCreateTournament(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage('');
    setSuccessMessage('');
    setCreatedTournament(null);

    if (hasBlockingErrors) {
      setErrorMessage('Corrige os erros de validação antes de criar o torneio.');
      return;
    }

    setIsCreating(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        throw new Error('Para criar o torneio é necessário estar autenticado no admin.');
      }

      const slug = await getUniqueSlug(`${form.tournamentName} ${form.edition}`);

      const { data: tournament, error: tournamentError } = await supabase
        .from('tournaments')
        .insert({
          name: form.tournamentName.trim(),
          slug,
          edition: form.edition.trim() || null,
          age_group: form.ageGroup.trim() || null,
          birth_year: form.birthYear.trim() || null,
          football_type: form.footballType,
          gender: form.gender,
          location: form.location.trim() || null,
          address: form.address.trim() || null,
          description:
            form.description.trim() ||
            'Torneio criado através do assistente self-service de criação de torneios.',
          contact_phone: form.contactPhone.trim() || null,
          contact_email: form.contactEmail.trim() || null,
          status: 'published',
          is_public: true,
        })
        .select('id, slug')
        .single();

      if (tournamentError) throw tournamentError;

      const tournamentId = tournament.id as string;
      const publicSlug = tournament.slug as string;

      const dayRows = getDaysDraft(form).map((day) => ({
        tournament_id: tournamentId,
        day_date: day.day_date,
        start_time: day.start_time,
        end_time: day.end_time,
        lunch_start: day.lunch_start,
        lunch_end: day.lunch_end,
        notes: form.hasLunchBreak ? 'Criado pelo assistente self-service com pausa configurada.' : 'Criado pelo assistente self-service.',
      }));

      const { error: daysError } = await supabase.from('tournament_days').insert(dayRows);
      if (daysError) throw daysError;

      const { data: createdFields, error: fieldsError } = await supabase
        .from('tournament_fields')
        .insert(
          fields.map((field) => ({
            tournament_id: tournamentId,
            name: field.name,
            field_type: form.footballType,
            surface: null,
            is_active: true,
            notes: 'Campo criado pelo assistente self-service.',
          })),
        )
        .select('id, name');

      if (fieldsError) throw fieldsError;

      const { data: createdTeams, error: teamsError } = await supabase
        .from('tournament_teams')
        .insert(
          teams.map((team) => ({
            tournament_id: tournamentId,
            name: team.name,
            club: team.name,
            location: null,
            logo_url: null,
            coach_name: null,
            contact_phone: null,
            contact_email: null,
            primary_color: null,
            secondary_color: null,
            notes: 'Equipa placeholder criada pelo assistente self-service. Editar depois no admin.',
            sort_order: team.sort_order,
          })),
        )
        .select('id, name, sort_order');

      if (teamsError) throw teamsError;

      const { data: createdGroups, error: groupsError } = await supabase
        .from('tournament_groups')
        .insert(
          groups.map((group) => ({
            tournament_id: tournamentId,
            name: group.name,
            sort_order: group.sort_order,
          })),
        )
        .select('id, name, sort_order');

      if (groupsError) throw groupsError;

      const distribution = distributeTeams(form.totalTeams, form.groupCount);
      const groupTeamRows = distribution.flatMap((teamIndexes, groupIndex) => {
        const group = createdGroups?.find((item) => Number(item.sort_order) === groupIndex + 1);

        if (!group) return [];

        return teamIndexes.flatMap((teamIndex, sortIndex) => {
          const team = createdTeams?.find((item) => Number(item.sort_order) === teamIndex + 1);
          if (!team) return [];

          return {
            tournament_id: tournamentId,
            group_id: group.id,
            team_id: team.id,
            sort_order: sortIndex + 1,
          };
        });
      });

      if (groupTeamRows.length > 0) {
        const { error: groupTeamsError } = await supabase.from('tournament_group_teams').insert(groupTeamRows);
        if (groupTeamsError) throw groupTeamsError;
      }

      const { error: rulesError } = await supabase.from('tournament_rules').insert({
        tournament_id: tournamentId,
        format_type: 'groups_final',
        group_count: form.groupCount,
        teams_per_group: Math.ceil(form.totalTeams / Math.max(1, form.groupCount)),
        qualifiers_per_group: form.qualifiersPerGroup,
        best_thirds_count: 0,
        has_quarter_finals: false,
        has_semi_finals: form.hasSemiFinals,
        has_third_place_match: form.hasThirdPlaceMatch,
        has_final: form.hasFinal,
        match_parts: 1,
        minutes_per_part: form.matchDurationMinutes,
        halftime_minutes: 0,
        minutes_between_matches: form.minutesBetweenMatches,
        min_rest_minutes: form.minRestMinutes,
        win_points: 3,
        draw_points: 1,
        loss_points: 0,
        no_show_points: 0,
        no_show_score_for: 0,
        no_show_score_against: 3,
        notes: `Criado pelo assistente self-service. Acesso de resultados solicitado: ${form.createResultsAccess ? 'sim' : 'não'}${
          form.createResultsAccess && form.resultsUsername ? ` (${form.resultsUsername})` : ''
        }.`,
      });

      if (rulesError) throw rulesError;

      if (form.hasTournamentPartner && form.partnerName.trim()) {
        const logoUrl = await uploadPartnerLogo(tournamentId);

        const { error: sponsorError } = await supabase.from('tournament_sponsors').insert({
          tournament_id: tournamentId,
          name: form.partnerName.trim(),
          description: form.partnerDescription.trim() || null,
          logo_url: logoUrl,
          website_url: normalizeWebsiteUrl(form.partnerWebsite),
          sponsor_level: form.partnerLevel,
          is_active: true,
          sort_order: 1,
        });

        if (sponsorError) throw sponsorError;
      }

      const schedulerResult = generateTournamentSchedule({
        groups: (createdGroups || []).map((group) => ({
          id: group.id,
          name: group.name,
          sort_order: Number(group.sort_order),
        })),
        teams: (createdTeams || []).map((team) => ({
          id: team.id,
          name: team.name,
          sort_order: Number(team.sort_order),
        })),
        assignments: groupTeamRows.map((assignment) => ({
          group_id: assignment.group_id,
          team_id: assignment.team_id,
          sort_order: assignment.sort_order,
        })),
        days: getDaysDraft(form),
        fields: (createdFields || []).map((field) => ({
          id: field.id,
          name: field.name,
          is_active: true,
        })),
        rules: {
          qualifiers_per_group: form.qualifiersPerGroup,
          best_thirds_count: 0,
          has_quarter_finals: false,
          has_semi_finals: form.hasSemiFinals,
          has_third_place_match: form.hasThirdPlaceMatch,
          has_final: form.hasFinal,
          match_parts: 1,
          minutes_per_part: form.matchDurationMinutes,
          halftime_minutes: 0,
          minutes_between_matches: form.minutesBetweenMatches,
          min_rest_minutes: form.minRestMinutes,
        },
      });

      const matchRows = schedulerResult.matches.map((match) => ({
        tournament_id: tournamentId,
        group_id: match.group_id,
        field_id: match.field_id,
        team_a_id: match.team_a_id,
        team_b_id: match.team_b_id,
        team_a_placeholder: match.team_a_placeholder,
        team_b_placeholder: match.team_b_placeholder,
        team_a_source: match.team_a_source,
        team_b_source: match.team_b_source,
        round_number: match.round_number,
        phase: match.phase,
        match_number: match.match_number,
        match_date: match.match_date,
        match_time: match.match_time ? `${match.match_time}:00` : null,
        status: 'scheduled',
        score_a: null,
        score_b: null,
        notes: match.notes || 'Jogo gerado pelo assistente self-service.',
      }));

      if (matchRows.length > 0) {
        const { error: matchesError } = await supabase.from('tournament_matches').insert(matchRows);
        if (matchesError) throw matchesError;
      }

      const resultsAccess = await createTournamentResultsUser(tournamentId);

      const baseUrl = getPublicBaseUrl();
      const created: CreatedTournament = {
        id: tournamentId,
        slug: publicSlug,
        publicUrl: `${baseUrl}/torneios/${publicSlug}`,
        adminUrl: `${baseUrl}/admin/gestor-torneios/${tournamentId}`,
        matchesUrl: `${baseUrl}/admin/gestor-torneios/${tournamentId}/jogos`,
        resultsUrl: `${baseUrl}/admin/resultados-torneio/${tournamentId}`,
        resultsAccessCreated: Boolean(resultsAccess),
        resultsUsername: resultsAccess?.username,
        resultsEmail: resultsAccess?.email,
        resultsPassword: form.createResultsAccess ? form.resultsPassword.trim() : undefined,
      };

      setCreatedTournament(created);
      setSuccessMessage(
        resultsAccess
          ? 'Torneio criado com sucesso. A página pública, calendário, jogos e acesso de resultados foram criados.'
          : 'Torneio criado com sucesso. Foram gerados os dados iniciais, página pública, jogos da fase de grupos e placeholders da fase final.',
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível criar o torneio.';
      setErrorMessage(message);
    } finally {
      setIsCreating(false);
    }
  }

  const currentStepIndex = getStepIndex(currentStep);

  return (
    <main className="min-h-screen bg-[#f7f2ea] px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="overflow-hidden rounded-3xl bg-[#24180f] text-white shadow-xl">
          <div className="grid gap-8 p-8 md:grid-cols-[1.4fr_0.8fr] md:p-12">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-red-300">
                Gestão de Torneios
              </p>
              <h1 className="mt-4 font-serif text-4xl font-light leading-tight md:text-6xl">
                Criar novo torneio.
              </h1>
              <p className="mt-5 max-w-3xl text-sm leading-7 text-white/75 md:text-base">
                Configure o torneio passo a passo. O assistente recolhe as informações essenciais, valida a estrutura e cria a base operacional: página pública, calendário, equipas, grupos, regras, parceiros e jogos.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-xs font-bold uppercase tracking-[0.18em] text-white/75">
                <span className="rounded-full bg-white/10 px-4 py-2">Assistente guiado</span>
                <span className="rounded-full bg-white/10 px-4 py-2">Dados validados</span>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="/admin/gestor-torneios/lista"
                  className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white px-5 py-3 text-sm font-bold text-[#24180f] transition hover:bg-white/90"
                >
                  Voltar aos torneios criados
                </a>
              </div>
            </div>

            <div className="rounded-2xl bg-white/10 p-6 ring-1 ring-white/10">
              <Trophy className="h-9 w-9 text-red-300" />
              <h2 className="mt-4 text-xl font-bold">Estrutura criada automaticamente</h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-white/75">
                <li>• Registo do torneio e página pública</li>
                <li>• Datas, horários, campos e pausas</li>
                <li>• Equipas temporárias e grupos</li>
                <li>• Regras competitivas e calendário inicial</li>
                <li>• Parceiros do torneio, quando aplicável</li>
                <li>• Área administrativa para jogos e resultados</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <aside className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            {steps.map((step, index) => {
              const isActive = step.id === currentStep;
              const isDone = index < currentStepIndex;

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setCurrentStep(step.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    isActive
                      ? 'border-green-700 bg-green-50 text-green-900'
                      : isDone
                        ? 'border-green-100 bg-white text-slate-700'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        isActive
                          ? 'bg-green-700 text-white'
                          : isDone
                            ? 'bg-green-100 text-green-800'
                            : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {isDone ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-bold">{step.title}</p>
                      <p className="mt-1 text-xs leading-5 opacity-80">{step.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </aside>

          <form onSubmit={handleCreateTournament} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            {currentStep === 'basic' && (
              <StepCard
                icon={<FileText className="h-5 w-5" />}
                title="Dados principais"
                description="Define a identidade base do torneio."
              >
                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Nome do torneio *" className="md:col-span-2">
                    <input
                      className={getInputClass()}
                      value={form.tournamentName}
                      onChange={(event) => updateField('tournamentName', event.target.value)}
                      placeholder="Ex: Torneio de Verão GDR Boavista"
                    />
                  </Field>

                  <Field label="Edição">
                    <input
                      className={getInputClass()}
                      value={form.edition}
                      onChange={(event) => updateField('edition', event.target.value)}
                      placeholder="Ex: 2026"
                    />
                  </Field>

                  <Field label="Escalão">
                    <input
                      className={getInputClass()}
                      value={form.ageGroup}
                      onChange={(event) => updateField('ageGroup', event.target.value)}
                      placeholder="Ex: Sub-9"
                    />
                  </Field>

                  <Field label="Ano de nascimento">
                    <input
                      className={getInputClass()}
                      value={form.birthYear}
                      onChange={(event) => updateField('birthYear', event.target.value)}
                      placeholder="Ex: 2017"
                    />
                  </Field>

                  <Field label="Tipo de futebol">
                    <select
                      className={getSelectClass()}
                      value={form.footballType}
                      onChange={(event) => updateField('footballType', event.target.value)}
                    >
                      <option>Futebol 5</option>
                      <option>Futebol 7</option>
                      <option>Futebol 9</option>
                      <option>Futebol 11</option>
                    </select>
                  </Field>

                  <Field label="Género">
                    <select
                      className={getSelectClass()}
                      value={form.gender}
                      onChange={(event) => updateField('gender', event.target.value)}
                    >
                      <option>Masculino</option>
                      <option>Feminino</option>
                      <option>Misto</option>
                    </select>
                  </Field>

                  <Field label="Número de equipas">
                    <input
                      type="number"
                      min={2}
                      className={getInputClass()}
                      value={form.totalTeams}
                      onChange={(event) => updateField('totalTeams', Number(event.target.value))}
                    />
                  </Field>

                  <Field label="Local">
                    <input
                      className={getInputClass()}
                      value={form.location}
                      onChange={(event) => updateField('location', event.target.value)}
                    />
                  </Field>

                  <Field label="Morada">
                    <input
                      className={getInputClass()}
                      value={form.address}
                      onChange={(event) => updateField('address', event.target.value)}
                    />
                  </Field>

                  <Field label="Contacto">
                    <input
                      className={getInputClass()}
                      value={form.contactPhone}
                      onChange={(event) => updateField('contactPhone', event.target.value)}
                    />
                  </Field>

                  <Field label="Email">
                    <input
                      type="email"
                      className={getInputClass()}
                      value={form.contactEmail}
                      onChange={(event) => updateField('contactEmail', event.target.value)}
                    />
                  </Field>

                  <Field label="Descrição" className="md:col-span-2">
                    <textarea
                      className={getTextareaClass()}
                      rows={4}
                      value={form.description}
                      onChange={(event) => updateField('description', event.target.value)}
                      placeholder="Texto breve para a página pública do torneio."
                    />
                  </Field>
                </div>
              </StepCard>
            )}

            {currentStep === 'schedule' && (
              <StepCard
                icon={<CalendarDays className="h-5 w-5" />}
                title="Dias, horários e campos"
                description="Define quando o torneio acontece e quantos campos existem."
              >
                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Os dias são seguidos?" className="md:col-span-2">
                    <div className="grid gap-3 md:grid-cols-2">
                      <ChoiceButton
                        selected={form.isConsecutiveDays}
                        onClick={() => updateField('isConsecutiveDays', true)}
                        title="Sim, dias seguidos"
                        description="Ex: sexta, sábado e domingo."
                      />
                      <ChoiceButton
                        selected={!form.isConsecutiveDays}
                        onClick={() => updateField('isConsecutiveDays', false)}
                        title="Não, datas manuais"
                        description="Permite indicar datas separadas."
                      />
                    </div>
                  </Field>

                  {form.isConsecutiveDays ? (
                    <>
                      <Field label="Primeiro dia">
                        <input
                          type="date"
                          className={getInputClass()}
                          value={form.startDate}
                          onChange={(event) => updateField('startDate', event.target.value)}
                        />
                      </Field>

                      <Field label="Número de dias">
                        <input
                          type="number"
                          min={1}
                          className={getInputClass()}
                          value={form.daysCount}
                          onChange={(event) => updateField('daysCount', Number(event.target.value))}
                        />
                      </Field>
                    </>
                  ) : (
                    <Field label="Datas do torneio" className="md:col-span-2">
                      <textarea
                        className={getTextareaClass()}
                        rows={4}
                        value={form.manualDates}
                        onChange={(event) => updateField('manualDates', event.target.value)}
                        placeholder="Uma data por linha. Ex:&#10;2026-07-03&#10;2026-07-05&#10;2026-07-10"
                      />
                    </Field>
                  )}

                  <Field label="Hora de início">
                    <input
                      type="time"
                      className={getInputClass()}
                      value={form.startTime}
                      onChange={(event) => updateField('startTime', event.target.value)}
                    />
                  </Field>

                  <Field label="Hora de fim">
                    <input
                      type="time"
                      className={getInputClass()}
                      value={form.endTime}
                      onChange={(event) => updateField('endTime', event.target.value)}
                    />
                  </Field>

                  <Field label="Pausa para almoço" className="md:col-span-2">
                    <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={form.hasLunchBreak}
                        onChange={(event) => updateField('hasLunchBreak', event.target.checked)}
                      />
                      O torneio terá pausa/almoço
                    </label>
                  </Field>

                  {form.hasLunchBreak && (
                    <>
                      <Field label="Início da pausa">
                        <input
                          type="time"
                          className={getInputClass()}
                          value={form.lunchStart}
                          onChange={(event) => updateField('lunchStart', event.target.value)}
                        />
                      </Field>

                      <Field label="Fim da pausa">
                        <input
                          type="time"
                          className={getInputClass()}
                          value={form.lunchEnd}
                          onChange={(event) => updateField('lunchEnd', event.target.value)}
                        />
                      </Field>
                    </>
                  )}

                  <Field label="Número de campos">
                    <input
                      type="number"
                      min={1}
                      className={getInputClass()}
                      value={form.fieldsCount}
                      onChange={(event) => updateField('fieldsCount', Number(event.target.value))}
                    />
                  </Field>
                </div>
              </StepCard>
            )}

            {currentStep === 'format' && (
              <StepCard
                icon={<Users className="h-5 w-5" />}
                title="Formato competitivo"
                description="Define grupos, duração dos jogos e critérios-base."
              >
                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Número de grupos">
                    <input
                      type="number"
                      min={1}
                      className={getInputClass()}
                      value={form.groupCount}
                      onChange={(event) => updateField('groupCount', Number(event.target.value))}
                    />
                  </Field>

                  <Field label="Passam por grupo">
                    <input
                      type="number"
                      min={1}
                      className={getInputClass()}
                      value={form.qualifiersPerGroup}
                      onChange={(event) => updateField('qualifiersPerGroup', Number(event.target.value))}
                    />
                  </Field>

                  <Field label="Duração do jogo em minutos">
                    <input
                      type="number"
                      min={1}
                      className={getInputClass()}
                      value={form.matchDurationMinutes}
                      onChange={(event) => updateField('matchDurationMinutes', Number(event.target.value))}
                    />
                  </Field>

                  <Field label="Intervalo entre jogos em minutos">
                    <input
                      type="number"
                      min={0}
                      className={getInputClass()}
                      value={form.minutesBetweenMatches}
                      onChange={(event) => updateField('minutesBetweenMatches', Number(event.target.value))}
                    />
                  </Field>

                  <Field label="Descanso mínimo por equipa em minutos">
                    <input
                      type="number"
                      min={0}
                      className={getInputClass()}
                      value={form.minRestMinutes}
                      onChange={(event) => updateField('minRestMinutes', Number(event.target.value))}
                    />
                  </Field>

                  <Field label="Fase final" className="md:col-span-2">
                    <div className="grid gap-3 md:grid-cols-3">
                      <label className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                        <input
                          className="mr-2"
                          type="checkbox"
                          checked={form.hasSemiFinals}
                          onChange={(event) => updateField('hasSemiFinals', event.target.checked)}
                        />
                        Meias-finais
                      </label>
                      <label className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                        <input
                          className="mr-2"
                          type="checkbox"
                          checked={form.hasThirdPlaceMatch}
                          onChange={(event) => updateField('hasThirdPlaceMatch', event.target.checked)}
                        />
                        3.º e 4.º lugar
                      </label>
                      <label className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                        <input
                          className="mr-2"
                          type="checkbox"
                          checked={form.hasFinal}
                          onChange={(event) => updateField('hasFinal', event.target.checked)}
                        />
                        Final
                      </label>
                    </div>
                  </Field>
                </div>
              </StepCard>
            )}

            {currentStep === 'partners' && (
              <StepCard
                icon={<LinkIcon className="h-5 w-5" />}
                title="Parceiros do torneio"
                description="Os parceiros do Boavista já aparecem automaticamente na página pública. Aqui defines parceiros próprios deste torneio."
              >
                <div className="space-y-5">
                  <Field label="O torneio terá parceiro próprio?">
                    <div className="grid gap-3 md:grid-cols-2">
                      <ChoiceButton
                        selected={form.hasTournamentPartner}
                        onClick={() => updateField('hasTournamentPartner', true)}
                        title="Sim"
                        description="Adicionar parceiro/apoiador específico do torneio."
                      />
                      <ChoiceButton
                        selected={!form.hasTournamentPartner}
                        onClick={() => updateField('hasTournamentPartner', false)}
                        title="Não"
                        description="Mostrar apenas os parceiros do GDR Boavista."
                      />
                    </div>
                  </Field>

                  {form.hasTournamentPartner && (
                    <div className="grid gap-5 md:grid-cols-2">
                      <Field label="Nome do parceiro *">
                        <input
                          className={getInputClass()}
                          value={form.partnerName}
                          onChange={(event) => updateField('partnerName', event.target.value)}
                        />
                      </Field>

                      <Field label="Link do site">
                        <input
                          className={getInputClass()}
                          value={form.partnerWebsite}
                          onChange={(event) => updateField('partnerWebsite', event.target.value)}
                          placeholder="https://..."
                        />
                      </Field>

                      <Field label="Tipo de apoio">
                        <select
                          className={getSelectClass()}
                          value={form.partnerLevel}
                          onChange={(event) => updateField('partnerLevel', event.target.value)}
                        >
                          <option>Parceiro principal do torneio</option>
                          <option>Parceiro do torneio</option>
                          <option>Apoiador do torneio</option>
                        </select>
                      </Field>

                      <Field label="Logo do parceiro">
                        <label className="flex cursor-pointer items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600 hover:border-green-600 hover:bg-green-50">
                          <Upload className="h-4 w-4" />
                          {partnerLogoFile ? partnerLogoFile.name : 'Escolher ficheiro'}
                          <input type="file" accept="image/*" className="hidden" onChange={handlePartnerLogoChange} />
                        </label>
                      </Field>

                      <Field label="Descrição do parceiro" className="md:col-span-2">
                        <textarea
                          className={getTextareaClass()}
                          rows={4}
                          value={form.partnerDescription}
                          onChange={(event) => updateField('partnerDescription', event.target.value)}
                          placeholder="Texto opcional para apresentar este parceiro na página pública do torneio."
                        />
                      </Field>
                    </div>
                  )}
                </div>
              </StepCard>
            )}

            {currentStep === 'results' && (
              <StepCard
                icon={<ShieldCheck className="h-5 w-5" />}
                title="Acesso para resultados"
                description="Define se alguém terá acesso específico para lançar resultados."
              >
                <div className="space-y-5">
                  <Field label="Criar acesso para lançar resultados?">
                    <div className="grid gap-3 md:grid-cols-2">
                      <ChoiceButton
                        selected={form.createResultsAccess}
                        onClick={() => updateField('createResultsAccess', true)}
                        title="Sim"
                        description="Mostrar no resumo um utilizador sugerido para resultados."
                      />
                      <ChoiceButton
                        selected={!form.createResultsAccess}
                        onClick={() => updateField('createResultsAccess', false)}
                        title="Não"
                        description="Apenas administradores atuais lançam resultados."
                      />
                    </div>
                  </Field>

                  {form.createResultsAccess && (
                    <div className="grid gap-5 md:grid-cols-2">
                      <Field label="Utilizador sugerido">
                        <input
                          className={getInputClass()}
                          value={form.resultsUsername}
                          onChange={(event) => updateField('resultsUsername', event.target.value)}
                        />
                      </Field>

                      <Field label="Palavra-passe temporária">
                        <input
                          className={getInputClass()}
                          value={form.resultsPassword}
                          onChange={(event) => updateField('resultsPassword', event.target.value)}
                          placeholder="Será registado como observação; o acesso pode ser configurado depois no admin"
                        />
                      </Field>
                    </div>
                  )}
                </div>
              </StepCard>
            )}

            {currentStep === 'summary' && (
              <StepCard
                icon={<Sparkles className="h-5 w-5" />}
                title="Resumo e criação"
                description="Confirma os dados antes de criar o torneio real."
              >
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-4">
                    <SummaryCard label="Equipas" value={String(form.totalTeams)} />
                    <SummaryCard label="Grupos" value={String(form.groupCount)} />
                    <SummaryCard label="Campos" value={String(form.fieldsCount)} />
                    <SummaryCard label="Jogos de grupo" value={String(pairings.length)} />
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Resumo</h3>
                    <dl className="mt-4 grid gap-4 text-sm md:grid-cols-2">
                      <SummaryItem label="Nome" value={form.tournamentName || '-'} />
                      <SummaryItem label="Escalão" value={form.ageGroup || '-'} />
                      <SummaryItem label="Tipo" value={form.footballType} />
                      <SummaryItem label="Datas" value={dates.length ? dates.map(formatDate).join(', ') : '-'} />
                      <SummaryItem label="Horário" value={`${form.startTime} às ${form.endTime}`} />
                      <SummaryItem
                        label="Pausa"
                        value={form.hasLunchBreak ? `${form.lunchStart} às ${form.lunchEnd}` : 'Sem pausa'}
                      />
                      <SummaryItem label="Parceiro do torneio" value={form.hasTournamentPartner ? form.partnerName || '-' : 'Não'} />
                      <SummaryItem
                        label="Acesso resultados"
                        value={form.createResultsAccess ? form.resultsUsername || 'Sim' : 'Não'}
                      />
                    </dl>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Validação</h3>
                    {validationMessages.map((message) => (
                      <div
                        key={message.text}
                        className={`rounded-xl border px-4 py-3 text-sm leading-6 ${
                          message.type === 'error'
                            ? 'border-red-200 bg-red-50 text-red-700'
                            : message.type === 'warning'
                              ? 'border-amber-200 bg-amber-50 text-amber-800'
                              : 'border-green-200 bg-green-50 text-green-800'
                        }`}
                      >
                        {message.text}
                      </div>
                    ))}
                  </div>

                  {errorMessage && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
                      {errorMessage}
                    </div>
                  )}

                  {successMessage && (
                    <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm leading-6 text-green-800">
                      {successMessage}
                    </div>
                  )}

                  {createdTournament && (
                    <div className="rounded-2xl border border-green-200 bg-white p-5 shadow-sm">
                      <h3 className="text-lg font-bold text-slate-900">Torneio criado</h3>
                      <div className="mt-4 grid gap-3 text-sm">
                        <LinkButton href={createdTournament.publicUrl} label="Abrir página pública" />
                        <LinkButton href={createdTournament.adminUrl} label="Editar torneio no admin" />
                        <LinkButton href={createdTournament.matchesUrl} label="Lançar resultados / gerir jogos" />
                      </div>
                      {createdTournament.resultsAccessCreated && (
                        <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-4 text-sm leading-6 text-red-900">
                          <p className="font-bold">Acesso de resultados criado</p>
                          <p className="mt-1">
                            Utilizador: <strong>{createdTournament.resultsUsername}</strong>
                          </p>
                          <p>
                            Palavra-passe: <strong>{createdTournament.resultsPassword}</strong>
                          </p>
                          <p className="text-xs text-red-800/80">
                            Conta técnica: {createdTournament.resultsEmail}
                          </p>
                          <div className="mt-3">
                            <LinkButton href={createdTournament.resultsUrl} label="Abrir área de resultados" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </StepCard>
            )}

            <div className="mt-8 flex flex-col gap-3 border-t border-slate-100 pt-6 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-slate-500">
                Passo {currentStepIndex + 1} de {steps.length}
              </div>

              <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
                {currentStepIndex > 0 && (
                  <button
                    type="button"
                    onClick={previousStep}
                    className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Voltar
                  </button>
                )}

                {currentStep !== 'summary' ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="rounded-xl bg-green-700 px-5 py-3 text-sm font-bold text-white hover:bg-green-800"
                  >
                    Continuar
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isCreating || hasBlockingErrors}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-700 px-5 py-3 text-sm font-bold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isCreating ? 'A criar torneio...' : 'Criar torneio'}
                  </button>
                )}
              </div>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

function StepCard({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-6 flex items-start gap-4">
        <div className="rounded-2xl bg-green-50 p-3 text-green-700">{icon}</div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-green-700">Assistente</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function Field({ label, className = '', children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function ChoiceButton({
  selected,
  onClick,
  title,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition ${
        selected ? 'border-green-700 bg-green-50 text-green-900' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
      }`}
    >
      <p className="font-bold">{title}</p>
      <p className="mt-1 text-sm leading-6 opacity-80">{description}</p>
    </button>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{label}</dt>
      <dd className="mt-1 font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

function LinkButton({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3 font-bold text-green-700 hover:border-green-700 hover:bg-green-50"
    >
      {label}
      <ExternalLink className="h-4 w-4" />
    </a>
  );
}
