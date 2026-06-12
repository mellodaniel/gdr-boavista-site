import { useEffect, useState } from 'react';
import { Mail, MessageSquare, RefreshCw, UserRound } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { GdrbContactRequest } from '../../types/database';

const contactStatuses = [
  { value: 'novo', label: 'Novo' },
  { value: 'em_tratamento', label: 'Em tratamento' },
  { value: 'respondido', label: 'Respondido' },
  { value: 'arquivado', label: 'Arquivado' },
];

export function AdminContactsPage() {
  const [contacts, setContacts] = useState<GdrbContactRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  async function loadContacts() {
    setLoading(true);
    setErrorMessage('');

    const { data, error } = await supabase
      .from('gdrb_contact_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao carregar contactos:', error);
      setErrorMessage('Não foi possível carregar os contactos.');
    }

    setContacts(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadContacts();
  }, []);

  async function updateStatus(id: string, status: string) {
    setUpdatingId(id);
    setErrorMessage('');

    const { error } = await supabase
      .from('gdrb_contact_requests')
      .update({ status })
      .eq('id', id);

    setUpdatingId(null);

    if (error) {
      console.error('Erro ao atualizar estado do contacto:', error);
      setErrorMessage('Não foi possível atualizar o estado da mensagem.');
      return;
    }

    setContacts((currentContacts) =>
      currentContacts.map((contact) =>
        contact.id === id ? { ...contact, status } : contact,
      ),
    );
  }

  function getStatusStyle(status: string) {
    if (status === 'respondido') {
      return 'bg-green-100 text-green-800';
    }

    if (status === 'arquivado') {
      return 'bg-zinc-200 text-zinc-700';
    }

    if (status === 'em_tratamento') {
      return 'bg-blue-100 text-blue-800';
    }

    return 'bg-red-100 text-red-700';
  }

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-red-600">
            Contactos
          </p>

          <h2 className="mt-2 text-3xl font-black text-zinc-950">
            Mensagens recebidas
          </h2>

          <p className="mt-3 max-w-3xl text-zinc-600">
            Lista de mensagens enviadas através do formulário de contacto do site.
          </p>
        </div>

        <button
          type="button"
          onClick={loadContacts}
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
          A carregar contactos...
        </div>
      ) : contacts.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-8 text-zinc-600">
          Ainda não existem mensagens recebidas.
        </div>
      ) : (
        <div className="mt-8 grid gap-5">
          {contacts.map((contact) => (
            <article
              key={contact.id}
              className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                <div className="flex gap-4">
                  <div className="h-fit rounded-full bg-red-100 p-3 text-red-600">
                    <MessageSquare size={22} />
                  </div>

                  <div>
                    <h3 className="text-xl font-black text-zinc-950">
                      {contact.subject || 'Sem assunto'}
                    </h3>

                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-zinc-600">
                      <p className="flex items-center gap-2">
                        <UserRound size={15} />
                        {contact.name}
                      </p>

                      {contact.email && (
                        <p className="flex items-center gap-2">
                          <Mail size={15} />
                          {contact.email}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-start gap-3 md:items-end">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${getStatusStyle(
                      contact.status,
                    )}`}
                  >
                    {contact.status}
                  </span>

                  <select
                    value={contact.status}
                    disabled={updatingId === contact.id}
                    onChange={(event) =>
                      updateStatus(contact.id, event.target.value)
                    }
                    className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {contactStatuses.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>

                  <p className="text-xs text-zinc-500">
                    {new Date(contact.created_at).toLocaleString('pt-PT')}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl bg-zinc-100 p-5 text-sm leading-6 text-zinc-700">
                {contact.message}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}