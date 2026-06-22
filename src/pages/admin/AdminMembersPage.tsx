import { useEffect, useMemo, useState } from 'react';
import { Download, FileSpreadsheet, Mail, Phone, RefreshCcw, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { GdrbMemberRequest } from '../../types/database';

const statusOptions = [
  { value: 'novo', label: 'Novo' },
  { value: 'em_contacto', label: 'Em contacto' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'convertido', label: 'Convertido' },
  { value: 'arquivado', label: 'Arquivado' },
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
    .replaceAll('\"', '&quot;')
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
            <label className="text-sm font-black text-zinc-800">
              Data inicial
            </label>

            <input
              type="date"
              value={reportStartDate}
              onChange={(event) => setReportStartDate(event.target.value)}
              className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm font-semibold outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
            />
          </div>

          <div>
            <label className="text-sm font-black text-zinc-800">
              Data final
            </label>

            <input
              type="date"
              value={reportEndDate}
              onChange={(event) => setReportEndDate(event.target.value)}
              className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm font-semibold outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
            />
          </div>

          <div>
            <label className="text-sm font-black text-zinc-800">
              Estado
            </label>

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
            <label className="text-sm font-black text-zinc-800">
              Formato
            </label>

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

      {isLoading ? (
        <div className="mt-8 rounded-sm border border-zinc-200 bg-white p-8 text-zinc-600 shadow-sm">
          A carregar pedidos de sócio...
        </div>
      ) : requests.length === 0 ? (
        <div className="mt-8 rounded-sm border border-dashed border-zinc-300 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-700">
            <Users size={28} />
          </div>

          <h2 className="mt-5 font-serif text-3xl font-light text-[#24180f]">
            Sem pedidos de sócio
          </h2>

          <p className="mt-3 text-zinc-500">
            Ainda não existem pedidos registados.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-5">
          {requests.map((request) => (
            <article
              key={request.id}
              className="overflow-hidden rounded-sm border border-zinc-200 bg-white shadow-sm"
            >
              <div className="h-1.5 bg-red-700" />

              <div className="grid gap-6 p-7 lg:grid-cols-[1fr_auto] lg:items-start">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-red-700">
                      {formatStatus(request.status)}
                    </span>

                    <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-700">
                      {formatDate(request.created_at)}
                    </span>
                  </div>

                  <h3 className="mt-6 font-serif text-4xl font-light text-[#24180f]">
                    {request.full_name}
                  </h3>

                  <div className="mt-5 grid gap-3 text-sm text-zinc-600">
                    {request.email && (
                      <a
                        href={`mailto:${request.email}`}
                        className="flex items-center gap-3 hover:text-red-700"
                      >
                        <Mail size={17} className="text-red-700" />
                        {request.email}
                      </a>
                    )}

                    {request.phone && (
                      <a
                        href={`tel:${request.phone}`}
                        className="flex items-center gap-3 hover:text-red-700"
                      >
                        <Phone size={17} className="text-red-700" />
                        {request.phone}
                      </a>
                    )}

                    {request.nif && (
                      <p className="rounded-sm bg-[#f6f2ec] px-4 py-3 font-semibold text-zinc-700">
                        NIF: {request.nif}
                      </p>
                    )}
                  </div>

                  {request.notes && (
                    <p className="mt-5 rounded-sm bg-[#f6f2ec] px-4 py-3 text-sm leading-7 text-zinc-600">
                      {request.notes}
                    </p>
                  )}
                </div>

                <div className="lg:min-w-[240px]">
                  <label className="text-sm font-black text-zinc-800">
                    Estado do pedido
                  </label>

                  <select
                    value={request.status}
                    onChange={(event) =>
                      handleStatusChange(request.id, event.target.value)
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
