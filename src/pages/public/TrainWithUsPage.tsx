import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CalendarDays, Clock, MapPin, Phone } from 'lucide-react';
import { findTrainingGroup } from '../../lib/trainingEligibility';
import { googleMapsUrl, TRAINING_SEASON } from '../../lib/trainingSchedules';

export function TrainWithUsPage() {
  const [year, setYear] = useState('');
  const [result, setResult] = useState<ReturnType<typeof findTrainingGroup>>(null);
  const [error, setError] = useState('');
  const resultRef = useRef<HTMLDivElement>(null);
  const [seasonExpired] = useState(() => Date.now() >= Date.parse('2027-07-01T00:00:00+01:00'));

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = findTrainingGroup(year.trim());
    setResult(found);
    setError(found ? '' : `Indique um ano de nascimento válido, entre ${new Date().getFullYear() - 100} e ${new Date().getFullYear()}.`);
    if (found) requestAnimationFrame(() => resultRef.current?.focus());
  }

  return (
    <div className="gdrb-public-page bg-[#f6f2ec] text-zinc-950">
      <section className="relative overflow-hidden bg-[#24180f] py-14 text-white md:py-20">
        <img src="/hero-boavista-premium.webp" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#24180f] via-[#24180f]/90 to-red-950/60" />
        <div className="relative mx-auto max-w-7xl px-5 md:px-4">
          <Link to="/" className="inline-flex min-h-11 items-center gap-2 text-sm text-zinc-300 hover:text-white"><ArrowLeft size={16} /> Página inicial</Link>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.25em] text-red-300">Época {TRAINING_SEASON} · GDR Boavista</p>
          <h1 className="mt-5 max-w-3xl font-serif text-4xl font-light leading-tight md:text-6xl">Venha treinar connosco</h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-zinc-300">Há um primeiro treino em cada história. Descubra o escalão do atleta e os horários para dar o próximo passo com o Boavista.</p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-10 md:px-4 md:py-16 lg:grid-cols-[1.3fr_0.7fr]">
        <div>
          <form onSubmit={submit} noValidate className="rounded-2xl border border-[#e7d9ce] bg-white p-6 md:p-8">
            <h2 className="font-serif text-3xl text-[#24180f]">Encontre o escalão e os treinos</h2>
            <p id="birth-year-help" className="mt-3 text-sm leading-6 text-zinc-600">Basta o ano de nascimento. A consulta é imediata e não guarda dados pessoais.</p>
            <label htmlFor="athlete-birth-year" className="mt-6 block text-sm font-bold">Ano de nascimento do atleta</label>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
              <input id="athlete-birth-year" type="text" inputMode="numeric" autoComplete="off" maxLength={4} placeholder="Ex.: 2014" value={year} onChange={e => { setYear(e.target.value); setResult(null); setError(''); }} aria-describedby={error ? 'birth-year-help birth-year-error' : 'birth-year-help'} aria-invalid={Boolean(error)} className="min-h-12 min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-4 text-lg outline-offset-2 focus:outline-red-700" />
              <button type="submit" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-red-700 px-5 py-3 text-sm font-bold text-white hover:bg-red-800 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-red-700">Ver escalão e horários <ArrowRight size={17} /></button>
            </div>
            {error && <p id="birth-year-error" role="alert" className="mt-3 text-sm font-semibold text-red-700">{error}</p>}
          </form>

          <div aria-live="polite" aria-atomic="true">
            {result && <div ref={resultRef} tabIndex={-1} className="mt-6 scroll-mt-28 rounded-2xl border border-[#e7d9ce] bg-white p-6 outline-none focus-visible:ring-2 focus-visible:ring-red-700 md:p-8">
              <p className="text-xs font-bold uppercase tracking-widest text-red-700">Nascimento em {result.year} · Época {TRAINING_SEASON}</p>
              <h2 className="mt-3 font-serif text-3xl text-[#24180f]">{result.label}</h2>
              {seasonExpired && <p role="status" className="mt-4 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">Esta consulta refere-se à época 2026/27, já terminada. Contacte o clube para conhecer o escalão e os horários da nova época.</p>}
              <p className="mt-4 text-sm leading-6 text-zinc-600">{result.note}</p>
              {result.needsTeamConfirmation && <p className="mt-4 rounded-lg bg-[#f6f2ec] p-4 text-sm leading-6 text-[#493427]">O ano de nascimento identifica o escalão. A equipa A ou B é definida pela coordenação; consulte abaixo os horários de ambas e confirme a equipa antes de se deslocar.</p>}
              <div className="mt-6 grid gap-4">
                {result.schedules.map(schedule => <article key={schedule.name} className="rounded-xl border border-zinc-200 p-5">
                  <h3 className="text-lg font-bold text-[#24180f]">{schedule.name}</h3>
                  {schedule.sessions.map((session, index) => <div key={index} className="mt-3 space-y-2 text-sm">
                    <p className="flex items-start gap-2"><CalendarDays size={17} className="mt-0.5 shrink-0 text-red-700" aria-hidden="true" />{session.days.join(' · ')}</p>
                    <p className="flex items-center gap-2 font-semibold"><Clock size={17} className="shrink-0 text-red-700" aria-hidden="true" />{session.time}</p>
                  </div>)}
                </article>)}
              </div>
              <Link to="/contactos" className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-red-700 px-5 py-3 text-sm font-bold text-white hover:bg-red-800">Falar com o clube sobre o primeiro treino <ArrowRight size={17} /></Link>
            </div>}
          </div>
        </div>

        <aside className="self-start rounded-2xl bg-[#24180f] p-6 text-white md:p-8">
          <h2 className="font-serif text-3xl">O próximo passo</h2>
          <ol className="mt-6 space-y-5 text-sm leading-6 text-zinc-300"><li><strong className="block text-white">1. Consulte o escalão</strong>Indique o ano de nascimento para ver os horários publicados.</li><li><strong className="block text-white">2. Fale connosco</strong>Combine a visita e confirme a equipa, as vagas e o que levar.</li><li><strong className="block text-white">3. Conheça o Boavista</strong>Venha ao campo conhecer a equipa e os treinadores.</li></ol>
          <div className="mt-7 space-y-3 border-t border-white/15 pt-6 text-sm">
            <a href={googleMapsUrl} target="_blank" rel="noreferrer" className="flex min-h-11 items-center gap-3 underline underline-offset-4"><MapPin size={18} className="shrink-0 text-red-400" /> Campo do GDR Boavista · Ver mapa</a>
            <a href="tel:+351913030249" className="flex min-h-11 items-center gap-3"><Phone size={18} className="text-red-400" />913 030 249</a>
            <Link to="/horarios-de-treino" className="flex min-h-11 items-center gap-3 underline underline-offset-4"><CalendarDays size={18} className="text-red-400" /> Ver todos os horários</Link>
          </div>
        </aside>
      </section>
    </div>
  );
}
