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

type ExternalRecipientDraft = {
  name: string;
  email: string;
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
  source: string | null;
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
  manualRecipientIds: string[];
  externalRecipients: ExternalRecipientDraft[];
  manualRecipientId?: string;
  email_template: EmailTemplate;
};

type AudienceSummary = {
  recipients: number;
  existingRecipients: number;
  externalRecipients: number;
  manualNoConsent: number;
  includedWithoutConsent: number;
  excludedNoConsent: number;
  excludedInactive: number;
  excludedNoEmail: number;
  needsGroups: boolean;
  isManual: boolean;
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
  audience_mode: 'all_active',
  groupIds: [],
  manualRecipientIds: [],
  externalRecipients: [],
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
  individual: 'Destinatários específicos',
};

const communicationTypeDescriptions: Record<CommunicationKind, string> = {
  newsletter: 'Todos os contactos ativos importados do Enjogo e contactos com consentimento registado. Cancelados e inativos ficam sempre excluídos.',
  escalao: 'Pais, encarregados, atletas e contactos associados a escalões/equipas específicas.',
  interno: 'Direção, treinadores, equipa técnica e contactos internos do clube.',
  socios: 'Contactos classificados como sócios.',
  parceiros: 'Contactos classificados como parceiros/patrocinadores.',
  geral: 'Comunicação institucional para todos os contactos ativos com consentimento aplicável.',
  individual: 'Seleciona vários contactos da base ou adiciona endereços externos para um envio direto.',
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

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function getManualRecipientIds(formState: FormState) {
  const currentIds = Array.isArray(formState.manualRecipientIds)
    ? formState.manualRecipientIds
    : [];
  const legacyIds = formState.manualRecipientId ? [formState.manualRecipientId] : [];

  return uniqueValues([...currentIds, ...legacyIds]);
}

function getExternalRecipients(formState: FormState) {
  return Array.isArray(formState.externalRecipients)
    ? formState.externalRecipients
    : [];
}

function generateRecipientToken() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
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

function subscriberHasEnjogoConsent(subscriber: Subscriber) {
  const source = String(subscriber.source || '').trim().toLowerCase();
  return source === 'importacao' || source === 'enjogo';
}

function subscriberMatchesType(subscriber: Subscriber, type: CommunicationType) {
  if (type === 'newsletter') {
    return true;
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
  manualRecipientIds,
  externalRecipients,
}: {
  subscribers: Subscriber[];
  subscriberGroups: SubscriberGroup[];
  communicationType: CommunicationKind;
  groupIds: string[];
  manualRecipientIds: string[];
  externalRecipients: ExternalRecipientDraft[];
}): AudienceSummary {
  const isManual = communicationType === 'individual';
  const needsGroups =
    !isManual &&
    ['escalao', 'interno', 'socios', 'parceiros'].includes(communicationType) &&
    groupIds.length === 0;

  if (isManual) {
    const selectedIds = new Set(manualRecipientIds);
    const usedEmails = new Set<string>();
    let recipients = 0;
    let existingRecipients = 0;
    let externalRecipientCount = 0;
    let manualNoConsent = 0;
    let excludedInactive = 0;
    let excludedNoEmail = 0;

    subscribers.forEach((subscriber) => {
      if (!selectedIds.has(subscriber.id)) return;

      if (!subscriber.is_active || subscriber.unsubscribed_at) {
        excludedInactive += 1;
        return;
      }

      const email = normalizeEmail(subscriber.email);

      if (!email || !isValidEmail(email)) {
        excludedNoEmail += 1;
        return;
      }

      if (usedEmails.has(email)) return;
      usedEmails.add(email);

      if (!subscriberHasConsent(subscriber, 'geral')) {
        manualNoConsent += 1;
      }

      recipients += 1;
      existingRecipients += 1;
    });

    externalRecipients.forEach((recipient) => {
      const email = normalizeEmail(recipient.email);

      if (!email || !isValidEmail(email)) {
        excludedNoEmail += 1;
        return;
      }

      if (usedEmails.has(email)) return;
      usedEmails.add(email);

      recipients += 1;
      externalRecipientCount += 1;
      manualNoConsent += 1;
    });

    return {
      recipients,
      existingRecipients,
      externalRecipients: externalRecipientCount,
      manualNoConsent,
      includedWithoutConsent: 0,
      excludedNoConsent: 0,
      excludedInactive,
      excludedNoEmail,
      needsGroups: false,
      isManual: true,
    };
  }

  const selectedGroups = new Set(groupIds);
  const subscriberGroupsMap = new Map<string, Set<string>>();
  const usedEmails = new Set<string>();
  const usesAllActiveAudience =
    communicationType === 'newsletter' || communicationType === 'geral';

  subscriberGroups.forEach((entry) => {
    if (!subscriberGroupsMap.has(entry.subscriber_id)) {
      subscriberGroupsMap.set(entry.subscriber_id, new Set<string>());
    }

    subscriberGroupsMap.get(entry.subscriber_id)?.add(entry.group_id);
  });

  let recipients = 0;
  let includedWithoutConsent = 0;
  let excludedNoConsent = 0;
  let excludedInactive = 0;
  let excludedNoEmail = 0;

  subscribers.forEach((subscriber) => {
    if (!subscriberMatchesType(subscriber, communicationType as CommunicationType)) return;

    if (!usesAllActiveAudience && selectedGroups.size > 0) {
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

    const email = normalizeEmail(subscriber.email);

    if (!email || !isValidEmail(email)) {
      excludedNoEmail += 1;
      return;
    }

    if (usedEmails.has(email)) return;
    usedEmails.add(email);

    if (!subscriberHasConsent(subscriber, communicationType as CommunicationType)) {
      if (communicationType === 'newsletter' && subscriberHasEnjogoConsent(subscriber)) {
        includedWithoutConsent += 1;
      } else {
        excludedNoConsent += 1;
        return;
      }
    }

    recipients += 1;
  });

  return {
    recipients,
    existingRecipients: recipients,
    externalRecipients: 0,
    manualNoConsent: 0,
    includedWithoutConsent,
    excludedNoConsent,
    excludedInactive,
    excludedNoEmail,
    needsGroups,
    isManual: false,
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
  const [recipientSourceMode, setRecipientSourceMode] = useState<'contacts' | 'external'>('contacts');
  const [externalRecipientName, setExternalRecipientName] = useState('');
  const [externalRecipientEmails, setExternalRecipientEmails] = useState('');
  const [recipientEntryMessage, setRecipientEntryMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

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
        .select('id,name,email,phone,athlete_name,source,contact_type,communication_scope,consent_email,consent_email_newsletter,consent_email_club,is_active,unsubscribed_at'),
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
    if (form.communication_type === 'individual' || form.communication_type === 'newsletter') return [];
    return groups.filter((group) => groupMatchesCommunicationType(group, form.communication_type));
  }, [groups, form.communication_type]);

  const selectedManualRecipientIds = getManualRecipientIds(form);
  const externalRecipientDrafts = getExternalRecipients(form);
  const hasCommunicationContent = form.subject.trim().length > 0 || form.body.trim().length > 0;

  const hasAudienceSelection =
    form.communication_type === 'individual'
      ? selectedManualRecipientIds.length + externalRecipientDrafts.length > 0
      : form.communication_type === 'newsletter' || form.communication_type === 'geral'
        ? hasCommunicationContent
        : form.groupIds.length > 0;

  const audienceSummary = useMemo(() => {
    if (!hasCommunicationContent || !hasAudienceSelection) {
      return {
        recipients: 0,
        existingRecipients: 0,
        externalRecipients: 0,
        manualNoConsent: 0,
        includedWithoutConsent: 0,
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
      manualRecipientIds: selectedManualRecipientIds,
      externalRecipients: externalRecipientDrafts,
    });
  }, [
    subscribers,
    subscriberGroups,
    form.communication_type,
    form.groupIds,
    selectedManualRecipientIds,
    externalRecipientDrafts,
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


  const selectedManualSubscribers = useMemo(() => {
    const selectedIds = new Set(selectedManualRecipientIds);
    return subscribers.filter((subscriber) => selectedIds.has(subscriber.id));
  }, [subscribers, selectedManualRecipientIds]);

  const filteredRecipientOptions = useMemo(() => {
    const term = recipientSearchTerm.trim().toLowerCase();
    const selectedIds = new Set(selectedManualRecipientIds);

    return subscribers
      .filter((subscriber) => normalizeEmail(subscriber.email))
      .filter((subscriber) => !selectedIds.has(subscriber.id))
      .filter((subscriber) => {
        if (!term) return true;
        return [subscriber.name, subscriber.email, subscriber.phone, subscriber.athlete_name, subscriber.contact_type]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(term);
      })
      .slice(0, 12);
  }, [subscribers, recipientSearchTerm, selectedManualRecipientIds]);

  function clearRecipientComposer() {
    setRecipientSearchTerm('');
    setRecipientSourceMode('contacts');
    setExternalRecipientName('');
    setExternalRecipientEmails('');
    setRecipientEntryMessage(null);
  }

  function addManualRecipient(subscriber: Subscriber) {
    if (!subscriber.is_active || subscriber.unsubscribed_at) {
      setRecipientEntryMessage({
        type: 'error',
        text: 'Este contacto está inativo ou cancelou as comunicações e não pode ser adicionado.',
      });
      return;
    }

    setForm((current) => ({
      ...current,
      manualRecipientIds: uniqueValues([
        ...getManualRecipientIds(current),
        subscriber.id,
      ]),
      manualRecipientId: '',
    }));
    setRecipientSearchTerm('');
    setRecipientEntryMessage(null);
  }

  function removeManualRecipient(subscriberId: string) {
    setForm((current) => ({
      ...current,
      manualRecipientIds: getManualRecipientIds(current).filter(
        (id) => id !== subscriberId,
      ),
      manualRecipientId: '',
    }));
  }

  function removeExternalRecipient(email: string) {
    const normalizedEmail = normalizeEmail(email);
    setForm((current) => ({
      ...current,
      externalRecipients: getExternalRecipients(current).filter(
        (recipient) => normalizeEmail(recipient.email) !== normalizedEmail,
      ),
    }));
  }

  function clearManualRecipients() {
    setForm((current) => ({
      ...current,
      manualRecipientIds: [],
      externalRecipients: [],
      manualRecipientId: '',
    }));
    clearRecipientComposer();
  }

  function addExternalRecipients() {
    const rawEmails = externalRecipientEmails
      .split(/[;,\n\r\t ]+/)
      .map((value) => normalizeEmail(value))
      .filter(Boolean);
    const emails = uniqueValues(rawEmails);

    if (emails.length === 0) {
      setRecipientEntryMessage({
        type: 'error',
        text: 'Indica pelo menos um endereço de email.',
      });
      return;
    }

    const invalidEmails = emails.filter((email) => !isValidEmail(email));
    if (invalidEmails.length > 0) {
      setRecipientEntryMessage({
        type: 'error',
        text: `Revê os endereços inválidos: ${invalidEmails.join(', ')}.`,
      });
      return;
    }

    const selectedIds = new Set(selectedManualRecipientIds);
    const selectedExternalEmails = new Set(
      externalRecipientDrafts.map((recipient) => normalizeEmail(recipient.email)),
    );
    const idsToAdd: string[] = [];
    const externalToAdd: ExternalRecipientDraft[] = [];
    const blockedEmails: string[] = [];

    emails.forEach((email) => {
      const existing = subscribers.find(
        (subscriber) => normalizeEmail(subscriber.email) === email,
      );

      if (existing) {
        if (!existing.is_active || existing.unsubscribed_at) {
          blockedEmails.push(email);
          return;
        }

        if (!selectedIds.has(existing.id)) {
          idsToAdd.push(existing.id);
          selectedIds.add(existing.id);
        }
        return;
      }

      if (!selectedExternalEmails.has(email)) {
        externalToAdd.push({
          name: emails.length === 1 ? externalRecipientName.trim() : '',
          email,
        });
        selectedExternalEmails.add(email);
      }
    });

    setForm((current) => ({
      ...current,
      manualRecipientIds: uniqueValues([
        ...getManualRecipientIds(current),
        ...idsToAdd,
      ]),
      externalRecipients: [
        ...getExternalRecipients(current),
        ...externalToAdd,
      ],
      manualRecipientId: '',
    }));

    setExternalRecipientName('');
    setExternalRecipientEmails('');

    if (blockedEmails.length > 0) {
      setRecipientEntryMessage({
        type: 'error',
        text: `Não foram adicionados porque estão inativos ou cancelados: ${blockedEmails.join(', ')}.`,
      });
      return;
    }

    const totalAdded = idsToAdd.length + externalToAdd.length;
    setRecipientEntryMessage({
      type: 'success',
      text:
        totalAdded > 0
          ? `${totalAdded} destinatário(s) adicionado(s).`
          : 'Os endereços indicados já estavam selecionados.',
    });
  }

  function resetForm() {
    setForm(emptyForm);
    setSelectedCommunicationId(null);
    clearRecipientComposer();
    setMessage(null);
  }

  function editCommunication(communication: Communication) {
    const groupIds = targets
      .filter((target) => target.communication_id === communication.id)
      .map((target) => target.group_id);
    const manualRecipientIds = manualRecipients
      .filter((recipient) => recipient.communication_id === communication.id)
      .map((recipient) => recipient.subscriber_id);
    const communicationKind: CommunicationKind =
      communication.audience_mode === 'manual'
        ? 'individual'
        : communication.communication_type || 'newsletter';
    const audienceMode: AudienceMode =
      communicationKind === 'individual'
        ? 'manual'
        : communicationKind === 'newsletter' || communicationKind === 'geral'
          ? 'all_active'
          : 'selected_groups';

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
      communication_type: communicationKind,
      audience_mode: audienceMode,
      groupIds: audienceMode === 'selected_groups' ? groupIds : [],
      manualRecipientIds,
      externalRecipients: [],
      manualRecipientId: '',
      email_template: inferEmailTemplate(communication),
    });
    clearRecipientComposer();
    setMessage(null);
  }

  function changeCommunicationType(type: CommunicationKind) {
    const audienceMode: AudienceMode =
      type === 'individual'
        ? 'manual'
        : type === 'newsletter' || type === 'geral'
          ? 'all_active'
          : 'selected_groups';

    setForm((current) => ({
      ...current,
      communication_type: type,
      audience_mode: audienceMode,
      groupIds: [],
      manualRecipientIds: [],
      externalRecipients: [],
      manualRecipientId: '',
    }));
    clearRecipientComposer();
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

  async function saveManualRecipients(
    communicationId: string,
    subscriberIds: string[],
  ) {
    const { error: deleteError } = await supabase
      .from('gdrb_communication_manual_recipients')
      .delete()
      .eq('communication_id', communicationId);

    if (deleteError) throw deleteError;

    const uniqueSubscriberIds = uniqueValues(subscriberIds);
    if (uniqueSubscriberIds.length === 0) return;

    const { error: insertError } = await supabase
      .from('gdrb_communication_manual_recipients')
      .insert(
        uniqueSubscriberIds.map((subscriberId) => ({
          communication_id: communicationId,
          subscriber_id: subscriberId,
        })),
      );

    if (insertError) throw insertError;
  }

  async function resolveExternalRecipientIds(
    recipients: ExternalRecipientDraft[],
  ) {
    const resolvedIds: string[] = [];
    const now = new Date().toISOString();

    for (const recipient of recipients) {
      const email = normalizeEmail(recipient.email);
      if (!email || !isValidEmail(email)) {
        throw new Error(`O email externo “${recipient.email}” não é válido.`);
      }

      let existing = subscribers.find(
        (subscriber) => normalizeEmail(subscriber.email) === email,
      );

      if (!existing) {
        const { data: existingRows, error: lookupError } = await supabase
          .from('gdrb_subscribers')
          .select('id,name,email,phone,athlete_name,source,contact_type,communication_scope,consent_email,consent_email_newsletter,consent_email_club,is_active,unsubscribed_at')
          .ilike('email', email)
          .limit(20);

        if (lookupError) throw lookupError;
        existing = (existingRows || []).find(
          (subscriber) => normalizeEmail(subscriber.email) === email,
        ) as Subscriber | undefined;
      }

      if (existing) {
        if (!existing.is_active || existing.unsubscribed_at) {
          throw new Error(
            `O contacto ${email} está inativo ou cancelou as comunicações.`,
          );
        }

        resolvedIds.push(existing.id);
        continue;
      }

      const payload = {
        name: recipient.name.trim() || null,
        email,
        phone: null,
        source: 'admin',
        contact_type: 'outro',
        communication_scope: 'geral',
        relationship: null,
        athlete_name: null,
        notes: 'Contacto avulso adicionado no módulo de Comunicações.',
        consent_email: false,
        consent_email_newsletter: false,
        consent_email_club: false,
        consent_email_at: null,
        consent_whatsapp: false,
        consent_whatsapp_at: null,
        is_active: true,
        unsubscribed_at: null,
        unsubscribe_reason: null,
        unsubscribe_token: generateRecipientToken(),
        privacy_policy_accepted: false,
        privacy_policy_accepted_at: null,
        updated_at: now,
      };

      const { data: created, error: createError } = await supabase
        .from('gdrb_subscribers')
        .insert(payload)
        .select('id')
        .single();

      if (createError || !created?.id) {
        const { data: fallbackRows, error: fallbackError } = await supabase
          .from('gdrb_subscribers')
          .select('id,email,is_active,unsubscribed_at')
          .ilike('email', email)
          .limit(20);
        const fallback = (fallbackRows || []).find(
          (subscriber) => normalizeEmail(subscriber.email) === email,
        ) as Pick<Subscriber, 'id' | 'email' | 'is_active' | 'unsubscribed_at'> | undefined;

        if (fallbackError || !fallback?.id) {
          throw createError || fallbackError || new Error(`Não foi possível adicionar ${email}.`);
        }

        if (!fallback.is_active || fallback.unsubscribed_at) {
          throw new Error(
            `O contacto ${email} está inativo ou cancelou as comunicações.`,
          );
        }

        resolvedIds.push(fallback.id);
        continue;
      }

      resolvedIds.push(created.id as string);
    }

    return uniqueValues(resolvedIds);
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

    const manualRecipientIds = getManualRecipientIds(form);
    const externalRecipients = getExternalRecipients(form);

    if (
      form.communication_type === 'individual' &&
      manualRecipientIds.length + externalRecipients.length === 0
    ) {
      throw new Error('Seleciona pelo menos um destinatário específico.');
    }

    const resolvedExternalRecipientIds =
      form.communication_type === 'individual'
        ? await resolveExternalRecipientIds(externalRecipients)
        : [];
    const resolvedManualRecipientIds = uniqueValues([
      ...manualRecipientIds,
      ...resolvedExternalRecipientIds,
    ]);

    const usesAllActiveAudience =
      form.communication_type === 'newsletter' || form.communication_type === 'geral';
    const resolvedAudienceMode: AudienceMode =
      form.communication_type === 'individual'
        ? 'manual'
        : usesAllActiveAudience
          ? 'all_active'
          : 'selected_groups';

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
      audience_mode: resolvedAudienceMode,
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

    await saveTargets(
      communicationId,
      form.communication_type === 'individual' || usesAllActiveAudience ? [] : form.groupIds,
    );
    await saveManualRecipients(
      communicationId,
      form.communication_type === 'individual' ? resolvedManualRecipientIds : [],
    );

    return communicationId;
  }

  async function sendNewsletter() {
    if (audienceSummary.needsGroups) {
      setMessage({ type: 'error', text: 'Seleciona pelo menos um grupo antes do envio definitivo.' });
      return;
    }

    if (
      form.communication_type === 'individual' &&
      selectedManualRecipientIds.length + externalRecipientDrafts.length === 0
    ) {
      setMessage({ type: 'error', text: 'Seleciona pelo menos um destinatário específico antes do envio.' });
      return;
    }

    if (audienceSummary.recipients === 0) {
      setMessage({
        type: 'error',
        text:
          form.communication_type === 'individual'
            ? 'Não existem destinatários específicos válidos para esta comunicação.'
            : form.communication_type === 'newsletter'
              ? 'Não existem contactos ativos com um endereço de email válido para esta newsletter.'
              : 'Não existem destinatários ativos com consentimento para esta comunicação.',
      });
      return;
    }

    const confirmed = window.confirm(
      form.communication_type === 'individual'
        ? `Confirmas o envio desta comunicação para ${audienceSummary.recipients} destinatário(s) específico(s)?\n\n${audienceSummary.existingRecipients} da base de contactos · ${audienceSummary.externalRecipients} externo(s).\n\nEsta ação não pode ser desfeita.`
        : form.communication_type === 'newsletter'
          ? `Confirmas o envio da Newsletter geral para ${audienceSummary.recipients} contacto(s) ativo(s)?\n\nSerão incluídos os contactos importados do Enjogo e os contactos com consentimento registado. ${audienceSummary.includedWithoutConsent} contacto(s) importado(s) do Enjogo não têm a flag local preenchida, mas serão incluídos. Contactos inativos, cancelados ou sem base de consentimento aplicável permanecem excluídos.\n\nEsta ação não pode ser desfeita.`
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
      clearRecipientComposer();

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
    const communication = communications.find((item) => item.id === communicationId);
    const manualRecipientIds = manualRecipients
      .filter((recipient) => recipient.communication_id === communicationId)
      .map((recipient) => recipient.subscriber_id);

    if (manualRecipientIds.length > 0) {
      const selectedSubscribers = subscribers.filter((subscriber) =>
        manualRecipientIds.includes(subscriber.id),
      );
      const labels = selectedSubscribers
        .slice(0, 2)
        .map((subscriber) => subscriber.name || subscriber.email || 'Sem nome');
      const suffix = manualRecipientIds.length > 2 ? ` +${manualRecipientIds.length - 2}` : '';

      return `${manualRecipientIds.length} destinatário(s) específico(s)${labels.length ? ` — ${labels.join(', ')}${suffix}` : ''}`;
    }

    if (communication?.communication_type === 'newsletter') {
      return 'Todos os contactos ativos com email';
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
      const manualRecipientIds = manualRecipients
        .filter((recipient) => recipient.communication_id === communication.id)
        .map((recipient) => recipient.subscriber_id);

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
          audience_mode:
            communication.audience_mode === 'manual'
              ? 'manual'
              : ['newsletter', 'geral'].includes(communication.communication_type || 'newsletter')
                ? 'all_active'
                : 'selected_groups',
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

      await saveTargets(
        newCommunicationId,
        ['newsletter', 'geral'].includes(communication.communication_type || 'newsletter')
          ? []
          : groupIds,
      );
      await saveManualRecipients(newCommunicationId, manualRecipientIds);
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
              <option value="individual">Destinatários específicos</option>
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
                    src="/newsletter/inicio-epoca-2026-27.jpg?v=20260904-3"
                    alt="Campo do GDR Boavista preparado para o início da época 2026/27"
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
                <p className="text-sm font-black text-zinc-900">
                  {form.communication_type === 'individual'
                    ? '2. Destinatários específicos'
                    : '2. Destinatários compatíveis'}
                </p>
                <p className="text-xs text-zinc-500">
                  {form.communication_type === 'individual'
                    ? 'Seleciona vários contactos existentes ou adiciona endereços externos.'
                    : form.communication_type === 'newsletter'
                      ? 'A Newsletter geral inclui automaticamente a base importada do Enjogo e os contactos com consentimento registado.'
                      : 'Os grupos abaixo mudam conforme o tipo de comunicação selecionado.'}
                </p>
              </div>
            </div>

            {form.communication_type === 'individual' ? (
              <div className="space-y-4">
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRecipientSourceMode('contacts');
                      setRecipientEntryMessage(null);
                    }}
                    className={`rounded-xl border px-4 py-3 text-left transition ${
                      recipientSourceMode === 'contacts'
                        ? 'border-red-300 bg-red-50 text-red-800'
                        : 'border-zinc-200 bg-white text-zinc-700 hover:border-red-200'
                    }`}
                  >
                    <span className="block text-sm font-black">Contactos existentes</span>
                    <span className="mt-1 block text-xs text-zinc-500">
                      Pesquisa e adiciona várias pessoas da base.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRecipientSourceMode('external');
                      setRecipientEntryMessage(null);
                    }}
                    className={`rounded-xl border px-4 py-3 text-left transition ${
                      recipientSourceMode === 'external'
                        ? 'border-red-300 bg-red-50 text-red-800'
                        : 'border-zinc-200 bg-white text-zinc-700 hover:border-red-200'
                    }`}
                  >
                    <span className="block text-sm font-black">Adicionar email externo</span>
                    <span className="mt-1 block text-xs text-zinc-500">
                      Para destinatários que ainda não estão na base.
                    </span>
                  </button>
                </div>

                {recipientSourceMode === 'contacts' ? (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                      <input
                        value={recipientSearchTerm}
                        onChange={(event) => setRecipientSearchTerm(event.target.value)}
                        placeholder="Pesquisar por nome, email, telefone ou atleta..."
                        className="w-full rounded-xl border border-zinc-200 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
                      />
                    </div>

                    <div className="max-h-80 overflow-y-auto rounded-xl border border-zinc-200 bg-white">
                      {filteredRecipientOptions.length === 0 ? (
                        <div className="p-4 text-sm font-semibold text-zinc-500">
                          Nenhum contacto disponível para a pesquisa atual.
                        </div>
                      ) : (
                        <div className="divide-y divide-zinc-100">
                          {filteredRecipientOptions.map((subscriber) => {
                            const isBlocked = !subscriber.is_active || Boolean(subscriber.unsubscribed_at);

                            return (
                              <button
                                key={subscriber.id}
                                type="button"
                                onClick={() => addManualRecipient(subscriber)}
                                disabled={isBlocked}
                                className="flex w-full flex-col gap-2 px-4 py-3 text-left transition hover:bg-red-50 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:opacity-60 sm:flex-row sm:items-center sm:justify-between"
                              >
                                <span>
                                  <span className="block text-sm font-black text-zinc-900">
                                    {subscriber.name || 'Sem nome'}
                                  </span>
                                  <span className="block text-xs font-semibold text-zinc-500">
                                    {subscriber.email}
                                    {subscriber.phone ? ` · ${subscriber.phone}` : ''}
                                    {subscriber.athlete_name ? ` · Atleta: ${subscriber.athlete_name}` : ''}
                                  </span>
                                </span>
                                <span className={`text-xs font-black uppercase tracking-[0.12em] ${isBlocked ? 'text-red-500' : 'text-red-700'}`}>
                                  {isBlocked ? 'Bloqueado' : 'Adicionar'}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-zinc-200 bg-white p-4">
                    <div className="grid gap-3 md:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)_auto] md:items-end">
                      <label className="space-y-2">
                        <span className="text-xs font-black uppercase tracking-[0.14em] text-zinc-600">
                          Nome — opcional (1 email)
                        </span>
                        <input
                          value={externalRecipientName}
                          onChange={(event) => setExternalRecipientName(event.target.value)}
                          placeholder="Ex.: Luís Silva"
                          className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
                        />
                      </label>

                      <label className="space-y-2">
                        <span className="text-xs font-black uppercase tracking-[0.14em] text-zinc-600">
                          Email ou vários emails
                        </span>
                        <textarea
                          value={externalRecipientEmails}
                          onChange={(event) => setExternalRecipientEmails(event.target.value)}
                          rows={2}
                          placeholder="email@exemplo.pt; outro@exemplo.pt"
                          className="w-full resize-y rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={addExternalRecipients}
                        className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#24180f] px-5 py-3 text-sm font-black text-white transition hover:bg-red-800"
                      >
                        Adicionar
                      </button>
                    </div>

                    <p className="mt-3 text-xs leading-5 text-zinc-500">
                      Podes separar os endereços por vírgula, ponto e vírgula, espaço ou mudança de linha. Um endereço novo fica guardado como contacto avulso e não é inscrito automaticamente na newsletter.
                    </p>
                  </div>
                )}

                {recipientEntryMessage && (
                  <div
                    className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
                      recipientEntryMessage.type === 'success'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-red-200 bg-red-50 text-red-700'
                    }`}
                  >
                    {recipientEntryMessage.text}
                  </div>
                )}

                <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
                  <div className="flex flex-col gap-2 border-b border-zinc-100 bg-zinc-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-black text-zinc-900">
                        Destinatários selecionados ({selectedManualSubscribers.length + externalRecipientDrafts.length})
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Cada endereço receberá uma mensagem individual; os destinatários não veem os restantes emails.
                      </p>
                    </div>

                    {selectedManualSubscribers.length + externalRecipientDrafts.length > 0 && (
                      <button
                        type="button"
                        onClick={clearManualRecipients}
                        className="self-start text-xs font-black uppercase tracking-[0.12em] text-red-700 hover:text-red-900 sm:self-auto"
                      >
                        Limpar todos
                      </button>
                    )}
                  </div>

                  {selectedManualSubscribers.length + externalRecipientDrafts.length === 0 ? (
                    <div className="p-5 text-sm font-semibold text-zinc-500">
                      Ainda não selecionaste nenhum destinatário.
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-100">
                      {selectedManualSubscribers.map((subscriber) => (
                        <div key={subscriber.id} className="flex items-start justify-between gap-3 px-4 py-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-zinc-900">
                              {subscriber.name || 'Sem nome'}
                            </p>
                            <p className="truncate text-xs font-semibold text-zinc-500">{subscriber.email}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700">
                                Base de contactos
                              </span>
                              {!subscriberHasConsent(subscriber, 'geral') && (
                                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-amber-700">
                                  Sem consentimento registado
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeManualRecipient(subscriber.id)}
                            aria-label={`Remover ${subscriber.name || subscriber.email || 'contacto'}`}
                            className="rounded-lg border border-zinc-200 p-2 text-zinc-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </div>
                      ))}

                      {externalRecipientDrafts.map((recipient) => (
                        <div key={normalizeEmail(recipient.email)} className="flex items-start justify-between gap-3 px-4 py-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-zinc-900">
                              {recipient.name || 'Contacto externo'}
                            </p>
                            <p className="truncate text-xs font-semibold text-zinc-500">{recipient.email}</p>
                            <span className="mt-2 inline-flex rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-sky-700">
                              Externo · não inscrito na newsletter
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeExternalRecipient(recipient.email)}
                            aria-label={`Remover ${recipient.email}`}
                            className="rounded-lg border border-zinc-200 p-2 text-zinc-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {audienceSummary.manualNoConsent > 0 && (
                  <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold leading-5 text-amber-800">
                    {audienceSummary.manualNoConsent} destinatário(s) não têm consentimento de marketing registado. Usa o envio específico apenas para comunicações diretas, operacionais ou administrativas com fundamento válido; não os inscreve automaticamente na newsletter.
                  </p>
                )}
              </div>
            ) : form.communication_type === 'newsletter' ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                  <div>
                    <p className="text-sm font-black text-emerald-950">Base elegível completa</p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-emerald-800">
                      Não é necessário selecionar grupos. Serão considerados todos os contactos ativos importados do Enjogo e todos os contactos com consentimento de email registado. Contactos avulsos sem consentimento, inativos ou que cancelaram comunicações continuam excluídos.
                    </p>
                  </div>
                </div>
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

            {audienceSummary.isManual ? (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <div className="rounded-xl bg-white p-3">
                  <p className="text-xs font-black uppercase text-zinc-400">Receberão</p>
                  <p className="mt-1 text-2xl font-black text-emerald-700">{audienceSummary.recipients}</p>
                </div>
                <div className="rounded-xl bg-white p-3">
                  <p className="text-xs font-black uppercase text-zinc-400">Da base</p>
                  <p className="mt-1 text-2xl font-black text-slate-700">{audienceSummary.existingRecipients}</p>
                </div>
                <div className="rounded-xl bg-white p-3">
                  <p className="text-xs font-black uppercase text-zinc-400">Externos</p>
                  <p className="mt-1 text-2xl font-black text-sky-700">{audienceSummary.externalRecipients}</p>
                </div>
                <div className="rounded-xl bg-white p-3">
                  <p className="text-xs font-black uppercase text-zinc-400">Sem registo</p>
                  <p className="mt-1 text-2xl font-black text-amber-700">{audienceSummary.manualNoConsent}</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <div className="rounded-xl bg-white p-3">
                  <p className="text-xs font-black uppercase text-zinc-400">Receberão</p>
                  <p className="mt-1 text-2xl font-black text-emerald-700">{audienceSummary.recipients}</p>
                </div>
                <div className="rounded-xl bg-white p-3">
                  <p className="text-xs font-black uppercase text-zinc-400">
                    {form.communication_type === 'newsletter' ? 'Consent. Enjogo' : 'Sem consent.'}
                  </p>
                  <p className="mt-1 text-2xl font-black text-amber-700">
                    {form.communication_type === 'newsletter'
                      ? audienceSummary.includedWithoutConsent
                      : audienceSummary.excludedNoConsent}
                  </p>
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
            )}

            {form.communication_type === 'newsletter' && audienceSummary.includedWithoutConsent > 0 && (
              <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-800">
                {audienceSummary.includedWithoutConsent} contacto(s) importado(s) do Enjogo serão incluídos apesar de a flag local ainda não estar preenchida. Os cancelamentos e contactos inativos continuam excluídos.
              </p>
            )}

            {form.communication_type === 'newsletter' && audienceSummary.excludedNoConsent > 0 && (
              <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-800">
                {audienceSummary.excludedNoConsent} contacto(s) ativo(s) não foram importados do Enjogo e não têm consentimento registado; por segurança, não serão incluídos nesta newsletter.
              </p>
            )}

            {audienceSummary.isManual &&
              (audienceSummary.excludedInactive > 0 || audienceSummary.excludedNoEmail > 0) && (
                <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  Existem {audienceSummary.excludedInactive} contacto(s) inativo(s) e {audienceSummary.excludedNoEmail} endereço(s) inválido(s), que não serão enviados.
                </p>
              )}

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
