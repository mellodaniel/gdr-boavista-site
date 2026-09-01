import { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Download,
  FileSpreadsheet,
  Filter,
  Mail,
  Phone,
  RefreshCcw,
  Search,
  Users,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { GdrbMemberRequest } from '../../types/database';

const statusOptions = [
  { value: 'novo', label: 'Novo' },
  { value: 'em_contacto', label: 'Em contacto' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'convertido', label: 'Convertido' },
  { value: 'arquivado', label: 'Arquivado' },
];

const listStatusOptions = [
  { value: 'todos', label: 'Todos' },
  ...statusOptions,
];

const reportStatusOptions = [
  { value: 'todos', label: 'Todos os estados' },
  ...statusOptions,
];

const reportFormatOptions = [
  { value: 'csv', label: 'CSV' },
  { value: 'excel', label: 'Excel' },
] as const;

type ReportFormat = (typeof reportFormatOptions)[number]['value'];

const csvColumnLabels: Record<string, string> = {
  id: 'ID',
  full_name: 'Nome completo',
  email: 'Email',
  phone: 'Telefone',
  nif: 'NIF',
  notes: 'Mensagem / observações',
  status: 'Status atual',
  status_label: 'Status atual (texto)',
  created_at: 'Data de registo',
  updated_at: 'Última atualização',
};

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

function getStatusBadgeClass(status: string) {
  if (status === 'novo') return 'border-blue-200 bg-blue-50 text-blue-700';
  if (status === 'em_contacto') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (status === 'pendente') return 'border-orange-200 bg-orange-50 text-orange-700';
  if (status === 'convertido') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'arquivado') return 'border-zinc-200 bg-zinc-100 text-zinc-600';
  return 'border-zinc-200 bg-zinc-50 text-zinc-700';
}

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getDefaultStartDate() {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  return toDateInputValue(date);
}

function getDefaultEndDate() {
  return toDateInputValue(new Date());
}

function normalizeDateForComparison(value: string, endOfDay = false) {
  const date = new Date(`${value}T00:00:00`);

  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  }

  return date;
}

function escapeCsvValue(value: unknown) {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = value instanceof Date ? value.toISOString() : String(value);
  return `"${stringValue.replaceAll('"', '""')}"`;
}

function escapeHtmlValue(value: unknown) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function getReportColumns(requests: GdrbMemberRequest[]) {
  const preferredColumns = [
    'id',
    'full_name',
    'email',
    'phone',
    'nif',
    'notes',
    'status',
    'status_label',
    'created_at',
    'updated_at',
  ];

  const availableColumns = new Set<string>();

  requests.forEach((request) => {
    Object.keys(request as unknown as Record<string, unknown>).forEach((key) => {
      availableColumns.add(key);
    });
  });

  const orderedColumns = preferredColumns.filter(
    (column) => column === 'status_label' || availableColumns.has(column),
  );

  const extraColumns = Array.from(availableColumns)
    .filter((column) => !preferredColumns.includes(column))
    .sort((firstColumn, secondColumn) => firstColumn.localeCompare(secondColumn));

  return [...orderedColumns, ...extraColumns];
}

export function AdminMembersPage() {
  const [requests, setRequests] = useState<GdrbMemberRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [reportStartDate, setReportStartDate] = useState(getDefaultStartDate());
  const [reportEndDate, setReportEndDate] = useState(getDefaultEndDate());
  const [reportStatus, setReportStatus] = useState('todos');
  const [reportFormat, setReportFormat] = useState<ReportFormat>('csv');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  async function loadRequests() {
    setIsLoading(true);
    setErrorMessage('');

    const { data, error } = await supabase
      .from('gdrb_member_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao carregar pedidos de sócio:', error);
      setErrorMessage('Não foi possível carregar os pedidos de sócio.');
      setIsLoading(false);
      return;
    }

    setRequests(data ?? []);
    setIsLoading(false);
  }

  useEffect(() => {
    loadRequests();
  }, []);

  const requestCounts = useMemo(() => {
    return {
      total: requests.filter((request) => request.status !== 'arquivado').length,
      novo: requests.filter((request) => request.status === 'novo').length,
      emContacto: requests.filter((request) => request.status === 'em_contacto').length,
      pendente: requests.filter((request) => request.status === 'pendente').length,
      convertido: requests.filter((request) => request.status === 'convertido').length,
      arquivado: requests.filter((request) => request.status === 'arquivado').length,
    };
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return requests.filter((request) => {
      const matchesStatus =
        statusFilter === 'todos'
          ? request.status !== 'arquivado'
          : request.status === statusFilter;

      const matchesSearch =
        !term ||
        request.full_name.toLowerCase().includes(term) ||
        request.email?.toLowerCase().includes(term) ||
        request.phone?.toLowerCase().includes(term) ||
        request.nif?.toLowerCase().includes(term) ||
        request.notes?.toLowerCase().includes(term);

      return matchesStatus && matchesSearch;
    });
  }, [requests, searchTerm, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const visibleRequests = filteredRequests.slice(startIndex, startIndex + pageSize);
  const firstVisible = filteredRequests.length === 0 ? 0 : startIndex + 1;
  const lastVisible = Math.min(startIndex + pageSize, filteredRequests.length);

  const reportRequests = useMemo(() => {
    const startDate = reportStartDate
      ? normalizeDateForComparison(reportStartDate)
      : null;
    const endDate = reportEndDate
      ? normalizeDateForComparison(reportEndDate, true)
      : null;

    return requests.filter((request) => {
      const createdAt = new Date(request.created_at);
      const matchesStartDate = !startDate || createdAt >= startDate;
      const matchesEndDate = !endDate || createdAt <= endDate;
      const matchesStatus = reportStatus === 'todos' || request.status === reportStatus;

      return matchesStartDate && matchesEndDate && matchesStatus;
    });
  }, [reportEndDate, reportStartDate, reportStatus, requests]);

  async function handleStatusChange(id: string, status: string) {
    setSuccessMessage('');
    setErrorMessage('');

    const { error } = await supabase
      .from('gdrb_member_requests')
      .update({ status })
      .eq('id', id);

    if (error) {
      console.error('Erro ao atualizar pedido:', error);
      setErrorMessage('Não foi possível atualizar o estado do pedido.');
      return;
    }

    setSuccessMessage('Estado do pedido atualizado com sucesso.');
    await loadRequests();
  }

  function getReportValue(request: GdrbMemberRequest, column: string) {
    const requestRecord = request as unknown as Record<string, unknown>;

    if (column === 'status_label') {
      return formatStatus(String(request.status));
    }

    return requestRecord[column];
  }

  function buildReportMetadata() {
    const generatedAt = new Date().toLocaleString('pt-PT');
    const statusLabel =
      reportStatus === 'todos'
        ? 'Todos os estados'
        : formatStatus(reportStatus);

    return [
      ['Relatório', 'Relatório de novos sócios GDR Boavista'],
      ['Gerado em', generatedAt],
      ['Data inicial', reportStartDate],
      ['Data final', reportEndDate],
      ['Estado', statusLabel],
      ['Total de registos', String(reportRequests.length)],
    ];
  }

  function buildCsvReport(columns: string[]) {
    const metadata = buildReportMetadata().map((row) =>
      row.map((value) => escapeCsvValue(value)).join(';'),
    );

    const header = columns.map((column) => escapeCsvValue(csvColumnLabels[column] ?? column)).join(';');

    const rows = reportRequests.map((request) =>
      columns
        .map((column) => escapeCsvValue(getReportValue(request, column)))
        .join(';'),
    );

    return [...metadata, '', header, ...rows].join('\n');
  }

  function buildExcelReport(columns: string[]) {
    const metadataRows = buildReportMetadata()
      .map(
        ([label, value]) => `
          <tr>
            <th style="text-align:left;background:#7f1d1d;color:#ffffff;padding:8px;border:1px solid #d4d4d8;">${escapeHtmlValue(label)}</th>
            <td style="padding:8px;border:1px solid #d4d4d8;">${escapeHtmlValue(value)}</td>
          </tr>
        `,
      )
      .join('');

    const headerCells = columns
      .map(
        (column) =>
          `<th style="text-align:left;background:#24180f;color:#ffffff;padding:8px;border:1px solid #d4d4d8;">${escapeHtmlValue(csvColumnLabels[column] ?? column)}</th>`,
      )
      .join('');

    const bodyRows = reportRequests
      .map((request) => {
        const cells = columns
          .map(
            (column) =>
              `<td style="padding:8px;border:1px solid #d4d4d8;vertical-align:top;">${escapeHtmlValue(getReportValue(request, column))}</td>`,
          )
          .join('');

        return `<tr>${cells}</tr>`;
      })
      .join('');

    return `
      <html>
        <head>
          <meta charset="UTF-8" />
        </head>
        <body>
          <table>
            <tbody>
              ${metadataRows}
            </tbody>
          </table>
          <br />
          <table>
            <thead>
              <tr>${headerCells}</tr>
            </thead>
            <tbody>
              ${bodyRows}
            </tbody>
          </table>
        </body>
      </html>
    `;
  }

  function handleGenerateReport() {
    setSuccessMessage('');
    setErrorMessage('');

    if (!reportStartDate || !reportEndDate) {
      setErrorMessage('Indica a data inicial e a data final para gerar o relatório.');
      return;
    }

    if (normalizeDateForComparison(reportStartDate) > normalizeDateForComparison(reportEndDate)) {
      setErrorMessage('A data inicial não pode ser maior do que a data final.');
      return;
    }

    if (reportRequests.length === 0) {
      setErrorMessage('Não existem novos sócios para o período e estado selecionados.');
      return;
    }

    const columns = getReportColumns(reportRequests);
    const baseFilename = `relatorio-novos-socios-${reportStartDate}-a-${reportEndDate}`;

    if (reportFormat === 'excel') {
      const excelContent = buildExcelReport(columns);
      downloadFile(
        `${baseFilename}.xls`,
        excelContent,
        'application/vnd.ms-excel;charset=utf-8;',
      );
      setSuccessMessage(`Relatório Excel gerado com ${reportRequests.length} registo(s).`);
      return;
    }

    const csvContent = buildCsvReport(columns);
    downloadFile(
      `${baseFilename}.csv`,
      `\uFEFF${csvContent}`,
      'text/csv;charset=utf-8;',
    );
    setSuccessMessage(`Relatório CSV gerado com ${reportRequests.length} registo(s).`);
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
              Sócios.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-300">
              Acompanha os pedidos de sócio recebidos através do site público do
              GDR Boavista.
            </p>
          </div>

          <button
            type="button"
            onClick={loadRequests}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
          >
            <RefreshCcw size={17} />
            Atualizar
          </button>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-2 gap-3 md:mt-8 md:grid-cols-5 md:gap-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm md:rounded-sm md:p-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">Todos</p>
          <p className="mt-2 text-2xl font-black md:text-3xl text-zinc-900">{requestCounts.total}</p>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm md:rounded-sm md:p-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Novos</p>
          <p className="mt-2 text-2xl font-black md:text-3xl text-blue-700">{requestCounts.novo}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm md:rounded-sm md:p-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-600">Em contacto</p>
          <p className="mt-2 text-2xl font-black md:text-3xl text-amber-700">{requestCounts.emContacto}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm md:rounded-sm md:p-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">Convertidos</p>
          <p className="mt-2 text-2xl font-black md:text-3xl text-emerald-700">{requestCounts.convertido}</p>
        </div>
        <div className="col-span-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 shadow-sm md:col-span-1 md:rounded-sm md:p-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">Arquivados</p>
          <p className="mt-2 text-2xl font-black md:text-3xl text-zinc-700">{requestCounts.arquivado}</p>
        </div>
      </section>

      <section className="mt-8 rounded-sm border border-zinc-200 bg-white p-7 shadow-sm">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-700">
              <FileSpreadsheet size={23} />
            </div>

            <p className="mt-5 text-sm font-bold uppercase tracking-[0.35em] text-red-700">
              Relatório semanal
            </p>

            <h2 className="mt-3 font-serif text-4xl font-light text-[#24180f]">
              Novos sócios
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-600">
              Gera um relatório em CSV ou Excel com todos os campos dos novos pedidos de
              sócio, incluindo o estado atual no momento da geração. Por defeito,
              o período vem preparado para os últimos 7 dias, ideal para envio à
              presidência todas as segundas-feiras.
            </p>
          </div>

          <div className="rounded-sm bg-[#f6f2ec] px-5 py-4 text-sm font-semibold text-zinc-700 lg:min-w-[220px]">
            {reportRequests.length} pedido(s) no relatório atual
          </div>
        </div>

        <div className="mt-7 grid gap-4 md:grid-cols-5">
          <div>
            <label className="text-sm font-black text-zinc-800">Data inicial</label>
            <input
              type="date"
              value={reportStartDate}
              onChange={(event) => setReportStartDate(event.target.value)}
              className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm font-semibold outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
            />
          </div>

          <div>
            <label className="text-sm font-black text-zinc-800">Data final</label>
            <input
              type="date"
              value={reportEndDate}
              onChange={(event) => setReportEndDate(event.target.value)}
              className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm font-semibold outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
            />
          </div>

          <div>
            <label className="text-sm font-black text-zinc-800">Estado</label>
            <select
              value={reportStatus}
              onChange={(event) => setReportStatus(event.target.value)}
              className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm font-semibold outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
            >
              {reportStatusOptions.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-black text-zinc-800">Formato</label>
            <select
              value={reportFormat}
              onChange={(event) => setReportFormat(event.target.value as ReportFormat)}
              className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm font-semibold outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
            >
              {reportFormatOptions.map((format) => (
                <option key={format.value} value={format.value}>
                  {format.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleGenerateReport}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-red-700 px-5 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-[#24180f]"
            >
              <Download size={17} />
              Gerar relatório
            </button>
          </div>
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

      <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm md:mt-8 md:rounded-sm md:p-5">
        <button
          type="button"
          onClick={() => setShowMobileFilters((value) => !value)}
          className="flex w-full items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-black text-zinc-800 md:hidden"
        >
          <span className="inline-flex items-center gap-2">
            <Filter size={16} />
            Filtros e pesquisa
          </span>
          <ChevronDown size={16} className={`transition ${showMobileFilters ? 'rotate-180' : ''}`} />
        </button>

        <div className={`${showMobileFilters ? 'mt-4 flex' : 'hidden'} flex-col gap-4 md:flex xl:flex-row xl:items-center xl:justify-between`}>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Pesquisar por nome, email, telefone, NIF ou observações..."
              className="w-full rounded-xl border border-zinc-200 py-3 pl-12 pr-4 text-sm font-semibold outline-none transition focus:border-red-700 focus:ring-4 focus:ring-red-100 md:rounded-md"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-red-700 focus:ring-4 focus:ring-red-100"
            >
              {listStatusOptions.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>

            <select
              value={pageSize}
              onChange={(event) => setPageSize(Number(event.target.value))}
              className="rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-red-700 focus:ring-4 focus:ring-red-100"
            >
              <option value={10}>10 por página</option>
              <option value={25}>25 por página</option>
              <option value={50}>50 por página</option>
            </select>

            <button
              type="button"
              onClick={loadRequests}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm font-black text-zinc-700 transition hover:bg-zinc-50"
            >
              <RefreshCcw size={16} />
              Atualizar
            </button>
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="mt-8 rounded-sm border border-zinc-200 bg-white p-8 text-zinc-600 shadow-sm">
          A carregar pedidos de sócio...
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="mt-8 rounded-sm border border-dashed border-zinc-300 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-700">
            <Users size={28} />
          </div>

          <h2 className="mt-5 font-serif text-3xl font-light text-[#24180f]">
            Sem pedidos encontrados
          </h2>

          <p className="mt-3 text-zinc-500">
            Altera os filtros ou a pesquisa para consultar outros pedidos.
          </p>
        </div>
      ) : (
        <section className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm md:mt-8 md:rounded-sm">
          <div className="divide-y divide-zinc-100 md:hidden">
            {visibleRequests.map((request) => {
              const isExpanded = expandedRequestId === request.id;

              return (
                <article key={request.id} className="bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-black text-zinc-900">{request.full_name}</p>
                      <p className="mt-1 text-xs font-semibold text-zinc-400">{formatDate(request.created_at)}</p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] ${getStatusBadgeClass(request.status)}`}>
                      {formatStatus(request.status)}
                    </span>
                  </div>

                  <div className="mt-3 space-y-2 text-sm">
                    {request.email && (
                      <a href={`mailto:${request.email}`} className="flex min-w-0 items-center gap-2 font-semibold text-red-700">
                        <Mail size={15} className="shrink-0" />
                        <span className="truncate">{request.email}</span>
                      </a>
                    )}
                    {request.phone && (
                      <a href={`tel:${request.phone}`} className="flex items-center gap-2 font-semibold text-zinc-700">
                        <Phone size={15} className="shrink-0" />
                        {request.phone}
                      </a>
                    )}
                    {request.nif && <p className="text-xs font-semibold text-zinc-500">NIF: {request.nif}</p>}
                  </div>

                  {isExpanded && request.notes && (
                    <div className="mt-4 rounded-xl bg-[#f6f2ec] p-4 text-sm leading-6 text-zinc-600">
                      {request.notes}
                    </div>
                  )}

                  <label className="mt-4 grid gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-zinc-500">
                    Estado
                    <select
                      value={request.status}
                      onChange={(event) => handleStatusChange(request.id, event.target.value)}
                      className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold normal-case tracking-normal text-zinc-700 outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
                    >
                      {statusOptions.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {(request.notes || request.nif) ? (
                      <button
                        type="button"
                        onClick={() => setExpandedRequestId(isExpanded ? null : request.id)}
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-3 text-xs font-black text-zinc-700"
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        Detalhes
                      </button>
                    ) : <span />}
                    <button
                      type="button"
                      onClick={() => handleStatusChange(request.id, request.status === 'arquivado' ? 'novo' : 'arquivado')}
                      className={`inline-flex min-h-12 items-center justify-center rounded-xl px-3 py-3 text-xs font-black text-white ${request.status === 'arquivado' ? 'bg-red-700' : 'bg-zinc-900'}`}
                    >
                      {request.status === 'arquivado' ? 'Reativar' : 'Arquivar'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full divide-y divide-zinc-200">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                    Pedido
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                    Contacto
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
                {visibleRequests.map((request) => {
                  const isExpanded = expandedRequestId === request.id;

                  return (
                    <tr key={request.id} className="align-top transition hover:bg-zinc-50/80">
                      <td className="px-5 py-5">
                        <div className="font-black text-zinc-900">{request.full_name}</div>
                        {request.nif && (
                          <div className="mt-1 text-xs font-semibold text-zinc-500">
                            NIF: {request.nif}
                          </div>
                        )}
                        {isExpanded && request.notes && (
                          <div className="mt-3 max-w-lg rounded-md bg-[#f6f2ec] px-4 py-3 text-sm leading-6 text-zinc-600">
                            {request.notes}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-5 text-sm text-zinc-600">
                        <div className="space-y-2">
                          {request.email && (
                            <a
                              href={`mailto:${request.email}`}
                              className="flex items-center gap-2 font-semibold text-red-700 hover:text-red-900"
                            >
                              <Mail size={15} />
                              {request.email}
                            </a>
                          )}

                          {request.phone && (
                            <a
                              href={`tel:${request.phone}`}
                              className="flex items-center gap-2 font-semibold text-zinc-700 hover:text-red-700"
                            >
                              <Phone size={15} />
                              {request.phone}
                            </a>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-5">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${getStatusBadgeClass(request.status)}`}>
                          {formatStatus(request.status)}
                        </span>

                        <select
                          value={request.status}
                          onChange={(event) => handleStatusChange(request.id, event.target.value)}
                          className="mt-3 block w-full min-w-[180px] rounded-md border border-zinc-200 px-3 py-2 text-xs font-semibold outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
                        >
                          {statusOptions.map((status) => (
                            <option key={status.value} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-5 py-5 text-sm font-semibold text-zinc-600">
                        {formatDate(request.created_at)}
                      </td>

                      <td className="px-5 py-5 text-right">
                        <div className="flex justify-end gap-2">
                          {(request.notes || request.nif) && (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedRequestId((current) =>
                                  current === request.id ? null : request.id,
                                )
                              }
                              className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs font-black text-zinc-700 transition hover:bg-zinc-50"
                            >
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              Detalhes
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              handleStatusChange(
                                request.id,
                                request.status === 'arquivado' ? 'novo' : 'arquivado',
                              )
                            }
                            className={
                              request.status === 'arquivado'
                                ? 'rounded-md bg-red-700 px-3 py-2 text-xs font-black text-white transition hover:bg-[#24180f]'
                                : 'rounded-md bg-zinc-900 px-3 py-2 text-xs font-black text-white transition hover:bg-zinc-700'
                            }
                          >
                            {request.status === 'arquivado' ? 'Reativar' : 'Arquivar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-4 border-t border-zinc-200 px-5 py-4 text-sm text-zinc-600 md:flex-row md:items-center md:justify-between">
            <div>
              A mostrar <strong>{firstVisible}</strong>-<strong>{lastVisible}</strong> de{' '}
              <strong>{filteredRequests.length}</strong> pedido(s)
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={safeCurrentPage === 1}
                className="inline-flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-xs font-black text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft size={14} />
                Anterior
              </button>

              <span className="px-3 text-xs font-black uppercase tracking-[0.16em] text-zinc-400">
                {safeCurrentPage}/{totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={safeCurrentPage === totalPages}
                className="inline-flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-xs font-black text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Seguinte
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
