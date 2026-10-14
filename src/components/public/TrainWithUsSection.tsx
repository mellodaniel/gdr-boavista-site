import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays } from 'lucide-react';
import { TRAINING_SEASON } from '../../lib/trainingSchedules';

export function TrainWithUsSection() {
  return (
    <section id="venha-treinar-connosco" aria-labelledby="train-with-us-title" className="relative mt-8 overflow-hidden rounded-2xl border border-[#dfd0c4] bg-[linear-gradient(135deg,#ffffff_0%,#fbf7f2_58%,#f5e8e1_100%)] shadow-[0_24px_70px_-46px_rgba(59,37,24,0.58)] md:mt-10 md:rounded-[1.6rem]">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-800 via-red-600 to-[#24180f]" />
      <div className="grid gap-6 p-6 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center md:gap-7 md:p-8">
        <span className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-[#24180f] text-white" aria-hidden="true"><CalendarDays size={27} /><span className="mt-1 text-[9px] font-bold tracking-widest">26/27</span></span>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-700">Futebol e formação · Época {TRAINING_SEASON}</p>
          <h2 id="train-with-us-title" className="mt-3 font-serif text-3xl font-light leading-tight text-[#24180f] md:text-4xl">Venha treinar connosco</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-600">Dê o primeiro passo no Boavista. Consulte o escalão e os horários pelo ano de nascimento do atleta.</p>
        </div>
        <div className="flex flex-col gap-2 md:max-w-64">
          <Link to="/venha-treinar-connosco" className="inline-flex min-h-12 items-center justify-center gap-3 rounded-md bg-red-700 px-5 py-4 text-center text-sm font-bold text-white transition hover:bg-red-800 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-red-700">Encontrar escalão e horários <ArrowRight size={18} className="shrink-0" aria-hidden="true" /></Link>
          <Link to="/horarios-de-treino" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-semibold text-[#493427] underline decoration-[#bca99b] underline-offset-4 transition hover:bg-white hover:text-red-700 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-red-700">Ver todos os horários <CalendarDays size={16} aria-hidden="true" /></Link>
        </div>
      </div>
    </section>
  );
}
