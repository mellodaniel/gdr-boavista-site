import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { GdrbTeam } from '../../types/database';

export function TeamsPage() {
  const [teams, setTeams] = useState<GdrbTeam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTeams() {
      const { data, error } = await supabase
        .from('gdrb_teams')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Erro ao carregar equipas:', error);
      }

      setTeams(data ?? []);
      setLoading(false);
    }

    loadTeams();
  }, []);

  const groupedTeams = teams.reduce<Record<string, GdrbTeam[]>>((acc, team) => {
    if (!acc[team.football_type]) {
      acc[team.football_type] = [];
    }

    acc[team.football_type].push(team);
    return acc;
  }, {});

  const footballOrder = ['Futebol 5', 'Futebol 7', 'Futebol 9', 'Futebol 11'];

  return (
    <section className="mx-auto max-w-7xl px-4 py-16">
      <p className="text-sm font-bold uppercase tracking-[0.25em] text-red-600">
        Equipas
      </p>

      <h1 className="mt-3 text-4xl font-black">Escalões e equipas</h1>

      <p className="mt-4 max-w-3xl text-zinc-600">
        O GDR Boavista tem apenas a modalidade de futebol. A organização dos
        escalões é feita por Futebol 5, Futebol 7, Futebol 9 e Futebol 11.
      </p>

      {loading ? (
        <div className="mt-10 rounded-3xl border border-zinc-200 bg-white p-8 text-zinc-600">
          A carregar equipas...
        </div>
      ) : (
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {footballOrder.map((footballType) => (
            <article
              key={footballType}
              className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-2xl font-black text-red-600">
                {footballType}
              </h2>

              <ul className="mt-5 space-y-3">
                {(groupedTeams[footballType] ?? []).map((team) => (
                  <li
                    key={team.id}
                    className="rounded-xl bg-zinc-100 px-4 py-3"
                  >
                    <p className="text-sm font-bold">{team.name}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {team.category}
                    </p>
                  </li>
                ))}
              </ul>

              {(groupedTeams[footballType] ?? []).length === 0 && (
                <p className="mt-5 text-sm text-zinc-500">
                  Sem equipas registadas.
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}