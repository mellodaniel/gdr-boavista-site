import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  EyeOff,
  Plus,
  RefreshCcw,
  Save,
  Trash2,
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { supabase } from '../../lib/supabase';
import type { GdrbMatch } from '../../types/database';

const initialForm = {
  team_name: '',
  football_type: 'Futebol 11',
  competition: '',
  opponent: '',
  match_date: '',
  match_time: '',
  location: '',
  venue_type: 'casa',
  status: 'agendado',
  home_score: '',
  away_score: '',
  notes: '',
  is_visible: true,
  sort_order: 0,
};

const footballTypes = ['Futebol 5', 'Futebol 7', 'Futebol 9', 'Futebol 11'];

const teamOptions = [
  'Petizes / ABC',
  'Traquinas',
  'Benjamins',
  'Infantis',
  'Iniciados',
  'Juvenis',
  'Juniores',
  'Seniores',
  'Veteranos',
];

const statusOptions = [
  { value: 'agendado', label: 'Agendado' },
  { value: 'terminado', label: 'Terminado' },
  { value: 'adiado', label: 'Adiado' },
  { value: 'cancelado', label: 'Cancelado' },
];

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateShort(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('pt-PT', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
}

function formatStatus(status: string) {
  const foundStatus = statusOptions.find((item) => item.value === status);
  return foundStatus?.label ?? status;
}

function getCurrentWeekRange() {
  const today = new Date();
  const day = today.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(today);
  monday.setDate(today.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { monday, sunday };
}

function isMatchInCurrentWeek(matchDate: string) {
  const { monday, sunday } = getCurrentWeekRange();
  const date = new Date(`${matchDate}T12:00:00`);

  return date >= monday && date <= sunday;
}

function getWeekLabel() {
  const { monday, sunday } = getCurrentWeekRange();

  const start = monday.toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'short',
  });

  const end = sunday.toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'short',
  });

  return `${start} a ${end}`;
}

export function AdminMatchesPage() {
  const posterRef = useRef<HTMLDivElement | null>(null);

  const [matches, setMatches] = useState<GdrbMatch[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPoster, setIsGeneratingPoster] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [showScheduled, setShowScheduled] = useState(true);
  const [showFinished, setShowFinished] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [showPosterPreview, setShowPosterPreview] = useState(false);

  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const scheduledMatches = useMemo(
    () =>
      matches.filter(
        (match) =>
          match.is_visible &&
          ['agendado', 'adiado', 'cancelado'].includes(match.status),
      ),
    [matches],
  );

  const weeklyMatches = useMemo(
    () =>
      scheduledMatches
        .filter((match) => isMatchInCurrentWeek(match.match_date))
        .sort((a, b) => {
          const dateA = `${a.match_date} ${a.match_time ?? '00:00'}`;
          const dateB = `${b.match_date} ${b.match_time ?? '00:00'}`;
          return dateA.localeCompare(dateB);
        }),
    [scheduledMatches],
  );

  const finishedMatches = useMemo(
    () =>
      matches.filter(
        (match) => match.is_visible && match.status === 'terminado',
      ),
    [matches],
  );

  const hiddenMatches = useMemo(
    () => matches.filter((match) => !match.is_visible),
    [matches],
  );

  async function loadMatches() {
    setIsLoading(true);
    setErrorMessage('');

    const { data, error } = await supabase
      .from('gdrb_matches')
      .select('*')
      .order('match_date', { ascending: true })
      .order('match_time', { ascending: true })
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Erro ao carregar jogos:', error);
      setErrorMessage('Não foi possível carregar os jogos.');
      setIsLoading(false);
      return;
    }

    setMatches(data ?? []);
    setIsLoading(false);
  }

  useEffect(() => {
    loadMatches();
  }, []);

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
    setShowForm(false);
  }

  function handleChange(
    field: keyof typeof initialForm,
    value: string | boolean | number,
  ) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function handleEdit(match: GdrbMatch) {
    setEditingId(match.id);
    setForm({
      team_name: match.team_name,
      football_type: match.football_type,
      competition: match.competition,
      opponent: match.opponent,
      match_date: match.match_date,
      match_time: match.match_time ?? '',
      location: match.location ?? '',
      venue_type: match.venue_type,
      status: match.status,
      home_score: match.home_score === null ? '' : String(match.home_score),
      away_score: match.away_score === null ? '' : String(match.away_score),
      notes: match.notes ?? '',
      is_visible: match.is_visible,
      sort_order: match.sort_order ?? 0,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSuccessMessage('');
    setErrorMessage('');

    if (
      !form.team_name.trim() ||
      !form.competition.trim() ||
      !form.opponent.trim() ||
      !form.match_date
    ) {
      setErrorMessage(
        'Preenche pelo menos escalão, competição, adversário e data.',
      );
      return;
    }

    setIsSaving(true);

    const payload = {
      team_name: form.team_name.trim(),
      football_type: form.football_type,
      competition: form.competition.trim(),
      opponent: form.opponent.trim(),
      match_date: form.match_date,
      match_time: form.match_time || null,
      location: form.location.trim() || null,
      venue_type: form.venue_type,
      status: form.status,
      home_score:
        form.home_score === '' ? null : Number.parseInt(form.home_score, 10),
      away_score:
        form.away_score === '' ? null : Number.parseInt(form.away_score, 10),
      notes: form.notes.trim() || null,
      is_visible: form.is_visible,
      sort_order: Number(form.sort_order) || 0,
      updated_at: new Date().toISOString(),
    };

    const result = editingId
      ? await supabase.from('gdrb_matches').update(payload).eq('id', editingId)
      : await supabase.from('gdrb_matches').insert(payload);

    setIsSaving(false);

    if (result.error) {
      console.error('Erro ao guardar jogo:', result.error);
      setErrorMessage('Não foi possível guardar o jogo.');
      return;
    }

    setSuccessMessage(
      editingId ? 'Jogo atualizado com sucesso.' : 'Jogo criado com sucesso.',
    );

    resetForm();
    await loadMatches();
  }

  async function handleToggleVisibility(match: GdrbMatch) {
    const { error } = await supabase
      .from('gdrb_matches')
      .update({
        is_visible: !match.is_visible,
        updated_at: new Date().toISOString(),
      })
      .eq('id', match.id);

    if (error) {
      console.error('Erro ao alterar visibilidade:', error);
      setErrorMessage('Não foi possível alterar a visibilidade do jogo.');
      return;
    }

    await loadMatches();
  }

  async function handleDelete(match: GdrbMatch) {
    const confirmDelete = window.confirm(
      `Tens a certeza que queres apagar o jogo de ${match.team_name} contra ${match.opponent}?`,
    );

    if (!confirmDelete) {
      return;
    }

    const { error } = await supabase
      .from('gdrb_matches')
      .delete()
      .eq('id', match.id);

    if (error) {
      console.error('Erro ao apagar jogo:', error);
      setErrorMessage('Não foi possível apagar o jogo.');
      return;
    }

    await loadMatches();
  }

  async function handleGenerateWeeklyPoster() {
    setSuccessMessage('');
    setErrorMessage('');
    setShowPosterPreview(true);

    window.setTimeout(async () => {
      if (!posterRef.current) {
        setErrorMessage('Não foi possível preparar a imagem.');
        return;
      }

      setIsGeneratingPoster(true);

      try {
        const dataUrl = await toPng(posterRef.current, {
          quality: 1,
          pixelRatio: 2,
          cacheBust: true,
          backgroundColor: '#09090b',
        });

        const link = document.createElement('a');
        link.download = `gdr-boavista-jogos-da-semana-${new Date()
          .toISOString()
          .slice(0, 10)}.png`;
        link.href = dataUrl;
        link.click();

        setSuccessMessage('Imagem gerada com sucesso.');
      } catch (error) {
        console.error('Erro ao gerar imagem:', error);
        setErrorMessage('Não foi possível gerar a imagem.');
      } finally {
        setIsGeneratingPoster(false);
      }
    }, 300);
  }

  function renderPosterPreview() {
    return (
      <section className="mt-8 overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-zinc-200 bg-zinc-50 px-6 py-5 md:flex-row md:items-center">
          <div>
            <h2 className="text-xl font-black text-zinc-950">
              Pré-visualização da imagem
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Formato vertical para redes sociais. A imagem gerada será em PNG.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowPosterPreview(false)}
            className="rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-sm font-bold text-zinc-600 hover:bg-zinc-50"
          >
            Fechar pré-visualização
          </button>
        </div>

        <div className="overflow-auto bg-zinc-100 p-6">
          <div
            ref={posterRef}
            className="relative mx-auto flex h-[1350px] w-[1080px] flex-col overflow-hidden bg-zinc-950 text-white"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(220,38,38,0.45),transparent_28%),radial-gradient(circle_at_85%_35%,rgba(220,38,38,0.32),transparent_30%),linear-gradient(135deg,#050505,#18181b_45%,#050505)]" />

            <div className="absolute -right-32 top-24 h-[520px] w-[520px] rounded-full bg-red-600/20 blur-3xl" />
            <div className="absolute -left-40 bottom-24 h-[520px] w-[520px] rounded-full bg-red-700/20 blur-3xl" />

            <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,0.28)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.28)_1px,transparent_1px)] [background-size:72px_72px]" />

            <img
              src="/logo-gdr-boavista-header-256.png"
              alt=""
              className="absolute right-[-90px] top-[210px] h-[620px] w-[620px] object-contain opacity-[0.10]"
            />

            <div className="relative flex flex-1 flex-col px-20 py-20">
              <header className="flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-white p-3 shadow-2xl">
                    <img
                      src="/logo-gdr-boavista-header-256.png"
                      alt="GDR Boavista"
                      className="h-full w-full object-contain"
                    />
                  </div>

                  <div>
                    <p className="text-3xl font-black uppercase leading-tight">
                      GDR Boavista
                    </p>
                    <p className="mt-1 text-sm font-black uppercase tracking-[0.28em] text-red-400">
                      Leiria
                    </p>
                  </div>
                </div>

                <div className="rounded-full border border-white/15 bg-white/10 px-6 py-3 text-right text-sm font-black uppercase tracking-[0.22em] text-white">
                  {getWeekLabel()}
                </div>
              </header>

              <div className="mt-20">
                <p className="text-2xl font-black uppercase tracking-[0.36em] text-red-400">
                  Agenda
                </p>

                <h1 className="mt-5 text-[96px] font-black uppercase leading-[0.92] tracking-tight">
                  Jogos da
                  <br />
                  Semana
                </h1>

                <div className="mt-8 h-2 w-52 rounded-full bg-red-600" />
              </div>

              <div className="mt-16 grid flex-1 content-start gap-5">
                {weeklyMatches.length === 0 ? (
                  <div className="rounded-[2rem] border border-white/15 bg-white/10 p-8 text-center shadow-2xl backdrop-blur">
                    <p className="text-3xl font-black uppercase">
                      Sem jogos visíveis esta semana
                    </p>
                    <p className="mt-3 text-lg text-zinc-300">
                      Adiciona jogos na agenda para gerar a imagem.
                    </p>
                  </div>
                ) : (
                  weeklyMatches.slice(0, 7).map((match) => (
                    <div
                      key={match.id}
                      className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-white/[0.10] p-6 shadow-2xl backdrop-blur"
                    >
                      <div className="absolute inset-y-0 left-0 w-3 bg-red-600" />

                      <div className="ml-4 grid grid-cols-[1fr_auto] gap-5">
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="rounded-full bg-red-600 px-4 py-2 text-sm font-black uppercase tracking-[0.18em] text-white">
                              {match.team_name}
                            </span>

                            <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-bold uppercase text-white">
                              {match.venue_type === 'casa'
                                ? 'Casa'
                                : 'Fora'}
                            </span>
                          </div>

                          <p className="mt-5 text-4xl font-black uppercase leading-tight">
                            GDR Boavista
                          </p>

                          <p className="mt-1 text-2xl font-black uppercase text-zinc-300">
                            vs {match.opponent}
                          </p>

                          <p className="mt-4 text-lg font-semibold text-zinc-300">
                            {match.competition}
                          </p>

                          {match.location && (
                            <p className="mt-2 text-base font-semibold text-zinc-400">
                              {match.location}
                            </p>
                          )}
                        </div>

                        <div className="flex min-w-[210px] flex-col items-center justify-center rounded-3xl bg-white text-zinc-950 px-6 py-5 text-center">
                          <p className="text-xl font-black uppercase text-red-600">
                            {formatDateShort(match.match_date)}
                          </p>

                          <p className="mt-3 text-5xl font-black">
                            {match.match_time
                              ? match.match_time.slice(0, 5)
                              : '--:--'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <footer className="mt-12 flex items-center justify-between border-t border-white/10 pt-8">
                <p className="text-lg font-black uppercase tracking-[0.25em] text-white">
                  Força, garra, união e luta
                </p>

                <p className="text-base font-bold text-zinc-400">
                  instagram.com/gdr_boavista_oficial
                </p>
              </footer>
            </div>
          </div>
        </div>
      </section>
    );
  }

  function renderMatchCard(match: GdrbMatch) {
    return (
      <article
        key={match.id}
        className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
      >
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black uppercase text-red-700">
                {match.team_name}
              </span>

              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-700">
                {match.football_type}
              </span>

              <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-bold uppercase text-white">
                {formatStatus(match.status)}
              </span>

              {!match.is_visible && (
                <span className="rounded-full bg-zinc-200 px-3 py-1 text-xs font-bold uppercase text-zinc-700">
                  Oculto
                </span>
              )}
            </div>

            <h3 className="mt-4 text-2xl font-black text-zinc-950">
              GDR Boavista vs {match.opponent}
            </h3>

            <p className="mt-2 text-sm font-semibold text-zinc-500">
              {match.competition}
            </p>

            <div className="mt-4 flex flex-wrap gap-3 text-sm text-zinc-600">
              <span className="inline-flex items-center gap-2 rounded-2xl bg-zinc-100 px-3 py-2 font-semibold">
                <CalendarDays size={16} className="text-red-600" />
                {formatDate(match.match_date)}
                {match.match_time ? ` | ${match.match_time.slice(0, 5)}` : ''}
              </span>

              <span className="rounded-2xl bg-zinc-100 px-3 py-2 font-semibold">
                {match.venue_type === 'casa' ? 'Casa' : 'Fora'}
              </span>

              {match.location && (
                <span className="rounded-2xl bg-zinc-100 px-3 py-2 font-semibold">
                  {match.location}
                </span>
              )}
            </div>

            {match.status === 'terminado' &&
              match.home_score !== null &&
              match.away_score !== null && (
                <p className="mt-4 text-3xl font-black text-red-600">
                  {match.home_score} - {match.away_score}
                </p>
              )}

            {match.notes && (
              <p className="mt-4 rounded-2xl bg-zinc-50 px-4 py-3 text-sm leading-6 text-zinc-600">
                {match.notes}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            <button
              type="button"
              onClick={() => handleEdit(match)}
              className="rounded-2xl border border-zinc-200 px-4 py-2 text-sm font-bold text-zinc-700 hover:border-red-600 hover:text-red-600"
            >
              Editar
            </button>

            <button
              type="button"
              onClick={() => handleToggleVisibility(match)}
              className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 px-4 py-2 text-sm font-bold text-zinc-700 hover:border-red-600 hover:text-red-600"
            >
              {match.is_visible ? <EyeOff size={16} /> : <Eye size={16} />}
              {match.is_visible ? 'Ocultar' : 'Mostrar'}
            </button>

            <button
              type="button"
              onClick={() => handleDelete(match)}
              className="inline-flex items-center gap-2 rounded-2xl border border-red-200 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50"
            >
              <Trash2 size={16} />
              Apagar
            </button>
          </div>
        </div>
      </article>
    );
  }

  function renderSection(
    title: string,
    description: string,
    isOpen: boolean,
    setIsOpen: (value: boolean) => void,
    items: GdrbMatch[],
  ) {
    return (
      <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-center justify-between gap-4 bg-zinc-50 px-6 py-5 text-left hover:bg-zinc-100"
        >
          <div>
            <h2 className="text-xl font-black text-zinc-950">{title}</h2>
            <p className="mt-1 text-sm text-zinc-500">
              {description} · {items.length} registo(s)
            </p>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-zinc-700 shadow-sm">
            {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </button>

        {isOpen && (
          <div className="grid gap-4 p-5">
            {items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-300 p-6 text-sm text-zinc-500">
                Não existem jogos nesta secção.
              </div>
            ) : (
              items.map((match) => renderMatchCard(match))
            )}
          </div>
        )}
      </section>
    );
  }

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.35em] text-red-600">
            Administração
          </p>

          <h1 className="mt-2 text-4xl font-black text-zinc-950">
            Jogos / Agenda
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600">
            Gere aqui os próximos jogos, resultados e agenda das equipas. As
            áreas estão recolhidas para facilitar a utilização no dia a dia.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleGenerateWeeklyPoster}
            disabled={isGeneratingPoster}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-zinc-950/20 transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download size={18} />
            {isGeneratingPoster ? 'A gerar...' : 'Gerar Jogos da Semana'}
          </button>

          <button
            type="button"
            onClick={loadMatches}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-700 hover:border-red-600 hover:text-red-600"
          >
            <RefreshCcw size={17} />
            Atualizar
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setForm(initialForm);
              setShowForm(!showForm);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-red-950/20 transition hover:bg-red-700"
          >
            <Plus size={18} />
            Novo jogo
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm font-semibold text-green-800">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-800">
          {errorMessage}
        </div>
      )}

      {showPosterPreview && renderPosterPreview()}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center justify-between gap-4 border-b border-zinc-200 pb-5">
            <div>
              <h2 className="text-2xl font-black text-zinc-950">
                {editingId ? 'Editar jogo' : 'Novo jogo'}
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Preenche os dados principais do jogo.
              </p>
            </div>

            <button
              type="button"
              onClick={resetForm}
              className="rounded-2xl border border-zinc-200 px-4 py-2 text-sm font-bold text-zinc-600 hover:bg-zinc-50"
            >
              Fechar
            </button>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="text-sm font-black text-zinc-800">
                Escalão
              </label>

              <select
                value={form.team_name}
                onChange={(event) =>
                  handleChange('team_name', event.target.value)
                }
                className="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
              >
                <option value="">Selecionar</option>
                {teamOptions.map((team) => (
                  <option key={team} value={team}>
                    {team}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-black text-zinc-800">
                Tipo de futebol
              </label>

              <select
                value={form.football_type}
                onChange={(event) =>
                  handleChange('football_type', event.target.value)
                }
                className="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
              >
                {footballTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-black text-zinc-800">
                Competição
              </label>

              <input
                type="text"
                value={form.competition}
                onChange={(event) =>
                  handleChange('competition', event.target.value)
                }
                placeholder="Campeonato Distrital"
                className="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
              />
            </div>

            <div>
              <label className="text-sm font-black text-zinc-800">
                Adversário
              </label>

              <input
                type="text"
                value={form.opponent}
                onChange={(event) =>
                  handleChange('opponent', event.target.value)
                }
                placeholder="Nome do adversário"
                className="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
              />
            </div>

            <div>
              <label className="text-sm font-black text-zinc-800">Data</label>

              <input
                type="date"
                value={form.match_date}
                onChange={(event) =>
                  handleChange('match_date', event.target.value)
                }
                className="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
              />
            </div>

            <div>
              <label className="text-sm font-black text-zinc-800">Hora</label>

              <input
                type="time"
                value={form.match_time}
                onChange={(event) =>
                  handleChange('match_time', event.target.value)
                }
                className="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
              />
            </div>

            <div>
              <label className="text-sm font-black text-zinc-800">
                Casa / Fora
              </label>

              <select
                value={form.venue_type}
                onChange={(event) =>
                  handleChange('venue_type', event.target.value)
                }
                className="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
              >
                <option value="casa">Casa</option>
                <option value="fora">Fora</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-black text-zinc-800">
                Estado
              </label>

              <select
                value={form.status}
                onChange={(event) => handleChange('status', event.target.value)}
                className="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
              >
                {statusOptions.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="xl:col-span-2">
              <label className="text-sm font-black text-zinc-800">Local</label>

              <input
                type="text"
                value={form.location}
                onChange={(event) =>
                  handleChange('location', event.target.value)
                }
                placeholder="Campo do Boavista"
                className="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
              />
            </div>

            <div>
              <label className="text-sm font-black text-zinc-800">
                Golos GDRB
              </label>

              <input
                type="number"
                min="0"
                value={form.home_score}
                onChange={(event) =>
                  handleChange('home_score', event.target.value)
                }
                className="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
              />
            </div>

            <div>
              <label className="text-sm font-black text-zinc-800">
                Golos adversário
              </label>

              <input
                type="number"
                min="0"
                value={form.away_score}
                onChange={(event) =>
                  handleChange('away_score', event.target.value)
                }
                className="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
              />
            </div>

            <div>
              <label className="text-sm font-black text-zinc-800">Ordem</label>

              <input
                type="number"
                value={form.sort_order}
                onChange={(event) =>
                  handleChange('sort_order', Number(event.target.value))
                }
                className="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
              />
            </div>

            <label className="flex items-center gap-3 rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-bold text-zinc-700">
              <input
                type="checkbox"
                checked={form.is_visible}
                onChange={(event) =>
                  handleChange('is_visible', event.target.checked)
                }
                className="h-4 w-4 accent-red-600"
              />
              Visível no site
            </label>

            <div className="md:col-span-2 xl:col-span-4">
              <label className="text-sm font-black text-zinc-800">Notas</label>

              <textarea
                value={form.notes}
                onChange={(event) => handleChange('notes', event.target.value)}
                rows={4}
                placeholder="Informação adicional sobre o jogo..."
                className="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm leading-6 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={resetForm}
              className="rounded-2xl border border-zinc-200 px-5 py-3 text-sm font-bold text-zinc-600 hover:bg-zinc-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-6 py-3 text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-red-950/20 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={18} />
              {isSaving ? 'A guardar...' : 'Guardar jogo'}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-8 text-zinc-600 shadow-sm">
          A carregar jogos...
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {renderSection(
            'Próximos jogos',
            'Jogos ainda por realizar, adiados ou cancelados',
            showScheduled,
            setShowScheduled,
            scheduledMatches,
          )}

          {renderSection(
            'Resultados',
            'Jogos terminados e respetivos resultados',
            showFinished,
            setShowFinished,
            finishedMatches,
          )}

          {renderSection(
            'Ocultos',
            'Jogos guardados no sistema, mas não visíveis no site',
            showHidden,
            setShowHidden,
            hiddenMatches,
          )}
        </div>
      )}
    </div>
  );
}