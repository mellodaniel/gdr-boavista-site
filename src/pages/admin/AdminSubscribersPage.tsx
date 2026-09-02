import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Filter,
  Mail,
  RefreshCw,
  Search,
  UserPlus,
  XCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useSessionState } from '../../hooks/useSessionState';

type SubscriberGroup = {
  id: string;
  name: string;
  slug: string;
  group_type: string;
  birth_years: string | null;
};

type Subscriber = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  source: string;
  contact_type: string | null;
  communication_scope: string | null;
  relationship: string | null;
  athlete_name: string | null;
  consent_email: boolean;
  consent_email_at: string | null;
  consent_email_newsletter?: boolean | null;
  consent_email_club?: boolean | null;
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
  groups: SubscriberGroup[];
};

type StatusFilter = 'all' | 'active' | 'inactive' | 'cancelled' | 'no-consent' | 'eligible';

type EditForm = {
  name: string;
  email: string;
  phone: string;
  source: string;
  contact_type: string;
  communication_scope: string;
  relationship: string;
  athlete_name: string;
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

const contactTypeLabels: Record<string, string> = {
  newsletter: 'Newsletter',
  encarregado: 'Encarregado',
  atleta: 'Atleta',
  treinador: 'Treinador',
  direcao: 'Direção',
  socio: 'Sócio',
  parceiro: 'Parceiro',
  staff: 'Staff',
  outro: 'Outro',
};

const scopeLabels: Record<string, string> = {
  newsletter: 'Newsletter',
  escalao: 'Escalão',
  interno: 'Interno',
  socios: 'Sócios',
  parceiros: 'Parceiros',
  geral: 'Geral',
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

function isEligibleForEmail(subscriber: Subscriber) {
  return Boolean(
    subscriber.email &&
      subscriber.is_active &&
      subscriber.consent_email &&
      !subscriber.unsubscribed_at,
  );
}

const emptyEditForm: EditForm = {
  name: '',
  email: '',
  phone: '',
  source: 'admin',
  contact_type: 'newsletter',
  communication_scope: 'newsletter',
  relationship: '',
  athlete_name: '',
  notes: '',
  is_active: true,
  consent_email: false,
  consent_whatsapp: false,
};

export function AdminSubscribersPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingSubscriber, setEditingSubscriber] = useSessionState<Subscriber | null>('admin:subscribers:editingSubscriber', null);
  const [editForm, setEditForm] = useSessionState<EditForm>('admin:subscribers:editForm', emptyEditForm);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

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
        contact_type,
        communication_scope,
        relationship,
        athlete_name,
        consent_email,
        consent_email_at,
        consent_email_newsletter,
        consent_email_club,
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
      setLoading(false);
      return;
    }

    const subscriberRows = (data || []) as Omit<Subscriber, 'groups'>[];
    const subscriberIds = subscriberRows.map((subscriber) => subscriber.id);
    const groupsBySubscriber = new Map<string, SubscriberGroup[]>();

    if (subscriberIds.length > 0) {
      const { data: groupLinks, error: groupError } = await supabase
        .from('gdrb_subscriber_groups')
        .select(
          `
          subscriber_id,
          group:gdrb_communication_groups (
            id,
            name,
            slug,
            group_type,
            birth_years
          )
        `,
        )
        .in('subscriber_id', subscriberIds);

      if (groupError) {
        console.warn('Não foi possível carregar grupos dos subscritores.', groupError);
      } else {
        (groupLinks || []).forEach((link: any) => {
          const group = Array.isArray(link.group) ? link.group[0] : link.group;
          if (!group) return;

          const currentGroups = groupsBySubscriber.get(link.subscriber_id) || [];
          currentGroups.push(group as SubscriberGroup);
          groupsBySubscriber.set(link.subscriber_id, currentGroups);
        });
      }
    }

    setSubscribers(
      subscriberRows.map((subscriber) => ({
        ...subscriber,
        contact_type: subscriber.contact_type || 'newsletter',
        communication_scope: subscriber.communication_scope || 'newsletter',
        groups: groupsBySubscriber.get(subscriber.id) || [],
      })),
    );

    setLoading(false);
  }

  useEffect(() => {
    loadSubscribers();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, typeFilter, groupFilter, sourceFilter, pageSize]);

  const groups = useMemo(() => {
    const map = new Map<string, SubscriberGroup>();
    subscribers.forEach((subscriber) => {
      subscriber.groups.forEach((group) => map.set(group.slug, group));
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'pt-PT'));
  }, [subscribers]);

  const stats = useMemo(() => {
    const total = subscribers.length;
    const active = subscribers.filter((subscriber) => isEligibleForEmail(subscriber)).length;
    const cancelled = subscribers.filter((subscriber) => subscriber.unsubscribed_at).length;
    const noConsent = subscribers.filter((subscriber) => !subscriber.consent_email).length;
    const imported = subscribers.filter((subscriber) => subscriber.source === 'importacao').length;

    return { total, active, cancelled, noConsent, imported };
  }, [subscribers]);

  const filteredSubscribers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return subscribers.filter((subscriber) => {
      const groupNames = subscriber.groups.map((group) => group.name.toLowerCase()).join(' ');
      const matchesSearch =
        !term ||
        subscriber.name?.toLowerCase().includes(term) ||
        subscriber.email?.toLowerCase().includes(term) ||
        subscriber.phone?.toLowerCase().includes(term) ||
        subscriber.source?.toLowerCase().includes(term) ||
        subscriber.contact_type?.toLowerCase().includes(term) ||
        subscriber.communication_scope?.toLowerCase().includes(term) ||
        subscriber.relationship?.toLowerCase().includes(term) ||
        subscriber.athlete_name?.toLowerCase().includes(term) ||
        groupNames.includes(term);

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'eligible' && isEligibleForEmail(subscriber)) ||
        (statusFilter === 'active' && subscriber.is_active && !subscriber.unsubscribed_at) ||
        (statusFilter === 'inactive' && !subscriber.is_active && !subscriber.unsubscribed_at) ||
        (statusFilter === 'cancelled' && Boolean(subscriber.unsubscribed_at)) ||
        (statusFilter === 'no-consent' && !subscriber.consent_email);

      const matchesType = typeFilter === 'all' || subscriber.contact_type === typeFilter;
      const matchesSource = sourceFilter === 'all' || subscriber.source === sourceFilter;
      const matchesGroup =
        groupFilter === 'all' || subscriber.groups.some((group) => group.slug === groupFilter);

      return matchesSearch && matchesStatus && matchesType && matchesSource && matchesGroup;
    });
  }, [subscribers, searchTerm, statusFilter, typeFilter, sourceFilter, groupFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredSubscribers.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = (safeCurrentPage - 1) * pageSize;
  const paginatedSubscribers = filteredSubscribers.slice(pageStart, pageStart + pageSize);

  function openEdit(subscriber: Subscriber) {
    setEditingSubscriber(subscriber);
    setEditForm({
      name: subscriber.name || '',
      email: subscriber.email || '',
      phone: subscriber.phone || '',
      source: subscriber.source || 'admin',
      contact_type: subscriber.contact_type || 'newsletter',
      communication_scope: subscriber.communication_scope || 'newsletter',
      relationship: subscriber.relationship || '',
      athlete_name: subscriber.athlete_name || '',
      notes: subscriber.notes || '',
      is_active: subscriber.is_active,
      consent_email: subscriber.consent_email,
      consent_whatsapp: subscriber.consent_whatsapp,
    });
    setMessage(null);
  }

  function closeEdit() {
    setEditingSubscriber(null);
    setEditForm(emptyEditForm);
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
      contact_type: editForm.contact_type,
      communication_scope: editForm.communication_scope,
      relationship: editForm.relationship.trim() || null,
      athlete_name: editForm.athlete_name.trim() || null,
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

    setMessage({ type: 'success', text: 'Subscritor atualizado com sucesso.' });
    closeEdit();
    await loadSubscribers();
  }

  async function toggleActive(subscriber: Subscriber) {
    setMessage(null);

    const now = new Date().toISOString();
    const nextActive = !subscriber.is_active || Boolean(subscriber.unsubscribed_at);

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
      payload.consent_email = true;
      payload.consent_email_at = now;
      payload.privacy_policy_accepted = true;
      payload.privacy_policy_accepted_at = now;
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

  function clearFilters() {
    setSearchTerm('');
    setStatusFilter('all');
    setTypeFilter('all');
    setGroupFilter('all');
    setSourceFilter('all');
    setPageSize(10);
    setCurrentPage(1);
  }

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#21150f] via-[#3b120f] to-[#8b1d1d] p-5 text-white shadow-xl md:p-8">
        <div className="max-w-3xl">
          <p className="mb-4 text-xs font-black uppercase tracking-[0.35em] text-red-200">
            Administração
          </p>
          <h1 className="font-serif text-4xl font-bold md:text-5xl">Subscritores.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/80 md:mt-5 md:text-base">
            Gere contactos de newsletter, pais, encarregados, atletas, sócios, parceiros e comunicações do clube.
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

      <section className="grid grid-cols-2 gap-3 md:grid-cols-5 md:gap-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm md:p-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Total</p>
          <p className="mt-2 text-2xl font-black md:mt-3 md:text-3xl text-zinc-900">{stats.total}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm md:p-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600">Elegíveis</p>
          <p className="mt-2 text-2xl font-black md:mt-3 md:text-3xl text-emerald-700">{stats.active}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm md:p-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Cancelados</p>
          <p className="mt-2 text-2xl font-black md:mt-3 md:text-3xl text-slate-700">{stats.cancelled}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm md:p-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-600">Sem consent.</p>
          <p className="mt-2 text-2xl font-black md:mt-3 md:text-3xl text-amber-700">{stats.noConsent}</p>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm md:p-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Importados</p>
          <p className="mt-2 text-2xl font-black md:mt-3 md:text-3xl text-blue-700">{stats.imported}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm md:p-5">
        <button
          type="button"
          onClick={() => setShowMobileFilters((value) => !value)}
          className="flex w-full items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-black text-zinc-800 md:hidden"
        >
          <span className="inline-flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros e pesquisa
          </span>
          <ChevronDown className={`h-4 w-4 transition ${showMobileFilters ? 'rotate-180' : ''}`} />
        </button>

        <div className={`${showMobileFilters ? 'mt-4 grid' : 'hidden'} gap-4 md:grid xl:grid-cols-[1.5fr_0.8fr_0.8fr_0.8fr_0.8fr_auto]`}>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Pesquisar nome, email, telefone, atleta, origem ou grupo..."
              className="w-full rounded-xl border border-zinc-200 bg-white py-3 pl-12 pr-4 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
          >
            <option value="all">Todos</option>
            <option value="eligible">Elegíveis para email</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
            <option value="cancelled">Cancelados</option>
            <option value="no-consent">Sem consentimento</option>
          </select>

          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
          >
            <option value="all">Tipos</option>
            {Object.entries(contactTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <select
            value={groupFilter}
            onChange={(event) => setGroupFilter(event.target.value)}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
          >
            <option value="all">Grupos</option>
            {groups.map((group) => (
              <option key={group.slug} value={group.slug}>{group.name}</option>
            ))}
          </select>

          <select
            value={sourceFilter}
            onChange={(event) => setSourceFilter(event.target.value)}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
          >
            <option value="all">Origens</option>
            {Object.entries(sourceLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-black text-zinc-700 transition hover:bg-zinc-50"
            >
              Limpar
            </button>
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
        <div className="flex flex-col gap-3 border-b border-zinc-200 bg-zinc-50 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm font-bold text-zinc-700">
            {filteredSubscribers.length} resultado(s) encontrados
          </p>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">Por página</span>
            <select
              value={pageSize}
              onChange={(event) => setPageSize(Number(event.target.value))}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-bold text-zinc-700 outline-none"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12 text-sm font-semibold text-zinc-500">
            A carregar subscritores...
          </div>
        ) : filteredSubscribers.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <UserPlus className="mb-4 h-10 w-10 text-zinc-300" />
            <h2 className="text-xl font-black text-zinc-900">Nenhum subscritor encontrado</h2>
            <p className="mt-2 text-sm text-zinc-500">Altera os filtros ou aguarda novas subscrições pelo site.</p>
          </div>
        ) : (
          <>
          <div className="divide-y divide-zinc-100 xl:hidden">
            {paginatedSubscribers.map((subscriber) => (
              <article key={subscriber.id} className="bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-black text-zinc-900">{subscriber.name || 'Sem nome'}</p>
                    {subscriber.email && (
                      <a href={`mailto:${subscriber.email}`} className="mt-1 flex max-w-full items-center gap-2 truncate text-sm font-semibold text-red-700">
                        <Mail className="h-4 w-4 shrink-0" />
                        <span className="truncate">{subscriber.email}</span>
                      </a>
                    )}
                    {subscriber.phone && <p className="mt-1 text-sm text-zinc-500">{subscriber.phone}</p>}
                  </div>
                  <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] ${statusClass(subscriber)}`}>
                    {statusLabel(subscriber)}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-bold text-zinc-600">
                    {contactTypeLabels[subscriber.contact_type || ''] || subscriber.contact_type || '—'}
                  </span>
                  {subscriber.groups.slice(0, 3).map((group) => (
                    <span key={group.slug} className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-bold text-zinc-600">
                      {group.name}
                    </span>
                  ))}
                  {subscriber.groups.length > 3 && (
                    <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-bold text-zinc-600">+{subscriber.groups.length - 3}</span>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-semibold text-zinc-500">
                  <div>Origem: {sourceLabels[subscriber.source] || subscriber.source || '—'}</div>
                  <div>Criação: {formatDate(subscriber.created_at)}</div>
                  {subscriber.athlete_name && <div className="col-span-2">Atleta: {subscriber.athlete_name}</div>}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(subscriber)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-3 text-xs font-black text-zinc-700"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleActive(subscriber)}
                    className={`rounded-lg px-3 py-3 text-xs font-black ${
                      subscriber.is_active && !subscriber.unsubscribed_at
                        ? 'bg-zinc-900 text-white'
                        : 'bg-red-600 text-white'
                    }`}
                  >
                    {subscriber.is_active && !subscriber.unsubscribed_at ? 'Inativar' : 'Reativar'}
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto xl:block">
            <table className="min-w-full divide-y divide-zinc-200">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.16em] text-zinc-500">Contacto</th>
                  <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.16em] text-zinc-500">Tipo / grupos</th>
                  <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.16em] text-zinc-500">Estado</th>
                  <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.16em] text-zinc-500">Datas</th>
                  <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-[0.16em] text-zinc-500">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-100 bg-white">
                {paginatedSubscribers.map((subscriber) => (
                  <tr key={subscriber.id} className="transition hover:bg-zinc-50/80">
                    <td className="px-5 py-4 align-top">
                      <div className="font-black text-zinc-900">{subscriber.name || 'Sem nome'}</div>
                      {subscriber.email && (
                        <a href={`mailto:${subscriber.email}`} className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-red-700 hover:text-red-900">
                          <Mail className="h-4 w-4" />
                          {subscriber.email}
                        </a>
                      )}
                      {subscriber.phone && <div className="mt-1 text-sm text-zinc-500">{subscriber.phone}</div>}
                      {subscriber.athlete_name && (
                        <div className="mt-1 text-xs font-semibold text-zinc-500">Atleta: {subscriber.athlete_name}</div>
                      )}
                    </td>

                    <td className="px-5 py-4 align-top">
                      <div className="text-sm font-black text-zinc-800">
                        {contactTypeLabels[subscriber.contact_type || ''] || subscriber.contact_type || '—'}
                      </div>
                      <div className="mt-1 text-xs font-semibold text-zinc-500">
                        {scopeLabels[subscriber.communication_scope || ''] || subscriber.communication_scope || '—'}
                        {subscriber.relationship ? ` · ${subscriber.relationship}` : ''}
                      </div>
                      <div className="mt-2 flex max-w-sm flex-wrap gap-1.5">
                        {subscriber.groups.length > 0 ? (
                          subscriber.groups.map((group) => (
                            <span key={group.slug} className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-bold text-zinc-600">
                              {group.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-zinc-400">Sem grupo associado</span>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-4 align-top">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${statusClass(subscriber)}`}>
                        {statusLabel(subscriber)}
                      </span>
                      <div className="mt-2 space-y-1 text-xs text-zinc-500">
                        <div className="flex items-center gap-1">
                          {subscriber.consent_email ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <XCircle className="h-3.5 w-3.5 text-zinc-400" />}
                          Email
                        </div>
                        <div className="flex items-center gap-1">
                          {subscriber.consent_whatsapp ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <XCircle className="h-3.5 w-3.5 text-zinc-400" />}
                          WhatsApp
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 align-top text-sm text-zinc-600">
                      <div>Criação: {formatDate(subscriber.created_at)}</div>
                      <div className="mt-1 text-xs text-zinc-400">Origem: {sourceLabels[subscriber.source] || subscriber.source || '—'}</div>
                      {subscriber.unsubscribed_at && (
                        <div className="mt-1 text-xs font-semibold text-slate-500">Cancelamento: {formatDate(subscriber.unsubscribed_at)}</div>
                      )}
                    </td>

                    <td className="px-5 py-4 align-top">
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
                          {subscriber.is_active && !subscriber.unsubscribed_at ? 'Inativar' : 'Reativar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}

        {filteredSubscribers.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-zinc-200 bg-zinc-50 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm font-semibold text-zinc-500">
              A mostrar {pageStart + 1}–{Math.min(pageStart + pageSize, filteredSubscribers.length)} de {filteredSubscribers.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={safeCurrentPage === 1}
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-bold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </button>
              <span className="rounded-lg bg-white px-3 py-2 text-sm font-black text-zinc-700">
                {safeCurrentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={safeCurrentPage === totalPages}
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-bold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Seguinte
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </section>

      {editingSubscriber && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-6">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-red-600">Subscritor</p>
              <h2 className="mt-2 font-serif text-3xl font-bold text-zinc-900">Editar subscritor</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-black text-zinc-800">Nome</span>
                <input value={editForm.name} onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))} className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100" />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-black text-zinc-800">Email</span>
                <input type="email" value={editForm.email} onChange={(event) => setEditForm((current) => ({ ...current, email: event.target.value }))} className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100" />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-black text-zinc-800">Telefone</span>
                <input value={editForm.phone} onChange={(event) => setEditForm((current) => ({ ...current, phone: event.target.value }))} className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100" />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-black text-zinc-800">Origem</span>
                <select value={editForm.source} onChange={(event) => setEditForm((current) => ({ ...current, source: event.target.value }))} className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100">
                  {Object.entries(sourceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-black text-zinc-800">Tipo de contacto</span>
                <select value={editForm.contact_type} onChange={(event) => setEditForm((current) => ({ ...current, contact_type: event.target.value }))} className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100">
                  {Object.entries(contactTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-black text-zinc-800">Âmbito</span>
                <select value={editForm.communication_scope} onChange={(event) => setEditForm((current) => ({ ...current, communication_scope: event.target.value }))} className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100">
                  {Object.entries(scopeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-black text-zinc-800">Relação</span>
                <input value={editForm.relationship} onChange={(event) => setEditForm((current) => ({ ...current, relationship: event.target.value }))} placeholder="Pai, mãe, treinador, sócio..." className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100" />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-black text-zinc-800">Atleta associado</span>
                <input value={editForm.athlete_name} onChange={(event) => setEditForm((current) => ({ ...current, athlete_name: event.target.value }))} className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100" />
              </label>
            </div>

            <label className="mt-4 block space-y-2">
              <span className="text-sm font-black text-zinc-800">Observações internas</span>
              <textarea value={editForm.notes} onChange={(event) => setEditForm((current) => ({ ...current, notes: event.target.value }))} rows={4} className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100" />
            </label>

            <div className="mt-5 grid gap-3 rounded-xl bg-zinc-50 p-4">
              <label className="flex items-start gap-3 text-sm font-semibold text-zinc-700">
                <input type="checkbox" checked={editForm.is_active} onChange={(event) => setEditForm((current) => ({ ...current, is_active: event.target.checked }))} className="mt-1" />
                Subscritor ativo
              </label>
              <label className="flex items-start gap-3 text-sm font-semibold text-zinc-700">
                <input type="checkbox" checked={editForm.consent_email} onChange={(event) => setEditForm((current) => ({ ...current, consent_email: event.target.checked }))} className="mt-1" />
                Consentimento para receber comunicações por email
              </label>
              <label className="flex items-start gap-3 text-sm font-semibold text-zinc-700">
                <input type="checkbox" checked={editForm.consent_whatsapp} onChange={(event) => setEditForm((current) => ({ ...current, consent_whatsapp: event.target.checked }))} className="mt-1" />
                Consentimento para comunicações por WhatsApp
              </label>
            </div>

            {editingSubscriber.unsubscribe_token && (
              <div className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">Link técnico de cancelamento</p>
                <p className="mt-2 break-all text-xs text-zinc-500">/newsletter/cancelar/{editingSubscriber.unsubscribe_token}</p>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={closeEdit} className="rounded-xl border border-zinc-200 bg-white px-5 py-3 text-sm font-black text-zinc-700 transition hover:bg-zinc-50">
                Cancelar
              </button>
              <button type="button" onClick={saveSubscriber} disabled={saving} className="rounded-xl bg-red-600 px-5 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60">
                {saving ? 'A guardar...' : 'Guardar alterações'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
