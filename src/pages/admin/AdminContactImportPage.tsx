import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  FileSpreadsheet,
  RefreshCw,
  Upload,
  XCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

type CommunicationGroup = {
  id: string;
  name: string;
  slug: string;
  group_type: string;
  birth_years: string | null;
};

type ExistingSubscriber = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
};

type ImportAction = 'create' | 'update' | 'skip';
type GroupAssignmentMode = 'single_group' | 'csv_groups';

type NormalizedImportRow = {
  name: string;
  email: string;
  phone: string;
  contactType: string;
  communicationScope: string;
  relationship: string;
  athleteName: string;
  consentEmail: boolean;
  consentWhatsapp: boolean;
  notes: string;
  groupNames: string[];
  groupIds: string[];
};

type ImportPreviewRow = {
  rowNumber: number;
  action: ImportAction;
  normalized: NormalizedImportRow;
  errors: string[];
  warnings: string[];
  existingSubscriberId: string | null;
};

type ImportResult = {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
};

type ImportFailure = {
  rowNumber: number;
  name: string;
  email: string;
  phone: string;
  group: string;
  problem: string;
  recommendedAction: string;
};

const contactTypes = [
  'newsletter',
  'encarregado',
  'atleta',
  'treinador',
  'direcao',
  'socio',
  'parceiro',
  'staff',
  'outro',
];

const communicationScopes = [
  'newsletter',
  'escalao',
  'interno',
  'socios',
  'parceiros',
  'geral',
  'outro',
];

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

const csvTemplateHeaders = [
  'nome',
  'email',
  'telefone',
  'tipo_contacto',
  'grupo',
  'relacao',
  'atleta',
  'consent_email',
  'consent_whatsapp',
  'observacoes',
];

const csvTemplateRows = [
  [
    'João Silva',
    'joao@email.pt',
    '912345678',
    'encarregado',
    'Iniciados',
    'pai',
    'Miguel Silva',
    'sim',
    'nao',
    'Pai do atleta Miguel',
  ],
  [
    'Maria Costa',
    'maria@email.pt',
    '913456789',
    'encarregado',
    'Traquinas A',
    'mãe',
    'Lucas Costa',
    'sim',
    'sim',
    'Mãe do atleta Lucas',
  ],
  [
    'Carlos Santos',
    'carlos@email.pt',
    '',
    'treinador',
    'Treinadores',
    'treinador',
    '',
    'sim',
    'sim',
    'Treinador principal',
  ],
];

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function normalizeHeader(value: string) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function normalizePhone(value: string) {
  return value.trim().replace(/\s+/g, '');
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function parseBoolean(value: string) {
  const normalized = normalizeText(value);

  if (!normalized) return false;
  return ['sim', 's', 'true', '1', 'yes', 'y', 'ok'].includes(normalized);
}

function escapeCsv(value: string) {
  if (/[";\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

function detectDelimiter(firstLine: string) {
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  return semicolonCount >= commaCount ? ';' : ',';
}

function parseCsvLine(line: string, delimiter: string) {
  const values: string[] = [];
  let current = '';
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === delimiter && !insideQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function parseCsv(content: string) {
  const cleanContent = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = cleanContent.split('\n').filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [] as Record<string, string>[] };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseCsvLine(lines[0], delimiter).map(normalizeHeader);
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line, delimiter);
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() || '';
    });

    return row;
  });

  return { headers, rows };
}

function getValue(row: Record<string, string>, aliases: string[]) {
  for (const alias of aliases) {
    const normalizedAlias = normalizeHeader(alias);
    if (Object.prototype.hasOwnProperty.call(row, normalizedAlias)) {
      return row[normalizedAlias] || '';
    }
  }

  return '';
}

function getGroupNames(value: string) {
  return value
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean);
}

function getCommunicationScope(contactType: string, explicitScope: string, groups: CommunicationGroup[]) {
  const normalizedExplicitScope = normalizeText(explicitScope).replace(/ç/g, 'c');

  if (communicationScopes.includes(normalizedExplicitScope)) {
    return normalizedExplicitScope;
  }

  if (contactType === 'socio') return 'socios';
  if (contactType === 'parceiro') return 'parceiros';
  if (['treinador', 'direcao', 'staff'].includes(contactType)) return 'interno';
  if (['encarregado', 'atleta'].includes(contactType)) return 'escalao';
  if (groups.some((group) => group.group_type === 'escalao')) return 'escalao';
  if (contactType === 'newsletter') return 'newsletter';

  return 'geral';
}

function generateToken() {
  const bytes = new Uint8Array(24);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function createTemplateCsv() {
  const rows = [csvTemplateHeaders, ...csvTemplateRows];
  return rows.map((row) => row.map(escapeCsv).join(';')).join('\n');
}

export function AdminContactImportPage() {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [groups, setGroups] = useState<CommunicationGroup[]>([]);
  const [subscribers, setSubscribers] = useState<ExistingSubscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState('');
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [groupAssignmentMode, setGroupAssignmentMode] = useState<GroupAssignmentMode>('single_group');
  const [targetGroupId, setTargetGroupId] = useState('');
  const [defaultContactType, setDefaultContactType] = useState('encarregado');
  const [previewRows, setPreviewRows] = useState<ImportPreviewRow[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [runtimeFailures, setRuntimeFailures] = useState<ImportFailure[]>([]);
  const [showAllPreview, setShowAllPreview] = useState(false);
  const [previewPage, setPreviewPage] = useState(1);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function loadReferenceData(preserveMessage = false) {
    setLoading(true);
    if (!preserveMessage) setMessage(null);

    const [groupsResponse, subscribersResponse] = await Promise.all([
      supabase
        .from('gdrb_communication_groups')
        .select('id, name, slug, group_type, birth_years')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true }),
      supabase
        .from('gdrb_subscribers')
        .select('id, name, email, phone')
        .order('created_at', { ascending: false }),
    ]);

    if (groupsResponse.error) {
      console.error(groupsResponse.error);
      setMessage({ type: 'error', text: 'Não foi possível carregar os grupos/escalões.' });
    } else {
      setGroups((groupsResponse.data || []) as CommunicationGroup[]);
    }

    if (subscribersResponse.error) {
      console.error(subscribersResponse.error);
      setMessage({ type: 'error', text: 'Não foi possível carregar os contactos existentes.' });
    } else {
      setSubscribers((subscribersResponse.data || []) as ExistingSubscriber[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadReferenceData();
  }, []);

  const groupLookup = useMemo(() => {
    const map = new Map<string, CommunicationGroup>();

    groups.forEach((group) => {
      map.set(normalizeText(group.name), group);
      map.set(normalizeText(group.slug), group);
    });

    return map;
  }, [groups]);

  const destinationGroups = useMemo(() => {
    const escalationGroups = groups.filter((group) => group.group_type === 'escalao');
    return escalationGroups.length > 0 ? escalationGroups : groups;
  }, [groups]);

  const subscriberByEmail = useMemo(() => {
    const map = new Map<string, ExistingSubscriber>();

    subscribers.forEach((subscriber) => {
      if (subscriber.email) {
        map.set(subscriber.email.trim().toLowerCase(), subscriber);
      }
    });

    return map;
  }, [subscribers]);

  const subscriberByPhone = useMemo(() => {
    const map = new Map<string, ExistingSubscriber>();

    subscribers.forEach((subscriber) => {
      if (subscriber.phone) {
        map.set(normalizePhone(subscriber.phone), subscriber);
      }
    });

    return map;
  }, [subscribers]);

  const stats = useMemo(() => {
    const validRows = previewRows.filter((row) => row.errors.length === 0);

    return {
      total: previewRows.length,
      valid: validRows.length,
      invalid: previewRows.length - validRows.length,
      create: validRows.filter((row) => row.action === 'create').length,
      update: validRows.filter((row) => row.action === 'update').length,
      noEmailConsent: validRows.filter((row) => !row.normalized.consentEmail).length,
    };
  }, [previewRows]);

  const validationFailures = useMemo<ImportFailure[]>(() => {
    return previewRows
      .filter((row) => row.errors.length > 0)
      .flatMap((row) =>
        row.errors.map((problem) => ({
          rowNumber: row.rowNumber,
          name: row.normalized.name,
          email: row.normalized.email,
          phone: row.normalized.phone,
          group: row.normalized.groupNames.join(' | '),
          problem,
          recommendedAction: problem.includes('Email inválido')
            ? 'Corrigir o endereço de email e voltar a importar.'
            : problem.includes('Falta email ou telefone')
              ? 'Adicionar pelo menos email ou telefone.'
              : problem.includes('Grupo/escalão não encontrado')
                ? 'Corrigir o nome do grupo/escalão ou escolher um destino único.'
                : problem.includes('Seleciona o escalão/grupo')
                  ? 'Selecionar um escalão/grupo de destino.'
                  : 'Corrigir os dados indicados e voltar a importar.',
        })),
      );
  }, [previewRows]);

  const allFailures = useMemo(
    () => [...validationFailures, ...runtimeFailures],
    [validationFailures, runtimeFailures],
  );

  const previewPageSize = 25;
  const previewPageCount = Math.max(1, Math.ceil(previewRows.length / previewPageSize));
  const previewRowsToShow = showAllPreview
    ? previewRows.slice((previewPage - 1) * previewPageSize, previewPage * previewPageSize)
    : previewRows.slice(0, 10);

  function buildPreviewRows(
    rows: Record<string, string>[],
    options: {
      assignmentMode?: GroupAssignmentMode;
      destinationGroupId?: string;
      fallbackContactType?: string;
    } = {},
  ) {
    const assignmentMode = options.assignmentMode ?? groupAssignmentMode;
    const destinationGroupId = options.destinationGroupId ?? targetGroupId;
    const fallbackContactType = options.fallbackContactType ?? defaultContactType;
    const destinationGroup = destinationGroupId
      ? groups.find((group) => group.id === destinationGroupId) || null
      : null;

    return rows.map((row, index): ImportPreviewRow => {
      const errors: string[] = [];
      const warnings: string[] = [];
      const rawEmail = getValue(row, [
        'email',
        'e-mail',
        'e_mail',
        'mail',
        'email_address',
        'endereco_email',
        'endereço_email',
        'correio_eletronico',
        'correio_eletrónico',
      ]).trim().toLowerCase();
      const rawPhone = normalizePhone(
        getValue(row, [
          'telefone',
          'telemovel',
          'telemóvel',
          'phone',
          'mobile',
          'mobile_phone',
          'contacto',
          'contato',
          'numero_telemovel',
          'número_telemóvel',
          'telemovel_telefone',
        ]),
      );
      const csvContactType = normalizeText(getValue(row, ['tipo_contacto', 'tipo', 'contact_type']));
      const rawContactType = csvContactType || fallbackContactType;
      const contactType = rawContactType.replace(/ç/g, 'c');
      const csvGroupNames = getGroupNames(getValue(row, ['grupo', 'grupos', 'escalao', 'escalão', 'equipa', 'team']));
      const groupNames = assignmentMode === 'single_group'
        ? destinationGroup
          ? [destinationGroup.name]
          : []
        : csvGroupNames;
      const rowGroups: CommunicationGroup[] = [];

      if (!rawEmail && !rawPhone) {
        errors.push('Falta email ou telefone.');
      }

      if (rawEmail && !isValidEmail(rawEmail)) {
        errors.push('Email inválido.');
      }

      if (!contactTypes.includes(contactType)) {
        errors.push(`Tipo de contacto inválido: ${rawContactType}.`);
      }

      if (assignmentMode === 'single_group' && !destinationGroup) {
        errors.push('Seleciona o escalão/grupo de destino para este ficheiro.');
      }

      groupNames.forEach((groupName) => {
        const group = groupLookup.get(normalizeText(groupName));

        if (!group) {
          errors.push(`Grupo/escalão não encontrado: ${groupName}.`);
          return;
        }

        rowGroups.push(group);
      });

      const consentEmail = parseBoolean(getValue(row, ['consent_email', 'consentimento_email', 'email_consentimento']));
      const consentWhatsapp = parseBoolean(getValue(row, ['consent_whatsapp', 'consentimento_whatsapp', 'whatsapp_consentimento']));

      if (!consentEmail) {
        warnings.push('Sem consentimento de email; não receberá newsletters/comunicações por email.');
      }

      const existingByEmail = rawEmail ? subscriberByEmail.get(rawEmail) : null;
      const existingByPhone = rawPhone ? subscriberByPhone.get(rawPhone) : null;
      const existingSubscriber = existingByEmail || existingByPhone || null;
      const normalizedContactType = contactTypes.includes(contactType) ? contactType : 'outro';
      const communicationScope = getCommunicationScope(
        normalizedContactType,
        getValue(row, ['communication_scope', 'ambito', 'âmbito', 'scope']),
        rowGroups,
      );

      return {
        rowNumber: index + 2,
        action: errors.length > 0 ? 'skip' : existingSubscriber ? 'update' : 'create',
        existingSubscriberId: existingSubscriber?.id || null,
        errors,
        warnings,
        normalized: {
          name: getValue(row, ['nome', 'name', 'nome_completo', 'full_name', 'contact_name', 'nome_contacto', 'nome_contato']).trim(),
          email: rawEmail,
          phone: rawPhone,
          contactType: normalizedContactType,
          communicationScope,
          relationship: getValue(row, ['relacao', 'relação', 'relationship']).trim(),
          athleteName: getValue(row, ['atleta', 'athlete', 'athlete_name', 'nome_atleta', 'jogador', 'player', 'player_name']).trim(),
          consentEmail,
          consentWhatsapp,
          notes: getValue(row, ['observacoes', 'observações', 'notas', 'notes']).trim(),
          groupNames,
          groupIds: rowGroups.map((group) => group.id),
        },
      };
    });
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    setMessage(null);
    setResult(null);
    setRuntimeFailures([]);
    setShowAllPreview(false);
    setPreviewPage(1);
    setPreviewRows([]);

    if (!file) return;

    setParsing(true);
    setFileName(file.name);

    try {
      const content = await file.text();
      const { headers, rows } = parseCsv(content);

      if (rows.length === 0) {
        setMessage({ type: 'error', text: 'O ficheiro CSV não tem linhas para importar.' });
        setParsing(false);
        return;
      }

      setRawRows(rows);
      setDetectedHeaders(headers);
      setPreviewRows(buildPreviewRows(rows));
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Não foi possível ler o ficheiro CSV.' });
    } finally {
      setParsing(false);
      event.target.value = '';
    }
  }

  function downloadTemplate() {
    const blob = new Blob([createTemplateCsv()], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'modelo-importacao-contactos-gdr-boavista.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function downloadErrorReport() {
    if (allFailures.length === 0) return;

    const headers = ['linha', 'nome', 'email', 'telefone', 'grupo', 'problema', 'acao_recomendada'];
    const rows = allFailures.map((failure) => [
      String(failure.rowNumber),
      failure.name,
      failure.email,
      failure.phone,
      failure.group,
      failure.problem,
      failure.recommendedAction,
    ]);
    const content = [headers, ...rows]
      .map((row) => row.map((value) => escapeCsv(value)).join(';'))
      .join('\n');
    const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-erros-${(fileName || 'importacao').replace(/\.csv$/i, '')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function confirmImport() {
    const validRows = previewRows.filter((row) => row.errors.length === 0);

    if (validRows.length === 0) {
      setMessage({ type: 'error', text: 'Não existem linhas válidas para importar.' });
      return;
    }

    const destinationLabel = groupAssignmentMode === 'single_group'
      ? destinationGroups.find((group) => group.id === targetGroupId)?.name || 'destino selecionado'
      : 'grupos definidos no CSV';
    const invalidCount = previewRows.length - validRows.length;
    const confirmed = window.confirm(
      `${validRows.length} contacto(s) válido(s) serão criados ou atualizados em ${destinationLabel}.` +
        (invalidCount > 0 ? ` ${invalidCount} linha(s) com erro serão ignoradas e ficarão no relatório.` : '') +
        '\n\nConfirmar importação?',
    );
    if (!confirmed) return;

    setImporting(true);
    setMessage(null);
    setResult(null);
    setRuntimeFailures([]);
    const failures: ImportFailure[] = [...validationFailures];

    const now = new Date().toISOString();
    const importResult: ImportResult = {
      created: 0,
      updated: 0,
      skipped: previewRows.length - validRows.length,
      failed: 0,
    };

    const { data: batch, error: batchError } = await supabase
      .from('gdrb_contact_import_batches')
      .insert({
        file_name: fileName || 'importacao-contactos.csv',
        description: 'Importação de contactos via Admin > Importar Contactos',
        total_rows: previewRows.length,
        imported_count: 0,
        skipped_count: importResult.skipped,
        error_count: 0,
        status: 'processing',
      })
      .select('id')
      .single();

    if (batchError || !batch) {
      console.error(batchError);
      setMessage({ type: 'error', text: 'Não foi possível criar o lote de importação.' });
      setImporting(false);
      return;
    }

    const batchId = batch.id as string;
    const dynamicSubscriberByEmail = new Map(subscriberByEmail);
    const dynamicSubscriberByPhone = new Map(subscriberByPhone);

    for (const row of validRows) {
      const existingSubscriber =
        row.normalized.email ? dynamicSubscriberByEmail.get(row.normalized.email) : null;
      const existingByPhone =
        !existingSubscriber && row.normalized.phone
          ? dynamicSubscriberByPhone.get(row.normalized.phone)
          : null;
      const subscriberId = existingSubscriber?.id || existingByPhone?.id || row.existingSubscriberId;
      const isUpdate = Boolean(subscriberId);
      const consentAccepted = row.normalized.consentEmail || row.normalized.consentWhatsapp;

      const payload = {
        name: row.normalized.name || null,
        email: row.normalized.email || null,
        phone: row.normalized.phone || null,
        source: 'importacao',
        contact_type: row.normalized.contactType,
        communication_scope: row.normalized.communicationScope,
        relationship: row.normalized.relationship || null,
        athlete_name: row.normalized.athleteName || null,
        notes: row.normalized.notes || null,
        consent_email: row.normalized.consentEmail,
        consent_email_newsletter: row.normalized.consentEmail,
        consent_email_club: row.normalized.consentEmail,
        consent_email_at: row.normalized.consentEmail ? now : null,
        consent_whatsapp: row.normalized.consentWhatsapp,
        consent_whatsapp_at: row.normalized.consentWhatsapp ? now : null,
        is_active: true,
        unsubscribed_at: null,
        unsubscribe_reason: null,
        privacy_policy_accepted: consentAccepted,
        privacy_policy_accepted_at: consentAccepted ? now : null,
        import_batch_id: batchId,
        updated_at: now,
      };

      let savedSubscriberId = subscriberId || '';

      if (isUpdate && subscriberId) {
        const { error } = await supabase
          .from('gdrb_subscribers')
          .update(payload)
          .eq('id', subscriberId);

        if (error) {
          console.error(error);
          importResult.failed += 1;
          failures.push({
            rowNumber: row.rowNumber,
            name: row.normalized.name,
            email: row.normalized.email,
            phone: row.normalized.phone,
            group: row.normalized.groupNames.join(' | '),
            problem: `Falha ao atualizar contacto: ${error.message || 'erro desconhecido'}`,
            recommendedAction: 'Verificar os dados e tentar novamente.',
          });
          continue;
        }

        importResult.updated += 1;
      } else {
        const { data: createdSubscriber, error } = await supabase
          .from('gdrb_subscribers')
          .insert({
            ...payload,
            unsubscribe_token: generateToken(),
          })
          .select('id, name, email, phone')
          .single();

        if (error || !createdSubscriber) {
          console.error(error);
          importResult.failed += 1;
          failures.push({
            rowNumber: row.rowNumber,
            name: row.normalized.name,
            email: row.normalized.email,
            phone: row.normalized.phone,
            group: row.normalized.groupNames.join(' | '),
            problem: `Falha ao criar contacto: ${error?.message || 'erro desconhecido'}`,
            recommendedAction: 'Verificar os dados e tentar novamente.',
          });
          continue;
        }

        savedSubscriberId = createdSubscriber.id as string;
        importResult.created += 1;

        const created = createdSubscriber as ExistingSubscriber;
        if (created.email) dynamicSubscriberByEmail.set(created.email.trim().toLowerCase(), created);
        if (created.phone) dynamicSubscriberByPhone.set(normalizePhone(created.phone), created);
      }

      if (row.normalized.groupIds.length > 0 && savedSubscriberId) {
        const links = row.normalized.groupIds.map((groupId) => ({
          subscriber_id: savedSubscriberId,
          group_id: groupId,
        }));

        const { error: linkError } = await supabase
          .from('gdrb_subscriber_groups')
          .upsert(links, { onConflict: 'subscriber_id,group_id' });

        if (linkError) {
          console.error(linkError);
          importResult.failed += 1;
          failures.push({
            rowNumber: row.rowNumber,
            name: row.normalized.name,
            email: row.normalized.email,
            phone: row.normalized.phone,
            group: row.normalized.groupNames.join(' | '),
            problem: `Contacto gravado, mas falhou a associação ao grupo: ${linkError.message || 'erro desconhecido'}`,
            recommendedAction: 'Verificar a associação ao grupo e repetir a operação se necessário.',
          });
        }
      }
    }

    await supabase
      .from('gdrb_contact_import_batches')
      .update({
        imported_count: importResult.created + importResult.updated,
        skipped_count: importResult.skipped,
        error_count: importResult.failed,
        status: importResult.failed > 0 ? 'completed' : 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', batchId);

    setRuntimeFailures(failures);
    setResult(importResult);

    const importedTotal = importResult.created + importResult.updated;
    const issuesTotal = importResult.skipped + importResult.failed;

    // Depois de uma importação concluída, o formulário volta ao estado inicial.
    // Mantemos apenas o resumo/relatório da operação para dar feedback inequívoco ao utilizador.
    setFileName('');
    setRawRows([]);
    setDetectedHeaders([]);
    setPreviewRows([]);
    setShowAllPreview(false);
    setPreviewPage(1);
    setTargetGroupId('');
    setGroupAssignmentMode('single_group');
    setAdvancedOpen(false);

    setImporting(false);
    await loadReferenceData(true);

    setMessage({
      type: importedTotal > 0 ? 'success' : 'error',
      text:
        importedTotal > 0
          ? issuesTotal > 0
            ? `Importação concluída. ${importedTotal} contacto(s) foram importados e ${issuesTotal} linha(s) ficaram por tratar. Consulta o resumo e descarrega o relatório de erros.`
            : `Importação concluída com sucesso. ${importedTotal} contacto(s) foram importados. O formulário foi limpo e está pronto para a próxima importação.`
          : 'A importação terminou sem gravar contactos. Consulta o resumo e o relatório de erros.',
    });
  }

  function clearImport() {
    setFileName('');
    setRawRows([]);
    setDetectedHeaders([]);
    setPreviewRows([]);
    setResult(null);
    setRuntimeFailures([]);
    setShowAllPreview(false);
    setPreviewPage(1);
    setMessage(null);
  }

  function changeAssignmentMode(mode: GroupAssignmentMode) {
    setGroupAssignmentMode(mode);
    if (rawRows.length > 0) {
      setPreviewRows(buildPreviewRows(rawRows, { assignmentMode: mode }));
    }
  }

  function changeTargetGroup(groupId: string) {
    setTargetGroupId(groupId);
    if (rawRows.length > 0) {
      setPreviewRows(buildPreviewRows(rawRows, { destinationGroupId: groupId }));
    }
  }

  function changeDefaultContactType(contactType: string) {
    setDefaultContactType(contactType);
    if (rawRows.length > 0) {
      setPreviewRows(buildPreviewRows(rawRows, { fallbackContactType: contactType }));
    }
  }

  function toggleAdvancedOptions() {
    if (advancedOpen) {
      setAdvancedOpen(false);
      if (groupAssignmentMode !== 'single_group') {
        changeAssignmentMode('single_group');
      }
      return;
    }

    setAdvancedOpen(true);
  }

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#21150f] via-[#3b120f] to-[#8b1d1d] p-8 text-white shadow-xl">
        <div className="max-w-3xl">
          <p className="mb-4 text-xs font-black uppercase tracking-[0.35em] text-red-200">
            Administração
          </p>
          <h1 className="font-serif text-5xl font-bold">Importar Contactos.</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/80">
            Escolhe o ficheiro CSV, indica o escalão/grupo de destino e importa. A validação acontece automaticamente antes de gravar.
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
          <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Linhas</p>
          <p className="mt-3 text-3xl font-black text-zinc-900">{stats.total}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600">Válidas</p>
          <p className="mt-3 text-3xl font-black text-emerald-700">{stats.valid}</p>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Novos</p>
          <p className="mt-3 text-3xl font-black text-blue-700">{stats.create}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-600">Atualizar</p>
          <p className="mt-3 text-3xl font-black text-amber-700">{stats.update}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-red-600">Importação de contactos</p>
            <h2 className="mt-2 text-2xl font-black text-zinc-900">Ficheiro → destino → importar.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
              Seleciona o CSV exportado, escolhe o escalão/grupo e confirma. A validação e a deteção de duplicados são automáticas.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2 lg:items-end">
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                Ficheiro CSV
              </label>
              <label className={`flex min-h-[52px] cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 transition ${
                fileName
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-zinc-300 bg-white text-zinc-700 hover:border-red-300'
              }`}>
                <span className="flex min-w-0 items-center gap-3">
                  <FileSpreadsheet className="h-5 w-5 shrink-0" />
                  <span className="truncate text-sm font-black">
                    {fileName || 'Escolher ficheiro CSV'}
                  </span>
                </span>
                <Upload className="h-4 w-4 shrink-0" />
                <input type="file" accept=".csv,text/csv" onChange={handleFileChange} className="hidden" />
              </label>
            </div>

            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                Destino
              </label>
              {groupAssignmentMode === 'single_group' ? (
                <select
                  value={targetGroupId}
                  onChange={(event) => changeTargetGroup(event.target.value)}
                  className="min-h-[52px] w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-black text-zinc-800 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
                >
                  <option value="">Selecionar escalão / grupo...</option>
                  {destinationGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}{group.birth_years ? ` (${group.birth_years})` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex min-h-[52px] items-center rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-black text-blue-700">
                  Usar grupos/escalões do próprio CSV
                </div>
              )}
            </div>

          </div>

          <div className="flex flex-col gap-3 border-t border-zinc-100 pt-4 md:flex-row md:items-center md:justify-between">
            <div className="text-xs font-semibold text-zinc-500">
              {previewRows.length > 0 ? (
                <span>
                  {stats.valid} válidos · {stats.create} novos · {stats.update} a atualizar
                  {stats.invalid > 0 ? ` · ${stats.invalid} com erro` : ''}
                </span>
              ) : (
                <span>Depois de escolher o ficheiro, a pré-visualização aparece automaticamente abaixo.</span>
              )}
            </div>

            <div className="md:min-w-[230px]">
              <button
                type="button"
                onClick={toggleAdvancedOptions}
                aria-expanded={advancedOpen}
                className="inline-flex w-full items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 md:w-auto"
              >
                <span>{advancedOpen ? 'Fechar opções avançadas' : 'Opções avançadas'}</span>
                {advancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {advancedOpen && (
                <div className="mt-3 grid gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-zinc-500">Origem do destino</p>
                  <div className="mt-2 space-y-2">
                    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-200 bg-white p-3">
                      <input
                        type="radio"
                        name="group-assignment-mode"
                        checked={groupAssignmentMode === 'single_group'}
                        onChange={() => changeAssignmentMode('single_group')}
                        className="mt-1"
                      />
                      <span>
                        <span className="block text-sm font-black text-zinc-900">Usar o destino escolhido</span>
                        <span className="mt-1 block text-xs font-semibold text-zinc-500">Fluxo recomendado para exportações por escalão.</span>
                      </span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-200 bg-white p-3">
                      <input
                        type="radio"
                        name="group-assignment-mode"
                        checked={groupAssignmentMode === 'csv_groups'}
                        onChange={() => changeAssignmentMode('csv_groups')}
                        className="mt-1"
                      />
                      <span>
                        <span className="block text-sm font-black text-zinc-900">Usar grupos do CSV</span>
                        <span className="mt-1 block text-xs font-semibold text-zinc-500">Só quando o ficheiro já tiver grupo/escalão/equipa.</span>
                      </span>
                    </label>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-[0.14em] text-zinc-500">
                      Tipo padrão do contacto
                    </label>
                    <select
                      value={defaultContactType}
                      onChange={(event) => changeDefaultContactType(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-bold text-zinc-800 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
                    >
                      {contactTypes.map((type) => (
                        <option key={type} value={type}>
                          {contactTypeLabels[type] || type}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={downloadTemplate}
                    className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-black text-zinc-700 transition hover:bg-zinc-100"
                  >
                    <Download className="h-4 w-4" />
                    Descarregar modelo CSV
                  </button>
                </div>
                </div>
              )}
            </div>
          </div>

          {detectedHeaders.length > 0 && (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-zinc-500">Colunas detetadas</p>
              <p className="mt-2 text-xs font-semibold text-zinc-600">{detectedHeaders.join(' · ')}</p>
            </div>
          )}
        </div>
      </section>

      {result && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600">Última importação</p>
              <h2 className="mt-1 text-xl font-black text-zinc-900">Importação concluída</h2>
              <p className="mt-1 text-sm font-semibold text-zinc-500">
                O formulário foi limpo automaticamente e já está pronto para o próximo ficheiro.
              </p>
            </div>
            {runtimeFailures.length > 0 && (
              <button
                type="button"
                onClick={downloadErrorReport}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700 transition hover:bg-red-100"
              >
                <Download className="h-4 w-4" />
                Descarregar relatório de erros
              </button>
            )}
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600">Criados</p>
              <p className="mt-2 text-3xl font-black text-emerald-700">{result.created}</p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Atualizados</p>
              <p className="mt-2 text-3xl font-black text-blue-700">{result.updated}</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Ignorados</p>
              <p className="mt-2 text-3xl font-black text-zinc-700">{result.skipped}</p>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-red-600">Falhas</p>
              <p className="mt-2 text-3xl font-black text-red-700">{result.failed}</p>
            </div>
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 bg-zinc-50 px-5 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-black text-zinc-900">Pré-visualização da importação</p>
              <p className="mt-1 text-xs font-semibold text-zinc-500">
                O sistema valida o ficheiro automaticamente. Revê o resumo; não é necessário percorrer todos os contactos.
              </p>
              {previewRows.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                  <span className="rounded-full bg-zinc-200/70 px-3 py-1.5 text-zinc-700">{fileName}</span>
                  <span className="rounded-full bg-red-100 px-3 py-1.5 text-red-700">
                    {groupAssignmentMode === 'single_group'
                      ? `Destino: ${destinationGroups.find((group) => group.id === targetGroupId)?.name || 'não selecionado'}`
                      : 'Destino: grupos do CSV'}
                  </span>
                  <span className="rounded-full bg-blue-100 px-3 py-1.5 text-blue-700">
                    Padrão: {contactTypeLabels[defaultContactType] || defaultContactType}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void loadReferenceData()}
                disabled={loading || importing}
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-black text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw className="h-4 w-4" />
                Atualizar base
              </button>
              <button
                type="button"
                onClick={clearImport}
                disabled={importing || previewRows.length === 0}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-black text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Limpar
              </button>
            </div>
          </div>
        </div>

        {loading || parsing ? (
          <div className="flex items-center justify-center p-12 text-sm font-semibold text-zinc-500">
            {loading ? 'A carregar dados de referência...' : 'A validar CSV...'}
          </div>
        ) : previewRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <FileSpreadsheet className="mb-4 h-10 w-10 text-zinc-300" />
            <h2 className="text-xl font-black text-zinc-900">Nenhum ficheiro carregado</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">
              Escolhe um ficheiro CSV e o respetivo escalão/grupo de destino. A validação aparece automaticamente.
            </p>
          </div>
        ) : (
          <div className="p-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-zinc-500">Encontrados</p>
                <p className="mt-2 text-2xl font-black text-zinc-900">{stats.total}</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-600">Novos</p>
                <p className="mt-2 text-2xl font-black text-emerald-700">{stats.create}</p>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600">Atualizações</p>
                <p className="mt-2 text-2xl font-black text-blue-700">{stats.update}</p>
              </div>
              <div className={`rounded-xl border p-4 ${stats.invalid > 0 ? 'border-red-200 bg-red-50' : 'border-zinc-200 bg-zinc-50'}`}>
                <p className={`text-xs font-black uppercase tracking-[0.14em] ${stats.invalid > 0 ? 'text-red-600' : 'text-zinc-500'}`}>Com problemas</p>
                <p className={`mt-2 text-2xl font-black ${stats.invalid > 0 ? 'text-red-700' : 'text-zinc-700'}`}>{stats.invalid}</p>
              </div>
            </div>

            {allFailures.length > 0 && (
              <div className="mt-5 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="flex items-center gap-2 text-sm font-black text-red-800">
                    <AlertTriangle className="h-4 w-4" />
                    {allFailures.length} problema(s) identificado(s)
                  </p>
                  <p className="mt-1 text-xs font-semibold text-red-700/80">
                    As linhas inválidas serão ignoradas. Descarrega o relatório para saber exatamente o que corrigir.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={downloadErrorReport}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-black text-red-700 transition hover:bg-red-100"
                >
                  <Download className="h-4 w-4" />
                  Descarregar relatório de erros
                </button>
              </div>
            )}

            <div className="mt-5 flex flex-col gap-3 border-b border-zinc-200 pb-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-black text-zinc-900">
                  {showAllPreview ? 'Lista completa' : `Amostra — primeiros ${Math.min(10, previewRows.length)} de ${previewRows.length}`}
                </p>
                <p className="mt-1 text-xs font-semibold text-zinc-500">
                  {showAllPreview
                    ? `Página ${previewPage} de ${previewPageCount} · ${previewPageSize} por página.`
                    : 'Para ficheiros grandes mostramos apenas uma amostra por defeito.'}
                </p>
              </div>
              {previewRows.length > 10 && (
                <button
                  type="button"
                  onClick={() => {
                    setShowAllPreview((current) => !current);
                    setPreviewPage(1);
                  }}
                  className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-black text-zinc-700 transition hover:bg-zinc-50"
                >
                  {showAllPreview ? 'Mostrar apenas amostra' : `Ver todos os ${previewRows.length} contactos`}
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.14em] text-zinc-500">Linha</th>
                    <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.14em] text-zinc-500">Contacto</th>
                    <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.14em] text-zinc-500">Tipo / grupos</th>
                    <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.14em] text-zinc-500">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 bg-white">
                  {previewRowsToShow.map((row) => (
                    <tr key={`${row.rowNumber}-${row.normalized.email}-${row.normalized.phone}`} className="align-top transition hover:bg-zinc-50/80">
                      <td className="px-4 py-4 text-sm font-black text-zinc-700">{row.rowNumber}</td>
                      <td className="px-4 py-4">
                        <div className="font-black text-zinc-900">{row.normalized.name || 'Sem nome'}</div>
                        <div className="mt-1 text-sm font-semibold text-zinc-500">{row.normalized.email || 'Sem email'}</div>
                        {row.normalized.phone && <div className="mt-1 text-sm text-zinc-500">{row.normalized.phone}</div>}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-black text-zinc-800">
                          {contactTypeLabels[row.normalized.contactType] || row.normalized.contactType}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {row.normalized.groupNames.map((groupName) => (
                            <span key={groupName} className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-bold text-zinc-600">
                              {groupName}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {row.errors.length > 0 ? (
                          <div className="space-y-1.5">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-black text-red-700">
                              <XCircle className="h-3.5 w-3.5" /> Erro
                            </span>
                            {row.errors.slice(0, 2).map((error) => (
                              <p key={error} className="text-xs font-semibold text-red-600">{error}</p>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black ${
                              row.action === 'create'
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border-blue-200 bg-blue-50 text-blue-700'
                            }`}>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {row.action === 'create' ? 'Criar' : 'Atualizar'}
                            </span>
                            {!row.normalized.consentEmail && (
                              <p className="text-xs font-semibold text-amber-600">Sem consentimento de email</p>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {showAllPreview && previewPageCount > 1 && (
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-zinc-100 pt-4">
                <button
                  type="button"
                  onClick={() => setPreviewPage((page) => Math.max(1, page - 1))}
                  disabled={previewPage === 1}
                  className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-black text-zinc-700 disabled:opacity-40"
                >
                  Anterior
                </button>
                <span className="text-xs font-bold text-zinc-500">Página {previewPage} de {previewPageCount}</span>
                <button
                  type="button"
                  onClick={() => setPreviewPage((page) => Math.min(previewPageCount, page + 1))}
                  disabled={previewPage === previewPageCount}
                  className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-black text-zinc-700 disabled:opacity-40"
                >
                  Seguinte
                </button>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-black text-zinc-900">Pronto para importar</p>
                <p className="mt-1 text-xs font-semibold text-zinc-500">
                  {stats.valid} contacto(s) válido(s) serão criados ou atualizados.
                  {stats.invalid > 0 ? ` ${stats.invalid} linha(s) com erro serão ignoradas.` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={confirmImport}
                disabled={importing || parsing || loading || stats.valid === 0}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                {importing ? 'A importar...' : `Importar ${stats.valid} contactos`}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
