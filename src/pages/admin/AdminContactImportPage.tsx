import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
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

const scopeLabels: Record<string, string> = {
  newsletter: 'Newsletter',
  escalao: 'Escalão',
  interno: 'Interno',
  socios: 'Sócios',
  parceiros: 'Parceiros',
  geral: 'Geral',
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
  const [groups, setGroups] = useState<CommunicationGroup[]>([]);
  const [subscribers, setSubscribers] = useState<ExistingSubscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState('');
  const [previewRows, setPreviewRows] = useState<ImportPreviewRow[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function loadReferenceData() {
    setLoading(true);
    setMessage(null);

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

  function buildPreviewRows(rows: Record<string, string>[]) {
    return rows.map((row, index): ImportPreviewRow => {
      const errors: string[] = [];
      const warnings: string[] = [];
      const rawEmail = getValue(row, ['email', 'e-mail', 'mail']).trim().toLowerCase();
      const rawPhone = normalizePhone(getValue(row, ['telefone', 'telemovel', 'telemóvel', 'phone', 'telemovel_telefone']));
      const rawContactType = normalizeText(getValue(row, ['tipo_contacto', 'tipo', 'contact_type'])) || 'newsletter';
      const contactType = rawContactType.replace(/ç/g, 'c');
      const groupNames = getGroupNames(getValue(row, ['grupo', 'grupos', 'escalao', 'escalão', 'equipa']));
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
          name: getValue(row, ['nome', 'name']).trim(),
          email: rawEmail,
          phone: rawPhone,
          contactType: normalizedContactType,
          communicationScope,
          relationship: getValue(row, ['relacao', 'relação', 'relationship']).trim(),
          athleteName: getValue(row, ['atleta', 'athlete', 'athlete_name', 'nome_atleta']).trim(),
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
    setPreviewRows([]);

    if (!file) return;

    setParsing(true);
    setFileName(file.name);

    try {
      const content = await file.text();
      const { rows } = parseCsv(content);

      if (rows.length === 0) {
        setMessage({ type: 'error', text: 'O ficheiro CSV não tem linhas para importar.' });
        setParsing(false);
        return;
      }

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

  async function confirmImport() {
    const validRows = previewRows.filter((row) => row.errors.length === 0);

    if (validRows.length === 0) {
      setMessage({ type: 'error', text: 'Não existem linhas válidas para importar.' });
      return;
    }

    setImporting(true);
    setMessage(null);
    setResult(null);

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

    setResult(importResult);
    setMessage({
      type: importResult.failed > 0 ? 'error' : 'success',
      text:
        importResult.failed > 0
          ? 'Importação concluída com alguns erros. Revê os contadores abaixo.'
          : 'Importação concluída com sucesso.',
    });
    setImporting(false);
    await loadReferenceData();
  }

  function clearImport() {
    setFileName('');
    setPreviewRows([]);
    setResult(null);
    setMessage(null);
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
            Importa contactos por CSV com validação, pré-visualização e associação automática a grupos ou escalões antes de gravar.
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
        <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-red-700">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-zinc-900">1. Preparar o ficheiro</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  Descarrega o modelo, preenche as linhas e guarda em CSV. O separador recomendado é ponto e vírgula.
                </p>
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-black text-zinc-800 transition hover:bg-zinc-100"
                >
                  <Download className="h-4 w-4" />
                  Descarregar modelo CSV
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-red-700">
                <Upload className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-zinc-900">2. Carregar e validar</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  O sistema mostra uma prévia antes de gravar. Linhas com erro ficam bloqueadas.
                </p>
                <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-black text-white transition hover:bg-red-700">
                  <Upload className="h-4 w-4" />
                  Escolher CSV
                  <input type="file" accept=".csv,text/csv" onChange={handleFileChange} className="hidden" />
                </label>
                {fileName && <p className="mt-3 text-xs font-semibold text-zinc-500">Ficheiro: {fileName}</p>}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">Tipos aceites</p>
            <p className="mt-2 text-sm font-semibold text-zinc-600">{contactTypes.join(', ')}</p>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">Grupos carregados</p>
            <p className="mt-2 text-sm font-semibold text-zinc-600">{groups.length} grupos/escalões ativos</p>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">Regra de duplicados</p>
            <p className="mt-2 text-sm font-semibold text-zinc-600">Email primeiro; se não houver email, usa telefone.</p>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">Grupos múltiplos</p>
            <p className="mt-2 text-sm font-semibold text-zinc-600">Usa | no campo grupo. Ex: Iniciados|Treinadores</p>
          </div>
        </div>
      </section>

      {result && (
        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600">Criados</p>
            <p className="mt-3 text-3xl font-black text-emerald-700">{result.created}</p>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Atualizados</p>
            <p className="mt-3 text-3xl font-black text-blue-700">{result.updated}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Ignorados</p>
            <p className="mt-3 text-3xl font-black text-zinc-700">{result.skipped}</p>
          </div>
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-red-600">Falhas</p>
            <p className="mt-3 text-3xl font-black text-red-700">{result.failed}</p>
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-zinc-200 bg-zinc-50 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-black text-zinc-800">Pré-visualização da importação</p>
            <p className="mt-1 text-xs font-semibold text-zinc-500">
              Confirma os dados antes de gravar. Nenhum contacto é criado antes de clicares em “Confirmar importação”.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadReferenceData}
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
            <button
              type="button"
              onClick={confirmImport}
              disabled={importing || parsing || loading || stats.valid === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <CheckCircle2 className="h-4 w-4" />
              {importing ? 'A importar...' : 'Confirmar importação'}
            </button>
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
              Começa por descarregar o modelo CSV. Depois carrega o ficheiro preenchido para ver a prévia e validar erros antes de gravar.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.16em] text-zinc-500">Linha</th>
                  <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.16em] text-zinc-500">Contacto</th>
                  <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.16em] text-zinc-500">Tipo / grupos</th>
                  <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.16em] text-zinc-500">Consentimentos</th>
                  <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.16em] text-zinc-500">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white">
                {previewRows.map((row) => (
                  <tr key={`${row.rowNumber}-${row.normalized.email}-${row.normalized.phone}`} className="align-top transition hover:bg-zinc-50/80">
                    <td className="px-5 py-4 text-sm font-black text-zinc-700">{row.rowNumber}</td>
                    <td className="px-5 py-4">
                      <div className="font-black text-zinc-900">{row.normalized.name || 'Sem nome'}</div>
                      <div className="mt-1 text-sm font-semibold text-zinc-500">{row.normalized.email || 'Sem email'}</div>
                      <div className="mt-1 text-sm text-zinc-500">{row.normalized.phone || 'Sem telefone'}</div>
                      {row.normalized.athleteName && (
                        <div className="mt-1 text-xs font-semibold text-zinc-500">Atleta: {row.normalized.athleteName}</div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-sm font-black text-zinc-800">
                        {contactTypeLabels[row.normalized.contactType] || row.normalized.contactType}
                      </div>
                      <div className="mt-1 text-xs font-semibold text-zinc-500">
                        Âmbito: {scopeLabels[row.normalized.communicationScope] || row.normalized.communicationScope}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {row.normalized.groupNames.length > 0 ? (
                          row.normalized.groupNames.map((groupName) => (
                            <span key={groupName} className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-bold text-zinc-600">
                              {groupName}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs font-semibold text-zinc-400">Sem grupo</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-2 text-xs font-black">
                        <span className={row.normalized.consentEmail ? 'text-emerald-700' : 'text-zinc-400'}>
                          Email: {row.normalized.consentEmail ? 'Sim' : 'Não'}
                        </span>
                        <span className={row.normalized.consentWhatsapp ? 'text-emerald-700' : 'text-zinc-400'}>
                          WhatsApp: {row.normalized.consentWhatsapp ? 'Sim' : 'Não'}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {row.errors.length > 0 ? (
                        <div className="space-y-2">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-black text-red-700">
                            <XCircle className="h-3.5 w-3.5" />
                            Erro
                          </span>
                          {row.errors.map((error) => (
                            <p key={error} className="text-xs font-semibold text-red-600">{error}</p>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black ${
                              row.action === 'create'
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border-blue-200 bg-blue-50 text-blue-700'
                            }`}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {row.action === 'create' ? 'Criar' : 'Atualizar'}
                          </span>
                          {row.warnings.map((warning) => (
                            <p key={warning} className="inline-flex items-start gap-1.5 text-xs font-semibold text-amber-600">
                              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                              {warning}
                            </p>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
