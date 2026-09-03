import { useEffect } from 'react';
import {
  CalendarDays,
  ChevronRight,
  Clock,
  MapPin,
  ShieldCheck,
  Users,
} from 'lucide-react';

const googleMapsUrl =
  'https://www.google.com/maps/place/Campo+do+Grupo+Desportivo+e+Recreativo+da+Boavista/@39.780229,-8.7487878,17z/data=!3m1!4b1!4m6!3m5!1s0xd2271873a862cd7:0x575890ac1492b6a2!8m2!3d39.780229!4d-8.7462129!16s%2Fg%2F11bytx3sxs?entry=ttu&g_ep=EgoyMDI2MDYxMC4wIKXMDSoASAFQAw%3D%3D';

type TrainingSession = {
  days: string[];
  time: string;
};

type TrainingSchedule = {
  name: string;
  sessions: TrainingSession[];
};

const formationSchedules: TrainingSchedule[] = [
  {
    name: 'ABC',
    sessions: [
      { days: ['Quarta-feira'], time: '18h45 — 19h30' },
      { days: ['Sábado'], time: '09h00 — 09h45' },
    ],
  },
  {
    name: 'Petizes',
    sessions: [{ days: ['Terça-feira', 'Sexta-feira'], time: '18h45 — 19h45' }],
  },
  {
    name: 'Traquinas B',
    sessions: [{ days: ['Segunda-feira', 'Quarta-feira'], time: '18h45 — 19h45' }],
  },
  {
    name: 'Traquinas A',
    sessions: [{ days: ['Segunda-feira', 'Quarta-feira'], time: '18h45 — 19h45' }],
  },
  {
    name: 'Benjamins B',
    sessions: [{ days: ['Terça-feira', 'Sexta-feira'], time: '19h00 — 20h00' }],
  },
  {
    name: 'Benjamins A',
    sessions: [{ days: ['Terça-feira', 'Quinta-feira'], time: '18h45 — 19h45' }],
  },
  {
    name: 'Sub-12',
    sessions: [
      {
        days: ['Segunda-feira', 'Quarta-feira', 'Quinta-feira'],
        time: '18h45 — 19h45',
      },
    ],
  },
  {
    name: 'Sub-13',
    sessions: [
      {
        days: ['Segunda-feira', 'Quarta-feira', 'Quinta-feira'],
        time: '18h45 — 19h45',
      },
    ],
  },
];

const footballElevenSchedules: TrainingSchedule[] = [
  {
    name: 'Iniciados',
    sessions: [
      {
        days: ['Terça-feira', 'Quarta-feira', 'Sexta-feira'],
        time: '19h30 — 21h00',
      },
    ],
  },
  {
    name: 'Juvenis B',
    sessions: [
      {
        days: ['Segunda-feira', 'Quarta-feira', 'Sexta-feira'],
        time: '19h30 — 21h00',
      },
    ],
  },
  {
    name: 'Juvenis A',
    sessions: [
      {
        days: ['Segunda-feira', 'Quarta-feira', 'Quinta-feira'],
        time: '19h30 — 21h00',
      },
    ],
  },
  {
    name: 'Juniores',
    sessions: [
      {
        days: ['Segunda-feira', 'Terça-feira', 'Quinta-feira'],
        time: '19h30 — 21h00',
      },
    ],
  },
  {
    name: 'GR Futebol 11 (Guarda-Redes)',
    sessions: [{ days: ['Terça-feira', 'Sexta-feira'], time: '19h30 — 20h30' }],
  },
  {
    name: 'Seniores',
    sessions: [
      {
        days: ['Terça-feira', 'Quinta-feira', 'Sexta-feira'],
        time: '20h30 — 22h00',
      },
    ],
  },
];

export function TrainingSchedulePage() {
  useEffect(() => {
    const previousTitle = document.title;
    const descriptionMeta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const previousDescription = descriptionMeta?.content;

    document.title = 'Horários de Treino 2026/27 · GDR Boavista';

    if (descriptionMeta) {
      descriptionMeta.content =
        'Consulta os dias e horários de treino de todos os escalões do GDR Boavista na época 2026/27.';
    }

    return () => {
      document.title = previousTitle;

      if (descriptionMeta && previousDescription !== undefined) {
        descriptionMeta.content = previousDescription;
      }
    };
  }, []);

  return (
    <div className="gdrb-public-page bg-[#f6f2ec] text-zinc-950">
      <section className="relative overflow-hidden bg-[#24180f] py-16 text-white md:py-24">
        <img
          src="/hero-boavista-premium.webp"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-center opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#24180f] via-[#24180f]/95 to-red-950/80" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_28%,rgba(220,38,38,0.34),transparent_30%)]" />
        <img
          src="/logo-gdr-boavista-watermark-white.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -right-14 bottom-[-4rem] h-56 w-56 object-contain opacity-[0.055] md:right-10 md:h-80 md:w-80"
        />

        <div className="relative mx-auto max-w-7xl px-5 md:px-4">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2 backdrop-blur-sm">
              <CalendarDays size={16} className="text-red-300" />
              <span className="text-[11px] font-black uppercase tracking-[0.28em] text-red-100">
                Época 2026/27
              </span>
            </div>

            <h1 className="mt-6 font-serif text-4xl font-light leading-[0.98] tracking-tight sm:text-5xl md:mt-8 md:text-8xl">
              Horários de
              <br />
              treino.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-300 md:mt-8 md:text-lg">
              Consulta os dias e horários de todos os escalões do GDR Boavista.
              Informação organizada para atletas, famílias e equipas técnicas.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-bold text-white">
                <Users size={15} className="text-red-300" />
                14 grupos de treino
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-bold text-white">
                <CalendarDays size={15} className="text-red-300" />
                Segunda-feira a sábado
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-bold text-white">
                <ShieldCheck size={15} className="text-red-300" />
                Consulta oficial
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="relative py-12 md:py-20">
        <div className="mx-auto max-w-7xl px-5 md:px-4">
          <div className="gdrb-soft-panel rounded-2xl border border-[#eadfd2] bg-white p-4 shadow-sm md:rounded-[1.35rem] md:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-700">
                  Consulta rápida
                </p>
                <p className="mt-1 text-sm font-semibold leading-6 text-zinc-600">
                  Escolhe a área para encontrares mais depressa o teu escalão.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:flex">
                <a
                  href="#formacao"
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#24180f] px-4 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:bg-red-700"
                >
                  Formação
                </a>
                <a
                  href="#futebol-11"
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-zinc-200 bg-white px-4 text-xs font-black uppercase tracking-[0.14em] text-[#24180f] transition hover:border-red-200 hover:text-red-700"
                >
                  Futebol 11
                </a>
              </div>
            </div>
          </div>

          <ScheduleGroup
            id="formacao"
            eyebrow="Primeiros passos e formação"
            title="Futebol de formação"
            schedules={formationSchedules}
          />

          <ScheduleGroup
            id="futebol-11"
            eyebrow="Competição e rendimento"
            title="Futebol 11"
            schedules={footballElevenSchedules}
          />
        </div>
      </section>

      <section className="bg-white py-12 md:py-20">
        <div className="mx-auto max-w-7xl px-5 md:px-4">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="gdrb-pitch-panel group relative grid min-h-[280px] overflow-hidden rounded-2xl bg-[#163d2d] text-white shadow-lg md:min-h-[320px] md:rounded-[1.35rem] lg:grid-cols-[1fr_auto] lg:items-center"
          >
            <div className="relative z-10 p-7 md:p-10 lg:p-12">
              <p className="text-xs font-black uppercase tracking-[0.35em] text-red-200">
                Localização do clube
              </p>
              <h2 className="mt-4 max-w-2xl font-serif text-4xl font-light leading-tight md:text-6xl">
                Campo do GDR Boavista, Leiria.
              </h2>
              <p className="mt-5 max-w-xl text-base leading-8 text-zinc-200">
                Consulta a localização do campo e planeia a tua deslocação.
              </p>
            </div>

            <div className="relative z-10 flex items-end p-7 pt-0 md:p-10 md:pt-0 lg:items-center lg:p-12">
              <span className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-6 py-4 text-sm font-black uppercase tracking-wide text-[#24180f] transition group-hover:bg-red-700 group-hover:text-white">
                <MapPin size={18} />
                Abrir no Google Maps
                <ChevronRight size={17} />
              </span>
            </div>
          </a>
        </div>
      </section>
    </div>
  );
}

type ScheduleGroupProps = {
  id: string;
  eyebrow: string;
  title: string;
  schedules: TrainingSchedule[];
};

function ScheduleGroup({ id, eyebrow, title, schedules }: ScheduleGroupProps) {
  return (
    <section id={id} className="scroll-mt-28 pt-14 md:pt-20">
      <div className="flex flex-col gap-4 border-b border-[#dfd3c7] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-red-700">
            {eyebrow}
          </p>
          <h2 className="mt-3 font-serif text-4xl font-light text-[#24180f] md:text-6xl">
            {title}
          </h2>
        </div>

        <span className="w-fit rounded-full border border-red-100 bg-red-50 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-red-700">
          {schedules.length} grupos
        </span>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2 md:mt-8 md:gap-5">
        {schedules.map((schedule) => (
          <TrainingCard key={schedule.name} schedule={schedule} />
        ))}
      </div>
    </section>
  );
}

function TrainingCard({ schedule }: { schedule: TrainingSchedule }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-[#e7ddd3] bg-white shadow-sm md:rounded-[1.35rem]">
      <div className="flex items-center justify-between gap-4 border-b border-[#eee6df] px-5 py-4 md:px-6 md:py-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-700">
            <ShieldCheck size={19} />
          </span>
          <h3 className="font-serif text-2xl font-light leading-tight text-[#24180f] md:text-3xl">
            {schedule.name}
          </h3>
        </div>

        <span className="hidden shrink-0 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400 sm:block">
          {schedule.sessions.length > 1 ? 'Horários distintos' : 'Horário semanal'}
        </span>
      </div>

      <div className="space-y-3 p-4 md:p-5">
        {schedule.sessions.map((session) => (
          <div
            key={`${schedule.name}-${session.days.join('-')}-${session.time}`}
            className="grid gap-3 rounded-2xl bg-[#f8f5f1] px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
          >
            <div className="flex flex-wrap gap-2">
              {session.days.map((day) => (
                <span
                  key={day}
                  className="rounded-full border border-[#e6dbd0] bg-white px-3 py-1.5 text-xs font-bold text-[#4e4036]"
                >
                  {day}
                </span>
              ))}
            </div>

            <div className="inline-flex items-center gap-2 text-sm font-black text-red-700 sm:justify-end">
              <Clock size={16} />
              <span>{session.time}</span>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
