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

const statusFilterOptions = [
  { value: 'active', label: 'Ativos / visíveis na gestão' },
  { value: 'published', label: 'Publicados' },
  { value: 'draft', label: 'Rascunhos' },
  { value: 'setup', label: 'Em configuração' },
  { value: 'calendar_generated', label: 'Calendário gerado' },
  { value: 'in_progress', label: 'Em andamento' },
  { value: 'finished', label: 'Finalizados' },
  { value: 'archived', label: 'Arquivados' },
  { value: 'all', label: 'Todos os torneios' },
];

export default function AdminTournamentManagerPage() {
  const [tournaments, setTournaments] = useState<TournamentManagerTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [searchTerm, setSearchTerm] = useState('');

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
      active: tournaments.filter((item) => item.status !== 'archived').length,
      draft: tournaments.filter((item) => item.status === 'draft').length,
      published: tournaments.filter((item) => item.status === 'published').length,
      archived: tournaments.filter((item) => item.status === 'archived').length,
    };
  }, [tournaments]);

  const filteredTournaments = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return tournaments.filter((tournament) => {
      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'active'
            ? tournament.status !== 'archived'
            : tournament.status === statusFilter;

      if (!matchesStatus) return false;

      if (!normalizedSearch) return true;

      const searchableText = [
        tournament.name,
        tournament.slug,
        tournament.age_group,
        tournament.football_type,
        tournament.location,
        tournament.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableText.includes(normalizedSearch);
    });
  }, [searchTerm, statusFilter, tournaments]);

  async function archiveTournament(tournament: TournamentManagerTournament) {
    const confirmArchive = window.confirm(
      `Arquivar o torneio “${tournament.name}”?\n\nO torneio deixa de ficar ativo na gestão e deixa de estar público, mas continua guardado para consulta.`
    );

    if (!confirmArchive) return;

    setActionLoadingId(tournament.id);

    const { error } = await supabase
      .from('tournaments')
      .update({
        status: 'archived',
        is_public: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tournament.id);

    setActionLoadingId(null);

    if (error) {
      alert('Não foi possível arquivar o torneio.');
      return;
    }

    await loadTournaments();
  }

  async function restoreTournament(tournament: TournamentManagerTournament) {
    const confirmRestore = window.confirm(
      `Reativar o torneio “${tournament.name}”?\n\nEle volta a aparecer na lista de torneios ativos, mas continua privado até ser publicado.`
    );

    if (!confirmRestore) return;

    setActionLoadingId(tournament.id);

    const { error } = await supabase
      .from('tournaments')
      .update({
        status: 'draft',
        is_public: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tournament.id);

    setActionLoadingId(null);

    if (error) {
      alert('Não foi possível reativar o torneio.');
      return;
    }

    await loadTournaments();
  }

  async function deleteTournament(tournament: TournamentManagerTournament) {
    const firstConfirmation = window.confirm(
      `Apagar definitivamente o torneio “${tournament.name}”?\n\nIsto vai remover o torneio da base de dados e também os dados associados, como dias, campos, equipas, grupos, jogos, regras e parceiros do torneio.\n\nEsta ação não é igual a arquivar e não deve ser usada para torneios que queiras manter para histórico.`
    );

    if (!firstConfirmation) return;

    const typedConfirmation = window.prompt(
      `Para confirmar a eliminação definitiva, escreve exatamente:\n\nAPAGAR`
    );

    if (typedConfirmation !== 'APAGAR') return;

    setActionLoadingId(tournament.id);

    const { error } = await supabase
      .from('tournaments')
      .delete()
      .eq('id', tournament.id);

    setActionLoadingId(null);

    if (error) {
      alert('Não foi possível apagar o torneio. Confirma as permissões RLS para delete na tabela tournaments.');
      return;
    }

    await loadTournaments();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-red-700">
            Administração
          </p>
          <h1 className="text-3xl font-bold text-slate-900">
            Gestor de Torneios Boavista
          </h1>
          <p className="mt-2 max-w-3xl text-slate-600">
            Consulta os torneios ativos, cria novos torneios no assistente self-service,
            arquiva torneios para histórico ou apaga definitivamente quando for necessário limpar dados.
          </p>
        </div>

        <Link
          to="/admin/gestor-torneios/novo"
          className="inline-flex items-center justify-center rounded-xl bg-red-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-800"
        >
          Criar novo torneio
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <StatCard label="Total de torneios" value={stats.total} />
        <StatCard label="Ativos" value={stats.active} />
        <StatCard label="Rascunhos" value={stats.draft} />
        <StatCard label="Publicados" value={stats.published} />
        <StatCard label="Arquivados" value={stats.archived} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Torneios criados pelo Boavista</h2>
              <p className="mt-1 text-sm text-slate-500">
                Por defeito, esta lista mostra apenas torneios ativos. Usa os filtros para consultar arquivados ou todos os estados.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[520px]">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Pesquisar
                </label>
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Nome, slug, escalão, local..."
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-red-700 focus:ring-2 focus:ring-red-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Estado
                </label>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-red-700 focus:ring-2 focus:ring-red-100"
                >
                  {statusFilterOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {loading && <div className="p-6 text-slate-600">A carregar torneios...</div>}

        {!loading && errorMessage && <div className="p-6 text-red-600">{errorMessage}</div>}

        {!loading && !errorMessage && tournaments.length === 0 && (
          <div className="p-6 text-slate-600">Ainda não existem torneios criados.</div>
        )}

        {!loading && !errorMessage && tournaments.length > 0 && filteredTournaments.length === 0 && (
          <div className="p-6 text-slate-600">
            Não existem torneios para os filtros selecionados.
          </div>
        )}

        {!loading && !errorMessage && filteredTournaments.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-left text-sm">
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
                {filteredTournaments.map((tournament) => (
                  <tr key={tournament.id} className={tournament.status === 'archived' ? 'bg-slate-50/80' : 'hover:bg-slate-50'}>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{tournament.name}</div>
                      <div className="text-xs text-slate-500">{tournament.slug}</div>
                    </td>

                    <td className="px-6 py-4 text-slate-700">{tournament.age_group || '-'}</td>
                    <td className="px-6 py-4 text-slate-700">{tournament.football_type || '-'}</td>
                    <td className="px-6 py-4 text-slate-700">{tournament.location || '-'}</td>

                    <td className="px-6 py-4">
                      <span className={getStatusBadgeClass(tournament.status)}>
                        {statusLabels[tournament.status] || tournament.status}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-slate-700">
                      {tournament.is_public ? 'Sim' : 'Não'}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Link
                          to={`/admin/gestor-torneios/${tournament.id}`}
                          className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          Editar
                        </Link>

                        <Link
                          to={`/torneios/${tournament.slug}`}
                          target="_blank"
                          className="rounded-lg border border-red-700 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                        >
                          Ver página
                        </Link>

                        {tournament.status === 'archived' ? (
                          <button
                            type="button"
                            disabled={actionLoadingId === tournament.id}
                            onClick={() => restoreTournament(tournament)}
                            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Reativar
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={actionLoadingId === tournament.id}
                            onClick={() => archiveTournament(tournament)}
                            className="rounded-lg border border-amber-300 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Arquivar
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={actionLoadingId === tournament.id}
                          onClick={() => deleteTournament(tournament)}
                          className="rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Apagar
                        </button>
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

function getStatusBadgeClass(status: string) {
  if (status === 'published') {
    return 'rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700';
  }

  if (status === 'archived') {
    return 'rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600';
  }

  if (status === 'in_progress') {
    return 'rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700';
  }

  return 'rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700';
}
