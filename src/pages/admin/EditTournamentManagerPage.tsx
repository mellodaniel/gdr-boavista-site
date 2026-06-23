import { useEffect, useState, type FormEvent } from 'react';
import { CalendarDays, Handshake, Layers, ListChecks, MapPin, Shield, Trophy } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { TournamentManager } from '../../types/tournamentManager';

const statusLabels: Record<string, string> = {
  draft: 'Rascunho',
  setup: 'Em configuração',
  calendar_generated: 'Calendário gerado',
  published: 'Publicado',
  in_progress: 'Em andamento',
  finished: 'Finalizado',
  archived: 'Arquivado',
};

const statusOptions = [
  { value: 'draft', label: 'Rascunho' },
  { value: 'setup', label: 'Em configuração' },
  { value: 'calendar_generated', label: 'Calendário gerado' },
  { value: 'published', label: 'Publicado' },
  { value: 'in_progress', label: 'Em andamento' },
  { value: 'finished', label: 'Finalizado' },
  { value: 'archived', label: 'Arquivado' },
];

function createSlug(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export default function EditTournamentManagerPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [tournament, setTournament] = useState<TournamentManager | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [edition, setEdition] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [footballType, setFootballType] = useState('');
  const [gender, setGender] = useState('');
  const [location, setLocation] = useState('');
  const [address, setAddress] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('draft');
  const [isPublic, setIsPublic] = useState(false);

  function fillForm(data: TournamentManager) {
    setName(data.name || '');
    setSlug(data.slug || '');
    setEdition(data.edition || '');
    setAgeGroup(data.age_group || '');
    setBirthYear(data.birth_year || '');
    setFootballType(data.football_type || '');
    setGender(data.gender || '');
    setLocation(data.location || '');
    setAddress(data.address || '');
    setContactPhone(data.contact_phone || '');
    setContactEmail(data.contact_email || '');
    setDescription(data.description || '');
    setStatus(data.status || 'draft');
    setIsPublic(Boolean(data.is_public));
  }

  async function loadTournament() {
    if (!id) return;

    setLoading(true);
    setErrorMessage('');

    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      setErrorMessage('Não foi possível carregar o torneio.');
      setLoading(false);
      return;
    }

    setTournament(data);
    fillForm(data);
    setLoading(false);
  }

  useEffect(() => {
    loadTournament();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function handleGenerateSlug() {
    const generatedSlug = edition ? `${createSlug(name)}-${createSlug(edition)}` : createSlug(name);
    setSlug(generatedSlug);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!tournament) return;

    if (!name.trim()) {
      setErrorMessage('O nome do torneio é obrigatório.');
      return;
    }

    if (!slug.trim()) {
      setErrorMessage('O slug do torneio é obrigatório.');
      return;
    }

    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    const { error } = await supabase
      .from('tournaments')
      .update({
        name: name.trim(),
        slug: slug.trim(),
        edition: edition.trim() || null,
        age_group: ageGroup.trim() || null,
        birth_year: birthYear.trim() || null,
        football_type: footballType || null,
        gender: gender || null,
        location: location.trim() || null,
        address: address.trim() || null,
        contact_phone: contactPhone.trim() || null,
        contact_email: contactEmail.trim() || null,
        description: description.trim() || null,
        status,
        is_public: isPublic,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tournament.id);

    if (error) {
      setSaving(false);

      if (error.message.includes('duplicate key')) {
        setErrorMessage('Já existe outro torneio com este slug. Altera o slug antes de guardar.');
        return;
      }

      setErrorMessage('Não foi possível guardar as alterações. Confirma as permissões RLS para update.');
      return;
    }

    setSuccessMessage('Torneio atualizado com sucesso.');
    await loadTournament();
    setSaving(false);
  }

  async function updateVisibility(nextIsPublic: boolean) {
    if (!tournament) return;

    setPublishing(true);
    setErrorMessage('');
    setSuccessMessage('');

    const nextStatus = nextIsPublic ? 'published' : 'draft';

    const { error } = await supabase
      .from('tournaments')
      .update({
        is_public: nextIsPublic,
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tournament.id);

    if (error) {
      setErrorMessage('Não foi possível atualizar a publicação do torneio.');
      setPublishing(false);
      return;
    }

    setSuccessMessage(nextIsPublic ? 'Torneio publicado com sucesso.' : 'Torneio removido da publicação.');
    await loadTournament();
    setPublishing(false);
  }

  if (loading) {
    return <div className="text-slate-600">A carregar torneio...</div>;
  }

  if (errorMessage && !tournament) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
        {errorMessage}
      </div>
    );
  }

  if (!tournament) {
    return <div className="text-slate-600">Torneio não encontrado.</div>;
  }

  const configurationLinks = [
    {
      title: 'Datas e horários',
      description: 'Configura os dias, horários, pausas e observações do torneio.',
      href: `/admin/gestor-torneios/${tournament.id}/datas`,
      icon: CalendarDays,
    },
    {
      title: 'Campos',
      description: 'Define os campos disponíveis, tipo de piso e estado de utilização.',
      href: `/admin/gestor-torneios/${tournament.id}/campos`,
      icon: MapPin,
    },
    {
      title: 'Equipas',
      description: 'Adiciona clubes, treinadores, contactos e equipamentos.',
      href: `/admin/gestor-torneios/${tournament.id}/equipas`,
      icon: Shield,
    },
    {
      title: 'Grupos',
      description: 'Cria grupos e distribui as equipas participantes.',
      href: `/admin/gestor-torneios/${tournament.id}/grupos`,
      icon: Layers,
    },
    {
      title: 'Formato e regras',
      description: 'Define modelo competitivo, pontuação, desempates e duração dos jogos.',
      href: `/admin/gestor-torneios/${tournament.id}/regras`,
      icon: Trophy,
    },
    {
      title: 'Jogos',
      description: 'Gera a proposta inicial de jogos, horários e campos, com edição manual.',
      href: `/admin/gestor-torneios/${tournament.id}/jogos`,
      icon: ListChecks,
    },
    {
      title: 'Parceiros do torneio',
      description: 'Gere parceiros e apoiadores específicos deste torneio.',
      href: `/admin/gestor-torneios/${tournament.id}/parceiros`,
      icon: Handshake,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <button
          type="button"
          onClick={() => navigate('/admin/gestor-torneios')}
          className="text-sm font-semibold text-green-700 hover:text-green-800"
        >
          ← Voltar para o Gestor de Torneios
        </button>

        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Editar Torneio</h1>
            <p className="mt-2 text-slate-600">
              Atualiza os dados gerais e configura a estrutura completa do torneio organizado pelo Boavista.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              to={`/torneios/${tournament.slug}`}
              target="_blank"
              className="rounded-xl border border-green-700 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-50"
            >
              Ver página pública
            </Link>

            {tournament.is_public ? (
              <button
                type="button"
                disabled={publishing}
                onClick={() => updateVisibility(false)}
                className="rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
              >
                {publishing ? 'A atualizar...' : 'Despublicar'}
              </button>
            ) : (
              <button
                type="button"
                disabled={publishing}
                onClick={() => updateVisibility(true)}
                className="rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60"
              >
                {publishing ? 'A publicar...' : 'Publicar'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Estado atual</p>
          <p className="mt-2 font-bold text-slate-900">{statusLabels[tournament.status] || tournament.status}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Escalão</p>
          <p className="mt-2 font-bold text-slate-900">{tournament.age_group || '-'}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Tipo</p>
          <p className="mt-2 font-bold text-slate-900">{tournament.football_type || '-'}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Público</p>
          <p className="mt-2 font-bold text-slate-900">{tournament.is_public ? 'Sim' : 'Não'}</p>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-50 text-green-700">
            <Trophy size={22} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Configuração do torneio</h2>
            <p className="text-sm text-slate-600">
              Depois dos dados gerais, configura os detalhes operacionais do torneio.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {configurationLinks.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                to={item.href}
                className="group rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:border-green-300 hover:bg-green-50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-green-700 shadow-sm">
                  <Icon size={20} />
                </div>
                <h3 className="mt-4 font-bold text-slate-900 group-hover:text-green-800">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{item.description}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Dados gerais</h2>
            <p className="mt-1 text-sm text-slate-600">
              Estes dados aparecem na administração e na página pública do torneio.
            </p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-green-700 px-5 py-3 text-sm font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'A guardar...' : 'Guardar alterações'}
          </button>
        </div>

        {successMessage && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-slate-700">Nome do torneio *</label>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Edição</label>
            <input
              type="text"
              value={edition}
              onChange={(event) => setEdition(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Escalão</label>
            <input
              type="text"
              value={ageGroup}
              onChange={(event) => setAgeGroup(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Ano de nascimento</label>
            <input
              type="text"
              value={birthYear}
              onChange={(event) => setBirthYear(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Tipo de futebol</label>
            <select
              value={footballType}
              onChange={(event) => setFootballType(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
            >
              <option value="">Selecionar</option>
              <option value="Futebol 5">Futebol 5</option>
              <option value="Futebol 7">Futebol 7</option>
              <option value="Futebol 9">Futebol 9</option>
              <option value="Futebol 11">Futebol 11</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Género</label>
            <select
              value={gender}
              onChange={(event) => setGender(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
            >
              <option value="">Selecionar</option>
              <option value="Masculino">Masculino</option>
              <option value="Feminino">Feminino</option>
              <option value="Misto">Misto</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Local</label>
            <input
              type="text"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Morada</label>
            <input
              type="text"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
            />
          </div>

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

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Estado</label>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
            >
              {statusOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Publicação</label>
            <select
              value={isPublic ? 'true' : 'false'}
              onChange={(event) => setIsPublic(event.target.value === 'true')}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
            >
              <option value="false">Privado</option>
              <option value="true">Público</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <div className="mb-2 flex items-center justify-between gap-3">
              <label className="block text-sm font-semibold text-slate-700">Slug da página pública *</label>
              <button
                type="button"
                onClick={handleGenerateSlug}
                className="text-xs font-semibold text-green-700 hover:text-green-800"
              >
                Gerar slug pelo nome
              </button>
            </div>

            <input
              type="text"
              value={slug}
              onChange={(event) => setSlug(createSlug(event.target.value))}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
            />

            <p className="mt-2 text-xs text-slate-500">Link público: /torneios/{slug || 'slug-do-torneio'}</p>
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-slate-700">Descrição</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={5}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
            />
          </div>
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 md:flex-row md:justify-end">
          <Link
            to="/admin/gestor-torneios"
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </Link>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center rounded-xl bg-green-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'A guardar...' : 'Guardar alterações'}
          </button>
        </div>
      </form>
    </div>
  );
}
