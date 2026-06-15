import { useEffect, useMemo, useState } from 'react';
import { Trophy, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { GdrbTeam } from '../../types/database';

const fallbackTeams = [
  {
    id: 'petizes-abc',
    name: 'Petizes / ABC',
    category: 'Escola de Futebol',
    football_type: 'Futebol 5',
    description: 'Os primeiros passos no futebol, com diversão e aprendizagem.',
    image_url: null,
    is_active: true,
    sort_order: 1,
    created_at: '',
  },
  {
    id: 'traquinas',
    name: 'Traquinas',
    category: 'Escola de Futebol',
    football_type: 'Futebol 5',
    description: 'Formação inicial com foco na técnica, amizade e jogo.',
    image_url: null,
    is_active: true,
    sort_order: 2,
    created_at: '',
  },
  {
    id: 'benjamins',
    name: 'Benjamins',
    category: 'Formação',
    football_type: 'Futebol 7',
    description: 'Crescimento técnico e competitivo no futebol de formação.',
    image_url: null,
    is_active: true,
    sort_order: 3,
    created_at: '',
  },
  {
    id: 'infantis',
    name: 'Infantis',
    category: 'Formação',
    football_type: 'Futebol 9',
    description: 'Transição e evolução para contextos competitivos maiores.',
    image_url: null,
    is_active: true,
    sort_order: 4,
    created_at: '',
  },
  {
    id: 'iniciados',
    name: 'Iniciados',
    category: 'Formação',
    football_type: 'Futebol 11',
    description: 'Entrada no futebol de 11, com exigência e organização.',
    image_url: null,
    is_active: true,
    sort_order: 5,
    created_at: '',
  },
  {
    id: 'juvenis',
    name: 'Juvenis',
    category: 'Formação',
    football_type: 'Futebol 11',
    description: 'Competição, evolução e consolidação do percurso formativo.',
    image_url: null,
    is_active: true,
    sort_order: 6,
    created_at: '',
  },
  {
    id: 'juniores',
    name: 'Juniores',
    category: 'Formação',
    football_type: 'Futebol 11',
    description: 'Preparação para níveis competitivos superiores.',
    image_url: null,
    is_active: true,
    sort_order: 7,
    created_at: '',
  },
  {
    id: 'seniores',
    name: 'Seniores',
    category: 'Seniores',
    football_type: 'Futebol 11',
    description: 'A equipa principal do GDR Boavista.',
    image_url: null,
    is_active: true,
    sort_order: 8,
    created_at: '',
  },
  {
    id: 'veteranos',
    name: 'Veteranos',
    category: 'Veteranos',
    football_type: 'Futebol 11',
    description: 'Experiência, amizade e ligação permanente ao futebol.',
    image_url: null,
    is_active: true,
    sort_order: 9,
    created_at: '',
  },
];

const filters = ['Todos', 'Futebol 5', 'Futebol 7', 'Futebol 9', 'Futebol 11'];

export function TeamsPage() {
  const [teams, setTeams] = useState<GdrbTeam[]>([]);
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [isLoading, setIsLoading] = useState(true);

  const visibleTeams = useMemo(() => {
    const source = teams.length > 0 ? teams : fallbackTeams;

    if (activeFilter === 'Todos') {
      return source;
    }

    return source.filter((team) => team.football_type === activeFilter);
  }, [teams, activeFilter]);

  useEffect(() => {
    async function loadTeams() {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('gdrb_teams')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        console.error('Erro ao carregar equipas:', error);
      }

      setTeams(data ?? []);
      setIsLoading(false);
    }

    loadTeams();
  }, []);

  return (
    <div className="bg-[#f6f2ec] text-zinc-950">
      <section className="relative overflow-hidden bg-[#24180f] py-24 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_right,rgba(220,38,38,0.28),transparent_34%)]" />

        <div className="relative mx-auto max-w-7xl px-4">
          <div className="max-w-4xl">
            <p className="text-sm font-bold uppercase tracking-[0.45em] text-red-400">
              Equipas
            </p>

            <h1 className="mt-8 font-serif text-6xl font-light leading-[0.95] tracking-tight md:text-8xl">
              Formação,
              <br />
              competição e futuro.
            </h1>

            <p className="mt-8 max-w-2xl text-lg leading-8 text-zinc-300">
              Do futebol 5 ao futebol 11, o GDR Boavista acompanha diferentes
              escalões com foco na aprendizagem, evolução e espírito de equipa.
            </p>
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.45em] text-red-700">
                Escalões
              </p>

              <h2 className="mt-5 font-serif text-5xl font-light text-[#24180f] md:text-6xl">
                As nossas equipas
              </h2>
            </div>

            <div className="flex flex-wrap gap-2">
              {filters.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                    activeFilter === filter
                      ? 'bg-[#24180f] text-white'
                      : 'border border-zinc-200 bg-white text-zinc-600 hover:border-red-700 hover:text-red-700'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="mt-10 rounded-sm border border-zinc-200 bg-white p-8 text-zinc-600">
              A carregar equipas...
            </div>
          ) : (
            <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {visibleTeams.map((team) => (
                <article
                  key={team.id}
                  className="group overflow-hidden rounded-sm border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="h-1.5 bg-red-700" />

                  {team.image_url ? (
                    <div className="h-56 overflow-hidden">
                      <img
                        src={team.image_url}
                        alt={team.name}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    </div>
                  ) : (
                    <div className="flex h-56 items-center justify-center bg-[#24180f]">
                      <Trophy size={54} className="text-red-500" />
                    </div>
                  )}

                  <div className="p-7">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-red-700">
                        {team.football_type}
                      </span>

                      <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-600">
                        {team.category}
                      </span>
                    </div>

                    <h3 className="mt-6 font-serif text-4xl font-light text-[#24180f]">
                      {team.name}
                    </h3>

                    {team.description && (
                      <p className="mt-4 text-sm leading-7 text-zinc-600">
                        {team.description}
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-6 md:grid-cols-3">
            <article className="border border-zinc-200 bg-[#f6f2ec] p-8">
              <Users className="text-red-700" size={30} />
              <h3 className="mt-6 font-serif text-3xl font-light text-[#24180f]">
                Escola de Futebol
              </h3>
              <p className="mt-4 text-sm leading-7 text-zinc-600">
                A base da formação, onde a aprendizagem começa com alegria,
                técnica e amizade.
              </p>
            </article>

            <article className="border border-zinc-200 bg-[#f6f2ec] p-8">
              <Trophy className="text-red-700" size={30} />
              <h3 className="mt-6 font-serif text-3xl font-light text-[#24180f]">
                Formação
              </h3>
              <p className="mt-4 text-sm leading-7 text-zinc-600">
                Escalões que evoluem com disciplina, compromisso e espírito de
                equipa.
              </p>
            </article>

            <article className="border border-zinc-200 bg-[#f6f2ec] p-8">
              <Trophy className="text-red-700" size={30} />
              <h3 className="mt-6 font-serif text-3xl font-light text-[#24180f]">
                Competição
              </h3>
              <p className="mt-4 text-sm leading-7 text-zinc-600">
                Representar o Boavista com orgulho, ambição e responsabilidade.
              </p>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}