import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
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
} from "lucide-react";
import { toPng } from "html-to-image";
import { supabase } from "../../lib/supabase";
import type { GdrbMatch, GdrbTournament } from "../../types/database";

const initialForm = {
  team_name: "",
  football_type: "Futebol 11",
  competition: "",
  opponent: "",
  match_date: "",
  match_time: "",
  location: "",
  venue_type: "casa",
  status: "agendado",
  home_score: "",
  away_score: "",
  notes: "",
  is_visible: true,
  sort_order: 0,
};

const footballTypes = ["Futebol 5", "Futebol 7", "Futebol 9", "Futebol 11"];

const teamOptions = [
  "Petizes / ABC",
  "Traquinas",
  "Benjamins",
  "Infantis",
  "Iniciados",
  "Juvenis",
  "Juniores",
  "Seniores",
  "Veteranos",
];

const statusOptions = [
  { value: "agendado", label: "Agendado" },
  { value: "terminado", label: "Terminado" },
  { value: "adiado", label: "Adiado" },
  { value: "cancelado", label: "Cancelado" },
];

type PosterMode = "matches" | "results";

type AgendaPosterItem =
  | {
      type: "match";
      id: string;
      sortDate: string;
      data: GdrbMatch;
    }
  | {
      type: "tournament";
      id: string;
      sortDate: string;
      data: GdrbTournament;
    };

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateShort(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("pt-PT", {
    weekday: "short",
    day: "2-digit",
    month: "short",
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

function isTournamentInCurrentWeek(tournament: GdrbTournament) {
  const { monday, sunday } = getCurrentWeekRange();

  const startDate = new Date(`${tournament.start_date}T12:00:00`);
  const endDate = tournament.end_date
    ? new Date(`${tournament.end_date}T12:00:00`)
    : startDate;

  return startDate <= sunday && endDate >= monday;
}

function formatTournamentDate(tournament: GdrbTournament) {
  if (!tournament.end_date || tournament.end_date === tournament.start_date) {
    return formatDateShort(tournament.start_date);
  }

  return `${formatDateShort(tournament.start_date)} a ${formatDateShort(
    tournament.end_date,
  )}`;
}

function getWeekLabel() {
  const { monday, sunday } = getCurrentWeekRange();

  const start = monday.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "short",
  });

  const end = sunday.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "short",
  });

  return `${start} a ${end}`;
}

function getPosterMatchTeams(match: GdrbMatch) {
  if (match.venue_type === "fora") {
    return {
      firstTeam: match.opponent,
      secondTeam: "GDR Boavista",
    };
  }

  return {
    firstTeam: "GDR Boavista",
    secondTeam: match.opponent,
  };
}

function getMatchResult(match: GdrbMatch) {
  if (match.venue_type === "fora") {
    return {
      firstTeam: match.opponent,
      firstScore: match.away_score,
      secondTeam: "GDR Boavista",
      secondScore: match.home_score,
    };
  }

  return {
    firstTeam: "GDR Boavista",
    firstScore: match.home_score,
    secondTeam: match.opponent,
    secondScore: match.away_score,
  };
}

export function AdminMatchesPage() {
  const posterRef = useRef<HTMLDivElement | null>(null);

  const [matches, setMatches] = useState<GdrbMatch[]>([]);
  const [tournaments, setTournaments] = useState<GdrbTournament[]>([]);
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
  const [posterMode, setPosterMode] = useState<PosterMode>("matches");

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const scheduledMatches = useMemo(
    () =>
      matches.filter(
        (match) =>
          match.is_visible &&
          ["agendado", "adiado", "cancelado"].includes(match.status),
      ),
    [matches],
  );

  const weeklyAgendaItems = useMemo<AgendaPosterItem[]>(() => {
    const matchItems: AgendaPosterItem[] = matches
      .filter(
        (match) =>
          match.is_visible &&
          match.status !== "terminado" &&
          isMatchInCurrentWeek(match.match_date),
      )
      .map((match) => ({
        type: "match",
        id: match.id,
        sortDate: `${match.match_date} ${match.match_time ?? "00:00"}`,
        data: match,
      }));

    const tournamentItems: AgendaPosterItem[] = tournaments
      .filter(
        (tournament) =>
          tournament.is_visible && isTournamentInCurrentWeek(tournament),
      )
      .map((tournament) => ({
        type: "tournament",
        id: tournament.id,
        sortDate: `${tournament.start_date} 00:00`,
        data: tournament,
      }));

    return [...matchItems, ...tournamentItems].sort((a, b) =>
      a.sortDate.localeCompare(b.sortDate),
    );
  }, [matches, tournaments]);

  const weeklyResults = useMemo(
    () =>
      matches
        .filter(
          (match) =>
            match.is_visible &&
            match.status === "terminado" &&
            isMatchInCurrentWeek(match.match_date),
        )
        .sort((a, b) => {
          const dateA = `${a.match_date} ${a.match_time ?? "00:00"}`;
          const dateB = `${b.match_date} ${b.match_time ?? "00:00"}`;
          return dateA.localeCompare(dateB);
        }),
    [matches],
  );

  const finishedMatches = useMemo(
    () =>
      matches.filter(
        (match) => match.is_visible && match.status === "terminado",
      ),
    [matches],
  );

  const hiddenMatches = useMemo(
    () => matches.filter((match) => !match.is_visible),
    [matches],
  );

  async function loadMatches() {
    setIsLoading(true);
    setErrorMessage("");

    const [matchesResult, tournamentsResult] = await Promise.all([
      supabase
        .from("gdrb_matches")
        .select("*")
        .order("match_date", { ascending: true })
        .order("match_time", { ascending: true })
        .order("sort_order", { ascending: true }),

      supabase
        .from("gdrb_tournaments")
        .select("*")
        .order("start_date", { ascending: true })
        .order("sort_order", { ascending: true }),
    ]);

    if (matchesResult.error) {
      console.error("Erro ao carregar jogos:", matchesResult.error);
      setErrorMessage("Não foi possível carregar os jogos.");
      setIsLoading(false);
      return;
    }

    if (tournamentsResult.error) {
      console.error("Erro ao carregar torneios:", tournamentsResult.error);
      setErrorMessage("Não foi possível carregar os torneios.");
      setIsLoading(false);
      return;
    }

    setMatches(matchesResult.data ?? []);
    setTournaments(tournamentsResult.data ?? []);
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
      match_time: match.match_time ?? "",
      location: match.location ?? "",
      venue_type: match.venue_type,
      status: match.status,
      home_score: match.home_score === null ? "" : String(match.home_score),
      away_score: match.away_score === null ? "" : String(match.away_score),
      notes: match.notes ?? "",
      is_visible: match.is_visible,
      sort_order: match.sort_order ?? 0,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSuccessMessage("");
    setErrorMessage("");

    if (
      !form.team_name.trim() ||
      !form.competition.trim() ||
      !form.opponent.trim() ||
      !form.match_date
    ) {
      setErrorMessage(
        "Preenche pelo menos escalão, competição, adversário e data.",
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
        form.home_score === "" ? null : Number.parseInt(form.home_score, 10),
      away_score:
        form.away_score === "" ? null : Number.parseInt(form.away_score, 10),
      notes: form.notes.trim() || null,
      is_visible: form.is_visible,
      sort_order: Number(form.sort_order) || 0,
      updated_at: new Date().toISOString(),
    };

    const result = editingId
      ? await supabase.from("gdrb_matches").update(payload).eq("id", editingId)
      : await supabase.from("gdrb_matches").insert(payload);

    setIsSaving(false);

    if (result.error) {
      console.error("Erro ao guardar jogo:", result.error);
      setErrorMessage("Não foi possível guardar o jogo.");
      return;
    }

    setSuccessMessage(
      editingId ? "Jogo atualizado com sucesso." : "Jogo criado com sucesso.",
    );

    resetForm();
    await loadMatches();
  }

  async function handleToggleVisibility(match: GdrbMatch) {
    const { error } = await supabase
      .from("gdrb_matches")
      .update({
        is_visible: !match.is_visible,
        updated_at: new Date().toISOString(),
      })
      .eq("id", match.id);

    if (error) {
      console.error("Erro ao alterar visibilidade:", error);
      setErrorMessage("Não foi possível alterar a visibilidade do jogo.");
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
      .from("gdrb_matches")
      .delete()
      .eq("id", match.id);

    if (error) {
      console.error("Erro ao apagar jogo:", error);
      setErrorMessage("Não foi possível apagar o jogo.");
      return;
    }

    await loadMatches();
  }

  async function generatePoster(mode: PosterMode) {
    setSuccessMessage("");
    setErrorMessage("");
    setPosterMode(mode);
    setShowPosterPreview(true);

    window.setTimeout(async () => {
      if (!posterRef.current) {
        setErrorMessage("Não foi possível preparar a imagem.");
        return;
      }

      setIsGeneratingPoster(true);

      try {
        const dataUrl = await toPng(posterRef.current, {
          quality: 1,
          pixelRatio: 2,
          cacheBust: true,
          backgroundColor: "#111111",
        });

        const filePrefix =
          mode === "matches"
            ? "gdr-boavista-jogos-da-semana"
            : "gdr-boavista-resultados-da-semana";

        const link = document.createElement("a");
        link.download = `${filePrefix}-${new Date()
          .toISOString()
          .slice(0, 10)}.png`;
        link.href = dataUrl;
        link.click();

        setSuccessMessage("Imagem gerada com sucesso.");
      } catch (error) {
        console.error("Erro ao gerar imagem:", error);
        setErrorMessage("Não foi possível gerar a imagem.");
      } finally {
        setIsGeneratingPoster(false);
      }
    }, 300);
  }

  function renderPosterAgendaCard(item: AgendaPosterItem) {
    if (item.type === "tournament") {
      const tournament = item.data;

      return (
        <div
          key={`tournament-${tournament.id}`}
          className="relative overflow-hidden rounded-2xl border border-white/15 bg-white text-[#24180f] shadow-xl"
        >
          <div className="absolute inset-y-0 left-0 w-2 bg-red-700" />

          <div className="grid min-h-[112px] grid-cols-[82px_1fr]">
            <div className="flex items-center justify-center bg-[#24180f] px-3 text-center text-white">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-300">
                Torneio
              </p>
            </div>

            <div className="p-4">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-red-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-red-700">
                  {tournament.team_name}
                </span>

                <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[9px] font-bold uppercase text-zinc-600">
                  {tournament.football_type}
                </span>
              </div>

              <h3 className="mt-2 truncate font-serif text-2xl font-light leading-tight">
                {tournament.name}
              </h3>

              <p className="mt-2 text-xs font-black uppercase text-red-700">
                {formatTournamentDate(tournament)}
              </p>

              {tournament.location && (
                <p className="mt-1 truncate text-xs font-semibold text-zinc-500">
                  {tournament.location}
                </p>
              )}
            </div>
          </div>
        </div>
      );
    }

    const match = item.data;
    const { firstTeam, secondTeam } = getPosterMatchTeams(match);

    return (
      <div
        key={`match-${match.id}`}
        className="relative overflow-hidden rounded-2xl border border-white/15 bg-white text-[#24180f] shadow-xl"
      >
        <div className="absolute inset-y-0 left-0 w-2 bg-red-700" />

        <div className="grid min-h-[112px] grid-cols-[82px_1fr]">
          <div className="flex items-center justify-center bg-[#24180f] px-3 text-center text-white">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-300">
              Jogo
            </p>
          </div>

          <div className="p-4">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-red-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-red-700">
                {match.team_name}
              </span>

              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[9px] font-bold uppercase text-zinc-600">
                {match.football_type}
              </span>

              <span className="rounded-full bg-[#24180f] px-2.5 py-1 text-[9px] font-bold uppercase text-white">
                {match.venue_type === "casa" ? "Casa" : "Fora"}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-[minmax(0,1fr)_36px_minmax(0,1fr)] items-center gap-2">
              <h3 className="whitespace-normal break-normal text-center font-serif text-[17px] font-light leading-[1.05] text-[#24180f]">
                {firstTeam}
              </h3>

              <span className="flex h-8 w-9 items-center justify-center rounded-lg bg-red-700 text-[10px] font-black uppercase leading-none text-white">
                VS
              </span>

              <h3 className="whitespace-normal break-normal text-center font-serif text-[17px] font-light leading-[1.05] text-[#24180f]">
                {secondTeam}
              </h3>
            </div>

            <p className="mt-1 truncate text-xs font-semibold text-zinc-600">
              {match.competition}
            </p>

            <div className="mt-2 grid grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-2">
              <span className="rounded-lg bg-[#24180f] px-3 py-1.5 text-[11px] font-black uppercase text-white">
                {formatDateShort(match.match_date)}
              </span>

              <span className="rounded-lg bg-red-700 px-3 py-1.5 text-sm font-black text-white">
                {match.match_time ? match.match_time.slice(0, 5) : "--:--"}
              </span>

              {match.location && (
                <span className="truncate text-[11px] font-semibold text-zinc-500">
                  {match.location}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderPosterResultCard(match: GdrbMatch) {
    const { firstTeam, firstScore, secondTeam, secondScore } =
      getMatchResult(match);

    return (
      <div
        key={match.id}
        className="relative overflow-hidden rounded-2xl border border-white/15 bg-white text-[#24180f] shadow-xl"
      >
        <div className="absolute inset-y-0 left-0 w-2 bg-red-700" />

        <div className="grid min-h-[112px] grid-cols-[82px_1fr]">
          <div className="flex items-center justify-center bg-[#24180f] px-3 text-center text-white">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-300">
              Final
            </p>
          </div>

          <div className="p-4">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-red-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-red-700">
                {match.team_name}
              </span>

              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[9px] font-bold uppercase text-zinc-600">
                {match.football_type}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
              <h3 className="whitespace-normal break-normal text-center font-serif text-[16px] font-light leading-[1.05] text-[#24180f]">
                {firstTeam}
              </h3>

              <div className="flex shrink-0 items-center gap-1">
                <span className="rounded-lg bg-[#24180f] px-3 py-1.5 text-2xl font-black text-white">
                  {firstScore ?? "-"}
                </span>

                <span className="text-xl font-black text-zinc-400">-</span>

                <span className="rounded-lg bg-red-700 px-3 py-1.5 text-2xl font-black text-white">
                  {secondScore ?? "-"}
                </span>
              </div>

              <h3 className="whitespace-normal break-normal text-center font-serif text-[16px] font-light leading-[1.05] text-[#24180f]">
                {secondTeam}
              </h3>
            </div>

            <p className="mt-2 truncate text-xs font-semibold text-zinc-600">
              {match.competition} · {formatDateShort(match.match_date)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  function renderPosterPreview() {
    const hasAgendaItems = weeklyAgendaItems.length > 0;
    const hasResults = weeklyResults.length > 0;

    return (
      <section className="mt-8 overflow-hidden rounded-sm border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-zinc-200 bg-[#f6f2ec] px-7 py-5 md:flex-row md:items-center">
          <div>
            <h2 className="font-serif text-3xl font-light text-[#24180f]">
              Pré-visualização da imagem
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Formato vertical 1080x1350, adequado para redes sociais.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowPosterPreview(false)}
            className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-bold text-zinc-600 hover:border-red-700 hover:text-red-700"
          >
            Fechar pré-visualização
          </button>
        </div>

        <div className="overflow-auto bg-[#f6f2ec] p-6">
          <div
            ref={posterRef}
            className="relative mx-auto h-[1350px] w-[1080px] overflow-hidden bg-[#111111] text-white"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-black via-[#24180f] to-red-950" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(220,38,38,0.5),transparent_35%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.12),transparent_30%)]" />

            <div className="relative flex h-full flex-col px-14 py-12">
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
                    <p className="text-4xl font-black uppercase leading-tight">
                      GDR Boavista
                    </p>
                  </div>
                </div>

                <div className="rounded-full border border-white/20 bg-white/10 px-6 py-3 text-right text-sm font-black uppercase tracking-[0.22em]">
                  {getWeekLabel()}
                </div>
              </header>

              <div className="mt-12">
                <p className="text-2xl font-black uppercase tracking-[0.42em] text-red-400">
                  {posterMode === "matches" ? "Agenda semanal" : "Resultados"}
                </p>

                <h1 className="mt-4 font-serif text-[82px] font-light leading-[0.88] tracking-tight">
                  {posterMode === "matches" ? (
                    <>
                      Jogos
                      <br />e Torneios
                    </>
                  ) : (
                    <>
                      Resultados
                      <br />
                      da Semana
                    </>
                  )}
                </h1>

                <div className="mt-7 h-2 w-56 rounded-full bg-red-600" />
              </div>

              <div className="mt-9 flex-1">
                {posterMode === "matches" ? (
                  hasAgendaItems ? (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        {weeklyAgendaItems
                          .slice(0, 12)
                          .map((item) => renderPosterAgendaCard(item))}
                      </div>

                      {weeklyAgendaItems.length > 12 && (
                        <div className="mt-5 rounded-2xl bg-white/10 px-6 py-4 text-center text-sm font-bold text-white">
                          Existem mais eventos agendados. Consulta a agenda
                          completa no site.
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="rounded-3xl border border-white/15 bg-white p-10 text-center text-[#24180f] shadow-2xl">
                      <p className="font-serif text-5xl font-light">
                        Sem jogos ou torneios agendados
                      </p>

                      <p className="mt-4 text-lg text-zinc-600">
                        Não existem eventos visíveis para esta semana.
                      </p>
                    </div>
                  )
                ) : hasResults ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      {weeklyResults
                        .slice(0, 12)
                        .map((match) => renderPosterResultCard(match))}
                    </div>

                    {weeklyResults.length > 12 && (
                      <div className="mt-5 rounded-2xl bg-white/10 px-6 py-4 text-center text-sm font-bold text-white">
                        Existem mais resultados. Consulta a agenda completa no
                        site.
                      </div>
                    )}
                  </>
                ) : (
                  <div className="rounded-3xl border border-white/15 bg-white p-10 text-center text-[#24180f] shadow-2xl">
                    <p className="font-serif text-5xl font-light">
                      Sem resultados registados
                    </p>

                    <p className="mt-4 text-lg text-zinc-600">
                      Não existem resultados visíveis para esta semana.
                    </p>
                  </div>
                )}
              </div>

              <footer className="mt-8 flex items-center justify-between border-t border-white/15 pt-7">
                <p className="text-base font-black uppercase tracking-[0.25em] text-red-300">
                  Força, garra, união e luta
                </p>

                <p className="text-sm font-bold text-zinc-300">
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
        className="overflow-hidden rounded-sm border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl"
      >
        <div
          className={
            match.is_visible ? "h-1.5 bg-red-700" : "h-1.5 bg-zinc-300"
          }
        />

        <div className="grid gap-6 p-7 lg:grid-cols-[1fr_auto] lg:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-red-700">
                {match.team_name}
              </span>

              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-700">
                {match.football_type}
              </span>

              <span className="rounded-full bg-[#24180f] px-3 py-1 text-xs font-bold uppercase text-white">
                {formatStatus(match.status)}
              </span>

              {!match.is_visible && (
                <span className="rounded-full bg-zinc-200 px-3 py-1 text-xs font-bold uppercase text-zinc-700">
                  Oculto
                </span>
              )}
            </div>

            {match.venue_type === "fora" ? (
              <>
                <p className="mt-6 text-sm font-black uppercase tracking-[0.22em] text-zinc-500">
                  {match.opponent}
                </p>

                <h3 className="mt-2 font-serif text-4xl font-light text-[#24180f]">
                  vs GDR Boavista
                </h3>
              </>
            ) : (
              <>
                <h3 className="mt-6 font-serif text-4xl font-light text-[#24180f]">
                  GDR Boavista
                </h3>

                <p className="mt-1 text-sm font-black uppercase tracking-[0.22em] text-zinc-500">
                  vs {match.opponent}
                </p>
              </>
            )}

            <p className="mt-4 text-sm font-semibold text-zinc-600">
              {match.competition}
            </p>

            <div className="mt-5 flex flex-wrap gap-3 text-sm text-zinc-600">
              <span className="inline-flex items-center gap-2 rounded-md bg-[#f6f2ec] px-4 py-3 font-semibold">
                <CalendarDays size={16} className="text-red-700" />
                {formatDate(match.match_date)}
                {match.match_time ? ` | ${match.match_time.slice(0, 5)}` : ""}
              </span>

              <span className="rounded-md bg-[#f6f2ec] px-4 py-3 font-semibold">
                {match.venue_type === "casa" ? "Casa" : "Fora"}
              </span>

              {match.location && (
                <span className="rounded-md bg-[#f6f2ec] px-4 py-3 font-semibold">
                  {match.location}
                </span>
              )}
            </div>

            {match.status === "terminado" &&
              match.home_score !== null &&
              match.away_score !== null && (
                <p className="mt-5 font-serif text-5xl font-light text-red-700">
                  {match.home_score} - {match.away_score}
                </p>
              )}

            {match.notes && (
              <p className="mt-5 rounded-sm bg-[#f6f2ec] px-4 py-3 text-sm leading-7 text-zinc-600">
                {match.notes}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            <button
              type="button"
              onClick={() => handleEdit(match)}
              className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-bold text-zinc-700 hover:border-red-700 hover:text-red-700"
            >
              Editar
            </button>

            <button
              type="button"
              onClick={() => handleToggleVisibility(match)}
              className="inline-flex items-center gap-2 rounded-md border border-zinc-200 px-4 py-2 text-sm font-bold text-zinc-700 hover:border-red-700 hover:text-red-700"
            >
              {match.is_visible ? <EyeOff size={16} /> : <Eye size={16} />}
              {match.is_visible ? "Ocultar" : "Mostrar"}
            </button>

            <button
              type="button"
              onClick={() => handleDelete(match)}
              className="inline-flex items-center gap-2 rounded-md border border-red-200 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50"
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
      <section className="overflow-hidden rounded-sm border border-zinc-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-center justify-between gap-4 bg-[#f6f2ec] px-7 py-5 text-left hover:bg-white"
        >
          <div>
            <h2 className="font-serif text-3xl font-light text-[#24180f]">
              {title}
            </h2>

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
              <div className="rounded-sm border border-dashed border-zinc-300 p-6 text-sm text-zinc-500">
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
      <section className="relative overflow-hidden rounded-sm bg-[#24180f] p-8 text-white shadow-2xl shadow-zinc-950/10 md:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_right,rgba(220,38,38,0.28),transparent_34%)]" />

        <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.45em] text-red-400">
              Administração
            </p>

            <h1 className="mt-6 font-serif text-5xl font-light leading-tight md:text-7xl">
              Jogos
              <br />e agenda.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-300">
              Gere os próximos jogos, resultados e agenda das equipas do GDR
              Boavista. O poster de agenda inclui jogos e torneios da semana.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => generatePoster("matches")}
              disabled={isGeneratingPoster}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-red-700 px-5 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Download size={18} />
              {isGeneratingPoster && posterMode === "matches"
                ? "A gerar..."
                : "Gerar Jogos da Semana"}
            </button>

            <button
              type="button"
              onClick={() => generatePoster("results")}
              disabled={isGeneratingPoster}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-red-700 px-5 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Download size={18} />
              {isGeneratingPoster && posterMode === "results"
                ? "A gerar..."
                : "Gerar Resultados da Semana"}
            </button>

            <button
              type="button"
              onClick={loadMatches}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
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
              className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-black uppercase tracking-wide text-[#24180f] transition hover:bg-red-700 hover:text-white"
            >
              <Plus size={18} />
              Novo jogo
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

      {showPosterPreview && renderPosterPreview()}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mt-8 rounded-sm border border-zinc-200 bg-white p-7 shadow-sm"
        >
          <div className="flex items-center justify-between gap-4 border-b border-zinc-200 pb-5">
            <div>
              <h2 className="font-serif text-4xl font-light text-[#24180f]">
                {editingId ? "Editar jogo" : "Novo jogo"}
              </h2>

              <p className="mt-2 text-sm text-zinc-500">
                Preenche os dados principais do jogo.
              </p>
            </div>

            <button
              type="button"
              onClick={resetForm}
              className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-bold text-zinc-600 hover:border-red-700 hover:text-red-700"
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
                  handleChange("team_name", event.target.value)
                }
                className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
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
                  handleChange("football_type", event.target.value)
                }
                className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
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
                  handleChange("competition", event.target.value)
                }
                placeholder="Campeonato Distrital"
                className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
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
                  handleChange("opponent", event.target.value)
                }
                placeholder="Nome do adversário"
                className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
              />
            </div>

            <div>
              <label className="text-sm font-black text-zinc-800">Data</label>

              <input
                type="date"
                value={form.match_date}
                onChange={(event) =>
                  handleChange("match_date", event.target.value)
                }
                className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
              />
            </div>

            <div>
              <label className="text-sm font-black text-zinc-800">Hora</label>

              <input
                type="time"
                value={form.match_time}
                onChange={(event) =>
                  handleChange("match_time", event.target.value)
                }
                className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
              />
            </div>

            <div>
              <label className="text-sm font-black text-zinc-800">
                Casa / Fora
              </label>

              <select
                value={form.venue_type}
                onChange={(event) =>
                  handleChange("venue_type", event.target.value)
                }
                className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
              >
                <option value="casa">Casa</option>
                <option value="fora">Fora</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-black text-zinc-800">Estado</label>

              <select
                value={form.status}
                onChange={(event) => handleChange("status", event.target.value)}
                className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
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
                  handleChange("location", event.target.value)
                }
                placeholder="Campo do Boavista"
                className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
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
                  handleChange("home_score", event.target.value)
                }
                className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
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
                  handleChange("away_score", event.target.value)
                }
                className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
              />
            </div>

            <div>
              <label className="text-sm font-black text-zinc-800">Ordem</label>

              <input
                type="number"
                value={form.sort_order}
                onChange={(event) =>
                  handleChange("sort_order", Number(event.target.value))
                }
                className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
              />
            </div>

            <label className="flex items-center gap-3 rounded-md border border-zinc-200 px-4 py-3 text-sm font-bold text-zinc-700">
              <input
                type="checkbox"
                checked={form.is_visible}
                onChange={(event) =>
                  handleChange("is_visible", event.target.checked)
                }
                className="h-4 w-4 accent-red-700"
              />
              Visível no site
            </label>

            <div className="md:col-span-2 xl:col-span-4">
              <label className="text-sm font-black text-zinc-800">Notas</label>

              <textarea
                value={form.notes}
                onChange={(event) => handleChange("notes", event.target.value)}
                rows={4}
                placeholder="Informação adicional sobre o jogo..."
                className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm leading-7 outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={resetForm}
              className="rounded-md border border-zinc-200 px-5 py-3 text-sm font-bold text-zinc-600 hover:border-red-700 hover:text-red-700"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-md bg-red-700 px-6 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-[#24180f] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={18} />
              {isSaving ? "A guardar..." : "Guardar jogo"}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="mt-8 rounded-sm border border-zinc-200 bg-white p-8 text-zinc-600 shadow-sm">
          A carregar jogos...
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {renderSection(
            "Próximos jogos",
            "Jogos ainda por realizar, adiados ou cancelados",
            showScheduled,
            setShowScheduled,
            scheduledMatches,
          )}

          {renderSection(
            "Resultados",
            "Jogos terminados e respetivos resultados",
            showFinished,
            setShowFinished,
            finishedMatches,
          )}

          {renderSection(
            "Ocultos",
            "Jogos guardados no sistema, mas não visíveis no site",
            showHidden,
            setShowHidden,
            hiddenMatches,
          )}
        </div>
      )}
    </div>
  );
}
