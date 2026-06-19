import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
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
import type { GdrbSponsor } from '../../types/database';

const initialForm = {
  name: '',
  description: '',
  logo_url: '',
  website_url: '',
  sponsor_level: 'Parceiro oficial',
  is_active: true,
  sort_order: 0,
};

const sponsorLevels = [
  'Parceiro principal',
  'Parceiro oficial',
  'Parceiro',
  'Apoio institucional',
  'Outro',
];

function normalizePartnerLevel(level: string | null | undefined) {
  const normalized: Record<string, string> = {
    'Patrocinador principal': 'Parceiro principal',
    'Patrocinador oficial': 'Parceiro oficial',
    Patrocinador: 'Parceiro',
  };

  return normalized[level ?? ''] ?? level ?? 'Parceiro oficial';
}


export function AdminSponsorsPage() {
  const [sponsors, setSponsors] = useState<GdrbSponsor[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  async function loadSponsors() {
    setIsLoading(true);
    setErrorMessage('');

    const { data, error } = await supabase
      .from('gdrb_sponsors')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Erro ao carregar parceiros:', error);
      setErrorMessage('Não foi possível carregar os parceiros.');
      setIsLoading(false);
      return;
    }

    setSponsors(data ?? []);
    setIsLoading(false);
  }

  useEffect(() => {
    loadSponsors();
  }, []);

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

  function handleEdit(sponsor: GdrbSponsor) {
    setEditingId(sponsor.id);
    setForm({
      name: sponsor.name,
      description: sponsor.description ?? '',
      logo_url: sponsor.logo_url ?? '',
      website_url: sponsor.website_url ?? '',
      sponsor_level: normalizePartnerLevel(sponsor.sponsor_level),
      is_active: sponsor.is_active,
      sort_order: sponsor.sort_order ?? 0,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleLogoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setSuccessMessage('');
    setErrorMessage('');
    setIsUploadingLogo(true);

    const fileExtension = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExtension}`;
    const filePath = `logos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('gdrb-sponsors')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Erro ao enviar logo:', uploadError);
      setErrorMessage('Não foi possível enviar o logo.');
      setIsUploadingLogo(false);
      return;
    }

    const { data } = supabase.storage
      .from('gdrb-sponsors')
      .getPublicUrl(filePath);

    handleChange('logo_url', data.publicUrl);
    setSuccessMessage('Logo enviado com sucesso.');
    setIsUploadingLogo(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSuccessMessage('');
    setErrorMessage('');

    if (!form.name.trim()) {
      setErrorMessage('Indica o nome do parceiro.');
      return;
    }

    setIsSaving(true);

    const payload = {
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
          .from('gdrb_sponsors')
          .update(payload)
          .eq('id', editingId)
      : await supabase.from('gdrb_sponsors').insert(payload);

    setIsSaving(false);

    if (result.error) {
      console.error('Erro ao guardar parceiro:', result.error);
      setErrorMessage('Não foi possível guardar o parceiro.');
      return;
    }

    setSuccessMessage(
      editingId
        ? 'Parceiro atualizado com sucesso.'
        : 'Parceiro criado com sucesso.',
    );

    resetForm();
    await loadSponsors();
  }

  async function handleToggleActive(sponsor: GdrbSponsor) {
    const { error } = await supabase
      .from('gdrb_sponsors')
      .update({
        is_active: !sponsor.is_active,
      })
      .eq('id', sponsor.id);

    if (error) {
      console.error('Erro ao alterar parceiro:', error);
      setErrorMessage('Não foi possível alterar o estado do parceiro.');
      return;
    }

    await loadSponsors();
  }

  async function handleDelete(sponsor: GdrbSponsor) {
    const confirmDelete = window.confirm(
      `Tens a certeza que queres apagar o parceiro "${sponsor.name}"?`,
    );

    if (!confirmDelete) {
      return;
    }

    const { error } = await supabase
      .from('gdrb_sponsors')
      .delete()
      .eq('id', sponsor.id);

    if (error) {
      console.error('Erro ao apagar parceiro:', error);
      setErrorMessage('Não foi possível apagar o parceiro.');
      return;
    }

    await loadSponsors();
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
              Parceiros.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-300">
              Gere as marcas, empresas e entidades parceiras visíveis na página pública do
              site.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={loadSponsors}
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
              className="inline-flex items-center justify-center gap-2 rounded-md bg-red-700 px-6 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-red-800"
            >
              <Plus size={18} />
              Novo parceiro
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

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mt-8 rounded-sm border border-zinc-200 bg-white p-7 shadow-sm"
        >
          <div className="flex items-center justify-between gap-4 border-b border-zinc-200 pb-5">
            <div>
              <h2 className="font-serif text-4xl font-light text-[#24180f]">
                {editingId ? 'Editar parceiro' : 'Novo parceiro'}
              </h2>

              <p className="mt-2 text-sm text-zinc-500">
                Preenche os dados da marca, empresa ou entidade parceira.
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

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div>
              <label className="text-sm font-black text-zinc-800">
                Nome *
              </label>

              <input
                type="text"
                value={form.name}
                onChange={(event) => handleChange('name', event.target.value)}
                className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
              />
            </div>

            <div>
              <label className="text-sm font-black text-zinc-800">
                Tipo de parceria
              </label>

              <select
                value={form.sponsor_level}
                onChange={(event) =>
                  handleChange('sponsor_level', event.target.value)
                }
                className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
              >
                {sponsorLevels.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-black text-zinc-800">
                Descrição
              </label>

              <textarea
                value={form.description}
                onChange={(event) =>
                  handleChange('description', event.target.value)
                }
                rows={4}
                className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm leading-7 outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
              />
            </div>

            <div>
              <label className="text-sm font-black text-zinc-800">
                Logo
              </label>

              <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-zinc-300 bg-[#f6f2ec] px-4 py-4 text-sm font-bold text-zinc-700 transition hover:border-red-700 hover:text-red-700">
                <Upload size={18} />
                {isUploadingLogo ? 'A enviar...' : 'Enviar logo'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div>
              <label className="text-sm font-black text-zinc-800">
                URL do logo
              </label>

              <input
                type="url"
                value={form.logo_url}
                onChange={(event) =>
                  handleChange('logo_url', event.target.value)
                }
                className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
              />
            </div>

            {form.logo_url && (
              <div className="md:col-span-2 rounded-sm border border-zinc-200 bg-[#f6f2ec] p-5">
                <p className="mb-3 text-sm font-black text-zinc-800">
                  Pré-visualização
                </p>

                <img
                  src={form.logo_url}
                  alt="Pré-visualização do logo"
                  className="max-h-28 max-w-full object-contain"
                />
              </div>
            )}

            <div>
              <label className="text-sm font-black text-zinc-800">
                Website
              </label>

              <input
                type="url"
                value={form.website_url}
                onChange={(event) =>
                  handleChange('website_url', event.target.value)
                }
                className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
              />
            </div>

            <div>
              <label className="text-sm font-black text-zinc-800">
                Ordem
              </label>

              <input
                type="number"
                value={form.sort_order}
                onChange={(event) =>
                  handleChange('sort_order', Number(event.target.value))
                }
                className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
              />
            </div>

            <label className="flex items-center gap-3 rounded-md border border-zinc-200 px-4 py-3 text-sm font-bold text-zinc-700">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) =>
                  handleChange('is_active', event.target.checked)
                }
                className="h-4 w-4 accent-red-700"
              />
              Visível no site
            </label>
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
              {isSaving ? 'A guardar...' : 'Guardar parceiro'}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="mt-8 rounded-sm border border-zinc-200 bg-white p-8 text-zinc-600 shadow-sm">
          A carregar parceiros...
        </div>
      ) : sponsors.length === 0 ? (
        <div className="mt-8 rounded-sm border border-dashed border-zinc-300 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-700">
            <Handshake size={28} />
          </div>

          <h2 className="mt-5 font-serif text-3xl font-light text-[#24180f]">
            Sem parceiros
          </h2>

          <p className="mt-3 text-zinc-500">
            Ainda não existem parceiros criados.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {sponsors.map((sponsor) => (
            <article
              key={sponsor.id}
              className="overflow-hidden rounded-sm border border-zinc-200 bg-white shadow-sm"
            >
              <div className={sponsor.is_active ? 'h-1.5 bg-red-700' : 'h-1.5 bg-zinc-300'} />

              <div className="flex h-44 items-center justify-center bg-[#f6f2ec] p-6">
                {sponsor.logo_url ? (
                  <img
                    src={sponsor.logo_url}
                    alt={sponsor.name}
                    className="max-h-24 max-w-full object-contain"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#24180f] text-red-500">
                    <Handshake size={32} />
                  </div>
                )}
              </div>

              <div className="p-7">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-red-700">
                    {normalizePartnerLevel(sponsor.sponsor_level)}
                  </span>

                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-700">
                    {sponsor.is_active ? 'Visível' : 'Oculto'}
                  </span>
                </div>

                <h3 className="mt-6 font-serif text-4xl font-light text-[#24180f]">
                  {sponsor.name}
                </h3>

                {sponsor.description && (
                  <p className="mt-4 text-sm leading-7 text-zinc-600">
                    {sponsor.description}
                  </p>
                )}

                {sponsor.website_url && (
                  <a
                    href={sponsor.website_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-red-700 hover:text-red-900"
                  >
                    Abrir website
                    <ExternalLink size={15} />
                  </a>
                )}

                <div className="mt-7 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(sponsor)}
                    className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-bold text-zinc-700 hover:border-red-700 hover:text-red-700"
                  >
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleActive(sponsor)}
                    className="inline-flex items-center gap-2 rounded-md border border-zinc-200 px-4 py-2 text-sm font-bold text-zinc-700 hover:border-red-700 hover:text-red-700"
                  >
                    {sponsor.is_active ? <EyeOff size={16} /> : <Eye size={16} />}
                    {sponsor.is_active ? 'Ocultar' : 'Mostrar'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(sponsor)}
                    className="inline-flex items-center gap-2 rounded-md border border-red-200 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50"
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