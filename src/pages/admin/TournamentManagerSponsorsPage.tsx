import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ExternalLink,
  Eye,
  EyeOff,
  Handshake,
  Plus,
  RefreshCcw,
  Save,
  Trash2,
  Upload,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type {
  TournamentManager,
  TournamentManagerSponsor,
} from '../../types/tournamentManager';

const initialForm = {
  name: '',
  description: '',
  logo_url: '',
  website_url: '',
  sponsor_level: 'Parceiro do torneio',
  is_active: true,
  sort_order: 0,
};

const sponsorLevels = [
  'Parceiro principal do torneio',
  'Parceiro do torneio',
  'Apoiador do torneio',
  'Apoio institucional',
  'Outro',
];

function normalizePartnerLabel(value: string | null) {
  if (!value) return '';

  return value
    .replace(/patrocinador/gi, 'parceiro')
    .replace(/patrocinadores/gi, 'parceiros')
    .replace(/sponsor/gi, 'parceiro')
    .replace(/sponsors/gi, 'parceiros');
}

export default function TournamentManagerSponsorsPage() {
  const { id } = useParams();

  const [tournament, setTournament] = useState<TournamentManager | null>(null);
  const [sponsors, setSponsors] = useState<TournamentManagerSponsor[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  async function loadData() {
    if (!id) return;

    setIsLoading(true);
    setErrorMessage('');

    const [tournamentResponse, sponsorsResponse] = await Promise.all([
      supabase.from('tournaments').select('*').eq('id', id).single(),
      supabase
        .from('tournament_sponsors')
        .select('*')
        .eq('tournament_id', id)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true }),
    ]);

    if (tournamentResponse.error || !tournamentResponse.data) {
      setErrorMessage('Não foi possível carregar o torneio.');
      setIsLoading(false);
      return;
    }

    if (sponsorsResponse.error) {
      setErrorMessage('Não foi possível carregar os parceiros do torneio.');
      setIsLoading(false);
      return;
    }

    setTournament(tournamentResponse.data as TournamentManager);
    setSponsors((sponsorsResponse.data || []) as TournamentManagerSponsor[]);
    setIsLoading(false);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function handleChange(
    field: keyof typeof initialForm,
    value: string | boolean | number,
  ) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
    setShowForm(false);
  }

  function handleEdit(sponsor: TournamentManagerSponsor) {
    setEditingId(sponsor.id);
    setForm({
      name: sponsor.name,
      description: sponsor.description ?? '',
      logo_url: sponsor.logo_url ?? '',
      website_url: sponsor.website_url ?? '',
      sponsor_level: sponsor.sponsor_level ?? 'Parceiro do torneio',
      is_active: sponsor.is_active,
      sort_order: sponsor.sort_order ?? 0,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleLogoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file || !id) return;

    setSuccessMessage('');
    setErrorMessage('');
    setIsUploadingLogo(true);

    const fileExtension = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExtension}`;
    const filePath = `${id}/logos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('gdrb-tournament-sponsors')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Erro ao enviar logo:', uploadError);
      setErrorMessage('Não foi possível enviar o logo. Confirma se o bucket gdrb-tournament-sponsors existe e tem permissões.');
      setIsUploadingLogo(false);
      return;
    }

    const { data } = supabase.storage
      .from('gdrb-tournament-sponsors')
      .getPublicUrl(filePath);

    handleChange('logo_url', data.publicUrl);
    setSuccessMessage('Logo enviado com sucesso.');
    setIsUploadingLogo(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!id) return;

    setSuccessMessage('');
    setErrorMessage('');

    if (!form.name.trim()) {
      setErrorMessage('Indica o nome do parceiro ou apoiador.');
      return;
    }

    setIsSaving(true);

    const payload = {
      tournament_id: id,
      name: form.name.trim(),
      description: form.description.trim() || null,
      logo_url: form.logo_url.trim() || null,
      website_url: form.website_url.trim() || null,
      sponsor_level: form.sponsor_level,
      is_active: form.is_active,
      sort_order: Number(form.sort_order) || 0,
    };

    const result = editingId
      ? await supabase
          .from('tournament_sponsors')
          .update(payload)
          .eq('id', editingId)
      : await supabase.from('tournament_sponsors').insert(payload);

    setIsSaving(false);

    if (result.error) {
      console.error('Erro ao guardar parceiro do torneio:', result.error);
      setErrorMessage('Não foi possível guardar o parceiro do torneio.');
      return;
    }

    setSuccessMessage(
      editingId
        ? 'Parceiro do torneio atualizado com sucesso.'
        : 'Parceiro do torneio criado com sucesso.',
    );

    resetForm();
    await loadData();
  }

  async function handleToggleActive(sponsor: TournamentManagerSponsor) {
    const { error } = await supabase
      .from('tournament_sponsors')
      .update({
        is_active: !sponsor.is_active,
      })
      .eq('id', sponsor.id);

    if (error) {
      setErrorMessage('Não foi possível alterar o estado do parceiro.');
      return;
    }

    await loadData();
  }

  async function handleDelete(sponsor: TournamentManagerSponsor) {
    const confirmDelete = window.confirm(
      `Tens a certeza que queres apagar "${sponsor.name}" deste torneio?`,
    );

    if (!confirmDelete) return;

    const { error } = await supabase
      .from('tournament_sponsors')
      .delete()
      .eq('id', sponsor.id);

    if (error) {
      setErrorMessage('Não foi possível apagar o parceiro do torneio.');
      return;
    }

    await loadData();
  }

  if (isLoading) {
    return <div className="text-slate-600">A carregar parceiros do torneio...</div>;
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

        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
              Gestor de Torneios Boavista
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Parceiros e apoiadores do torneio
            </h1>
            <p className="mt-2 max-w-3xl text-slate-600">
              Gere marcas, empresas e entidades associadas especificamente ao torneio {tournament.name}.
              Estes parceiros aparecem numa secção separada da página pública do torneio.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={loadData}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
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
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-700 px-5 py-3 text-sm font-semibold text-white hover:bg-green-800"
            >
              <Plus size={18} />
              Novo parceiro
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-green-100 bg-green-50 p-5 text-sm text-green-900">
        <strong>Nota:</strong> os parceiros oficiais do GDR Boavista continuam a ser geridos em Administração → Parceiros.
        Aqui devem ser criados apenas os parceiros e apoiadores específicos deste torneio.
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

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {editingId ? 'Editar parceiro do torneio' : 'Novo parceiro do torneio'}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Preenche os dados da marca, empresa ou entidade apoiadora.
              </p>
            </div>

            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Fechar
            </button>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Nome *</label>
              <input
                type="text"
                value={form.name}
                onChange={(event) => handleChange('name', event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Tipo de parceria</label>
              <select
                value={form.sponsor_level}
                onChange={(event) => handleChange('sponsor_level', event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
              >
                {sponsorLevels.map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-700">Descrição</label>
              <textarea
                value={form.description}
                onChange={(event) => handleChange('description', event.target.value)}
                rows={4}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Logo</label>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-700 hover:border-green-700 hover:text-green-700">
                <Upload size={18} />
                {isUploadingLogo ? 'A enviar...' : 'Enviar logo'}
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              </label>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">URL do logo</label>
              <input
                type="url"
                value={form.logo_url}
                onChange={(event) => handleChange('logo_url', event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
              />
            </div>

            {form.logo_url && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 md:col-span-2">
                <p className="mb-3 text-sm font-semibold text-slate-700">Pré-visualização</p>
                <img src={form.logo_url} alt="Pré-visualização do logo" className="max-h-28 max-w-full object-contain" />
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Website</label>
              <input
                type="url"
                value={form.website_url}
                onChange={(event) => handleChange('website_url', event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Ordem</label>
              <input
                type="number"
                value={form.sort_order}
                onChange={(event) => handleChange('sort_order', Number(event.target.value))}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
              />
            </div>

            <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) => handleChange('is_active', event.target.checked)}
                className="h-4 w-4 accent-green-700"
              />
              Visível na página pública do torneio
            </label>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-green-700 px-6 py-3 text-sm font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={18} />
              {isSaving ? 'A guardar...' : 'Guardar parceiro'}
            </button>
          </div>
        </form>
      )}

      {sponsors.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-green-700">
            <Handshake size={28} />
          </div>
          <h2 className="mt-5 text-2xl font-bold text-slate-900">Sem parceiros do torneio</h2>
          <p className="mt-3 text-slate-500">
            Ainda não existem parceiros ou apoiadores específicos para este torneio.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {sponsors.map((sponsor) => (
            <article key={sponsor.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className={sponsor.is_active ? 'h-1.5 bg-green-700' : 'h-1.5 bg-slate-300'} />

              <div className="flex h-44 items-center justify-center bg-slate-50 p-6">
                {sponsor.logo_url ? (
                  <img src={sponsor.logo_url} alt={sponsor.name} className="max-h-24 max-w-full object-contain" />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-700">
                    <Handshake size={32} />
                  </div>
                )}
              </div>

              <div className="p-6">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-green-700">
                    {normalizePartnerLabel(sponsor.sponsor_level)}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {sponsor.is_active ? 'Visível' : 'Oculto'}
                  </span>
                </div>

                <h3 className="mt-5 text-2xl font-bold text-slate-900">{sponsor.name}</h3>

                {sponsor.description && (
                  <p className="mt-3 text-sm leading-6 text-slate-600">{sponsor.description}</p>
                )}

                {sponsor.website_url && (
                  <a
                    href={sponsor.website_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-green-700 hover:text-green-900"
                  >
                    Abrir website
                    <ExternalLink size={15} />
                  </a>
                )}

                <div className="mt-6 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(sponsor)}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleActive(sponsor)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {sponsor.is_active ? <EyeOff size={16} /> : <Eye size={16} />}
                    {sponsor.is_active ? 'Ocultar' : 'Mostrar'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(sponsor)}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                    Apagar
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
