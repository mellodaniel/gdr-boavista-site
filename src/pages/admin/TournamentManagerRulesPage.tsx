import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type {
  TournamentManagerRule,
  TournamentManagerTournament,
} from '../../types/tournamentManager';

const defaultTiebreakers = [
  'Maior número de pontos',
  'Confronto direto',
  'Diferença de golos',
  'Maior número de golos marcados',
  'Menor número de golos sofridos',
  'Disciplina',
  'Sorteio',
];

const formatOptions = [
  { value: 'groups_final', label: 'Fase de grupos + fase final' },
  { value: 'round_robin', label: 'Todos contra todos' },
  { value: 'triangular', label: 'Triangular' },
  { value: 'quadrangular', label: 'Quadrangular' },
  { value: 'knockout', label: 'Eliminatória direta' },
  { value: 'custom', label: 'Formato personalizado' },
];

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function TournamentManagerRulesPage() {
  const { id } = useParams();

  const [tournament, setTournament] = useState<TournamentManagerTournament | null>(null);
  const [rule, setRule] = useState<TournamentManagerRule | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [formatType, setFormatType] = useState('groups_final');
  const [groupCount, setGroupCount] = useState('2');
  const [teamsPerGroup, setTeamsPerGroup] = useState('4');
  const [qualifiersPerGroup, setQualifiersPerGroup] = useState('2');
  const [bestThirdsCount, setBestThirdsCount] = useState('0');
  const [hasQuarterFinals, setHasQuarterFinals] = useState(false);
  const [hasSemiFinals, setHasSemiFinals] = useState(true);
  const [hasThirdPlaceMatch, setHasThirdPlaceMatch] = useState(true);
  const [hasFinal, setHasFinal] = useState(true);

  const [matchParts, setMatchParts] = useState('2');
  const [minutesPerPart, setMinutesPerPart] = useState('12');
  const [halftimeMinutes, setHalftimeMinutes] = useState('3');
  const [minutesBetweenMatches, setMinutesBetweenMatches] = useState('5');
  const [minRestMinutes, setMinRestMinutes] = useState('25');

  const [winPoints, setWinPoints] = useState('3');
  const [drawPoints, setDrawPoints] = useState('1');
  const [lossPoints, setLossPoints] = useState('0');
  const [noShowPoints, setNoShowPoints] = useState('0');
  const [noShowScoreFor, setNoShowScoreFor] = useState('0');
  const [noShowScoreAgainst, setNoShowScoreAgainst] = useState('3');
  const [tiebreakersText, setTiebreakersText] = useState(defaultTiebreakers.join('\n'));
  const [notes, setNotes] = useState('');

  function fillRule(data: TournamentManagerRule | null) {
    if (!data) return;

    setRule(data);
    setFormatType(data.format_type || 'groups_final');
    setGroupCount(String(data.group_count ?? 2));
    setTeamsPerGroup(String(data.teams_per_group ?? 4));
    setQualifiersPerGroup(String(data.qualifiers_per_group ?? 2));
    setBestThirdsCount(String(data.best_thirds_count ?? 0));
    setHasQuarterFinals(Boolean(data.has_quarter_finals));
    setHasSemiFinals(Boolean(data.has_semi_finals));
    setHasThirdPlaceMatch(Boolean(data.has_third_place_match));
    setHasFinal(Boolean(data.has_final));
    setMatchParts(String(data.match_parts ?? 2));
    setMinutesPerPart(String(data.minutes_per_part ?? 12));
    setHalftimeMinutes(String(data.halftime_minutes ?? 3));
    setMinutesBetweenMatches(String(data.minutes_between_matches ?? 5));
    setMinRestMinutes(String(data.min_rest_minutes ?? 25));
    setWinPoints(String(data.win_points ?? 3));
    setDrawPoints(String(data.draw_points ?? 1));
    setLossPoints(String(data.loss_points ?? 0));
    setNoShowPoints(String(data.no_show_points ?? 0));
    setNoShowScoreFor(String(data.no_show_score_for ?? 0));
    setNoShowScoreAgainst(String(data.no_show_score_against ?? 3));
    setTiebreakersText(
      Array.isArray(data.tiebreakers) && data.tiebreakers.length > 0
        ? data.tiebreakers.join('\n')
        : defaultTiebreakers.join('\n'),
    );
    setNotes(data.notes || '');
  }

  async function loadData() {
    if (!id) return;

    setLoading(true);
    setErrorMessage('');

    const [tournamentResult, ruleResult] = await Promise.all([
      supabase.from('tournaments').select('*').eq('id', id).single(),
      supabase.from('tournament_rules').select('*').eq('tournament_id', id).maybeSingle(),
    ]);

    if (tournamentResult.error) {
      setErrorMessage('Não foi possível carregar o torneio.');
      setLoading(false);
      return;
    }

    if (ruleResult.error) {
      setErrorMessage('Não foi possível carregar as regras. Confirma se o SQL da Entrega 4 foi executado.');
      setLoading(false);
      return;
    }

    setTournament(tournamentResult.data);
    fillRule(ruleResult.data || null);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!id) return;

    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    const tiebreakers = tiebreakersText
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);

    const payload = {
      tournament_id: id,
      format_type: formatType,
      group_count: toNumber(groupCount, 0),
      teams_per_group: toNumber(teamsPerGroup, 0),
      qualifiers_per_group: toNumber(qualifiersPerGroup, 0),
      best_thirds_count: toNumber(bestThirdsCount, 0),
      has_quarter_finals: hasQuarterFinals,
      has_semi_finals: hasSemiFinals,
      has_third_place_match: hasThirdPlaceMatch,
      has_final: hasFinal,
      match_parts: toNumber(matchParts, 1),
      minutes_per_part: toNumber(minutesPerPart, 10),
      halftime_minutes: toNumber(halftimeMinutes, 0),
      minutes_between_matches: toNumber(minutesBetweenMatches, 0),
      min_rest_minutes: toNumber(minRestMinutes, 0),
      win_points: toNumber(winPoints, 3),
      draw_points: toNumber(drawPoints, 1),
      loss_points: toNumber(lossPoints, 0),
      no_show_points: toNumber(noShowPoints, 0),
      no_show_score_for: toNumber(noShowScoreFor, 0),
      no_show_score_against: toNumber(noShowScoreAgainst, 3),
      tiebreakers,
      notes: notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('tournament_rules')
      .upsert(payload, { onConflict: 'tournament_id' })
      .select('*')
      .single();

    if (error) {
      setErrorMessage('Não foi possível guardar as regras. Confirma as permissões RLS e a estrutura da tabela.');
      setSaving(false);
      return;
    }

    setRule(data);
    setSuccessMessage('Formato competitivo e regras guardados com sucesso.');
    setSaving(false);
  }

  if (loading) {
    return <div className="text-slate-600">A carregar regras...</div>;
  }

  if (!tournament) {
    return <div className="text-slate-600">Torneio não encontrado.</div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <Link
          to={`/admin/gestor-torneios/${tournament.id}`}
          className="text-sm font-semibold text-green-700 hover:text-green-800"
        >
          ← Voltar para o torneio
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-slate-900">Formato e regras</h1>
        <p className="mt-2 max-w-4xl text-slate-600">
          Define o modelo competitivo, pontuação, duração dos jogos e critérios de desempate.
          Estes dados serão usados na próxima fase para gerar automaticamente os jogos e horários.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-slate-900">{tournament.name}</h2>
        <p className="mt-1 text-sm text-slate-600">
          {[tournament.age_group, tournament.football_type].filter(Boolean).join(' · ') || 'Torneio'}
        </p>
      </div>

      {successMessage && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Modelo competitivo</h2>
          <p className="mt-1 text-sm text-slate-600">
            Define como o torneio será organizado antes da geração automática dos jogos.
          </p>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-700">Formato do torneio</label>
              <select
                value={formatType}
                onChange={(event) => setFormatType(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
              >
                {formatOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <NumberInput label="Número de grupos" value={groupCount} onChange={setGroupCount} />
            <NumberInput label="Equipas por grupo" value={teamsPerGroup} onChange={setTeamsPerGroup} />
            <NumberInput label="Apurados por grupo" value={qualifiersPerGroup} onChange={setQualifiersPerGroup} />
            <NumberInput label="Melhores terceiros apurados" value={bestThirdsCount} onChange={setBestThirdsCount} />
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <CheckOption label="Quartos de final" checked={hasQuarterFinals} onChange={setHasQuarterFinals} />
            <CheckOption label="Meias-finais" checked={hasSemiFinals} onChange={setHasSemiFinals} />
            <CheckOption label="3.º e 4.º lugar" checked={hasThirdPlaceMatch} onChange={setHasThirdPlaceMatch} />
            <CheckOption label="Final" checked={hasFinal} onChange={setHasFinal} />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Tempo de jogo e descanso</h2>

          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-5">
            <NumberInput label="Número de partes" value={matchParts} onChange={setMatchParts} />
            <NumberInput label="Minutos por parte" value={minutesPerPart} onChange={setMinutesPerPart} />
            <NumberInput label="Intervalo" value={halftimeMinutes} onChange={setHalftimeMinutes} suffix="min" />
            <NumberInput label="Tempo entre jogos" value={minutesBetweenMatches} onChange={setMinutesBetweenMatches} suffix="min" />
            <NumberInput label="Descanso mínimo" value={minRestMinutes} onChange={setMinRestMinutes} suffix="min" />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Pontuação e desempates</h2>

          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <NumberInput label="Pontos por vitória" value={winPoints} onChange={setWinPoints} />
            <NumberInput label="Pontos por empate" value={drawPoints} onChange={setDrawPoints} />
            <NumberInput label="Pontos por derrota" value={lossPoints} onChange={setLossPoints} />
            <NumberInput label="Pontos por falta de comparência" value={noShowPoints} onChange={setNoShowPoints} />
            <NumberInput label="Golos a favor por falta" value={noShowScoreFor} onChange={setNoShowScoreFor} />
            <NumberInput label="Golos contra por falta" value={noShowScoreAgainst} onChange={setNoShowScoreAgainst} />
          </div>

          <div className="mt-6">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Critérios de desempate, por ordem
            </label>
            <textarea
              value={tiebreakersText}
              onChange={(event) => setTiebreakersText(event.target.value)}
              rows={7}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
            />
            <p className="mt-2 text-xs text-slate-500">Escreve um critério por linha.</p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Observações internas</h2>

          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={4}
            placeholder="Ex: regras específicas do escalão, exceções de horários, notas para a organização..."
            className="mt-4 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
          />
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-green-700 px-6 py-3 text-sm font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'A guardar...' : rule ? 'Guardar regras' : 'Criar regras'}
          </button>
        </div>
      </form>
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suffix?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">{label}</label>
      <div className="flex overflow-hidden rounded-xl border border-slate-300 focus-within:border-green-700 focus-within:ring-2 focus-within:ring-green-100">
        <input
          type="number"
          min="0"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full border-0 px-4 py-3 text-sm outline-none"
        />
        {suffix && (
          <span className="flex items-center border-l border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-500">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function CheckOption({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-green-50">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-green-700 focus:ring-green-700"
      />
      {label}
    </label>
  );
}
