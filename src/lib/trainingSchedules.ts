// Shared with the existing training timetable. Season is explicit; do not roll forward without updating schedules.
export const TRAINING_SEASON = "2026/27";
export const googleMapsUrl =
  'https://www.google.com/maps/place/Campo+do+Grupo+Desportivo+e+Recreativo+da+Boavista/@39.780229,-8.7487878,17z/data=!3m1!4b1!4m6!3m5!1s0xd2271873a862cd7:0x575890ac1492b6a2!8m2!3d39.780229!4d-8.7462129!16s%2Fg%2F11bytx3sxs?entry=ttu&g_ep=EgoyMDI2MDYxMC4wIKXMDSoASAFQAw%3D%3D';

type TrainingSession = {
  days: string[];
  time: string;
};

export type TrainingSchedule = {
  name: string;
  sessions: TrainingSession[];
};

export const formationSchedules: TrainingSchedule[] = [
  {
    name: 'ABCs',
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

export const footballElevenSchedules: TrainingSchedule[] = [
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
