import type { GdrbMatch } from '../types/database';

export type Intent = 'next' | 'games' | 'results' | 'training' | 'standings' | 'age' | 'contacts' | 'join' | 'members';
export type Period = { start: string; end: string; label: string };
export type ChatContext = { intent?: Intent; team?: string; period?: Period; awaitingYear?: boolean; lastMatch?: GdrbMatch };
export type ChatPlan = { kind: 'query'; intent: Intent; team?: string; period?: Period; year?: string } |
  { kind: 'reply'; text: string; choices?: string[]; href?: string; linkLabel?: string };
export const chatTeams = ['Seniores', 'Juniores', 'Juvenis', 'Iniciados', 'Sub-13', 'Sub-12', 'Benjamins A', 'Benjamins B', 'Traquinas A', 'Traquinas B', 'Petizes', 'ABCs', 'Equipa de Desenvolvimento'];
export const normalizeChat = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[?!.,]/g, '').replace(/\s+/g, ' ').trim();
export function lisbonClock(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const get = (key: string) => parts.find(p => p.type === key)!.value;
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}:00` };
}
function shift(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`); value.setUTCDate(value.getUTCDate() + days); return value.toISOString().slice(0, 10);
}
const months = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export function parsePeriod(text: string, today: string): Period | undefined {
  const [year, month] = today.split('-').map(Number);
  if (/\bhoje\b/.test(text)) return { start: today, end: today, label: 'hoje' };
  if (/\bamanha\b/.test(text)) { const day = shift(today, 1); return { start: day, end: day, label: 'amanhã' }; }
  if (/fim (de|da) semana/.test(text)) {
    const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
    const saturday = shift(today, weekday === 0 ? -1 : 6 - weekday);
    return { start: saturday, end: shift(saturday, 1), label: 'este fim de semana' };
  }
  if (/esta semana/.test(text)) {
    const weekday = new Date(`${today}T12:00:00Z`).getUTCDay() || 7;
    const monday = shift(today, 1 - weekday); return { start: monday, end: shift(monday, 6), label: 'esta semana' };
  }
  let index = months.findIndex(m => new RegExp(`\\b${m}\\b`).test(text));
  let targetYear = Number(text.match(/\b20\d{2}\b/)?.[0] || year);
  if (/este mes|neste mes/.test(text)) index = month - 1;
  if (/proximo mes/.test(text)) { index = month % 12; if (month === 12) targetYear++; }
  if (index < 0) return;
  const start = `${targetYear}-${String(index + 1).padStart(2, '0')}-01`;
  const end = new Date(Date.UTC(targetYear, index + 1, 0, 12)).toISOString().slice(0, 10);
  return { start, end, label: `${months[index]} de ${targetYear}` };
}

export function planChat(input: string, context: ChatContext = {}, now = new Date()): { plan: ChatPlan; context: ChatContext } {
  const text = normalizeChat(input), today = lisbonClock(now).date;
  const reply = (message: string, choices?: string[], nextContext = context): { plan: ChatPlan; context: ChatContext } => ({ plan: { kind: 'reply', text: message, choices }, context: nextContext });
  if (/^(ola|oi|bom dia|boa tarde|boa noite|ajuda)$/.test(text)) return reply('Olá! Posso ajudar com jogos, resultados, treinos e escalões. O que queres consultar?', ['Próximo jogo dos Seniores', 'Jogos dos Juvenis este mês', 'Qual é o escalão do meu filho?']);
  if (/^(obrigad[oa]|obrigad[oa]s|ok|perfeito)$/.test(text)) return reply('De nada! Estou por aqui para ajudar com o Boavista.');
  if (/\bonde\b/.test(text) && context.lastMatch && !/trein/.test(text)) {
    const m = context.lastMatch;
    return reply(`${m.team_name} · ${m.opponent}: ${m.location || 'local por confirmar'}. ${m.venue_type === 'fora' ? 'Jogo fora de casa.' : 'Jogo em casa.'}`);
  }
  let intent: Intent | undefined;
  if (/classifica|posicao|pontos|campeonato.*lugar/.test(text)) intent = 'standings';
  else if (/inscri|inscrev|experimental|experimentar/.test(text)) intent = 'join';
  else if (/socio|quota/.test(text)) intent = 'members';
  else if (/contact|telefone|email|e-mail|falar com/.test(text)) intent = 'contacts';
  else if (/escalao|nasc|\b\d{1,2} anos\b/.test(text)) intent = 'age';
  else if (/trein|horario/.test(text)) intent = 'training';
  else if (/resultad|ganhou|perdeu|ficou|marcador/.test(text)) intent = 'results';
  else if (/proximo jogo\b|quando.*jog|volta.*jog/.test(text)) intent = 'next';
  else if (/\bjogo[s]?\b|\bjoga[m]?\b|calendario|agenda/.test(text)) intent = 'games';
  if (context.awaitingYear && /^\d{4}$/.test(text)) intent = 'age';
  if (intent === 'age') {
    const year = text.match(/\b(?:19|20)\d{2}\b/)?.[0];
    if (!year) return reply('Em que ano nasceu? Só preciso do ano de nascimento, por exemplo 2016.', undefined, { intent: 'age', awaitingYear: true });
    if (Number(year) > Number(today.slice(0, 4)) || Number(year) < 1926) return reply('Indica um ano de nascimento válido, por exemplo 2016.', undefined, { intent: 'age', awaitingYear: true });
    return { plan: { kind: 'query', intent, year }, context: { intent, awaitingYear: false } };
  }
  const teamMatches = chatTeams.filter(t => text.includes(normalizeChat(t)));
  if (/\bsenior\b/.test(text) && !teamMatches.includes('Seniores')) teamMatches.push('Seniores');
  if (/\bjunior\b/.test(text) && !teamMatches.includes('Juniores')) teamMatches.push('Juniores');
  if (/\bjuvenil\b/.test(text) && !teamMatches.includes('Juvenis')) teamMatches.push('Juvenis');
  if (/sub\s?[- ]?13|\bu13\b/.test(text) && !teamMatches.includes('Sub-13')) teamMatches.push('Sub-13');
  if (/sub\s?[- ]?12|\bu12\b/.test(text) && !teamMatches.includes('Sub-12')) teamMatches.push('Sub-12');
  if (/\babc\b/.test(text) && !teamMatches.includes('ABCs')) teamMatches.push('ABCs');
  const period = parsePeriod(text, today);
  const followup = /^(e |dos |das )/.test(text) || chatTeams.some(t => normalizeChat(t) === text) || /^(hoje|amanha|este mes|proximo mes|esta semana|este fim de semana)$/.test(text);
  if (!intent && followup && (teamMatches.length || period)) intent = context.intent;
  if (!intent) return reply('Ainda não consegui perceber a consulta. Posso ajudar com estes assuntos:', ['Próximo jogo dos Seniores', 'Resultados dos Seniores', 'Horários de treino', 'Qual é o escalão do meu filho?', 'Contactos']);
  if (['join', 'members', 'contacts'].includes(intent)) return { plan: { kind: 'query', intent }, context: { intent } };
  if (/\bnao\b|exceto|menos os/.test(text)) return reply('Para evitar escolher a equipa errada, seleciona a que queres consultar.', chatTeams, { intent, period });
  if (teamMatches.length > 1) return reply('Vamos consultar uma equipa de cada vez. Qual preferes?', teamMatches, { intent, period });
  const pending = { intent, period: period || (followup ? context.period : undefined) };
  if (/benjamin/.test(text) && !teamMatches.length) return reply('Queres consultar Benjamins A ou Benjamins B?', ['Benjamins A', 'Benjamins B'], pending);
  if (/traquina/.test(text) && !teamMatches.length) return reply('Queres consultar Traquinas A ou Traquinas B?', ['Traquinas A', 'Traquinas B'], pending);
  if (/infanti/.test(text) && !teamMatches.length) return reply('Queres consultar Sub-12 ou Sub-13?', ['Sub-12', 'Sub-13'], pending);
  const team = teamMatches[0] || context.team;
  if (!team) return reply('Qual é a equipa?', chatTeams, pending);
  if (team === 'Juvenis' && /juvenis [ab]\b/.test(text) && intent !== 'training') return reply('O calendário está registado como Juvenis, sem distinguir A e B. Posso mostrar a agenda geral dos Juvenis.', ['Juvenis'], pending);
  // Do not silently turn unsupported date constraints into a different query.
  const specificDay = /\bdia \d{1,2}\b|\b\d{1,2} (?:de )?(?:janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/.test(text);
  if (specificDay || !period && /\b20\d{2}\b|\d{1,2}[/\-]\d{1,2}|semana passada|mes passado|proxima semana|ontem|segunda|terca|quarta|quinta|sexta|sabado|domingo/.test(text)) return reply('Neste protótipo posso consultar hoje, amanhã, esta semana, este fim de semana ou um mês por nome. Experimenta “Jogos dos Juvenis em novembro de 2026”.');
  const next = { intent, team, period: period || (followup ? context.period : undefined) };
  return { plan: { kind: 'query', ...next }, context: next };
}

export function selectChatMatches(rows: GdrbMatch[], intent: Intent, period: Period | undefined, now = new Date()) {
  const { date, time } = lisbonClock(now);
  const allowed = rows.filter(m => m.is_visible && !m.is_archived && m.status !== 'arquivado');
  const filtered = allowed.filter(m => {
    if (period && (m.match_date < period.start || m.match_date > period.end)) return false;
    if (intent === 'results') return m.status === 'terminado';
    if (intent === 'next' || !period) return m.status === 'agendado' && (m.match_date > date || m.match_date === date && (!m.match_time || m.match_time >= time));
    return true;
  }).sort((a, b) => (`${a.match_date} ${a.match_time || '23:59'}`).localeCompare(`${b.match_date} ${b.match_time || '23:59'}`));
  return intent === 'results' ? filtered.reverse() : intent === 'next' ? filtered.slice(0, 1) : filtered;
}
