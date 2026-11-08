// Interpolate only a recent server reading. Never derive kickoff from the schedule.
export const CLOCK_FRESH_MS = 45000;
export function fanClockReading(match, ageMs = 0, unavailable = false) {
  const c = match.clock;
  const precise = Number.isFinite(c.elapsedMs) && c.elapsedMs >= 0 &&
    Number.isFinite(c.periodMinutes) && c.periodMinutes > 0;
  const age = Number.isFinite(ageMs) ? Math.max(0, ageMs) : CLOCK_FRESH_MS;
  const stale = unavailable || age >= CLOCK_FRESH_MS;
  const running = match.status === 'live' && c.running && precise && !stale;
  if (match.status === 'draft') return { text: '00:00', running: false, stale, label: 'A aguardar o início do jogo' };
  let text = `${c.minute}${c.added ? '+' + c.added : ''}′`;
  if (precise) {
    const elapsed = c.elapsedMs + (running ? age : 0);
    const raw = Math.floor(elapsed / 60000);
    const minute = (c.period - 1) * c.periodMinutes + Math.min(raw, c.periodMinutes);
    const added = Math.max(0, raw - c.periodMinutes);
    text = `${String(minute).padStart(2, '0')}${added ? '+' + added : ''}:${String(Math.floor(elapsed / 1000) % 60).padStart(2, '0')}`;
  }
  const phase = match.status === 'finished' ? 'Fim de jogo' : match.status === 'interval' ? 'Intervalo' : c.running ? 'A decorrer' : 'Jogo em pausa';
  return { text, running, stale, label: stale ? `${phase} · última leitura confirmada` : phase };
}
