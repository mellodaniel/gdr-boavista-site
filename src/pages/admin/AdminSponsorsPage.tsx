import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ExternalLink, Plus, RefreshCw, Upload } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { GdrbSponsor } from '../../types/database';

const sponsorLevels = [
  'Patrocinador principal',
  'Patrocinador oficial',
  'Parceiro',
  'Apoio institucional',
  'Outro',
];

const SPONSORS_BUCKET = 'gdrb-sponsors';

export function AdminSponsorsPage() {
  const [sponsors, setSponsors] = useState<GdrbSponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [sponsorLevel, setSponsorLevel] = useState('Parceiro');
  const [sortOrder, setSortOrder] = useState('10');
  const [isActive, setIsActive] = useState(true);

  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  async function loadSponsors() {
    setLoading(true);
    setErrorMessage('');

    const { data, error } = await supabase
      .from('gdrb_sponsors')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erro ao carregar patrocinadores:', error);
      setErrorMessage('Não foi possível carregar os patrocinadores.');
    }

    setSponsors(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadSponsors();
  }, []);

  async function uploadSponsorLogo(file: File) {
    const fileExtension = file.name.split('.').pop();
    const safeFileName = `${Date.now()}-${crypto.randomUUID()}.${fileExtension}`;
    const filePath = `logos/${safeFileName}`;

    const { error: uploadError } = await supabase.storage
      .from(SPONSORS_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from(SPONSORS_BUCKET)
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  async function handleCreateSponsor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSuccessMessage('');
    setErrorMessage('');

    if (!name.trim()) {
      setErrorMessage('Indica o nome do patrocinador.');
      return;
    }

    setSaving(true);

    try {
      let finalLogoUrl = logoUrl.trim() || null;

      if (logoFile) {
        finalLogoUrl = await uploadSponsorLogo(logoFile);
      }

      const { error } = await supabase.from('gdrb_sponsors').insert({
        name: name.trim(),
        description: description.trim() || null,
        logo_url: finalLogoUrl,
        website_url: websiteUrl.trim() || null,
        sponsor_level: sponsorLevel,
        sort_order: Number(sortOrder) || 0,
        is_active: isActive,
      });

      if (error) {
        throw error;
      }

      setName('');
      setDescription('');
      setLogoUrl('');
      setLogoFile(null);
      setWebsiteUrl('');
      setSponsorLevel('Parceiro');
      setSortOrder('10');
      setIsActive(true);
      setSuccessMessage('Patrocinador criado com sucesso.');
      loadSponsors();
    } catch (error) {
      console.error('Erro ao criar patrocinador:', error);
      setErrorMessage('Não foi possível criar o patrocinador.');
    } finally {
      setSaving(false);
    }
  }

  async function updateSponsor(
    id: string,
    changes: Partial<
      Pick<
        GdrbSponsor,
        'sponsor_level' | 'sort_order' | 'is_active' | 'website_url' | 'logo_url'
      >
    >,
  ) {
    setUpdatingId(id);
    setErrorMessage('');
    setSuccessMessage('');

    const { error } = await supabase
      .from('gdrb_sponsors')
      .update(changes)
      .eq('id', id);

    setUpdatingId(null);

    if (error) {
      console.error('Erro ao atualizar patrocinador:', error);
      setErrorMessage('Não foi possível atualizar o patrocinador.');
      return;
    }

    setSponsors((currentSponsors) =>
      currentSponsors.map((sponsor) =>
        sponsor.id === id ? { ...sponsor, ...changes } : sponsor,
      ),
    );
  }

  function getStatusStyle(isSponsorActive: boolean) {
    return isSponsorActive
      ? 'bg-green-100 text-green-800'
      : 'bg-zinc-200 text-zinc-700';
  }

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-red-600">
            Patrocinadores
          </p>

          <h2 className="mt-2 text-3xl font-black text-zinc-950">
            Gestão de patrocinadores
          </h2>

          <p className="mt-3 max-w-3xl text-zinc-600">
            Gere os parceiros e patrocinadores do GDR Boavista. Os patrocinadores
            ativos aparecem automaticamente no site público.
          </p>
        </div>

        <button
          type="button"
          onClick={loadSponsors}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-zinc-950 px-5 py-3 text-sm font-bold text-white hover:bg-red-600"
        >
          <RefreshCw size={16} />
          Atualizar
        </button>
      </div>

      {successMessage && (
        <div className="mt-6 rounded-xl bg-green-100 px-4 py-3 text-sm font-semibold text-green-800">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="mt-6 rounded-xl bg-red-100 px-4 py-3 text-sm font-semibold text-red-800">
          {errorMessage}
        </div>
      )}

      <div className="mt-8 grid gap-8 xl:grid-cols-[0.8fr_1.2fr]">
        <form
          onSubmit={handleCreateSponsor}
          className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-red-100 p-3 text-red-600">
              <Plus size={22} />
            </div>

            <div>
              <h3 className="text-2xl font-black">Novo patrocinador</h3>
              <p className="text-sm text-zinc-500">
                Criar patrocinador para aparecer no site público.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            <input
              className="rounded-xl border border-zinc-300 px-4 py-3"
              placeholder="Nome do patrocinador *"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />

            <textarea
              className="min-h-28 rounded-xl border border-zinc-300 px-4 py-3"
              placeholder="Descrição curta"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />

            <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-4">
              <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl bg-white px-4 py-6 text-center hover:bg-zinc-100">
                <Upload size={28} className="text-red-600" />

                <div>
                  <p className="font-bold text-zinc-950">
                    Fazer upload do logotipo
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    PNG, JPG ou WEBP até 5MB
                  </p>
                </div>

                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setLogoFile(file);

                    if (file) {
                      setLogoUrl('');
                    }
                  }}
                />
              </label>

              {logoFile && (
                <div className="mt-4 rounded-xl bg-green-100 px-4 py-3 text-sm font-semibold text-green-800">
                  Imagem selecionada: {logoFile.name}
                </div>
              )}

              <p className="mt-4 text-center text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                ou
              </p>

              <input
                className="mt-4 w-full rounded-xl border border-zinc-300 px-4 py-3"
                placeholder="Colar URL do logotipo"
                value={logoUrl}
                onChange={(event) => {
                  setLogoUrl(event.target.value);

                  if (event.target.value.trim()) {
                    setLogoFile(null);
                  }
                }}
              />
            </div>

            <input
              className="rounded-xl border border-zinc-300 px-4 py-3"
              placeholder="Website do patrocinador"
              value={websiteUrl}
              onChange={(event) => setWebsiteUrl(event.target.value)}
            />

            <select
              className="rounded-xl border border-zinc-300 bg-white px-4 py-3"
              value={sponsorLevel}
              onChange={(event) => setSponsorLevel(event.target.value)}
            >
              {sponsorLevels.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            <input
              className="rounded-xl border border-zinc-300 px-4 py-3"
              placeholder="Ordem de exibição"
              type="number"
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
            />

            <label className="flex items-center gap-3 rounded-xl bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-700">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(event) => setIsActive(event.target.checked)}
              />
              Patrocinador ativo no site público
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-red-600 px-6 py-3 font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'A guardar...' : 'Criar patrocinador'}
          </button>
        </form>

        <div>
          <h3 className="text-2xl font-black text-zinc-950">
            Patrocinadores existentes
          </h3>

          {loading ? (
            <div className="mt-5 rounded-3xl border border-zinc-200 bg-white p-8 text-zinc-600">
              A carregar patrocinadores...
            </div>
          ) : sponsors.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-zinc-200 bg-white p-8 text-zinc-600">
              Ainda não existem patrocinadores.
            </div>
          ) : (
            <div className="mt-5 grid gap-4">
              {sponsors.map((sponsor) => (
                <article
                  key={sponsor.id}
                  className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                    <div className="flex gap-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-zinc-100 text-xs font-black text-zinc-400">
                        {sponsor.logo_url ? (
                          <img
                            src={sponsor.logo_url}
                            alt={sponsor.name}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          'LOGO'
                        )}
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold uppercase text-zinc-700">
                            {sponsor.sponsor_level}
                          </span>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${getStatusStyle(
                              sponsor.is_active,
                            )}`}
                          >
                            {sponsor.is_active ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>

                        <h4 className="mt-3 text-lg font-black text-zinc-950">
                          {sponsor.name}
                        </h4>

                        {sponsor.description && (
                          <p className="mt-2 text-sm text-zinc-600">
                            {sponsor.description}
                          </p>
                        )}

                        {sponsor.website_url && (
                          <a
                            href={sponsor.website_url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-red-600 hover:text-red-700"
                          >
                            <ExternalLink size={15} />
                            Website
                          </a>
                        )}

                        <p className="mt-2 text-xs text-zinc-500">
                          Ordem: {sponsor.sort_order}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 md:min-w-64">
                      <select
                        value={sponsor.sponsor_level}
                        disabled={updatingId === sponsor.id}
                        onChange={(event) =>
                          updateSponsor(sponsor.id, {
                            sponsor_level: event.target.value,
                          })
                        }
                        className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {sponsorLevels.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>

                      <input
                        value={sponsor.sort_order}
                        disabled={updatingId === sponsor.id}
                        type="number"
                        onChange={(event) =>
                          updateSponsor(sponsor.id, {
                            sort_order: Number(event.target.value) || 0,
                          })
                        }
                        className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
                      />

                      <button
                        type="button"
                        disabled={updatingId === sponsor.id}
                        onClick={() =>
                          updateSponsor(sponsor.id, {
                            is_active: !sponsor.is_active,
                          })
                        }
                        className={`rounded-full px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60 ${
                          sponsor.is_active
                            ? 'bg-zinc-950 text-white hover:bg-red-600'
                            : 'bg-red-600 text-white hover:bg-red-700'
                        }`}
                      >
                        {sponsor.is_active ? 'Desativar' : 'Ativar'}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}