import { supabase } from './supabase';
import { findTrainingGroup } from './trainingEligibility';
import { formationSchedules, footballElevenSchedules, TRAINING_SEASON } from './trainingSchedules';
import type { TrainingSchedule } from './trainingSchedules';
import { lisbonClock, selectChatMatches } from './clubChat';
import type { ChatPlan } from './clubChat';
import type { GdrbMatch } from '../types/database';

export type ChatAnswer = {
  sources?: {id:string;name:string;url?:string;checkedAt?:string}[];
  text: string; matches?: GdrbMatch[]; schedules?: TrainingSchedule[];
  source?: string; consultedAt?: string; href?: string; linkLabel?: string; choices?: string[];
};
const matchFields = 'id,team_name,football_type,competition,opponent,match_date,match_time,location,venue_type,status,home_score,away_score,result_outcome,is_visible,updated_at';
export async function answerChat(plan: ChatPlan, signal: AbortSignal, now = new Date()): Promise<ChatAnswer> {
  if (plan.kind === 'reply') return plan;
  const { intent, team, period } = plan;
  if (intent === 'standings') return {
    text: `A classificação oficial${team ? ` dos ${team}` : ''} ainda não está ligada ao assistente. Os resultados do clube não permitem calcular a tabela completa do campeonato.`,
    href: '/contactos', linkLabel: 'Confirmar com o clube',
  };
  if (intent === 'age' || intent === 'training') {
    const year = Number(lisbonClock(now).date.slice(0, 4));
    const seasonStart = Number(TRAINING_SEASON.slice(0, 4));
    const current = lisbonClock(now).date;
    if (current < `${seasonStart}-07-01` || current >= `${seasonStart + 1}-07-01`) return { text: `Os horários e escalões disponíveis são da época ${TRAINING_SEASON}. Confirma com a coordenação a informação para a época atual.`, href: '/contactos', linkLabel: 'Contactar o clube' };
    if (intent === 'age') {
      const group = findTrainingGroup(plan.year || '', year);
      if (!group) return { text: 'Não consegui identificar esse ano. Indica os quatro algarismos do ano de nascimento.' };
      return { text: `Para quem nasceu em ${group.year}: ${group.label}, na época ${TRAINING_SEASON}. ${group.note}${group.needsTeamConfirmation ? ' A escolha da equipa A ou B é feita pela coordenação.' : ''}`, schedules: group.schedules, source: `Tabela e horários publicados no site · ${TRAINING_SEASON}`, href: '/venha-treinar-connosco', linkLabel: 'Conhecer a formação' };
    }
    const all = [...formationSchedules, ...footballElevenSchedules];
    const schedules = all.filter(s => s.name === team || team === 'Juvenis' && s.name.startsWith('Juvenis '));
    return { text: schedules.length ? `Horários publicados para ${team}, época ${TRAINING_SEASON}.${team === 'Juvenis' ? ' O site distingue as equipas A e B nos treinos.' : ''} Confirma alterações pontuais com a coordenação.` : `Ainda não tenho horários publicados para ${team}.`, schedules, source: `Horários do site · ${TRAINING_SEASON}`, href: '/horarios-de-treino', linkLabel: 'Ver todos os horários' };
  }
  if (['contacts', 'join', 'members'].includes(intent)) {
    const { data, error } = await supabase.from('gdrb_site_contents').select('content_key,value').in('content_key', ['contact_phone', 'contact_email']).abortSignal(signal);
    if (error) throw new Error('contacts');
    const contacts = data?.map(item => `${item.content_key === 'contact_phone' ? 'Telefone' : 'Email'}: ${item.value}`).join('\n');
    const intro = intent === 'join' ? 'Para uma inscrição ou treino experimental, fala com o clube. Valores, documentos e vagas devem ser confirmados com a coordenação.' : intent === 'members' ? 'Podes enviar o pedido de adesão na página de sócios. Confirma as quotas e condições atuais com o clube.' : 'Estes são os contactos publicados pelo clube:';
    return { text: `${intro}\n\n${contacts || 'Consulta a página de contactos.'}`, source: 'Contactos públicos do clube', consultedAt: now.toISOString(), href: intent === 'members' ? '/socios' : intent === 'join' ? '/venha-treinar-connosco' : '/contactos', linkLabel: intent === 'members' ? 'Ser sócio' : intent === 'join' ? 'Treinar connosco' : 'Ver contactos' };
  }
  const dbTeam = team === 'Equipa de Desenvolvimento' ? 'equipa de desenvolvimento' : team!;
  let query = supabase.from('gdrb_matches').select(matchFields, { count: 'exact' }).eq('is_visible', true).neq('status', 'arquivado').eq('team_name', dbTeam);
  if (period) query = query.gte('match_date', period.start).lte('match_date', period.end);
  else if (intent !== 'results') query = query.gte('match_date', lisbonClock(now).date);
  if (intent === 'results') query = query.eq('status', 'terminado');
  const { data, error, count } = await query.order('match_date', { ascending: intent !== 'results' }).order('match_time', { ascending: intent !== 'results', nullsFirst: false }).limit(100).abortSignal(signal);
  if (error) throw new Error('matches');
  const matches = selectChatMatches((data || []) as GdrbMatch[], intent, period, now);
  const scope = period ? ` em ${period.label}` : '';
  const label = intent === 'results' ? 'resultados' : 'jogos';
  const text = !matches.length ? `Não encontrei ${label} publicados para ${team}${scope}${!period && intent !== 'results' ? ' a partir de agora' : ''}. Isto não confirma que não existam outros compromissos; o calendário pode ainda não estar completo.` :
    intent === 'next' ? `Este é o próximo jogo agendado de ${team}${scope}.` : `${intent === 'results' ? 'Resultados publicados' : 'Calendário'} de ${team}${scope}.${matches.length > 8 || (count || 0) > 100 ? ' Mostro até 8 registos; consulta a página de jogos para ver mais.' : ''}`;
  return { text, matches: matches.slice(0, 8), source: 'Calendário público do clube', consultedAt: now.toISOString(), href: '/resultados', linkLabel: 'Abrir jogos e resultados', choices: ['Próximo jogo dos Seniores', 'Jogos dos Juvenis este mês'] };
}
