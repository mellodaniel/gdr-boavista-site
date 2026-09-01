import { useEffect, useMemo, useState } from 'react';
import { Flag, Shield, Shirt, Sparkles, Trophy, Users } from 'lucide-react';

import { supabase } from '../../lib/supabase';
import type { GdrbRosterGroup, GdrbRosterPlayer } from '../../types/database';

const SENIOR_TEAM_KEY = 'senior';

const rosterGroups: GdrbRosterGroup[] = [
  'Guarda-redes',
  'Defesas',
  'Médios',
  'Avançados',
  'Equipa técnica',
];

function getPlayerInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function normalizeNationality(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, '')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ');
}

function getCountryFlagCode(nationality?: string | null) {
  if (!nationality) {
    return null;
  }

  const value = normalizeNationality(nationality);

  const countryMap: Record<string, string> = {
    portugal: 'pt',
    portugues: 'pt',
    portuguesa: 'pt',
    luso: 'pt',

    brasil: 'br',
    brasileiro: 'br',
    brasileira: 'br',

    angola: 'ao',
    angolano: 'ao',
    angolana: 'ao',

    'cabo verde': 'cv',
    caboverde: 'cv',
    'cabo verdiano': 'cv',
    caboverdiano: 'cv',
    'cabo verdiana': 'cv',
    caboverdiana: 'cv',

    'guine bissau': 'gw',
    guine: 'gw',
    guineense: 'gw',

    mocambique: 'mz',
    mocambicano: 'mz',
    mocambicana: 'mz',

    'sao tome': 'st',
    'sao tome e principe': 'st',
    santomense: 'st',

    franca: 'fr',
    frances: 'fr',
    francesa: 'fr',

    espanha: 'es',
    espanhol: 'es',
    espanhola: 'es',

    italia: 'it',
    italiano: 'it',
    italiana: 'it',

    alemanha: 'de',
    alemao: 'de',
    alema: 'de',

    inglaterra: 'gb-eng',
    ingles: 'gb-eng',
    inglesa: 'gb-eng',
    'reino unido': 'gb',

    argentina: 'ar',
    argentino: 'ar',
    argentina_nacionalidade: 'ar',

    uruguai: 'uy',
    uruguaio: 'uy',
    uruguaia: 'uy',

    colombia: 'co',
    colombiano: 'co',
    colombiana: 'co',

    venezuela: 've',
    venezuelano: 've',
    venezuelana: 've',
  };

  return countryMap[value] ?? null;
}

function formatPlayerNumber(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return '—';
  }

  return `#${value}`;
}

function getGroupShortLabel(group: GdrbRosterGroup) {
  if (group === 'Guarda-redes') return 'GR';
  if (group === 'Equipa técnica') return 'Staff';
  return group;
}

function RosterStatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: typeof Users;
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3">
        <Icon className="text-red-300" size={22} />
        <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300">
          GDRB
        </span>
      </div>
      <p className="mt-4 text-3xl font-black leading-none text-white">{value}</p>
      <p className="mt-2 text-xs font-bold uppercase tracking-[0.18em] text-zinc-300">
        {label}
      </p>
    </div>
  );
}

function PlayerCard({ player }: { player: GdrbRosterPlayer }) {
  const flagCode = getCountryFlagCode(player.nationality);

  return (
    <article className="group overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-red-200 hover:shadow-2xl hover:shadow-zinc-950/10">
      <div className="relative overflow-hidden bg-[#24180f]">
        {player.photo_url ? (
          <img
            src={player.photo_url}
            alt={player.name}
            className="h-[340px] w-full object-cover object-top transition duration-500 group-hover:scale-105 sm:h-[360px]"
          />
        ) : (
          <div className="flex h-[340px] w-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(220,38,38,0.45),transparent_42%),#24180f] text-6xl font-black text-white sm:h-[360px]">
            {getPlayerInitials(player.name)}
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

        <div className="absolute left-4 top-4 rounded-full bg-white px-5 md:px-4 py-2 text-sm font-black text-[#24180f] shadow-lg ring-1 ring-black/5">
          {formatPlayerNumber(player.shirt_number)}
        </div>

        <div className="absolute bottom-4 left-4 right-4">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-red-300">
            {player.position || player.roster_group}
          </p>
          <h3 className="mt-2 text-2xl font-black leading-tight text-white drop-shadow">
            {player.name}
          </h3>
        </div>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-2 gap-3 text-sm">
          {player.height && (
            <div className="rounded-2xl bg-zinc-50 p-3 ring-1 ring-zinc-100">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
                Altura
              </p>
              <p className="mt-1 font-bold text-zinc-900">{player.height}</p>
            </div>
          )}

          {player.birth_year && (
            <div className="rounded-2xl bg-zinc-50 p-3 ring-1 ring-zinc-100">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
                Ano
              </p>
              <p className="mt-1 font-bold text-zinc-900">{player.birth_year}</p>
            </div>
          )}

          {player.nationality && (
            <div className="col-span-2 rounded-2xl bg-zinc-50 p-3 ring-1 ring-zinc-100">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
                Origem
              </p>

              <div className="mt-2 flex items-center gap-2 font-bold text-zinc-900">
                {flagCode && (
                  <img
                    src={`https://flagcdn.com/w40/${flagCode}.png`}
                    srcSet={`https://flagcdn.com/w80/${flagCode}.png 2x`}
                    alt={`Bandeira de ${player.nationality}`}
                    className="h-4 w-6 rounded-[3px] border border-zinc-200 object-cover shadow-sm"
                    loading="lazy"
                  />
                )}
                <span>{player.nationality}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export function SeniorRosterPage() {
  const [players, setPlayers] = useState<GdrbRosterPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeGroup, setActiveGroup] = useState<GdrbRosterGroup | 'Todos'>('Todos');

  const groupedPlayers = useMemo(() => {
    return rosterGroups.map((group) => ({
      group,
      players: players.filter((player) => player.roster_group === group),
    }));
  }, [players]);

  const visibleGroups = useMemo(() => {
    if (activeGroup === 'Todos') {
      return groupedPlayers;
    }

    return groupedPlayers.filter(({ group }) => group === activeGroup);
  }, [activeGroup, groupedPlayers]);

  const groupCounts = useMemo(() => {
    return rosterGroups.reduce<Record<GdrbRosterGroup, number>>((acc, group) => {
      acc[group] = players.filter((player) => player.roster_group === group).length;
      return acc;
    }, {
      'Guarda-redes': 0,
      Defesas: 0,
      Médios: 0,
      Avançados: 0,
      'Equipa técnica': 0,
    });
  }, [players]);

  useEffect(() => {
    document.title = 'Plantel Sénior 2026/2027 · GDR Boavista';

    const robotsMeta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const previousRobotsContent = robotsMeta?.content;

    if (robotsMeta) {
      robotsMeta.content = 'noindex,nofollow';
    } else {
      const meta = document.createElement('meta');
      meta.name = 'robots';
      meta.content = 'noindex,nofollow';
      document.head.appendChild(meta);
    }

    return () => {
      if (robotsMeta && previousRobotsContent !== undefined) {
        robotsMeta.content = previousRobotsContent;
      }
    };
  }, []);

  useEffect(() => {
    async function loadPlayers() {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('gdrb_roster_players')
        .select('*')
        .eq('team_key', SENIOR_TEAM_KEY)
        .eq('is_active', true)
        .order('roster_group', { ascending: true })
        .order('sort_order', { ascending: true })
        .order('shirt_number', { ascending: true, nullsFirst: false })
        .order('name', { ascending: true });

      if (error) {
        console.error('Erro ao carregar plantel sénior:', error);
      }

      setPlayers((data ?? []) as GdrbRosterPlayer[]);
      setIsLoading(false);
    }

    loadPlayers();
  }, []);

  return (
    <div className="overflow-hidden bg-[#f6f2ec] text-zinc-950">
      <section className="relative overflow-hidden bg-[#1f140d] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(220,38,38,0.35),transparent_30%),linear-gradient(135deg,rgba(36,24,15,0.95),rgba(0,0,0,0.86))]" />
        <div className="absolute -right-20 top-8 h-96 w-96 rounded-full border border-white/10" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full border border-red-500/20" />
        <img
          src="/logo-gdr-boavista-header-256.png"
          alt=""
          className="pointer-events-none absolute right-10 top-10 hidden h-[360px] w-[360px] rotate-[-8deg] opacity-[0.045] lg:block"
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-7xl px-5 md:px-4 py-16 md:py-24">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/10 px-5 md:px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-red-200 backdrop-blur">
                <Sparkles size={16} />
                Plantel privado
              </div>

              <h1 className="mt-7 max-w-4xl font-serif text-4xl font-light leading-[0.95] tracking-tight md:text-7xl lg:text-8xl">
                Equipa Sénior
                <span className="block text-red-300">GDR Boavista.</span>
              </h1>

              <p className="mt-7 max-w-2xl text-lg leading-8 text-zinc-300">
                Plantel oficial da equipa principal para a época 2026/2027.
                Uma apresentação moderna para valorizar quem representa a
                camisola do GDR Boavista dentro e fora de campo.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3 text-sm font-bold text-zinc-300">
                <span className="rounded-full bg-white px-5 md:px-4 py-2 text-[#24180f]">
                  Época 2026/2027
                </span>
                <span className="rounded-full border border-white/15 px-5 md:px-4 py-2">
                  Futebol sénior
                </span>
                <span className="rounded-full border border-white/15 px-5 md:px-4 py-2">
                  Página por link direto
                </span>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/10 p-5 shadow-lg md:shadow-2xl shadow-black/20 backdrop-blur md:p-6">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.28em] text-red-200">
                    Resumo
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-white">
                    Plantel configurado
                  </h2>
                </div>
                <img
                  src="/logo-gdr-boavista-header-256.png"
                  alt="GDR Boavista"
                  className="h-14 w-14 rounded-2xl bg-white p-2 shadow-md md:shadow-xl"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <RosterStatCard label="Elementos" value={players.length} icon={Users} />
                <RosterStatCard label="Setores" value={rosterGroups.length} icon={Shield} />
                <RosterStatCard label="Futebol" value="F11" icon={Shirt} />
              </div>

              <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-black/20 p-4 text-sm leading-6 text-zinc-300">
                <strong className="text-white">Compromisso, respeito e união.</strong>{' '}
                Um grupo preparado para competir, crescer e representar a
                Boavista com orgulho.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 md:px-4 py-6 md:flex-row md:items-center md:justify-between">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-red-700">
            Juntos, fortes e comprometidos.
          </p>

          <p className="max-w-2xl text-sm leading-6 text-zinc-600">
            Respeito, trabalho e união em cada treino, em cada jogo e em cada
            momento dentro e fora de campo.
          </p>
        </div>
      </section>

      <section className="py-14 md:py-20">
        <div className="mx-auto max-w-7xl px-5 md:px-4">
          {isLoading ? (
            <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 md:p-10 text-center text-sm font-bold text-zinc-500 shadow-sm">
              A carregar plantel...
            </div>
          ) : players.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-zinc-300 bg-white p-12 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-700">
                <Trophy size={28} />
              </div>
              <h2 className="mt-5 font-serif text-4xl font-light text-[#24180f]">
                Plantel em preparação.
              </h2>
              <p className="mt-3 text-zinc-500">
                Os jogadores serão adicionados pela administração do clube.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-10 rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-red-700">
                      Plantel oficial
                    </p>
                    <h2 className="mt-2 font-serif text-4xl font-light text-[#24180f] md:text-5xl">
                      Conhece a equipa Sénior
                    </h2>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveGroup('Todos')}
                      className={`rounded-full px-5 md:px-4 py-2 text-xs font-black uppercase tracking-[0.14em] transition ${
                        activeGroup === 'Todos'
                          ? 'bg-[#24180f] text-white shadow-lg shadow-zinc-950/10'
                          : 'border border-zinc-200 bg-white text-zinc-600 hover:border-red-200 hover:text-red-700'
                      }`}
                    >
                      Todos · {players.length}
                    </button>

                    {rosterGroups.map((group) => (
                      <button
                        key={group}
                        type="button"
                        onClick={() => setActiveGroup(group)}
                        className={`rounded-full px-5 md:px-4 py-2 text-xs font-black uppercase tracking-[0.14em] transition ${
                          activeGroup === group
                            ? 'bg-red-700 text-white shadow-lg shadow-red-700/20'
                            : 'border border-zinc-200 bg-white text-zinc-600 hover:border-red-200 hover:text-red-700'
                        }`}
                      >
                        {getGroupShortLabel(group)} · {groupCounts[group]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-16">
                {visibleGroups.map(({ group, players: groupPlayers }) => {
                  if (groupPlayers.length === 0) {
                    return null;
                  }

                  return (
                    <section key={group}>
                      <div className="mb-7 flex items-center gap-4">
                        <div>
                          <p className="text-sm font-black uppercase tracking-[0.35em] text-red-700">
                            Plantel
                          </p>
                          <h2 className="mt-2 font-serif text-5xl font-light text-[#24180f]">
                            {group}
                          </h2>
                        </div>

                        <div className="h-px flex-1 bg-zinc-200" />
                        <div className="hidden items-center gap-2 rounded-full bg-white px-5 md:px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-zinc-500 shadow-sm ring-1 ring-zinc-200 md:flex">
                          <Flag size={14} />
                          {groupPlayers.length} elemento(s)
                        </div>
                      </div>

                      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {groupPlayers.map((player) => (
                          <PlayerCard key={player.id} player={player} />
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>

              <div className="mt-16 overflow-hidden rounded-[2rem] border border-zinc-200 bg-[#24180f] text-white shadow-sm">
                <div className="grid gap-8 p-5 md:grid-cols-[1fr_auto] md:items-center md:p-10">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-red-300">
                      Orgulho Boavista
                    </p>
                    <h2 className="mt-3 font-serif text-4xl font-light">
                      Uma equipa. Uma camisola. Uma identidade.
                    </h2>
                    <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-300">
                      Cada atleta representa a história, a comunidade e o futuro
                      do GDR Boavista. Esta página valoriza o grupo e aproxima o
                      clube dos seus adeptos.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
