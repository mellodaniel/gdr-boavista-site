import { useEffect, useState } from 'react';
import { Mail, Phone, RefreshCw, UserRound } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { GdrbMemberRequest } from '../../types/database';

const memberStatuses = [
  { value: 'novo', label: 'Novo' },
  { value: 'em_contacto', label: 'Em contacto' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'convertido', label: 'Convertido' },
  { value: 'arquivado', label: 'Arquivado' },
];

export function AdminMembersPage() {
  const [requests, setRequests] = useState<GdrbMemberRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  async function loadRequests() {
    setLoading(true);
    setErrorMessage('');

    const { data, error } = await supabase
      .from('gdrb_member_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao carregar pedidos de sócio:', error);
      setErrorMessage('Não foi possível carregar os pedidos de sócio.');
    }

    setRequests(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadRequests();
  }, []);

  async function updateStatus(id: string, status: string) {
    setUpdatingId(id);
    setErrorMessage('');

    const { error } = await supabase
      .from('gdrb_member_requests')
      .update({ status })
      .eq('id', id);

    setUpdatingId(null);

    if (error) {
      console.error('Erro ao atualizar estado do pedido:', error);
      setErrorMessage('Não foi possível atualizar o estado do pedido.');
      return;
    }

    setRequests((currentRequests) =>
      currentRequests.map((request) =>
        request.id === id ? { ...request, status } : request,
      ),
    );
  }

  function getStatusStyle(status: string) {
    if (status === 'convertido') {
      return 'bg-green-100 text-green-800';
    }

    if (status === 'arquivado') {
      return 'bg-zinc-200 text-zinc-700';
    }

    if (status === 'pendente') {
      return 'bg-yellow-100 text-yellow-800';
    }

    if (status === 'em_contacto') {
      return 'bg-blue-100 text-blue-800';
    }

    return 'bg-red-100 text-red-700';
  }

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-red-600">
            Sócios
          </p>

          <h2 className="mt-2 text-3xl font-black text-zinc-950">
            Pedidos de sócio
          </h2>

          <p className="mt-3 max-w-3xl text-zinc-600">
            Lista de pessoas que preencheram o formulário para serem sócias ou
            atualizarem os seus dados.
          </p>
        </div>

        <button
          type="button"
          onClick={loadRequests}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-zinc-950 px-5 py-3 text-sm font-bold text-white hover:bg-red-600"
        >
          <RefreshCw size={16} />
          Atualizar
        </button>
      </div>

      {errorMessage && (
        <div className="mt-6 rounded-xl bg-red-100 px-4 py-3 text-sm font-semibold text-red-800">
          {errorMessage}
        </div>
      )}

      {loading ? (
        <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-8 text-zinc-600">
          A carregar pedidos de sócio...
        </div>
      ) : requests.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-8 text-zinc-600">
          Ainda não existem pedidos de sócio.
        </div>
      ) : (
        <div className="mt-8 overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="bg-zinc-950 text-white">
                <tr>
                  <th className="px-5 py-4 font-bold">Nome</th>
                  <th className="px-5 py-4 font-bold">Contacto</th>
                  <th className="px-5 py-4 font-bold">NIF</th>
                  <th className="px-5 py-4 font-bold">Observações</th>
                  <th className="px-5 py-4 font-bold">Estado</th>
                  <th className="px-5 py-4 font-bold">Alterar estado</th>
                  <th className="px-5 py-4 font-bold">Data</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-200">
                {requests.map((request) => (
                  <tr key={request.id} className="hover:bg-zinc-50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-red-100 p-2 text-red-600">
                          <UserRound size={18} />
                        </div>

                        <div>
                          <p className="font-bold text-zinc-950">
                            {request.full_name}
                          </p>
                          <p className="text-xs text-zinc-500">
                            ID: {request.id.slice(0, 8)}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="space-y-1 text-zinc-600">
                        {request.email && (
                          <p className="flex items-center gap-2">
                            <Mail size={14} />
                            {request.email}
                          </p>
                        )}

                        {request.phone && (
                          <p className="flex items-center gap-2">
                            <Phone size={14} />
                            {request.phone}
                          </p>
                        )}

                        {!request.email && !request.phone && (
                          <p className="text-zinc-400">Sem contacto</p>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-zinc-600">
                      {request.nif || '-'}
                    </td>

                    <td className="max-w-xs px-5 py-4 text-zinc-600">
                      {request.notes || '-'}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${getStatusStyle(
                          request.status,
                        )}`}
                      >
                        {request.status}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <select
                        value={request.status}
                        disabled={updatingId === request.id}
                        onChange={(event) =>
                          updateStatus(request.id, event.target.value)
                        }
                        className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {memberStatuses.map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="px-5 py-4 text-zinc-600">
                      {new Date(request.created_at).toLocaleDateString('pt-PT')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}