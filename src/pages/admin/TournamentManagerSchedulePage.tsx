import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type {
  TournamentManagerDay,
  TournamentManagerTournament,
} from '../../types/tournamentManager';

type DayFormState = {
  day_date: string;
  start_time: string;
  end_time: string;
  lunch_start: string;
  lunch_end: string;
  notes: string;
};

const emptyForm: DayFormState = {
  day_date: '',
  start_time: '09:00',
  end_time: '18:00',
  lunch_start: '',
  lunch_end: '',
  notes: '',
};

function formatDate(value: string) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`));
}

function formatTime(value: string | null) {
  if (!value) return '-';
  return value.slice(0, 5);
}

export default function TournamentManagerSchedulePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [tournament, setTournament] = useState<TournamentManagerTournament | null>(null);
  const [days, setDays] = useState<TournamentManagerDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [form, setForm] = useState<DayFormState>(emptyForm);

  const orderedDays = useMemo(() => {
    return [...days].sort((a, b) => a.day_date.localeCompare(b.day_date));
  }, [days]);

  async function loadData() {
    if (!id) return;

    setLoading(true);
    setErrorMessage('');

    const [{ data: tournamentData, error: tournamentError }, { data: daysData, error: daysError }] =
      await Promise.all([
        supabase.from('tournaments').select('*').eq('id', id).single(),
        supabase
          .from('tournament_days')
          .select('*')
          .eq('tournament_id', id)
          .order('day_date', { ascending: true }),
      ]);

    if (tournamentError) {
      setErrorMessage('Não foi possível carregar o torneio.');
      setLoading(false);
      return;
    }

    if (daysError) {
      setErrorMessage('Não foi possível carregar os dias do torneio. Confirma se o SQL da Entrega 2 foi executado.');
      setLoading(false);
      return;
    }

    setTournament(tournamentData);
    setDays(daysData || []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function updateForm(key: keyof DayFormState, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setErrorMessage('');
    setSuccessMessage('');
  }

  function editDay(day: TournamentManagerDay) {
    setEditingId(day.id);
    setForm({
      day_date: day.day_date,
      start_time: formatTime(day.start_time),
      end_time: formatTime(day.end_time),
      lunch_start: day.lunch_start ? formatTime(day.lunch_start) : '',
      lunch_end: day.lunch_end ? formatTime(day.lunch_end) : '',
      notes: day.notes || '',
    });
    setErrorMessage('');
    setSuccessMessage('');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!id) return;

    if (!form.day_date) {
      setErrorMessage('Seleciona a data do torneio.');
      return;
    }

    if (!form.start_time || !form.end_time) {
      setErrorMessage('Indica a hora inicial e final do dia.');
      return;
    }

    if (form.start_time >= form.end_time) {
      setErrorMessage('A hora final deve ser posterior à hora inicial.');
      return;
    }

    if ((form.lunch_start && !form.lunch_end) || (!form.lunch_start && form.lunch_end)) {
      setErrorMessage('Para configurar pausa, indica início e fim da pausa.');
      return;
    }

    if (form.lunch_start && form.lunch_end && form.lunch_start >= form.lunch_end) {
      setErrorMessage('A hora final da pausa deve ser posterior à hora inicial da pausa.');
      return;
    }

    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    const payload = {
      tournament_id: id,
      day_date: form.day_date,
      start_time: form.start_time,
      end_time: form.end_time,
      lunch_start: form.lunch_start || null,
      lunch_end: form.lunch_end || null,
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const request = editingId
      ? supabase.from('tournament_days').update(payload).eq('id', editingId)
      : supabase.from('tournament_days').insert(payload);

    const { error } = await request;

    if (error) {
      setSaving(false);

      if (error.message.includes('duplicate key')) {
        setErrorMessage('Este dia já foi adicionado ao torneio.');
        return;
      }

      setErrorMessage('Não foi possível guardar o dia do torneio. Confirma as permissões RLS.');
      return;
    }

    setSuccessMessage(editingId ? 'Dia atualizado com sucesso.' : 'Dia adicionado com sucesso.');
    resetForm();
    await loadData();
    setSaving(false);
  }

  async function deleteDay(dayId: string) {
    const confirmed = window.confirm('Tens a certeza que queres remover este dia do torneio?');

    if (!confirmed) return;

    setErrorMessage('');
    setSuccessMessage('');

    const { error } = await supabase.from('tournament_days').delete().eq('id', dayId);

    if (error) {
      setErrorMessage('Não foi possível remover o dia.');
      return;
    }

    setSuccessMessage('Dia removido com sucesso.');
    await loadData();
  }

  if (loading) {
    return <div className="text-slate-600">A carregar datas do torneio...</div>;
  }

  if (!tournament) {
    return <div className="text-slate-600">Torneio não encontrado.</div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <button
          type="button"
          onClick={() => navigate(`/admin/gestor-torneios/${tournament.id}`)}
          className="text-sm font-semibold text-green-700 hover:text-green-800"
        >
          ← Voltar para o torneio
        </button>

        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
              Gestor de Torneios Boavista
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Datas e horários
            </h1>
            <p className="mt-2 text-slate-600">
              Configura os dias em que o torneio vai decorrer, horários, pausas e observações.
            </p>
          </div>

          <Link
            to={`/admin/gestor-torneios/${tournament.id}/campos`}
            className="rounded-xl border border-green-700 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-50"
          >
            Configurar campos
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">{tournament.name}</h2>
        <p className="mt-1 text-sm text-slate-600">
          {tournament.age_group || 'Escalão por definir'} · {tournament.football_type || 'Tipo por definir'}
        </p>
      </div>

      {successMessage && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-700">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">
            {editingId ? 'Editar dia' : 'Adicionar dia'}
          </h2>

          <div className="mt-6 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Data *</label>
              <input
                type="date"
                value={form.day_date}
                onChange={(event) => updateForm('day_date', event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Hora inicial *</label>
                <input
                  type="time"
                  value={form.start_time}
                  onChange={(event) => updateForm('start_time', event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Hora final *</label>
                <input
                  type="time"
                  value={form.end_time}
                  onChange={(event) => updateForm('end_time', event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Início da pausa</label>
                <input
                  type="time"
                  value={form.lunch_start}
                  onChange={(event) => updateForm('lunch_start', event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Fim da pausa</label>
                <input
                  type="time"
                  value={form.lunch_end}
                  onChange={(event) => updateForm('lunch_end', event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Observações</label>
              <textarea
                value={form.notes}
                onChange={(event) => updateForm('notes', event.target.value)}
                rows={4}
                placeholder="Ex: Cerimónia de abertura às 09h00, almoço das equipas, entrega de prémios..."
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 md:flex-row md:justify-end">
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar edição
              </button>
            )}

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-green-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'A guardar...' : editingId ? 'Guardar alterações' : 'Adicionar dia'}
            </button>
          </div>
        </form>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-xl font-bold text-slate-900">Dias configurados</h2>
          </div>

          {orderedDays.length === 0 ? (
            <div className="p-6 text-slate-600">
              Ainda não existem dias configurados para este torneio.
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {orderedDays.map((day) => (
                <div key={day.id} className="p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{formatDate(day.day_date)}</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        {formatTime(day.start_time)} às {formatTime(day.end_time)}
                      </p>
                      {(day.lunch_start || day.lunch_end) && (
                        <p className="mt-1 text-sm text-slate-600">
                          Pausa: {formatTime(day.lunch_start)} às {formatTime(day.lunch_end)}
                        </p>
                      )}
                      {day.notes && (
                        <p className="mt-3 whitespace-pre-line text-sm text-slate-600">{day.notes}</p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => editDay(day)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteDay(day.id)}
                        className="rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
