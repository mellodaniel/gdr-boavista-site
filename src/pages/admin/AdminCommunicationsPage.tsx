import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  ChevronDown,
  CheckCircle2,
  Copy,
  Filter,
  Mail,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Users,
  XCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useSessionState } from '../../hooks/useSessionState';

type CommunicationType = 'newsletter' | 'escalao' | 'interno' | 'socios' | 'parceiros' | 'geral';
type CommunicationKind = CommunicationType | 'individual';
type AudienceMode = 'all_active' | 'selected_groups' | 'manual';
type EmailTemplate = 'standard' | 'season_opening_2026_27';

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

type ManualRecipient = {
  communication_id: string;
  subscriber_id: string;
};

type SubscriberGroup = {
  subscriber_id: string;
  group_id: string;
};

type Subscriber = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  athlete_name: string | null;
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
  communication_type: CommunicationKind;
  audience_mode: AudienceMode;
  groupIds: string[];
  manualRecipientId: string;
  email_template: EmailTemplate;
};

type AudienceSummary = {
  recipients: number;
  excludedNoConsent: number;
  excludedInactive: number;
  excludedNoEmail: number;
  needsGroups: boolean;
  isManual: boolean;
}

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
  manualRecipientId: '',
  email_template: 'standard',
};

const seasonOpeningPreset = {
  subject: 'A época 2026/27 começa agora no GDR Boavista',
  previewText: 'Novos desafios, a mesma paixão. Consulta os horários de treino de todos os escalões.',
  body: `Uma nova época começa no GDR Boavista.

Regressamos ao campo com energia renovada, novos desafios e a mesma paixão que une atletas, treinadores, famílias, sócios e amigos do clube.

Em 2026/27 queremos continuar a formar atletas, construir equipas e representar o Boavista com trabalho, ambição, respeito e união.

Os dias e horários de treino de todos os escalões já estão disponíveis. Consulta o teu escalão e acompanha também todas as novidades no nosso site.

Contamos contigo para escrever mais um capítulo da nossa história.`,
};

function inferEmailTemplate(communication: Communication): EmailTemplate {
  const subject = communication.subject?.trim().toLowerCase() || '';

  return subject === seasonOpeningPreset.subject.toLowerCase()
    ? 'season_opening_2026_27'
    : 'standard';
}

const statusLabels: Record<Communication['status'], string> = {
  draft: 'Rascunho',
  ready: 'Pronta',
  sent: 'Enviada',
  archived: 'Arquivada',
};


const communicationTypeLabels: Record<CommunicationKind, string> = {
  newsletter: 'Newsletter geral',
  escalao: 'Comunicação por escalão',
  interno: 'Comunicação interna',
  socios: 'Comunicação para sócios',
  parceiros: 'Comunicação para parceiros',
  geral: 'Comunicação geral do clube',
  individual: 'Contacto individual',
};

const communicationTypeDescriptions: Record<CommunicationKind, string> = {
  newsletter: 'Apenas pessoas que subscreveram voluntariamente a newsletter pública do site.',
  escalao: 'Pais, encarregados, atletas e contactos associados a escalões/equipas específicas.',
  interno: 'Direção, treinadores, equipa técnica e contactos internos do clube.',
  socios: 'Contactos classificados como sócios.',
  parceiros: 'Contactos classificados como parceiros/patrocinadores.',
  geral: 'Comunicação institucional para todos os contactos ativos com consentimento aplicável.',
  individual: 'Envio único para uma pessoa/contacto específico pesquisado na base de contactos.',
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

function groupMatchesCommunicationType(group: CommunicationGroup, type: CommunicationKind) {
  if (type === 'individual') return false;
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
  manualRecipientId,
}: {
  subscribers: Subscriber[];
  subscriberGroups: SubscriberGroup[];
  communicationType: CommunicationKind;
  groupIds: string[];
  manualRecipientId: string;
}): AudienceSummary {
  const isManual = communicationType === 'individual';
  const needsGroups = !isManual && ['escalao', 'interno', 'socios', 'parceiros'].includes(communicationType) && groupIds.length === 0;

  if (isManual) {
    const subscriber = subscribers.find((item) => item.id === manualRecipientId);

    if (!subscriber) {
      return { recipients: 0, excludedNoConsent: 0, excludedInactive: 0, excludedNoEmail: 0, needsGroups: false, isManual: true };
    }

    if (!subscriber.is_active || subscriber.unsubscribed_at) {
      return { recipients: 0, excludedNoConsent: 0, excludedInactive: 1, excludedNoEmail: 0, needsGroups: false, isManual: true };
    }

    if (!normalizeEmail(subscriber.email)) {
      return { recipients: 0, excludedNoConsent: 0, excludedInactive: 0, excludedNoEmail: 1, needsGroups: false, isManual: true };
    }

    return {
      recipients: 1,
      excludedNoConsent: subscriberHasConsent(subscriber, 'geral') ? 0 : 1,
      excludedInactive: 0,
      excludedNoEmail: 0,
      needsGroups: false,
      isManual: true,
    };
  }
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
    if (!subscriberMatchesType(subscriber, communicationType as CommunicationType)) return;

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

    if (!subscriberHasConsent(subscriber, communicationType as CommunicationType)) {
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
    isManual,
  };
}

export function AdminCommunicationsPage() {
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [groups, setGroups] = useState<CommunicationGroup[]>([]);
  const [targets, setTargets] = useState<CommunicationTarget[]>([]);
  const [manualRecipients, setManualRecipients] = useState<ManualRecipient[]>([]);
  const [subscriberGroups, setSubscriberGroups] = useState<SubscriberGroup[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [form, setForm] = useSessionState<FormState>('admin:communications:form', emptyForm);
  const [selectedCommunicationId, setSelectedCommunicationId] = useSessionState<string | null>('admin:communications:selectedId', null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingFinal, setSendingFinal] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | Communication['status']>('all');
  const [historyTypeFilter, setHistoryTypeFilter] = useState<'all' | CommunicationKind>('all');
  const [historyDateFrom, setHistoryDateFrom] = useState('');
  const [historyDateTo, setHistoryDateTo] = useState('');
  const [showHistoryMobileFilters, setShowHistoryMobileFilters] = useState(false);
  const [expandedCommunicationId, setExpandedCommunicationId] = useState<string | null>(null);
  const [recipientSearchTerm, setRecipientSearchTerm] = useState('');

  async function loadData() {
    setLoading(true);
    setMessage(null);

    const [communicationsResult, groupsResult, targetsResult, manualRecipientsResult, subscriberGroupsResult, subscribersResult, deliveriesResult] = await Promise.all([
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
        .from('gdrb_communication_manual_recipients')
        .select('communication_id,subscriber_id'),
      supabase
        .from('gdrb_subscriber_groups')
        .select('subscriber_id,group_id'),
      supabase
        .from('gdrb_subscribers')
        .select('id,name,email,phone,athlete_name,contact_type,communication_scope,consent_email,consent_email_newsletter,consent_email_club,is_active,unsubscribed_at'),
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

    if (manualRecipientsResult.error) {
      console.error(manualRecipientsResult.error);
      setManualRecipients([]);
    } else {
      setManualRecipients((manualRecipientsResult.data || []) as ManualRecipient[]);
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
    if (form.communication_type === 'individual') return [];
    return groups.filter((group) => groupMatchesCommunicationType(group, form.communication_type));
  }, [groups, form.communication_type]);

  const hasCommunicationContent = form.subject.trim().length > 0 || form.body.trim().length > 0;

  const hasAudienceSelection =
    form.communication_type === 'individual'
      ? Boolean(form.manualRecipientId)
      : form.communication_type === 'newsletter' || form.communication_type === 'geral'
        ? hasCommunicationContent
        : form.groupIds.length > 0;

  const audienceSummary = useMemo(() => {
    if (!hasCommunicationContent || !hasAudienceSelection) {
      return {
        recipients: 0,
        excludedNoConsent: 0,
        excludedInactive: 0,
        excludedNoEmail: 0,
        needsGroups: false,
        isManual: form.communication_type === 'individual',
      };
    }

    return calculateAudienceSummary({
      subscribers,
      subscriberGroups,
      communicationType: form.communication_type,
      groupIds: form.groupIds,
      manualRecipientId: form.manualRecipientId,
    });
  }, [
    subscribers,
    subscriberGroups,
    form.communication_type,
    form.groupIds,
    form.manualRecipientId,
    hasCommunicationContent,
    hasAudienceSelection,
  ]);

  const stats = useMemo(() => {
    const visibleCommunications = communications.filter((item) => item.status !== 'archived');
    const total = visibleCommunications.length;
    const drafts = visibleCommunications.filter((item) => item.status === 'draft').length;
    const ready = visibleCommunications.filter((item) => item.status === 'ready').length;
    const sent = visibleCommunications.filter((item) => item.status === 'sent').length;

    return { total, drafts, ready, sent };
  }, [communications]);


  const filteredCommunications = useMemo(() => {
    const term = historySearchTerm.trim().toLowerCase();

    return communications.filter((communication) => {
      const searchable = [
        communication.title,
        communication.subject,
        communication.preview_text,
        communication.body,
        communication.audience_mode === 'manual' ? communicationTypeLabels.individual : communicationTypeLabels[communication.communication_type || 'newsletter'],
        groupsLabel(communication.id),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch = !term || searchable.includes(term);
      const matchesStatus =
        historyStatusFilter === 'all'
          ? communication.status !== 'archived'
          : communication.status === historyStatusFilter;
      const matchesType =
        historyTypeFilter === 'all' ||
        (historyTypeFilter === 'individual'
          ? communication.audience_mode === 'manual'
          : communication.communication_type === historyTypeFilter && communication.audience_mode !== 'manual');

      const referenceDate = new Date(communication.sent_at || communication.created_at);
      const matchesDateFrom = !historyDateFrom || referenceDate >= new Date(`${historyDateFrom}T00:00:00`);
      const matchesDateTo = !historyDateTo || referenceDate <= new Date(`${historyDateTo}T23:59:59`);

      return matchesSearch && matchesStatus && matchesType && matchesDateFrom && matchesDateTo;
    });
  }, [communications, historySearchTerm, historyStatusFilter, historyTypeFilter, historyDateFrom, historyDateTo, targets, groups, manualRecipients, subscribers]);


  const selectedManualSubscriber = useMemo(() => {
    if (!form.manualRecipientId) return null;
    return subscribers.find((subscriber) => subscriber.id === form.manualRecipientId) || null;
  }, [subscribers, form.manualRecipientId]);

  const filteredRecipientOptions = useMemo(() => {
    const term = recipientSearchTerm.trim().toLowerCase();

    return subscribers
      .filter((subscriber) => normalizeEmail(subscriber.email))
      .filter((subscriber) => {
        if (!term) return true;
        return [subscriber.name, subscriber.email, subscriber.phone, subscriber.athlete_name, subscriber.contact_type]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(term);
      })
      .slice(0, 12);
  }, [subscribers, recipientSearchTerm]);

  function resetForm() {
    setForm(emptyForm);
    setSelectedCommunicationId(null);
    setRecipientSearchTerm('');
    setMessage(null);
  }

  function editCommunication(communication: Communication) {
    const groupIds = targets
      .filter((target) => target.communication_id === communication.id)
      .map((target) => target.group_id);
    const manualRecipientId = manualRecipients.find((recipient) => recipient.communication_id === communication.id)?.subscriber_id || '';

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
      communication_type: communication.audience_mode === 'manual' ? 'individual' : communication.communication_type || 'newsletter',
      audience_mode: communication.audience_mode || 'selected_groups',
      groupIds,
      manualRecipientId,
      email_template: inferEmailTemplate(communication),
    });
    const selected = subscribers.find((subscriber) => subscriber.id === manualRecipientId);
    setRecipientSearchTerm(selected ? `${selected.name || 'Sem nome'} — ${selected.email || ''}` : '');
    setMessage(null);
  }

  function changeCommunicationType(type: CommunicationKind) {
    setForm((current) => ({
      ...current,
      communication_type: type,
      audience_mode: type === 'individual' ? 'manual' : type === 'geral' ? 'all_active' : 'selected_groups',
      groupIds: [],
      manualRecipientId: '',
    }));
  }

  function applySeasonOpeningPreset() {
    const hasExistingContent = Boolean(
      form.subject.trim() || form.preview_text.trim() || form.body.trim(),
    );

    if (hasExistingContent) {
      const confirmed = window.confirm(
        'Aplicar o modelo vai substituir o assunto, o texto de pré-visualização e a mensagem atuais. Continuar?',
      );

      if (!confirmed) return;
    }

    setForm((current) => ({
      ...current,
      subject: seasonOpeningPreset.subject,
      preview_text: seasonOpeningPreset.previewText,
      body: seasonOpeningPreset.body,
      channel: 'email',
      email_template: 'season_opening_2026_27',
    }));

    setMessage({
      type: 'success',
      text: 'Modelo “Início da época 2026/27” aplicado. Revê o conteúdo e escolhe os destinatários antes do envio.',
    });
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

  async function saveManualRecipients(communicationId: string, subscriberId: string) {
    const { error: deleteError } = await supabase
      .from('gdrb_communication_manual_recipients')
      .delete()
      .eq('communication_id', communicationId);

    if (deleteError) throw deleteError;

    if (!subscriberId) return;

    const { error: insertError } = await supabase
      .from('gdrb_communication_manual_recipients')
      .insert({
        communication_id: communicationId,
        subscriber_id: subscriberId,
      });

    if (insertError) throw insertError;
  }

  async function persistCommunication() {
    const title = form.subject.trim();
    const subject = form.subject.trim();
    const body = form.body.trim();

    if (!subject || !body) {
      throw new Error('Preenche assunto e mensagem.');
    }

    if (audienceSummary.needsGroups) {
      throw new Error('Seleciona pelo menos um grupo compatível com este tipo de comunicação.');
    }

    if (form.communication_type === 'individual' && !form.manualRecipientId) {
      throw new Error('Seleciona o contacto individual que vai receber esta comunicação.');
    }

    const payload = {
      title: title || subject,
      subject,
      preview_text: form.preview_text.trim() || null,
      body,
      channel: form.channel,
      status: 'ready' as const,
      from_name: form.from_name.trim() || 'GDR Boavista',
      from_email: form.from_email.trim() || 'notificacoes@send.gdrboavista.pt',
      communication_type: form.communication_type === 'individual' ? 'geral' : form.communication_type,
      audience_mode: form.communication_type === 'individual' ? 'manual' : form.audience_mode,
      estimated_recipients: audienceSummary.recipients,
      excluded_no_consent: audienceSummary.excludedNoConsent,
      excluded_inactive: audienceSummary.excludedInactive,
      excluded_no_email: audienceSummary.excludedNoEmail,
      updated_at: new Date().toISOString(),
    };

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

    await saveTargets(communicationId, form.communication_type === 'individual' ? [] : form.groupIds);
    await saveManualRecipients(communicationId, form.communication_type === 'individual' ? form.manualRecipientId : '');

    return communicationId;
  }

  async function sendNewsletter() {
    if (audienceSummary.needsGroups) {
      setMessage({ type: 'error', text: 'Seleciona pelo menos um grupo antes do envio definitivo.' });
      return;
    }

    if (form.communication_type === 'individual' && !form.manualRecipientId) {
      setMessage({ type: 'error', text: 'Seleciona o contacto individual antes do envio definitivo.' });
      return;
    }

    if (audienceSummary.recipients === 0) {
      setMessage({ type: 'error', text: 'Não existem destinatários ativos com consentimento para esta comunicação.' });
      return;
    }

    const confirmed = window.confirm(
      form.communication_type === 'individual'
        ? `Confirmas o envio desta comunicação para ${selectedManualSubscriber?.name || selectedManualSubscriber?.email || '1 destinatário'}?\n\nEsta ação não pode ser desfeita.`
        : `Confirmas o envio definitivo desta comunicação para ${audienceSummary.recipients} destinatário(s)?\n\nEsta ação não pode ser desfeita.`,
    );

    if (!confirmed) return;

    setSendingFinal(true);
    setSaving(true);
    setMessage(null);

    try {
      const communicationId = await persistCommunication();

      const response = await fetch('/api/send-newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          communicationId,
          mode: 'send',
          emailTemplate: form.email_template || 'standard',
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result?.error || 'Não foi possível enviar a comunicação.');
      }

      setForm(emptyForm);
      setSelectedCommunicationId(null);
      setExpandedCommunicationId(null);
      setRecipientSearchTerm('');

      await loadData();

      setMessage({
        type: 'success',
        text: `Envio concluído. Enviados: ${result.sentCount || 0}. Falhas: ${result.failedCount || 0}.`,
      });

      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error(error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Não foi possível enviar a comunicação.',
      });
    } finally {
      setSendingFinal(false);
      setSaving(false);
    }
  }

  function groupsLabel(communicationId: string) {
    const manualRecipientId = manualRecipients.find((recipient) => recipient.communication_id === communicationId)?.subscriber_id;
    if (manualRecipientId) {
      const subscriber = subscribers.find((item) => item.id === manualRecipientId);
      return subscriber ? `${subscriber.name || 'Sem nome'} — ${subscriber.email || 'sem email'}` : 'Contacto individual';
    }

    const groupIds = targets
      .filter((target) => target.communication_id === communicationId)
      .map((target) => target.group_id);

    if (groupIds.length === 0) return 'Todos os contactos compatíveis';

    const names = groups
      .filter((group) => groupIds.includes(group.id))
      .map((group) => group.name);

    return names.length ? names.join(', ') : 'Grupos selecionados';
  }

  async function archiveCommunication(communication: Communication) {
    const confirmed = window.confirm(`Arquivar a comunicação "${communication.title}"?`);
    if (!confirmed) return;

    setMessage(null);

    const { error } = await supabase
      .from('gdrb_communications')
      .update({
        status: 'archived',
        updated_at: new Date().toISOString(),
      })
      .eq('id', communication.id);

    if (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Não foi possível arquivar a comunicação.' });
      return;
    }

    if (selectedCommunicationId === communication.id) {
      resetForm();
    }

    setMessage({ type: 'success', text: 'Comunicação arquivada com sucesso.' });
    await loadData();
  }

  async function duplicateCommunication(communication: Communication) {
    setMessage(null);

    try {
      const groupIds = targets
        .filter((target) => target.communication_id === communication.id)
        .map((target) => target.group_id);
      const manualRecipientId = manualRecipients.find((recipient) => recipient.communication_id === communication.id)?.subscriber_id || '';

      const { data, error } = await supabase
        .from('gdrb_communications')
        .insert({
          title: `Cópia de ${communication.title}`,
          subject: communication.subject,
          preview_text: communication.preview_text,
          body: communication.body,
          channel: communication.channel,
          status: 'draft',
          from_name: communication.from_name || 'GDR Boavista',
          from_email: communication.from_email || 'notificacoes@send.gdrboavista.pt',
          communication_type: communication.communication_type || 'newsletter',
          audience_mode: communication.audience_mode || 'selected_groups',
          estimated_recipients: 0,
          excluded_no_consent: 0,
          excluded_inactive: 0,
          excluded_no_email: 0,
          sent_count: 0,
          failed_count: 0,
          created_by: 'admin',
        })
        .select('id')
        .single();

      if (error) throw error;

      const newCommunicationId = data?.id;
      if (!newCommunicationId) throw new Error('Não foi possível criar a cópia.');

      await saveTargets(newCommunicationId, groupIds);
      await saveManualRecipients(newCommunicationId, manualRecipientId);
      await loadData();

      const { data: duplicated } = await supabase
        .from('gdrb_communications')
        .select('*')
        .eq('id', newCommunicationId)
        .single();

      if (duplicated) {
        editCommunication(duplicated as Communication);
      }

      setExpandedCommunicationId(null);
      setMessage({ type: 'success', text: 'Comunicação duplicada como rascunho.' });
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Não foi possível duplicar a comunicação.' });
    }
  }

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#21150f] via-[#3b120f] to-[#8b1d1d] p-5 text-white shadow-xl md:p-8">
        <div className="max-w-3xl">
          <p className="mb-4 text-xs font-black uppercase tracking-[0.35em] text-red-200">
            Administração
          </p>
          <h1 className="font-serif text-4xl font-bold md:text-5xl">Comunicações.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/80 md:mt-5 md:text-base">
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

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm md:p-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Total</p>
          <p className="mt-2 text-2xl font-black md:mt-3 md:text-3xl text-zinc-900">{stats.total}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm md:p-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Rascunhos</p>
          <p className="mt-2 text-2xl font-black md:mt-3 md:text-3xl text-slate-700">{stats.drafts}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm md:p-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-600">Prontas</p>
          <p className="mt-2 text-2xl font-black md:mt-3 md:text-3xl text-amber-700">{stats.ready}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm md:p-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600">Enviadas</p>
          <p className="mt-2 text-2xl font-black md:mt-3 md:text-3xl text-emerald-700">{stats.sent}</p>
        </div>
      </section>

      <section className="grid gap-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-red-600">Histórico</p>
              <h2 className="mt-1 font-serif text-3xl font-bold text-zinc-900">Comunicações</h2>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowHistoryMobileFilters((value) => !value)}
            className="mb-4 flex w-full items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-black text-zinc-800 md:hidden"
          >
            <span className="inline-flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtros e pesquisa
            </span>
            <ChevronDown className={`h-4 w-4 transition ${showHistoryMobileFilters ? 'rotate-180' : ''}`} />
          </button>

          <div className={`${showHistoryMobileFilters ? 'mb-4 grid' : 'hidden'} gap-3 md:mb-4 md:grid lg:grid-cols-[1fr_170px_190px_150px_150px]`}>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                value={historySearchTerm}
                onChange={(event) => setHistorySearchTerm(event.target.value)}
                placeholder="Pesquisar por título, assunto, mensagem ou grupo..."
                className="w-full rounded-xl border border-zinc-200 py-3 pl-11 pr-4 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
              />
            </div>

            <select
              value={historyStatusFilter}
              onChange={(event) => setHistoryStatusFilter(event.target.value as 'all' | Communication['status'])}
              className="rounded-xl border border-zinc-200 px-3 py-3 text-sm font-semibold outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
            >
              <option value="all">Todos</option>
              <option value="draft">Rascunho</option>
              <option value="ready">Pronta</option>
              <option value="sent">Enviada</option>
              <option value="archived">Arquivadas</option>
            </select>

            <select
              value={historyTypeFilter}
              onChange={(event) => setHistoryTypeFilter(event.target.value as 'all' | CommunicationKind)}
              className="rounded-xl border border-zinc-200 px-3 py-3 text-sm font-semibold outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
            >
              <option value="all">Todos tipos</option>
              <option value="newsletter">Newsletter</option>
              <option value="escalao">Escalão</option>
              <option value="interno">Interna</option>
              <option value="socios">Sócios</option>
              <option value="parceiros">Parceiros</option>
              <option value="geral">Geral</option>
              <option value="individual">Contacto individual</option>
            </select>

            <input
              type="date"
              value={historyDateFrom}
              onChange={(event) => setHistoryDateFrom(event.target.value)}
              className="rounded-xl border border-zinc-200 px-3 py-3 text-sm font-semibold outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
            />

            <input
              type="date"
              value={historyDateTo}
              onChange={(event) => setHistoryDateTo(event.target.value)}
              className="rounded-xl border border-zinc-200 px-3 py-3 text-sm font-semibold outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
            />
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
          ) : filteredCommunications.length === 0 ? (
            <div className="rounded-xl bg-zinc-50 p-8 text-center text-sm font-semibold text-zinc-500">
              Nenhuma comunicação encontrada com os filtros atuais.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-zinc-200">
              <div className="hidden grid-cols-[1.4fr_1fr_0.65fr_0.8fr_1.15fr] gap-4 bg-zinc-50 px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-zinc-500 xl:grid">
                <span>Comunicação</span>
                <span>Tipo / Grupos</span>
                <span>Estado</span>
                <span>Envio</span>
                <span className="text-right">Ações</span>
              </div>

              <div className="divide-y divide-zinc-100">
                {filteredCommunications.map((communication) => {
                  const isExpanded = expandedCommunicationId === communication.id;
                  const communicationDeliveries = deliveries.filter((delivery) => delivery.communication_id === communication.id);

                  return (
                    <div
                      key={communication.id}
                      className={selectedCommunicationId === communication.id ? 'bg-red-50/40' : 'bg-white'}
                    >
                      <div className="grid gap-3 px-4 py-4 xl:grid-cols-[1.4fr_1fr_0.65fr_0.8fr_1.15fr] xl:items-center xl:px-5">
                        <div>
                          <h3 className="font-black text-zinc-900">{communication.title}</h3>
                          <p className="mt-1 text-sm text-zinc-500">{communication.subject || 'Sem assunto'}</p>
                          <p className="mt-1 text-xs text-zinc-400">Criada: {formatDate(communication.created_at)}</p>
                        </div>

                        <div className="text-sm font-semibold text-zinc-600">
                          <div>{communication.audience_mode === 'manual' ? communicationTypeLabels.individual : communicationTypeLabels[communication.communication_type || 'newsletter']}</div>
                          <div className="mt-1 line-clamp-2 text-xs text-zinc-400">{groupsLabel(communication.id)}</div>
                        </div>

                        <div>
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${statusClass(
                              communication.status,
                            )}`}
                          >
                            {statusLabels[communication.status]}
                          </span>
                        </div>

                        <div className="text-sm font-semibold text-zinc-600">
                          <div>{communication.sent_at ? formatDate(communication.sent_at) : 'Ainda não enviada'}</div>
                          <div className="mt-1 text-xs text-zinc-400">
                            {communication.sent_count || 0} enviados · {communication.failed_count || 0} falhas
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-start xl:justify-end">
                          <button
                            type="button"
                            onClick={() => editCommunication(communication)}
                            className="rounded-lg border border-zinc-200 bg-white px-3 py-3 text-xs font-black text-zinc-700 transition hover:bg-zinc-50 sm:py-2"
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            onClick={() => setExpandedCommunicationId(isExpanded ? null : communication.id)}
                            className="inline-flex items-center justify-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 py-3 text-xs font-black text-zinc-700 transition hover:bg-zinc-50 sm:py-2"
                          >
                            Detalhes
                            <ChevronDown className={`h-3.5 w-3.5 transition ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>

                          <button
                            type="button"
                            onClick={() => duplicateCommunication(communication)}
                            className="inline-flex items-center justify-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 py-3 text-xs font-black text-zinc-700 transition hover:bg-zinc-50 sm:py-2"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            Duplicar
                          </button>

                          {communication.status !== 'archived' && (
                            <button
                              type="button"
                              onClick={() => archiveCommunication(communication)}
                              className="inline-flex items-center justify-center gap-1 rounded-lg bg-zinc-900 px-3 py-3 text-xs font-black text-white transition hover:bg-zinc-700 sm:py-2"
                            >
                              <Archive className="h-3.5 w-3.5" />
                              Arquivar
                            </button>
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-zinc-100 bg-zinc-50 px-4 py-4">
                          <div className="grid gap-4 lg:grid-cols-2">
                            <div className="rounded-xl bg-white p-4">
                              <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">Resumo</p>
                              <div className="mt-3 grid gap-2 text-sm text-zinc-600">
                                <div><strong>Assunto:</strong> {communication.subject || '—'}</div>
                                <div><strong>Prévia:</strong> {communication.preview_text || '—'}</div>
                                <div><strong>Destinatários estimados:</strong> {communication.estimated_recipients || 0}</div>
                                <div><strong>Sem consentimento:</strong> {communication.excluded_no_consent || 0}</div>
                                <div><strong>Inativos:</strong> {communication.excluded_inactive || 0}</div>
                                <div><strong>Sem email:</strong> {communication.excluded_no_email || 0}</div>
                              </div>
                            </div>

                            <div className="rounded-xl bg-white p-4">
                              <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">Entregas recentes</p>
                              {communicationDeliveries.length === 0 ? (
                                <p className="mt-3 text-sm text-zinc-500">Ainda não existem entregas registadas.</p>
                              ) : (
                                <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
                                  {communicationDeliveries.slice(0, 10).map((delivery) => (
                                    <div key={delivery.id} className="rounded-lg bg-zinc-50 px-3 py-2 text-sm">
                                      <div className="flex items-start justify-between gap-3">
                                        <div>
                                          <p className="font-bold text-zinc-800">{delivery.recipient_name || delivery.recipient_email}</p>
                                          <p className="text-xs text-zinc-500">{delivery.recipient_email}</p>
                                          {delivery.error_message && (
                                            <p className="mt-1 text-xs text-red-600">{delivery.error_message}</p>
                                          )}
                                        </div>
                                        <span className="text-xs font-black uppercase text-zinc-500">{delivery.status}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-red-600">
                {form.id ? 'Comunicação existente' : 'Nova comunicação'}
              </p>
              <h2 className="mt-1 font-serif text-3xl font-bold text-zinc-900">
                {form.id ? form.subject || form.title || 'Comunicação' : 'Enviar comunicação'}
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
              {(Object.keys(communicationTypeLabels) as CommunicationKind[]).map((type) => (
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

          <div className="mb-5 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="mb-4 flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-black text-zinc-900">Modelo visual do email</p>
                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  Escolhe o formato simples ou a campanha visual preparada para o início da época.
                </p>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <button
                type="button"
                onClick={() => setForm((current) => ({ ...current, email_template: 'standard' }))}
                className={`rounded-2xl border p-4 text-left transition ${
                  (form.email_template || 'standard') === 'standard'
                    ? 'border-red-300 bg-white shadow-sm ring-2 ring-red-100'
                    : 'border-zinc-200 bg-white hover:border-red-200'
                }`}
              >
                <span className="block text-xs font-black uppercase tracking-[0.18em] text-zinc-400">
                  Modelo simples
                </span>
                <span className="mt-2 block text-base font-black text-zinc-900">Comunicação editorial</span>
                <span className="mt-1 block text-xs leading-5 text-zinc-500">
                  Assunto e mensagem num formato neutro, leve e compatível com todos os clientes de email.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setForm((current) => ({ ...current, email_template: 'season_opening_2026_27' }))}
                className={`group overflow-hidden rounded-2xl border text-left transition ${
                  (form.email_template || 'standard') === 'season_opening_2026_27'
                    ? 'border-red-300 bg-white shadow-sm ring-2 ring-red-100'
                    : 'border-zinc-200 bg-white hover:border-red-200'
                }`}
              >
                <div className="relative h-32 overflow-hidden bg-[#21150f]">
                  <img
                    src="https://images.pexels.com/photos/33471345/pexels-photo-33471345/free-photo-of-sprinklers-watering-soccer-stadium-field-at-night.jpeg?auto=compress&dpr=1&h=750&w=1260"
                    alt="Campo de futebol iluminado"
                    className="h-full w-full object-cover opacity-75 transition duration-500 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#21150f]/90 via-[#21150f]/45 to-red-950/30" />
                  <div className="absolute inset-x-4 bottom-4">
                    <span className="block text-[10px] font-black uppercase tracking-[0.24em] text-red-200">
                      Campanha visual
                    </span>
                    <span className="mt-1 block text-lg font-black text-white">Início da época 2026/27</span>
                  </div>
                </div>
                <span className="block p-4 text-xs leading-5 text-zinc-500">
                  Imagem de futebol, saudação personalizada, horários, ligação para o site e cancelamento de subscrição.
                </span>
              </button>
            </div>

            {(form.email_template || 'standard') === 'season_opening_2026_27' && (
              <div className="mt-4 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-black text-red-900">Campanha pronta para personalizar</p>
                  <p className="mt-1 text-xs leading-5 text-red-700">
                    O banner, os botões e a saudação serão adicionados automaticamente no email final.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={applySeasonOpeningPreset}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-white transition hover:bg-red-800"
                >
                  <Sparkles className="h-4 w-4" />
                  Preencher campanha
                </button>
              </div>
            )}
          </div>

          <div className="grid gap-4">
            <label className="space-y-2">
              <span className="text-sm font-black text-zinc-800">Assunto do email *</span>
              <input
                value={form.subject}
                onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
                placeholder="Ex.: Agenda GDR Boavista para este fim de semana"
                className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-black text-zinc-800">Texto de pré-visualização</span>
              <input
                value={form.preview_text}
                onChange={(event) => setForm((current) => ({ ...current, preview_text: event.target.value }))}
                placeholder="Texto curto que aparece junto ao assunto na caixa de entrada"
                className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
              />
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
                  {form.communication_type === 'individual'
                    ? 'Pesquisa e seleciona uma pessoa/contacto específico.'
                    : 'Os grupos abaixo mudam conforme o tipo de comunicação selecionado.'}
                </p>
              </div>
            </div>

            {form.communication_type === 'individual' ? (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    value={recipientSearchTerm}
                    onChange={(event) => {
                      setRecipientSearchTerm(event.target.value);
                      setForm((current) => ({ ...current, manualRecipientId: '' }));
                    }}
                    placeholder="Pesquisar por nome, email, telefone ou atleta..."
                    className="w-full rounded-xl border border-zinc-200 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
                  />
                </div>

                {selectedManualSubscriber ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-black text-emerald-900">{selectedManualSubscriber.name || 'Sem nome'}</p>
                        <p className="mt-1 text-sm font-semibold text-emerald-800">{selectedManualSubscriber.email}</p>
                        <p className="mt-1 text-xs text-emerald-700">
                          Tipo: {selectedManualSubscriber.contact_type || '—'} · Escopo: {selectedManualSubscriber.communication_scope || '—'}
                        </p>
                        {selectedManualSubscriber.athlete_name && (
                          <p className="mt-1 text-xs text-emerald-700">Atleta: {selectedManualSubscriber.athlete_name}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setForm((current) => ({ ...current, manualRecipientId: '' }));
                          setRecipientSearchTerm('');
                        }}
                        className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-black text-emerald-800 transition hover:bg-emerald-100"
                      >
                        Trocar contacto
                      </button>
                    </div>

                    {audienceSummary.excludedNoConsent > 0 && (
                      <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                        Este contacto não tem consentimento registado para comunicações gerais. Usa apenas para comunicação operacional/administrativa justificada.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
                    {filteredRecipientOptions.length === 0 ? (
                      <div className="p-4 text-sm font-semibold text-zinc-500">
                        Nenhum contacto com email encontrado para a pesquisa atual.
                      </div>
                    ) : (
                      <div className="divide-y divide-zinc-100">
                        {filteredRecipientOptions.map((subscriber) => (
                          <button
                            key={subscriber.id}
                            type="button"
                            onClick={() => {
                              setForm((current) => ({ ...current, manualRecipientId: subscriber.id }));
                              setRecipientSearchTerm(`${subscriber.name || 'Sem nome'} — ${subscriber.email || ''}`);
                            }}
                            className="flex w-full flex-col gap-1 px-4 py-3 text-left transition hover:bg-red-50 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <span>
                              <span className="block text-sm font-black text-zinc-900">{subscriber.name || 'Sem nome'}</span>
                              <span className="block text-xs font-semibold text-zinc-500">
                                {subscriber.email}
                                {subscriber.phone ? ` · ${subscriber.phone}` : ''}
                                {subscriber.athlete_name ? ` · Atleta: ${subscriber.athlete_name}` : ''}
                              </span>
                            </span>
                            <span className="text-xs font-black uppercase tracking-[0.12em] text-zinc-400">
                              {subscriber.is_active && !subscriber.unsubscribed_at ? 'Ativo' : 'Inativo'}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : compatibleGroups.length === 0 ? (
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
                Para este tipo de comunicação, seleciona pelo menos um grupo antes de enviar.
              </p>
            )}
          </div>

          <div className="mt-5">
            <button
              type="button"
              onClick={sendNewsletter}
              disabled={sendingFinal || saving || audienceSummary.needsGroups || audienceSummary.recipients === 0}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-4 text-sm font-black uppercase tracking-wide text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              {sendingFinal
                ? 'A enviar comunicação...'
                : form.communication_type === 'individual'
                  ? 'Enviar comunicação para contacto selecionado'
                  : `Enviar comunicação para ${audienceSummary.recipients} destinatário(s)`}
            </button>
          </div>

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
