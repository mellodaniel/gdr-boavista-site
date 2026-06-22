import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type {
  TournamentManagerTeam,
  TournamentManagerTournament,
} from '../../types/tournamentManager';

export default function TournamentManagerTeamsPage() {
  const { id } = useParams();

  const [tournament, setTournament] = useState<TournamentManagerTournament | null>(null);
  const [teams, setTeams] = useState<TournamentManagerTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [name, setName] = useState('');
  const [club, setClub] = useState('');
  const [location, setLocation] = useState('');
  const [coachName, setCoachName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [primaryColor, setPrimaryColor] = useState('');
  const [secondaryColor, setSecondaryColor] = useState('');
  const [notes, setNotes] = useState('');

  const orderedTeams = useMemo(() => {
    return [...teams].sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return a.name.localeCompare(b.name, 'pt');
    });
  }, [teams]);

  async function loadData() {
    if (!id) return;

    setLoading(true);
    setErrorMessage('');

    const [tournamentResult, teamsResult] = await Promise.all([
      supabase.from('tournaments').select('*').eq('id', id).single(),
      supabase
        .from('tournament_teams')
        .select('*')
        .eq('tournament_id', id)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true }),
    ]);

    if (tournamentResult.error) {
      setErrorMessage('Não foi possível carregar o torneio.');
      setLoading(false);
      return;
    }

    if (teamsResult.error) {
      setErrorMessage('Não foi possível carregar as equipas. Confirma se o SQL da Entrega 3 foi executado.');
      setLoading(false);
      return;
    }

    setTournament(tournamentResult.data);
    setTeams(teamsResult.data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function resetForm() {
    setName('');
    setClub('');
    setLocation('');
    setCoachName('');
    setContactPhone('');
    setContactEmail('');
    setPrimaryColor('');
    setSecondaryColor('');
    setNotes('');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!id) return;

    if (!name.trim()) {
      setErrorMessage('O nome da equipa é obrigatório.');
      return;
    }

    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    const { error } = await supabase.from('tournament_teams').insert({
      tournament_id: id,
      name: name.trim(),
      club: club.trim() || null,
      location: location.trim() || null,
      coach_name: coachName.trim() || null,
      contact_phone: contactPhone.trim() || null,
      contact_email: contactEmail.trim() || null,
      primary_color: primaryColor.trim() || null,
      secondary_color: secondaryColor.trim() || null,
      notes: notes.trim() || null,
      sort_order: teams.length + 1,
    });

    if (error) {
      setErrorMessage('Não foi possível guardar a equipa. Confirma as permissões RLS e as colunas da tabela.');
      setSaving(false);
      return;
    }

    resetForm();
    setSuccessMessage('Equipa adicionada com sucesso.');
    await loadData();
    setSaving(false);
  }

  async function deleteTeam(team: TournamentManagerTeam) {
    const confirmed = window.confirm(`Queres remover a equipa "${team.name}" deste torneio?`);

    if (!confirmed) return;

    setErrorMessage('');
    setSuccessMessage('');

    const { error } = await supabase
      .from('tournament_teams')
      .delete()
      .eq('id', team.id);

    if (error) {
      setErrorMessage('Não foi possível remover a equipa.');
      return;
    }

    setSuccessMessage('Equipa removida com sucesso.');
    await loadData();
  }

  if (loading) {
    return <div className="text-slate-600">A carregar equipas...</div>;
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
          ← Voltar ao torneio
        </Link>

        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Equipas</h1>
            <p className="mt-2 text-slate-600">
              Adiciona as equipas participantes no torneio. Depois poderás distribuí-las por grupos.
            </p>
          </div>

          <Link
            to={`/admin/gestor-torneios/${tournament.id}/grupos`}
            className="inline-flex rounded-xl bg-green-700 px-5 py-3 text-sm font-semibold text-white hover:bg-green-800"
          >
            Gerir grupos
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">{tournament.name}</h2>
        <p className="mt-1 text-sm text-slate-600">
          {tournament.age_group || 'Escalão não definido'} · {tournament.football_type || 'Tipo não definido'}
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

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Adicionar equipa</h2>

          <div className="mt-6 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Nome da equipa *</label>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ex: GDR Boavista Sub-10"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Clube</label>
                <input
                  type="text"
                  value={club}
                  onChange={(event) => setClub(event.target.value)}
                  placeholder="Ex: GDR Boavista"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Localidade</label>
                <input
                  type="text"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder="Ex: Leiria"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Treinador / responsável</label>
              <input
                type="text"
                value={coachName}
                onChange={(event) => setCoachName(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Contacto</label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(event) => setContactPhone(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(event) => setContactEmail(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Cor principal</label>
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(event) => setPrimaryColor(event.target.value)}
                  placeholder="Ex: Verde"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Cor alternativa</label>
                <input
                  type="text"
                  value={secondaryColor}
                  onChange={(event) => setSecondaryColor(event.target.value)}
                  placeholder="Ex: Branco"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Observações</label>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={4}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-green-700 px-5 py-3 text-sm font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'A guardar...' : 'Adicionar equipa'}
            </button>
          </div>
        </form>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-xl font-bold text-slate-900">Equipas configuradas</h2>
            <p className="mt-1 text-sm text-slate-600">Total: {orderedTeams.length}</p>
          </div>

          {orderedTeams.length === 0 ? (
            <div className="p-6 text-sm text-slate-600">
              Ainda não existem equipas configuradas para este torneio.
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {orderedTeams.map((team, index) => (
                <div key={team.id} className="p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Equipa {index + 1}
                      </p>
                      <h3 className="mt-1 text-lg font-bold text-slate-900">{team.name}</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        {team.club || 'Clube não indicado'} {team.location ? `· ${team.location}` : ''}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => deleteTeam(team)}
                      className="rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                    >
                      Remover
                    </button>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                    <p><strong className="text-slate-900">Responsável:</strong> {team.coach_name || '-'}</p>
                    <p><strong className="text-slate-900">Contacto:</strong> {team.contact_phone || '-'}</p>
                    <p><strong className="text-slate-900">Email:</strong> {team.contact_email || '-'}</p>
                    <p><strong className="text-slate-900">Equipamento:</strong> {team.primary_color || '-'} {team.secondary_color ? `/ ${team.secondary_color}` : ''}</p>
                  </div>

                  {team.notes && (
                    <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                      {team.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
