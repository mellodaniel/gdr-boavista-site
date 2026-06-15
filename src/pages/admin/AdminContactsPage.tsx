import { useEffect, useState } from 'react';
import { Mail, MessageCircle, RefreshCcw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { GdrbContactRequest } from '../../types/database';

const statusOptions = [
  { value: 'novo', label: 'Novo' },
  { value: 'em_tratamento', label: 'Em tratamento' },
  { value: 'respondido', label: 'Respondido' },
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

export function AdminContactsPage() {
  const [contacts, setContacts] = useState<GdrbContactRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

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

      {isLoading ? (
        <div className="mt-8 rounded-sm border border-zinc-200 bg-white p-8 text-zinc-600 shadow-sm">
          A carregar contactos...
        </div>
      ) : contacts.length === 0 ? (
        <div className="mt-8 rounded-sm border border-dashed border-zinc-300 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-700">
            <MessageCircle size={28} />
          </div>

          <h2 className="mt-5 font-serif text-3xl font-light text-[#24180f]">
            Sem mensagens
          </h2>

          <p className="mt-3 text-zinc-500">
            Ainda não existem mensagens recebidas.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-5">
          {contacts.map((contact) => (
            <article
              key={contact.id}
              className="overflow-hidden rounded-sm border border-zinc-200 bg-white shadow-sm"
            >
              <div className="h-1.5 bg-red-700" />

              <div className="grid gap-6 p-7 lg:grid-cols-[1fr_auto] lg:items-start">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-red-700">
                      {formatStatus(contact.status)}
                    </span>

                    <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-700">
                      {formatDate(contact.created_at)}
                    </span>
                  </div>

                  <h3 className="mt-6 font-serif text-4xl font-light text-[#24180f]">
                    {contact.name}
                  </h3>

                  {contact.subject && (
                    <p className="mt-3 text-sm font-black uppercase tracking-[0.18em] text-red-700">
                      {contact.subject}
                    </p>
                  )}

                  {contact.email && (
                    <a
                      href={`mailto:${contact.email}`}
                      className="mt-5 flex items-center gap-3 text-sm text-zinc-600 hover:text-red-700"
                    >
                      <Mail size={17} className="text-red-700" />
                      {contact.email}
                    </a>
                  )}

                  <p className="mt-5 rounded-sm bg-[#f6f2ec] px-4 py-3 text-sm leading-7 text-zinc-600">
                    {contact.message}
                  </p>
                </div>

                <div className="lg:min-w-[240px]">
                  <label className="text-sm font-black text-zinc-800">
                    Estado da mensagem
                  </label>

                  <select
                    value={contact.status}
                    onChange={(event) =>
                      handleStatusChange(contact.id, event.target.value)
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