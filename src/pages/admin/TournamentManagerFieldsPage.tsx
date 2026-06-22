import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type {
  TournamentManagerField,
  TournamentManagerTournament,
} from '../../types/tournamentManager';

type FieldFormState = {
  name: string;
  field_type: string;
  surface: string;
  is_active: boolean;
  notes: string;
};

const emptyForm: FieldFormState = {
  name: '',
  field_type: '',
  surface: '',
  is_active: true,
  notes: '',
};

export default function TournamentManagerFieldsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [tournament, setTournament] = useState<TournamentManagerTournament | null>(null);
  const [fields, setFields] = useState<TournamentManagerField[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [form, setForm] = useState<FieldFormState>(emptyForm);

  const orderedFields = useMemo(() => {
    return [...fields].sort((a, b) => a.name.localeCompare(b.name));
  }, [fields]);

  async function loadData() {
    if (!id) return;

    setLoading(true);
    setErrorMessage('');

    const [{ data: tournamentData, error: tournamentError }, { data: fieldsData, error: fieldsError }] =
      await Promise.all([
        supabase.from('tournaments').select('*').eq('id', id).single(),
        supabase
          .from('tournament_fields')
          .select('*')
          .eq('tournament_id', id)
          .order('name', { ascending: true }),
      ]);

    if (tournamentError) {
      setErrorMessage('Não foi possível carregar o torneio.');
      setLoading(false);
      return;
    }

    if (fieldsError) {
      setErrorMessage('Não foi possível carregar os campos. Confirma se o SQL da Entrega 2 foi executado.');
      setLoading(false);
      return;
    }

    setTournament(tournamentData);
    setFields(fieldsData || []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function updateForm<T extends keyof FieldFormState>(key: T, value: FieldFormState[T]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setErrorMessage('');
    setSuccessMessage('');
  }

  function editField(field: TournamentManagerField) {
    setEditingId(field.id);
    setForm({
      name: field.name || '',
      field_type: field.field_type || '',
      surface: field.surface || '',
      is_active: Boolean(field.is_active),
      notes: field.notes || '',
    });
    setErrorMessage('');
    setSuccessMessage('');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!id) return;

    if (!form.name.trim()) {
      setErrorMessage('O nome do campo é obrigatório.');
      return;
    }

    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    const payload = {
      tournament_id: id,
      name: form.name.trim(),
      field_type: form.field_type.trim() || null,
      surface: form.surface.trim() || null,
      is_active: form.is_active,
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const request = editingId
      ? supabase.from('tournament_fields').update(payload).eq('id', editingId)
      : supabase.from('tournament_fields').insert(payload);

    const { error } = await request;

    if (error) {
      setSaving(false);
      setErrorMessage('Não foi possível guardar o campo. Confirma as permissões RLS.');
      return;
    }

    setSuccessMessage(editingId ? 'Campo atualizado com sucesso.' : 'Campo adicionado com sucesso.');
    resetForm();
    await loadData();
    setSaving(false);
  }

  async function deleteField(fieldId: string) {
    const confirmed = window.confirm('Tens a certeza que queres remover este campo?');

    if (!confirmed) return;

    setErrorMessage('');
    setSuccessMessage('');

    const { error } = await supabase.from('tournament_fields').delete().eq('id', fieldId);

    if (error) {
      setErrorMessage('Não foi possível remover o campo.');
      return;
    }

    setSuccessMessage('Campo removido com sucesso.');
    await loadData();
  }

  async function toggleField(field: TournamentManagerField) {
    const { error } = await supabase
      .from('tournament_fields')
      .update({ is_active: !field.is_active, updated_at: new Date().toISOString() })
      .eq('id', field.id);

    if (error) {
      setErrorMessage('Não foi possível atualizar o estado do campo.');
      return;
    }

    await loadData();
  }

  if (loading) {
    return <div className="text-slate-600">A carregar campos do torneio...</div>;
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
              Campos do torneio
            </h1>
            <p className="mt-2 text-slate-600">
              Define os campos disponíveis para o torneio. Estes campos serão usados na geração automática dos jogos.
            </p>
          </div>

          <Link
            to={`/admin/gestor-torneios/${tournament.id}/datas`}
            className="rounded-xl border border-green-700 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-50"
          >
            Configurar datas
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">{tournament.name}</h2>
        <p className="mt-1 text-sm text-slate-600">
          {tournament.location || 'Local por definir'}
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
            {editingId ? 'Editar campo' : 'Adicionar campo'}
          </h2>

          <div className="mt-6 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Nome do campo *</label>
              <input
                type="text"
                value={form.name}
                onChange={(event) => updateForm('name', event.target.value)}
                placeholder="Ex: Campo Principal"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Tipo</label>
                <select
                  value={form.field_type}
                  onChange={(event) => updateForm('field_type', event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
                >
                  <option value="">Selecionar</option>
                  <option value="Futebol 5">Futebol 5</option>
                  <option value="Futebol 7">Futebol 7</option>
                  <option value="Futebol 9">Futebol 9</option>
                  <option value="Futebol 11">Futebol 11</option>
                  <option value="Multiuso">Multiuso</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Piso</label>
                <select
                  value={form.surface}
                  onChange={(event) => updateForm('surface', event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
                >
                  <option value="">Selecionar</option>
                  <option value="Sintético">Sintético</option>
                  <option value="Relva natural">Relva natural</option>
                  <option value="Piso indoor">Piso indoor</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) => updateForm('is_active', event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-green-700 focus:ring-green-700"
              />
              Campo disponível para o torneio
            </label>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Observações</label>
              <textarea
                value={form.notes}
                onChange={(event) => updateForm('notes', event.target.value)}
                rows={4}
                placeholder="Ex: Campo reservado para finais, campo apenas disponível de manhã..."
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
              {saving ? 'A guardar...' : editingId ? 'Guardar alterações' : 'Adicionar campo'}
            </button>
          </div>
        </form>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-xl font-bold text-slate-900">Campos configurados</h2>
          </div>

          {orderedFields.length === 0 ? (
            <div className="p-6 text-slate-600">
              Ainda não existem campos configurados para este torneio.
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {orderedFields.map((field) => (
                <div key={field.id} className="p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-slate-900">{field.name}</h3>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            field.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {field.is_active ? 'Disponível' : 'Indisponível'}
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-slate-600">
                        {field.field_type || 'Tipo por definir'} · {field.surface || 'Piso por definir'}
                      </p>

                      {field.notes && (
                        <p className="mt-3 whitespace-pre-line text-sm text-slate-600">{field.notes}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => toggleField(field)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        {field.is_active ? 'Desativar' : 'Ativar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => editField(field)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteField(field.id)}
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
