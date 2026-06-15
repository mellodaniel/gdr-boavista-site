import { useEffect, useState } from 'react';
import { Mail, Phone, RefreshCcw, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { GdrbMemberRequest } from '../../types/database';

const statusOptions = [
  { value: 'novo', label: 'Novo' },
  { value: 'em_contacto', label: 'Em contacto' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'convertido', label: 'Convertido' },
  { value: 'arquivado', label: 'Arquivado' },
];

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatStatus(status: string) {
  const foundStatus = statusOptions.find((item) => item.value === status);
  return foundStatus?.label ?? status;
}

export function AdminMembersPage() {
  const [requests, setRequests] = useState<GdrbMemberRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  async function loadRequests() {
    setIsLoading(true);
    setErrorMessage('');

    const { data, error } = await supabase
      .from('gdrb_member_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao carregar pedidos de sócio:', error);
      setErrorMessage('Não foi possível carregar os pedidos de sócio.');
      setIsLoading(false);
      return;
    }

    setRequests(data ?? []);
    setIsLoading(false);
  }

  useEffect(() => {
    loadRequests();
  }, []);

  async function handleStatusChange(id: string, status: string) {
    setSuccessMessage('');
    setErrorMessage('');

    const { error } = await supabase
      .from('gdrb_member_requests')
      .update({ status })
      .eq('id', id);

    if (error) {
      console.error('Erro ao atualizar pedido:', error);
      setErrorMessage('Não foi possível atualizar o estado do pedido.');
      return;
    }

    setSuccessMessage('Estado do pedido atualizado com sucesso.');
    await loadRequests();
  }

  return (
    <div>
      <section className="relative overflow-hidden rounded-sm bg-[#24180f] p-8 text-white shadow-2xl shadow-zinc-950/10 md:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_right,rgba(220,38,38,0.28),transparent_34%)]" />

        <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.45em] text-red-400">
              Administração
            </p>

            <h1 className="mt-6 font-serif text-5xl font-light leading-tight md:text-7xl">
              Sócios.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-300">
              Acompanha os pedidos de sócio recebidos através do site público do
              GDR Boavista.
            </p>
          </div>

          <button
            type="button"
            onClick={loadRequests}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
          >
            <RefreshCcw size={17} />
            Atualizar
          </button>
        </div>
      </section>

      {successMessage && (
        <div className="mt-6 rounded-sm border border-green-200 bg-green-50 px-5 py-4 text-sm font-semibold text-green-800">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="mt-6 rounded-sm border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-800">
          {errorMessage}
        </div>
      )}

      {isLoading ? (
        <div className="mt-8 rounded-sm border border-zinc-200 bg-white p-8 text-zinc-600 shadow-sm">
          A carregar pedidos de sócio...
        </div>
      ) : requests.length === 0 ? (
        <div className="mt-8 rounded-sm border border-dashed border-zinc-300 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-700">
            <Users size={28} />
          </div>

          <h2 className="mt-5 font-serif text-3xl font-light text-[#24180f]">
            Sem pedidos de sócio
          </h2>

          <p className="mt-3 text-zinc-500">
            Ainda não existem pedidos registados.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-5">
          {requests.map((request) => (
            <article
              key={request.id}
              className="overflow-hidden rounded-sm border border-zinc-200 bg-white shadow-sm"
            >
              <div className="h-1.5 bg-red-700" />

              <div className="grid gap-6 p-7 lg:grid-cols-[1fr_auto] lg:items-start">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-red-700">
                      {formatStatus(request.status)}
                    </span>

                    <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-700">
                      {formatDate(request.created_at)}
                    </span>
                  </div>

                  <h3 className="mt-6 font-serif text-4xl font-light text-[#24180f]">
                    {request.full_name}
                  </h3>

                  <div className="mt-5 grid gap-3 text-sm text-zinc-600">
                    {request.email && (
                      <a
                        href={`mailto:${request.email}`}
                        className="flex items-center gap-3 hover:text-red-700"
                      >
                        <Mail size={17} className="text-red-700" />
                        {request.email}
                      </a>
                    )}

                    {request.phone && (
                      <a
                        href={`tel:${request.phone}`}
                        className="flex items-center gap-3 hover:text-red-700"
                      >
                        <Phone size={17} className="text-red-700" />
                        {request.phone}
                      </a>
                    )}

                    {request.nif && (
                      <p className="rounded-sm bg-[#f6f2ec] px-4 py-3 font-semibold text-zinc-700">
                        NIF: {request.nif}
                      </p>
                    )}
                  </div>

                  {request.notes && (
                    <p className="mt-5 rounded-sm bg-[#f6f2ec] px-4 py-3 text-sm leading-7 text-zinc-600">
                      {request.notes}
                    </p>
                  )}
                </div>

                <div className="lg:min-w-[240px]">
                  <label className="text-sm font-black text-zinc-800">
                    Estado do pedido
                  </label>

                  <select
                    value={request.status}
                    onChange={(event) =>
                      handleStatusChange(request.id, event.target.value)
                    }
                    className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm font-semibold outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
                  >
                    {statusOptions.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}