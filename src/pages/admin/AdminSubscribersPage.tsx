import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Edit3,
  Mail,
  RefreshCw,
  Search,
  UserPlus,
  XCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

type Subscriber = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  source: string;
  consent_email: boolean;
  consent_email_at: string | null;
  consent_whatsapp: boolean;
  consent_whatsapp_at: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
  unsubscribe_token: string | null;
  unsubscribed_at: string | null;
  unsubscribe_reason: string | null;
  privacy_policy_accepted: boolean;
  privacy_policy_accepted_at: string | null;
  last_email_sent_at: string | null;
};

type StatusFilter = 'all' | 'active' | 'inactive' | 'cancelled' | 'no-consent';

type EditForm = {
  name: string;
  email: string;
  phone: string;
  source: string;
  notes: string;
  is_active: boolean;
  consent_email: boolean;
  consent_whatsapp: boolean;
};

const sourceLabels: Record<string, string> = {
  admin: 'Admin',
  site: 'Site',
  importacao: 'Importação',
  contacto: 'Contacto',
  socio: 'Sócio',
  outro: 'Outro',
};

function formatDate(value: string | null | undefined) {
  if (!value) return '—';

  try {
    return new Intl.DateTimeFormat('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return '—';
  }
}

function statusLabel(subscriber: Subscriber) {
  if (subscriber.unsubscribed_at) return 'Cancelado';
  if (!subscriber.is_active) return 'Inativo';
  if (!subscriber.consent_email) return 'Sem consentimento';
  return 'Ativo';
}

function statusClass(subscriber: Subscriber) {
  if (subscriber.unsubscribed_at) {
    return 'bg-slate-100 text-slate-700 border-slate-200';
  }

  if (!subscriber.is_active) {
    return 'bg-zinc-100 text-zinc-700 border-zinc-200';
  }

  if (!subscriber.consent_email) {
    return 'bg-amber-50 text-amber-700 border-amber-200';
  }

  return 'bg-emerald-50 text-emerald-700 border-emerald-200';
}

export function AdminSubscribersPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [editingSubscriber, setEditingSubscriber] = useState<Subscriber | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    name: '',
    email: '',
    phone: '',
    source: 'admin',
    notes: '',
    is_active: true,
    consent_email: false,
    consent_whatsapp: false,
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function loadSubscribers() {
    setLoading(true);
    setMessage(null);

    const { data, error } = await supabase
      .from('gdrb_subscribers')
      .select(
        `
        id,
        name,
        email,
        phone,
        source,
        consent_email,
        consent_email_at,
        consent_whatsapp,
        consent_whatsapp_at,
        is_active,
        notes,
        created_at,
        updated_at,
        unsubscribe_token,
        unsubscribed_at,
        unsubscribe_reason,
        privacy_policy_accepted,
        privacy_policy_accepted_at,
        last_email_sent_at
      `,
      )
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      setMessage({
        type: 'error',
        text: 'Não foi possível carregar os subscritores.',
      });
      setSubscribers([]);
    } else {
      setSubscribers((data || []) as Subscriber[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadSubscribers();
  }, []);

  const stats = useMemo(() => {
    const total = subscribers.length;
    const active = subscribers.filter(
      (subscriber) =>
        subscriber.is_active &&
        subscriber.consent_email &&
        !subscriber.unsubscribed_at,
    ).length;
    const cancelled = subscribers.filter((subscriber) => subscriber.unsubscribed_at).length;
    const noConsent = subscribers.filter((subscriber) => !subscriber.consent_email).length;

    return {
      total,
      active,
      cancelled,
      noConsent,
    };
  }, [subscribers]);

  const filteredSubscribers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return subscribers.filter((subscriber) => {
      const matchesSearch =
        !term ||
        subscriber.name?.toLowerCase().includes(term) ||
        subscriber.email?.toLowerCase().includes(term) ||
        subscriber.phone?.toLowerCase().includes(term) ||
        subscriber.source?.toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' &&
          subscriber.is_active &&
          subscriber.consent_email &&
          !subscriber.unsubscribed_at) ||
        (statusFilter === 'inactive' &&
          !subscriber.is_active &&
          !subscriber.unsubscribed_at) ||
        (statusFilter === 'cancelled' && Boolean(subscriber.unsubscribed_at)) ||
        (statusFilter === 'no-consent' && !subscriber.consent_email);

      return matchesSearch && matchesStatus;
    });
  }, [subscribers, searchTerm, statusFilter]);

  function openEdit(subscriber: Subscriber) {
    setEditingSubscriber(subscriber);
    setEditForm({
      name: subscriber.name || '',
      email: subscriber.email || '',
      phone: subscriber.phone || '',
      source: subscriber.source || 'admin',
      notes: subscriber.notes || '',
      is_active: subscriber.is_active,
      consent_email: subscriber.consent_email,
      consent_whatsapp: subscriber.consent_whatsapp,
    });
    setMessage(null);
  }

  function closeEdit() {
    setEditingSubscriber(null);
    setSaving(false);
  }

  async function saveSubscriber() {
    if (!editingSubscriber) return;

    const email = editForm.email.trim();
    const phone = editForm.phone.trim();

    if (!email && !phone) {
      setMessage({
        type: 'error',
        text: 'O subscritor precisa ter pelo menos email ou telefone.',
      });
      return;
    }

    setSaving(true);
    setMessage(null);

    const now = new Date().toISOString();

    const payload: Partial<Subscriber> = {
      name: editForm.name.trim() || null,
      email: email || null,
      phone: phone || null,
      source: editForm.source,
      notes: editForm.notes.trim() || null,
      is_active: editForm.is_active,
      consent_email: editForm.consent_email,
      consent_whatsapp: editForm.consent_whatsapp,
      updated_at: now,
    };

    if (editForm.consent_email && !editingSubscriber.consent_email) {
      payload.consent_email_at = now;
      payload.privacy_policy_accepted = true;
      payload.privacy_policy_accepted_at = now;
      payload.unsubscribed_at = null;
      payload.unsubscribe_reason = null;
      payload.is_active = true;
    }

    if (!editForm.consent_email && editingSubscriber.consent_email) {
      payload.unsubscribed_at = now;
      payload.unsubscribe_reason = 'Alterado manualmente no admin';
      payload.is_active = false;
    }

    if (editForm.consent_whatsapp && !editingSubscriber.consent_whatsapp) {
      payload.consent_whatsapp_at = now;
    }

    const { error } = await supabase
      .from('gdrb_subscribers')
      .update(payload)
      .eq('id', editingSubscriber.id);

    if (error) {
      console.error(error);
      setMessage({
        type: 'error',
        text: 'Não foi possível guardar as alterações.',
      });
      setSaving(false);
      return;
    }

    setMessage({
      type: 'success',
      text: 'Subscritor atualizado com sucesso.',
    });

    setSaving(false);
    closeEdit();
    await loadSubscribers();
  }

  async function toggleActive(subscriber: Subscriber) {
    setMessage(null);

    const now = new Date().toISOString();
    const nextActive = !subscriber.is_active;

    const payload: Partial<Subscriber> = {
      is_active: nextActive,
      updated_at: now,
    };

    if (!nextActive) {
      payload.consent_email = false;
      payload.unsubscribed_at = now;
      payload.unsubscribe_reason = 'Inativado manualmente no admin';
    }

    if (nextActive) {
      payload.unsubscribed_at = null;
      payload.unsubscribe_reason = null;
    }

    const { error } = await supabase
      .from('gdrb_subscribers')
      .update(payload)
      .eq('id', subscriber.id);

    if (error) {
      console.error(error);
      setMessage({
        type: 'error',
        text: 'Não foi possível alterar o estado do subscritor.',
      });
      return;
    }

    await loadSubscribers();
  }

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#21150f] via-[#3b120f] to-[#8b1d1d] p-8 text-white shadow-xl">
        <div className="max-w-3xl">
          <p className="mb-4 text-xs font-black uppercase tracking-[0.35em] text-red-200">
            Administração
          </p>
          <h1 className="font-serif text-5xl font-bold">Subscritores.</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/80">
            Gere os contactos que autorizaram receber newsletters e comunicações oficiais do GDR Boavista.
          </p>
        </div>
      </section>

      {message && (
        <div
          className={`rounded-xl border px-5 py-4 text-sm font-semibold ${
            message.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Total</p>
          <p className="mt-3 text-3xl font-black text-zinc-900">{stats.total}</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600">Ativos</p>
          <p className="mt-3 text-3xl font-black text-emerald-700">{stats.active}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Cancelados</p>
          <p className="mt-3 text-3xl font-black text-slate-700">{stats.cancelled}</p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-600">Sem consentimento</p>
          <p className="mt-3 text-3xl font-black text-amber-700">{stats.noConsent}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Pesquisar por nome, email, telefone ou origem..."
              className="w-full rounded-xl border border-zinc-200 bg-white py-3 pl-12 pr-4 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
            >
              <option value="all">Todos</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
              <option value="cancelled">Cancelados</option>
              <option value="no-consent">Sem consentimento</option>
            </select>

            <button
              type="button"
              onClick={loadSubscribers}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-black text-zinc-700 transition hover:bg-zinc-50"
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-sm font-semibold text-zinc-500">
            A carregar subscritores...
          </div>
        ) : filteredSubscribers.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <UserPlus className="mb-4 h-10 w-10 text-zinc-300" />
            <h2 className="text-xl font-black text-zinc-900">Nenhum subscritor encontrado</h2>
            <p className="mt-2 text-sm text-zinc-500">
              Altera os filtros ou aguarda novas subscrições pelo site.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                    Subscritor
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                    Estado
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                    Origem
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                    Subscrição
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                    Cancelamento
                  </th>
                  <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-100 bg-white">
                {filteredSubscribers.map((subscriber) => (
                  <tr key={subscriber.id} className="transition hover:bg-zinc-50/80">
                    <td className="px-5 py-5 align-top">
                      <div className="font-black text-zinc-900">
                        {subscriber.name || 'Sem nome'}
                      </div>

                      {subscriber.email && (
                        <a
                          href={`mailto:${subscriber.email}`}
                          className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-red-700 hover:text-red-900"
                        >
                          <Mail className="h-4 w-4" />
                          {subscriber.email}
                        </a>
                      )}

                      {subscriber.phone && (
                        <div className="mt-1 text-sm text-zinc-500">{subscriber.phone}</div>
                      )}

                      {subscriber.notes && (
                        <div className="mt-2 max-w-md rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
                          {subscriber.notes}
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-5 align-top">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${statusClass(
                          subscriber,
                        )}`}
                      >
                        {statusLabel(subscriber)}
                      </span>

                      <div className="mt-2 space-y-1 text-xs text-zinc-500">
                        <div className="flex items-center gap-1">
                          {subscriber.consent_email ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-zinc-400" />
                          )}
                          Email
                        </div>

                        <div className="flex items-center gap-1">
                          {subscriber.consent_whatsapp ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-zinc-400" />
                          )}
                          WhatsApp
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-5 align-top text-sm font-semibold text-zinc-700">
                      {sourceLabels[subscriber.source] || subscriber.source || '—'}
                    </td>

                    <td className="px-5 py-5 align-top text-sm text-zinc-600">
                      <div>{formatDate(subscriber.created_at)}</div>
                      {subscriber.consent_email_at && (
                        <div className="mt-1 text-xs text-zinc-400">
                          Consentimento: {formatDate(subscriber.consent_email_at)}
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-5 align-top text-sm text-zinc-600">
                      {subscriber.unsubscribed_at ? (
                        <>
                          <div>{formatDate(subscriber.unsubscribed_at)}</div>
                          {subscriber.unsubscribe_reason && (
                            <div className="mt-1 text-xs text-zinc-400">
                              {subscriber.unsubscribe_reason}
                            </div>
                          )}
                        </>
                      ) : (
                        '—'
                      )}
                    </td>

                    <td className="px-5 py-5 align-top">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(subscriber)}
                          className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-black text-zinc-700 transition hover:bg-zinc-50"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleActive(subscriber)}
                          className={`rounded-lg px-3 py-2 text-xs font-black transition ${
                            subscriber.is_active && !subscriber.unsubscribed_at
                              ? 'bg-zinc-900 text-white hover:bg-zinc-800'
                              : 'bg-red-600 text-white hover:bg-red-700'
                          }`}
                        >
                          {subscriber.is_active && !subscriber.unsubscribed_at
                            ? 'Inativar'
                            : 'Reativar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editingSubscriber && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-6">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-red-600">
                Subscritor
              </p>
              <h2 className="mt-2 font-serif text-3xl font-bold text-zinc-900">
                Editar subscritor
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-black text-zinc-800">Nome</span>
                <input
                  value={editForm.name}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, name: event.target.value }))
                  }
                  className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-black text-zinc-800">Email</span>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, email: event.target.value }))
                  }
                  className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-black text-zinc-800">Telefone</span>
                <input
                  value={editForm.phone}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, phone: event.target.value }))
                  }
                  className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-black text-zinc-800">Origem</span>
                <select
                  value={editForm.source}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, source: event.target.value }))
                  }
                  className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
                >
                  <option value="admin">Admin</option>
                  <option value="site">Site</option>
                  <option value="importacao">Importação</option>
                  <option value="contacto">Contacto</option>
                  <option value="socio">Sócio</option>
                  <option value="outro">Outro</option>
                </select>
              </label>
            </div>

            <label className="mt-4 block space-y-2">
              <span className="text-sm font-black text-zinc-800">Observações internas</span>
              <textarea
                value={editForm.notes}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, notes: event.target.value }))
                }
                rows={4}
                className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
              />
            </label>

            <div className="mt-5 grid gap-3 rounded-xl bg-zinc-50 p-4">
              <label className="flex items-start gap-3 text-sm font-semibold text-zinc-700">
                <input
                  type="checkbox"
                  checked={editForm.is_active}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      is_active: event.target.checked,
                    }))
                  }
                  className="mt-1"
                />
                Subscritor ativo
              </label>

              <label className="flex items-start gap-3 text-sm font-semibold text-zinc-700">
                <input
                  type="checkbox"
                  checked={editForm.consent_email}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      consent_email: event.target.checked,
                    }))
                  }
                  className="mt-1"
                />
                Consentimento para receber comunicações por email
              </label>

              <label className="flex items-start gap-3 text-sm font-semibold text-zinc-700">
                <input
                  type="checkbox"
                  checked={editForm.consent_whatsapp}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      consent_whatsapp: event.target.checked,
                    }))
                  }
                  className="mt-1"
                />
                Consentimento para comunicações por WhatsApp
              </label>
            </div>

            {editingSubscriber.unsubscribe_token && (
              <div className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">
                  Link técnico de cancelamento
                </p>
                <p className="mt-2 break-all text-xs text-zinc-500">
                  /newsletter/cancelar/{editingSubscriber.unsubscribe_token}
                </p>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeEdit}
                className="rounded-xl border border-zinc-200 bg-white px-5 py-3 text-sm font-black text-zinc-700 transition hover:bg-zinc-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={saveSubscriber}
                disabled={saving}
                className="rounded-xl bg-red-600 px-5 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'A guardar...' : 'Guardar alterações'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}