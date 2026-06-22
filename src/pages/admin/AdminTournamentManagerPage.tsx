import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { TournamentManagerTournament } from '../../types/tournamentManager';

const statusLabels: Record<string, string> = {
  draft: 'Rascunho',
  setup: 'Em configuração',
  calendar_generated: 'Calendário gerado',
  published: 'Publicado',
  in_progress: 'Em andamento',
  finished: 'Finalizado',
  archived: 'Arquivado',
};

export default function AdminTournamentManagerPage() {
  const [tournaments, setTournaments] = useState<TournamentManagerTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  async function loadTournaments() {
    setLoading(true);
    setErrorMessage('');

    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setErrorMessage('Não foi possível carregar os torneios. Confirma as permissões RLS da tabela tournaments.');
      setLoading(false);
      return;
    }

    setTournaments(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadTournaments();
  }, []);

  const stats = useMemo(() => {
    return {
      total: tournaments.length,
      draft: tournaments.filter((item) => item.status === 'draft').length,
      published: tournaments.filter((item) => item.status === 'published').length,
      archived: tournaments.filter((item) => item.status === 'archived').length,
    };
  }, [tournaments]);

  async function archiveTournament(id: string) {
    const confirmArchive = window.confirm('Tens a certeza que queres arquivar este torneio?');

    if (!confirmArchive) return;

    const { error } = await supabase
      .from('tournaments')
      .update({
        status: 'archived',
        is_public: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      alert('Não foi possível arquivar o torneio.');
      return;
    }

    await loadTournaments();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
            Administração
          </p>
          <h1 className="text-3xl font-bold text-slate-900">
            Gestor de Torneios Boavista
          </h1>
          <p className="mt-2 max-w-3xl text-slate-600">
            Cria, configura e publica torneios organizados pelo GDR Boavista com equipas,
            grupos, jogos, resultados, classificação e página pública.
          </p>
        </div>

        <Link
          to="/admin/gestor-torneios/novo"
          className="inline-flex items-center justify-center rounded-xl bg-green-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-800"
        >
          Criar torneio
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total de torneios" value={stats.total} />
        <StatCard label="Rascunhos" value={stats.draft} />
        <StatCard label="Publicados" value={stats.published} />
        <StatCard label="Arquivados" value={stats.archived} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">Torneios criados pelo Boavista</h2>
          <p className="mt-1 text-sm text-slate-500">
            Esta área é diferente da secção de torneios em que o Boavista participa.
          </p>
        </div>

        {loading && <div className="p-6 text-slate-600">A carregar torneios...</div>}

        {!loading && errorMessage && <div className="p-6 text-red-600">{errorMessage}</div>}

        {!loading && !errorMessage && tournaments.length === 0 && (
          <div className="p-6 text-slate-600">Ainda não existem torneios criados.</div>
        )}

        {!loading && !errorMessage && tournaments.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-4">Nome</th>
                  <th className="px-6 py-4">Escalão</th>
                  <th className="px-6 py-4">Tipo</th>
                  <th className="px-6 py-4">Local</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">Público</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {tournaments.map((tournament) => (
                  <tr key={tournament.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{tournament.name}</div>
                      <div className="text-xs text-slate-500">{tournament.slug}</div>
                    </td>

                    <td className="px-6 py-4 text-slate-700">{tournament.age_group || '-'}</td>
                    <td className="px-6 py-4 text-slate-700">{tournament.football_type || '-'}</td>
                    <td className="px-6 py-4 text-slate-700">{tournament.location || '-'}</td>

                    <td className="px-6 py-4">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {statusLabels[tournament.status] || tournament.status}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-slate-700">
                      {tournament.is_public ? 'Sim' : 'Não'}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <Link
                          to={`/admin/gestor-torneios/${tournament.id}`}
                          className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          Editar
                        </Link>

                        <Link
                          to={`/torneios/${tournament.slug}`}
                          target="_blank"
                          className="rounded-lg border border-green-700 px-3 py-2 text-xs font-semibold text-green-700 hover:bg-green-50"
                        >
                          Ver página
                        </Link>

                        {tournament.status !== 'archived' && (
                          <button
                            type="button"
                            onClick={() => archiveTournament(tournament.id)}
                            className="rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                          >
                            Arquivar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
