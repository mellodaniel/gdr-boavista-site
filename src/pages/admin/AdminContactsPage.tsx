import { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  ChevronDown,
  Mail,
  MessageCircle,
  RefreshCcw,
  RotateCcw,
  Search,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { GdrbContactRequest } from '../../types/database';

const statusOptions = [
  { value: 'novo', label: 'Novo' },
  { value: 'em_tratamento', label: 'Em tratamento' },
  { value: 'respondido', label: 'Respondido' },
  { value: 'arquivado', label: 'Arquivado' },
];

const statusFilterOptions = [
  { value: 'all', label: 'Todos' },
  { value: 'novo', label: 'Novo' },
  { value: 'em_tratamento', label: 'Em tratamento' },
  { value: 'respondido', label: 'Respondido' },
  { value: 'arquivado', label: 'Arquivados' },
];

const pageSizeOptions = [10, 25, 50];

type StatusFilter = 'all' | 'novo' | 'em_tratamento' | 'respondido' | 'arquivado';

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatStatus(status: string) {
  const foundStatus = statusOptions.find((item) => item.value === status);
  return foundStatus?.label ?? status;
}

function getStatusClass(status: string) {
  if (status === 'arquivado') {
    return 'border-slate-200 bg-slate-100 text-slate-700';
  }

  if (status === 'respondido') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (status === 'em_tratamento') {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }

  return 'border-red-200 bg-red-50 text-red-700';
}

function getVisibleRange(total: number, page: number, pageSize: number) {
  if (total === 0) {
    return { start: 0, end: 0 };
  }

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return { start, end };
}

export function AdminContactsPage() {
  const [contacts, setContacts] = useState<GdrbContactRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedContactId, setExpandedContactId] = useState<string | null>(null);

  async function loadContacts() {
    setIsLoading(true);
    setErrorMessage('');

    const { data, error } = await supabase
      .from('gdrb_contact_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao carregar contactos:', error);
      setErrorMessage('Não foi possível carregar os contactos.');
      setIsLoading(false);
      return;
    }

    setContacts(data ?? []);
    setIsLoading(false);
  }

  useEffect(() => {
    loadContacts();
  }, []);

  const filteredContacts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return contacts.filter((contact) => {
      const matchesStatus =
        statusFilter === 'all'
          ? contact.status !== 'arquivado'
          : contact.status === statusFilter;

      if (!matchesStatus) return false;

      if (!normalizedSearch) return true;

      return [contact.name, contact.email, contact.subject, contact.message]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch));
    });
  }, [contacts, searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredContacts.length / pageSize));

  const paginatedContacts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredContacts.slice(start, start + pageSize);
  }, [currentPage, filteredContacts, pageSize]);

  const stats = useMemo(() => {
    return {
      totalActive: contacts.filter((contact) => contact.status !== 'arquivado').length,
      newContacts: contacts.filter((contact) => contact.status === 'novo').length,
      inProgress: contacts.filter((contact) => contact.status === 'em_tratamento').length,
      archived: contacts.filter((contact) => contact.status === 'arquivado').length,
    };
  }, [contacts]);

  const { start, end } = getVisibleRange(filteredContacts.length, currentPage, pageSize);

  useEffect(() => {
    setCurrentPage(1);
    setExpandedContactId(null);
  }, [searchTerm, statusFilter, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  async function handleStatusChange(id: string, status: string) {
    setSuccessMessage('');
    setErrorMessage('');

    const { error } = await supabase
      .from('gdrb_contact_requests')
      .update({ status })
      .eq('id', id);

    if (error) {
      console.error('Erro ao atualizar contacto:', error);
      setErrorMessage('Não foi possível atualizar o estado do contacto.');
      return;
    }

    setSuccessMessage('Estado do contacto atualizado com sucesso.');
    await loadContacts();
  }

  async function archiveContact(contact: GdrbContactRequest) {
    await handleStatusChange(contact.id, 'arquivado');
  }

  async function reactivateContact(contact: GdrbContactRequest) {
    await handleStatusChange(contact.id, 'novo');
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
              Contactos.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-300">
              Gere as mensagens recebidas através do formulário público de
              contacto.
            </p>
          </div>

          <button
            type="button"
            onClick={loadContacts}
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

      <section className="mt-8 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">
            Ativos
          </p>
          <p className="mt-3 text-3xl font-black text-zinc-900">{stats.totalActive}</p>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-red-600">
            Novos
          </p>
          <p className="mt-3 text-3xl font-black text-red-700">{stats.newContacts}</p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-600">
            Em tratamento
          </p>
          <p className="mt-3 text-3xl font-black text-amber-700">{stats.inProgress}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
            Arquivados
          </p>
          <p className="mt-3 text-3xl font-black text-slate-700">{stats.archived}</p>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_220px_160px_auto] lg:items-center">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Pesquisar por nome, email, assunto ou mensagem..."
              className="w-full rounded-xl border border-zinc-200 bg-white py-3 pl-12 pr-4 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
            />
          </label>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
          >
            {statusFilterOptions.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>

          <select
            value={pageSize}
            onChange={(event) => setPageSize(Number(event.target.value))}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size} por página
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={loadContacts}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-black text-zinc-700 transition hover:bg-zinc-50"
          >
            <RefreshCcw size={16} />
            Atualizar
          </button>
        </div>
      </section>

      {isLoading ? (
        <div className="mt-8 rounded-sm border border-zinc-200 bg-white p-8 text-zinc-600 shadow-sm">
          A carregar contactos...
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="mt-8 rounded-sm border border-dashed border-zinc-300 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-700">
            <MessageCircle size={28} />
          </div>

          <h2 className="mt-5 font-serif text-3xl font-light text-[#24180f]">
            Sem mensagens
          </h2>

          <p className="mt-3 text-zinc-500">
            Não existem mensagens para os filtros selecionados.
          </p>
        </div>
      ) : (
        <section className="mt-8 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                    Contacto
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                    Assunto
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                    Estado
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                    Data
                  </th>
                  <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-100 bg-white">
                {paginatedContacts.map((contact) => {
                  const isExpanded = expandedContactId === contact.id;

                  return (
                    <tr key={contact.id} className="align-top transition hover:bg-zinc-50/80">
                      <td className="px-5 py-5">
                        <div className="font-black text-zinc-900">{contact.name}</div>
                        {contact.email && (
                          <a
                            href={`mailto:${contact.email}`}
                            className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-red-700 hover:text-red-900"
                          >
                            <Mail size={15} />
                            {contact.email}
                          </a>
                        )}
                      </td>

                      <td className="px-5 py-5 text-sm text-zinc-700">
                        <div className="max-w-xs font-semibold text-zinc-900">
                          {contact.subject || 'Sem assunto'}
                        </div>

                        {isExpanded && (
                          <div className="mt-4 max-w-xl rounded-xl bg-[#f6f2ec] p-4 text-sm leading-7 text-zinc-600">
                            {contact.message}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-5">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${getStatusClass(
                            contact.status,
                          )}`}
                        >
                          {formatStatus(contact.status)}
                        </span>

                        <select
                          value={contact.status}
                          onChange={(event) =>
                            handleStatusChange(contact.id, event.target.value)
                          }
                          className="mt-3 block w-full min-w-[180px] rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
                        >
                          {statusOptions.map((status) => (
                            <option key={status.value} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-5 py-5 text-sm font-semibold text-zinc-600">
                        {formatDate(contact.created_at)}
                      </td>

                      <td className="px-5 py-5">
                        <div className="flex flex-col items-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedContactId(isExpanded ? null : contact.id)
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-black text-zinc-700 transition hover:bg-zinc-50"
                          >
                            Detalhes
                            <ChevronDown
                              size={14}
                              className={`transition ${isExpanded ? 'rotate-180' : ''}`}
                            />
                          </button>

                          {contact.status === 'arquivado' ? (
                            <button
                              type="button"
                              onClick={() => reactivateContact(contact)}
                              className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-black text-white transition hover:bg-red-700"
                            >
                              <RotateCcw size={14} />
                              Reativar
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => archiveContact(contact)}
                              className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-3 py-2 text-xs font-black text-white transition hover:bg-zinc-800"
                            >
                              <Archive size={14} />
                              Arquivar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-zinc-200 bg-zinc-50 px-5 py-4 text-sm font-semibold text-zinc-600 md:flex-row md:items-center md:justify-between">
            <span>
              A mostrar {start}-{end} de {filteredContacts.length} contacto(s)
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-black text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Anterior
              </button>

              <span className="px-2 text-xs font-black uppercase tracking-[0.12em] text-zinc-400">
                Página {currentPage} de {totalPages}
              </span>

              <button
                type="button"
                onClick={() =>
                  setCurrentPage((page) => Math.min(totalPages, page + 1))
                }
                disabled={currentPage === totalPages}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-black text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Seguinte
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
