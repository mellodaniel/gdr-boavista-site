import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Mail,
  RefreshCw,
  Save,
  Send,
  Users,
  XCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

type CommunicationType = 'newsletter' | 'escalao' | 'interno' | 'socios' | 'parceiros' | 'geral';
type AudienceMode = 'all_active' | 'selected_groups' | 'manual';

type Communication = {
  id: string;
  title: string;
  subject: string | null;
  preview_text: string | null;
  body: string;
  channel: 'email' | 'whatsapp' | 'email_whatsapp';
  status: 'draft' | 'ready' | 'sent' | 'archived';
  from_name: string | null;
  from_email: string | null;
  communication_type: CommunicationType;
  audience_mode: AudienceMode;
  estimated_recipients: number;
  excluded_no_consent: number;
  excluded_inactive: number;
  excluded_no_email: number;
  test_sent_at: string | null;
  sent_at: string | null;
  sent_count: number;
  failed_count: number;
  last_error: string | null;
  created_at: string;
  updated_at: string | null;
};

type CommunicationGroup = {
  id: string;
  name: string;
  slug: string;
  group_type: string;
  birth_years: string | null;
  is_active: boolean;
  sort_order: number;
};

type CommunicationTarget = {
  communication_id: string;
  group_id: string;
};

type SubscriberGroup = {
  subscriber_id: string;
  group_id: string;
};

type Subscriber = {
  id: string;
  name: string | null;
  email: string | null;
  contact_type: string;
  communication_scope: string;
  consent_email: boolean;
  consent_email_newsletter: boolean;
  consent_email_club: boolean;
  is_active: boolean;
  unsubscribed_at: string | null;
};

type Delivery = {
  id: string;
  communication_id: string;
  recipient_email: string;
  recipient_name: string | null;
  status: 'pending' | 'sent' | 'failed' | 'skipped';
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
};

type FormState = {
  id: string | null;
  title: string;
  subject: string;
  preview_text: string;
  body: string;
  channel: 'email' | 'whatsapp' | 'email_whatsapp';
  status: 'draft' | 'ready' | 'sent' | 'archived';
  from_name: string;
  from_email: string;
  communication_type: CommunicationType;
  audience_mode: AudienceMode;
  groupIds: string[];
};

type AudienceSummary = {
  recipients: number;
  excludedNoConsent: number;
  excludedInactive: number;
  excludedNoEmail: number;
  needsGroups: boolean;
};

const emptyForm: FormState = {
  id: null,
  title: '',
  subject: '',
  preview_text: '',
  body: '',
  channel: 'email',
  status: 'draft',
  from_name: 'GDR Boavista',
  from_email: 'notificacoes@send.gdrboavista.pt',
  communication_type: 'newsletter',
  audience_mode: 'selected_groups',
  groupIds: [],
};

const statusLabels: Record<Communication['status'], string> = {
  draft: 'Rascunho',
  ready: 'Pronta',
  sent: 'Enviada',
  archived: 'Arquivada',
};

const communicationTypeLabels: Record<CommunicationType, string> = {
  newsletter: 'Newsletter geral',
  escalao: 'Comunicação por escalão',
  interno: 'Comunicação interna',
  socios: 'Comunicação para sócios',
  parceiros: 'Comunicação para parceiros',
  geral: 'Comunicação geral do clube',
};

const communicationTypeDescriptions: Record<CommunicationType, string> = {
  newsletter: 'Apenas pessoas que subscreveram voluntariamente a newsletter pública do site.',
  escalao: 'Pais, encarregados, atletas e contactos associados a escalões/equipas específicas.',
  interno: 'Direção, treinadores, equipa técnica e contactos internos do clube.',
  socios: 'Contactos classificados como sócios.',
  parceiros: 'Contactos classificados como parceiros/patrocinadores.',
  geral: 'Comunicação institucional para todos os contactos ativos com consentimento aplicável.',
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

function normalizeEmail(email: string | null | undefined) {
  return String(email || '').trim().toLowerCase();
}

function statusClass(status: Communication['status']) {
  if (status === 'sent') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'ready') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (status === 'archived') return 'border-zinc-200 bg-zinc-100 text-zinc-600';
  return 'border-slate-200 bg-slate-50 text-slate-700';
}

function groupMatchesCommunicationType(group: CommunicationGroup, type: CommunicationType) {
  if (type === 'newsletter') return group.group_type === 'newsletter';
  if (type === 'escalao') return group.group_type === 'escalao';
  if (type === 'interno') return group.group_type === 'direcao' || group.group_type === 'tecnica';
  if (type === 'socios') return group.group_type === 'socios';
  if (type === 'parceiros') return group.group_type === 'parceiros';
  return true;
}

function subscriberHasConsent(subscriber: Subscriber, type: CommunicationType) {
  if (type === 'newsletter') {
    return subscriber.consent_email_newsletter || subscriber.consent_email;
  }

  if (type === 'geral') {
    return subscriber.consent_email_club || subscriber.consent_email_newsletter || subscriber.consent_email;
  }

  return subscriber.consent_email_club || subscriber.consent_email;
}

function subscriberMatchesType(subscriber: Subscriber, type: CommunicationType) {
  if (type === 'newsletter') {
    return subscriber.communication_scope === 'newsletter' || subscriber.contact_type === 'newsletter';
  }

  if (type === 'escalao') {
    return subscriber.communication_scope === 'escalao' || subscriber.contact_type === 'encarregado' || subscriber.contact_type === 'atleta';
  }

  if (type === 'interno') {
    return subscriber.communication_scope === 'interno' || ['treinador', 'direcao', 'staff'].includes(subscriber.contact_type);
  }

  if (type === 'socios') {
    return subscriber.communication_scope === 'socios' || subscriber.contact_type === 'socio';
  }

  if (type === 'parceiros') {
    return subscriber.communication_scope === 'parceiros' || subscriber.contact_type === 'parceiro';
  }

  return true;
}

function calculateAudienceSummary({
  subscribers,
  subscriberGroups,
  communicationType,
  groupIds,
}: {
  subscribers: Subscriber[];
  subscriberGroups: SubscriberGroup[];
  communicationType: CommunicationType;
  groupIds: string[];
}): AudienceSummary {
  const needsGroups = ['escalao', 'interno', 'socios', 'parceiros'].includes(communicationType) && groupIds.length === 0;
  const selectedGroups = new Set(groupIds);
  const subscriberGroupsMap = new Map<string, Set<string>>();

  subscriberGroups.forEach((entry) => {
    if (!subscriberGroupsMap.has(entry.subscriber_id)) {
      subscriberGroupsMap.set(entry.subscriber_id, new Set<string>());
    }

    subscriberGroupsMap.get(entry.subscriber_id)?.add(entry.group_id);
  });

  let recipients = 0;
  let excludedNoConsent = 0;
  let excludedInactive = 0;
  let excludedNoEmail = 0;

  subscribers.forEach((subscriber) => {
    if (!subscriberMatchesType(subscriber, communicationType)) return;

    if (selectedGroups.size > 0) {
      const groupsForSubscriber = subscriberGroupsMap.get(subscriber.id);
      const inSelectedGroup = groupsForSubscriber
        ? Array.from(selectedGroups).some((groupId) => groupsForSubscriber.has(groupId))
        : false;

      if (!inSelectedGroup) return;
    }

    if (!subscriber.is_active || subscriber.unsubscribed_at) {
      excludedInactive += 1;
      return;
    }

    if (!normalizeEmail(subscriber.email)) {
      excludedNoEmail += 1;
      return;
    }

    if (!subscriberHasConsent(subscriber, communicationType)) {
      excludedNoConsent += 1;
      return;
    }

    recipients += 1;
  });

  return {
    recipients,
    excludedNoConsent,
    excludedInactive,
    excludedNoEmail,
    needsGroups,
  };
}

export function AdminCommunicationsPage() {
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [groups, setGroups] = useState<CommunicationGroup[]>([]);
  const [targets, setTargets] = useState<CommunicationTarget[]>([]);
  const [subscriberGroups, setSubscriberGroups] = useState<SubscriberGroup[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [selectedCommunicationId, setSelectedCommunicationId] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState('mello.daniel@gmail.com');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [sendingFinal, setSendingFinal] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function loadData() {
    setLoading(true);
    setMessage(null);

    const [communicationsResult, groupsResult, targetsResult, subscriberGroupsResult, subscribersResult, deliveriesResult] = await Promise.all([
      supabase
        .from('gdrb_communications')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .from('gdrb_communication_groups')
        .select('id,name,slug,group_type,birth_years,is_active,sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
      supabase
        .from('gdrb_communication_targets')
        .select('communication_id,group_id'),
      supabase
        .from('gdrb_subscriber_groups')
        .select('subscriber_id,group_id'),
      supabase
        .from('gdrb_subscribers')
        .select('id,name,email,contact_type,communication_scope,consent_email,consent_email_newsletter,consent_email_club,is_active,unsubscribed_at'),
      supabase
        .from('gdrb_communication_deliveries')
        .select('id,communication_id,recipient_email,recipient_name,status,error_message,sent_at,created_at')
        .order('created_at', { ascending: false })
        .limit(120),
    ]);

    if (communicationsResult.error) {
      console.error(communicationsResult.error);
      setMessage({ type: 'error', text: 'Não foi possível carregar as comunicações.' });
      setCommunications([]);
    } else {
      setCommunications((communicationsResult.data || []) as Communication[]);
    }

    if (groupsResult.error) {
      console.error(groupsResult.error);
      setGroups([]);
    } else {
      setGroups((groupsResult.data || []) as CommunicationGroup[]);
    }

    if (targetsResult.error) {
      console.error(targetsResult.error);
      setTargets([]);
    } else {
      setTargets((targetsResult.data || []) as CommunicationTarget[]);
    }

    if (subscriberGroupsResult.error) {
      console.error(subscriberGroupsResult.error);
      setSubscriberGroups([]);
    } else {
      setSubscriberGroups((subscriberGroupsResult.data || []) as SubscriberGroup[]);
    }

    if (subscribersResult.error) {
      console.error(subscribersResult.error);
      setSubscribers([]);
    } else {
      setSubscribers((subscribersResult.data || []) as Subscriber[]);
    }

    if (deliveriesResult.error) {
      console.error(deliveriesResult.error);
      setDeliveries([]);
    } else {
      setDeliveries((deliveriesResult.data || []) as Delivery[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const selectedCommunication = useMemo(() => {
    if (!selectedCommunicationId) return null;
    return communications.find((communication) => communication.id === selectedCommunicationId) || null;
  }, [communications, selectedCommunicationId]);

  const selectedDeliveries = useMemo(() => {
    if (!selectedCommunicationId) return [];
    return deliveries.filter((delivery) => delivery.communication_id === selectedCommunicationId);
  }, [deliveries, selectedCommunicationId]);

  const compatibleGroups = useMemo(() => {
    return groups.filter((group) => groupMatchesCommunicationType(group, form.communication_type));
  }, [groups, form.communication_type]);

  const audienceSummary = useMemo(() => {
    return calculateAudienceSummary({
      subscribers,
      subscriberGroups,
      communicationType: form.communication_type,
      groupIds: form.groupIds,
    });
  }, [subscribers, subscriberGroups, form.communication_type, form.groupIds]);

  const stats = useMemo(() => {
    const total = communications.length;
    const drafts = communications.filter((item) => item.status === 'draft').length;
    const ready = communications.filter((item) => item.status === 'ready').length;
    const sent = communications.filter((item) => item.status === 'sent').length;

    return { total, drafts, ready, sent };
  }, [communications]);

  function resetForm() {
    setForm(emptyForm);
    setSelectedCommunicationId(null);
    setMessage(null);
  }

  function editCommunication(communication: Communication) {
    const groupIds = targets
      .filter((target) => target.communication_id === communication.id)
      .map((target) => target.group_id);

    setSelectedCommunicationId(communication.id);
    setForm({
      id: communication.id,
      title: communication.title || '',
      subject: communication.subject || '',
      preview_text: communication.preview_text || '',
      body: communication.body || '',
      channel: communication.channel || 'email',
      status: communication.status || 'draft',
      from_name: communication.from_name || 'GDR Boavista',
      from_email: communication.from_email || 'notificacoes@send.gdrboavista.pt',
      communication_type: communication.communication_type || 'newsletter',
      audience_mode: communication.audience_mode || 'selected_groups',
      groupIds,
    });
    setMessage(null);
  }

  function changeCommunicationType(type: CommunicationType) {
    setForm((current) => ({
      ...current,
      communication_type: type,
      audience_mode: type === 'geral' ? 'all_active' : 'selected_groups',
      groupIds: [],
    }));
  }

  function toggleGroup(groupId: string) {
    setForm((current) => ({
      ...current,
      groupIds: current.groupIds.includes(groupId)
        ? current.groupIds.filter((id) => id !== groupId)
        : [...current.groupIds, groupId],
    }));
  }

  async function saveTargets(communicationId: string, groupIds: string[]) {
    const { error: deleteError } = await supabase
      .from('gdrb_communication_targets')
      .delete()
      .eq('communication_id', communicationId);

    if (deleteError) throw deleteError;

    if (groupIds.length === 0) return;

    const { error: insertError } = await supabase.from('gdrb_communication_targets').insert(
      groupIds.map((groupId) => ({
        communication_id: communicationId,
        group_id: groupId,
      })),
    );

    if (insertError) throw insertError;
  }

  async function saveCommunication() {
    const title = form.title.trim();
    const subject = form.subject.trim();
    const body = form.body.trim();

    if (!title || !subject || !body) {
      setMessage({ type: 'error', text: 'Preenche título, assunto e mensagem.' });
      return;
    }

    if (audienceSummary.needsGroups) {
      setMessage({ type: 'error', text: 'Seleciona pelo menos um grupo compatível com este tipo de comunicação.' });
      return;
    }

    setSaving(true);
    setMessage(null);

    const payload = {
      title,
      subject,
      preview_text: form.preview_text.trim() || null,
      body,
      channel: form.channel,
      status: form.status === 'sent' ? 'ready' : form.status,
      from_name: form.from_name.trim() || 'GDR Boavista',
      from_email: form.from_email.trim() || 'notificacoes@send.gdrboavista.pt',
      communication_type: form.communication_type,
      audience_mode: form.audience_mode,
      estimated_recipients: audienceSummary.recipients,
      excluded_no_consent: audienceSummary.excludedNoConsent,
      excluded_inactive: audienceSummary.excludedInactive,
      excluded_no_email: audienceSummary.excludedNoEmail,
      updated_at: new Date().toISOString(),
    };

    try {
      let communicationId = form.id;

      if (communicationId) {
        const { error } = await supabase
          .from('gdrb_communications')
          .update(payload)
          .eq('id', communicationId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('gdrb_communications')
          .insert({
            ...payload,
            created_by: 'admin',
          })
          .select('id')
          .single();

        if (error) throw error;
        communicationId = data?.id || null;
      }

      if (!communicationId) {
        throw new Error('Não foi possível identificar a comunicação.');
      }

      await saveTargets(communicationId, form.groupIds);

      setMessage({ type: 'success', text: 'Comunicação guardada com sucesso.' });
      await loadData();

      const refreshed = communicationId
        ? (await supabase.from('gdrb_communications').select('*').eq('id', communicationId).single()).data
        : null;

      if (refreshed) {
        editCommunication(refreshed as Communication);
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Não foi possível guardar a comunicação.' });
    } finally {
      setSaving(false);
    }
  }

  async function sendNewsletter(mode: 'test' | 'send') {
    if (!form.id) {
      setMessage({ type: 'error', text: 'Guarda a comunicação antes de enviar.' });
      return;
    }

    if (mode === 'send') {
      if (audienceSummary.needsGroups) {
        setMessage({ type: 'error', text: 'Seleciona pelo menos um grupo antes do envio definitivo.' });
        return;
      }

      if (audienceSummary.recipients === 0) {
        setMessage({ type: 'error', text: 'Não existem destinatários ativos com consentimento para esta comunicação.' });
        return;
      }
    }

    if (mode === 'test') {
      setSendingTest(true);
    } else {
      const confirmed = window.confirm(
        `Confirmas o envio definitivo desta comunicação para ${audienceSummary.recipients} destinatário(s)?\n\nEsta ação não pode ser desfeita.`,
      );

      if (!confirmed) return;
      setSendingFinal(true);
    }

    setMessage(null);

    try {
      const response = await fetch('/api/send-newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          communicationId: form.id,
          mode,
          testEmail,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result?.error || 'Não foi possível enviar a comunicação.');
      }

      if (mode === 'test') {
        setMessage({ type: 'success', text: `Email de teste enviado para ${testEmail}.` });
      } else {
        setMessage({
          type: 'success',
          text: `Envio concluído. Enviados: ${result.sentCount || 0}. Falhas: ${result.failedCount || 0}.`,
        });
      }

      await loadData();
    } catch (error) {
      console.error(error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Não foi possível enviar a comunicação.',
      });
    } finally {
      setSendingTest(false);
      setSendingFinal(false);
    }
  }

  function groupsLabel(communicationId: string) {
    const groupIds = targets
      .filter((target) => target.communication_id === communicationId)
      .map((target) => target.group_id);

    if (groupIds.length === 0) return 'Todos os contactos compatíveis';

    const names = groups
      .filter((group) => groupIds.includes(group.id))
      .map((group) => group.name);

    return names.length ? names.join(', ') : 'Grupos selecionados';
  }

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#21150f] via-[#3b120f] to-[#8b1d1d] p-8 text-white shadow-xl">
        <div className="max-w-3xl">
          <p className="mb-4 text-xs font-black uppercase tracking-[0.35em] text-red-200">
            Administração
          </p>
          <h1 className="font-serif text-5xl font-bold">Comunicações.</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/80">
            Cria newsletters, comunicações por escalão e mensagens oficiais para contactos segmentados do GDR Boavista.
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
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Rascunhos</p>
          <p className="mt-3 text-3xl font-black text-slate-700">{stats.drafts}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-600">Prontas</p>
          <p className="mt-3 text-3xl font-black text-amber-700">{stats.ready}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600">Enviadas</p>
          <p className="mt-3 text-3xl font-black text-emerald-700">{stats.sent}</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-red-600">Histórico</p>
              <h2 className="mt-1 font-serif text-3xl font-bold text-zinc-900">Comunicações</h2>
            </div>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl bg-red-600 px-4 py-3 text-sm font-black text-white transition hover:bg-red-700"
            >
              Nova
            </button>
          </div>

          {loading ? (
            <div className="rounded-xl bg-zinc-50 p-8 text-center text-sm font-semibold text-zinc-500">
              A carregar comunicações...
            </div>
          ) : communications.length === 0 ? (
            <div className="rounded-xl bg-zinc-50 p-8 text-center">
              <Mail className="mx-auto mb-3 h-9 w-9 text-zinc-300" />
              <p className="font-black text-zinc-900">Ainda não existem comunicações.</p>
              <p className="mt-1 text-sm text-zinc-500">Cria a primeira comunicação no formulário ao lado.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {communications.map((communication) => (
                <button
                  key={communication.id}
                  type="button"
                  onClick={() => editCommunication(communication)}
                  className={`w-full rounded-xl border p-4 text-left transition hover:border-red-200 hover:bg-red-50/40 ${
                    selectedCommunicationId === communication.id
                      ? 'border-red-300 bg-red-50/60'
                      : 'border-zinc-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-black text-zinc-900">{communication.title}</h3>
                      <p className="mt-1 text-sm text-zinc-500">{communication.subject || 'Sem assunto'}</p>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${statusClass(
                        communication.status,
                      )}`}
                    >
                      {statusLabels[communication.status]}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2 text-xs font-semibold text-zinc-500 sm:grid-cols-2">
                    <span>{communicationTypeLabels[communication.communication_type || 'newsletter']}</span>
                    <span>{groupsLabel(communication.id)}</span>
                    <span>Criada: {formatDate(communication.created_at)}</span>
                    <span>Enviados: {communication.sent_count || 0} / Falhas: {communication.failed_count || 0}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-red-600">
                {form.id ? 'Editar comunicação' : 'Nova comunicação'}
              </p>
              <h2 className="mt-1 font-serif text-3xl font-bold text-zinc-900">
                {form.id ? form.title || 'Comunicação' : 'Criar comunicação'}
              </h2>
            </div>
            <button
              type="button"
              onClick={loadData}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-4 py-3 text-sm font-black text-zinc-700 transition hover:bg-zinc-50"
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </button>
          </div>

          <div className="mb-5 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="mb-3 text-sm font-black text-zinc-900">1. Tipo de comunicação</p>
            <div className="grid gap-2 md:grid-cols-2">
              {(Object.keys(communicationTypeLabels) as CommunicationType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => changeCommunicationType(type)}
                  className={`rounded-xl border p-3 text-left transition ${
                    form.communication_type === type
                      ? 'border-red-300 bg-red-50 text-red-800'
                      : 'border-zinc-200 bg-white text-zinc-700 hover:border-red-200'
                  }`}
                >
                  <span className="block text-sm font-black">{communicationTypeLabels[type]}</span>
                  <span className="mt-1 block text-xs leading-5 text-zinc-500">{communicationTypeDescriptions[type]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-black text-zinc-800">Título interno *</span>
              <input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Ex.: Jogos do fim de semana"
                className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-black text-zinc-800">Assunto do email *</span>
              <input
                value={form.subject}
                onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
                placeholder="Ex.: Agenda GDR Boavista para este fim de semana"
                className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-black text-zinc-800">Texto de resumo</span>
              <input
                value={form.preview_text}
                onChange={(event) => setForm((current) => ({ ...current, preview_text: event.target.value }))}
                placeholder="Resumo curto que pode aparecer na pré-visualização do email"
                className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-black text-zinc-800">Canal</span>
              <select
                value={form.channel}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    channel: event.target.value as FormState['channel'],
                  }))
                }
                className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
              >
                <option value="email">Email</option>
                <option value="email_whatsapp">Email + WhatsApp</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-black text-zinc-800">Estado</span>
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value as FormState['status'],
                  }))
                }
                className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
              >
                <option value="draft">Rascunho</option>
                <option value="ready">Pronta</option>
                <option value="archived">Arquivada</option>
              </select>
            </label>
          </div>

          <label className="mt-4 block space-y-2">
            <span className="text-sm font-black text-zinc-800">Mensagem *</span>
            <textarea
              value={form.body}
              onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
              rows={10}
              placeholder="Escreve aqui a comunicação. O sistema mantém as quebras de linha no email."
              className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm leading-7 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
            />
          </label>

          <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-black text-zinc-900">2. Destinatários compatíveis</p>
                <p className="text-xs text-zinc-500">
                  Os grupos abaixo mudam conforme o tipo de comunicação selecionado.
                </p>
              </div>
            </div>

            {compatibleGroups.length === 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-700">
                Não existem grupos compatíveis para este tipo de comunicação.
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {compatibleGroups.map((group) => (
                  <label
                    key={group.id}
                    className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 bg-white p-3 text-sm font-semibold text-zinc-700 transition hover:border-red-200 hover:bg-red-50/40"
                  >
                    <input
                      type="checkbox"
                      checked={form.groupIds.includes(group.id)}
                      onChange={() => toggleGroup(group.id)}
                      className="mt-1"
                    />
                    <span>
                      {group.name}
                      {group.birth_years && (
                        <span className="ml-1 text-xs text-zinc-400">({group.birth_years})</span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="mt-5 rounded-2xl border border-red-100 bg-red-50/40 p-4">
            <div className="mb-3 flex items-center gap-2">
              {audienceSummary.needsGroups ? (
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              )}
              <div>
                <p className="text-sm font-black text-zinc-900">3. Prévia de envio</p>
                <p className="text-xs text-zinc-500">Confirma sempre estes números antes do envio definitivo.</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-white p-3">
                <p className="text-xs font-black uppercase text-zinc-400">Receberão</p>
                <p className="mt-1 text-2xl font-black text-emerald-700">{audienceSummary.recipients}</p>
              </div>
              <div className="rounded-xl bg-white p-3">
                <p className="text-xs font-black uppercase text-zinc-400">Sem consent.</p>
                <p className="mt-1 text-2xl font-black text-amber-700">{audienceSummary.excludedNoConsent}</p>
              </div>
              <div className="rounded-xl bg-white p-3">
                <p className="text-xs font-black uppercase text-zinc-400">Inativos</p>
                <p className="mt-1 text-2xl font-black text-slate-700">{audienceSummary.excludedInactive}</p>
              </div>
              <div className="rounded-xl bg-white p-3">
                <p className="text-xs font-black uppercase text-zinc-400">Sem email</p>
                <p className="mt-1 text-2xl font-black text-red-700">{audienceSummary.excludedNoEmail}</p>
              </div>
            </div>

            {audienceSummary.needsGroups && (
              <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                Para este tipo de comunicação, seleciona pelo menos um grupo antes de guardar/enviar.
              </p>
            )}
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <input
              value={testEmail}
              onChange={(event) => setTestEmail(event.target.value)}
              placeholder="Email para teste"
              className="rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
            />

            <button
              type="button"
              onClick={saveCommunication}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 py-3 text-sm font-black text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving ? 'A guardar...' : 'Guardar'}
            </button>

            <button
              type="button"
              onClick={() => sendNewsletter('test')}
              disabled={sendingTest || saving || !form.id}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#24180f] px-5 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Mail className="h-4 w-4" />
              {sendingTest ? 'A enviar...' : 'Enviar teste'}
            </button>
          </div>

          <button
            type="button"
            onClick={() => sendNewsletter('send')}
            disabled={sendingFinal || saving || !form.id || audienceSummary.needsGroups || audienceSummary.recipients === 0}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-4 text-sm font-black uppercase tracking-wide text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {sendingFinal ? 'A enviar comunicação...' : `Enviar definitivo para ${audienceSummary.recipients} destinatário(s)`}
          </button>

          {selectedCommunication && (
            <div className="mt-5 rounded-2xl border border-zinc-200 bg-white p-4">
              <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-zinc-400">
                Últimos envios desta comunicação
              </p>

              {selectedDeliveries.length === 0 ? (
                <p className="text-sm text-zinc-500">Ainda não existem envios registados.</p>
              ) : (
                <div className="space-y-2">
                  {selectedDeliveries.slice(0, 8).map((delivery) => (
                    <div
                      key={delivery.id}
                      className="flex items-start justify-between gap-3 rounded-xl bg-zinc-50 px-3 py-2 text-sm"
                    >
                      <div>
                        <p className="font-bold text-zinc-800">{delivery.recipient_name || delivery.recipient_email}</p>
                        <p className="text-xs text-zinc-500">{delivery.recipient_email}</p>
                        {delivery.error_message && (
                          <p className="mt-1 text-xs text-red-600">{delivery.error_message}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center gap-1 text-xs font-black uppercase text-zinc-500">
                          {delivery.status === 'sent' ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-red-600" />
                          )}
                          {delivery.status}
                        </span>
                        <p className="mt-1 text-xs text-zinc-400">{formatDate(delivery.sent_at || delivery.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
