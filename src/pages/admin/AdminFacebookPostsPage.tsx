import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import {
  ExternalLink,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Link as LinkIcon,
  Plus,
  RefreshCcw,
  Save,
  ThumbsUp,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

type GdrbFacebookPost = {
  id: string;
  title: string;
  description: string | null;
  facebook_url: string;
  image_url: string | null;
  published_at: string | null;
  is_active: boolean;
  sort_order: number | null;
  created_at: string | null;
};

const initialForm = {
  title: '',
  description: '',
  facebook_url: '',
  image_url: '',
  published_at: '',
  is_active: true,
  sort_order: 0,
};

const FACEBOOK_STORAGE_BUCKET = 'gdrb-facebook-posts';

function formatDate(date: string | null) {
  if (!date) {
    return 'Sem data';
  }

  return new Date(date).toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function normalizeDatetimeForInput(value: string | null) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const timezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

export function AdminFacebookPostsPage() {
  const [posts, setPosts] = useState<GdrbFacebookPost[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');

  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  async function loadPosts() {
    setIsLoading(true);
    setErrorMessage('');

    const { data, error } = await supabase
      .from('gdrb_facebook_posts')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao carregar publicações do Facebook:', error);
      setErrorMessage(
        'Não foi possível carregar as publicações. Confirma se a tabela gdrb_facebook_posts já foi criada no Supabase.',
      );
      setIsLoading(false);
      return;
    }

    setPosts(data ?? []);
    setIsLoading(false);
  }

  useEffect(() => {
    loadPosts();
  }, []);

  useEffect(() => {
    return () => {
      if (imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);


  function setPreviewUrl(nextPreview: string) {
    setImagePreview((currentPreview) => {
      if (currentPreview.startsWith('blob:')) {
        URL.revokeObjectURL(currentPreview);
      }

      return nextPreview;
    });
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Escolhe um ficheiro de imagem válido.');
      event.target.value = '';
      return;
    }

    const maxSizeInMb = 6;
    const maxSizeInBytes = maxSizeInMb * 1024 * 1024;

    if (file.size > maxSizeInBytes) {
      setErrorMessage(`A imagem deve ter no máximo ${maxSizeInMb}MB.`);
      event.target.value = '';
      return;
    }

    setErrorMessage('');
    setSelectedImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function handleRemoveImage() {
    setSelectedImageFile(null);
    setPreviewUrl('');
    handleChange('image_url', '');
  }

  async function uploadSelectedImage() {
    if (!selectedImageFile) {
      return form.image_url.trim() || null;
    }

    const extension = selectedImageFile.name.split('.').pop()?.toLowerCase() || 'jpg';
    const uniqueId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const filePath = `facebook-posts/${uniqueId}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(FACEBOOK_STORAGE_BUCKET)
      .upload(filePath, selectedImageFile, {
        cacheControl: '3600',
        contentType: selectedImageFile.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Erro ao fazer upload da imagem:', uploadError);
      throw new Error(
        'Não foi possível fazer upload da imagem. Confirma se o bucket gdrb-facebook-posts existe no Supabase.',
      );
    }

    const { data } = supabase.storage
      .from(FACEBOOK_STORAGE_BUCKET)
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  function handleChange(
    field: keyof typeof initialForm,
    value: string | number | boolean,
  ) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm(initialForm);
    setSelectedImageFile(null);
    setPreviewUrl('');
    setEditingId(null);
    setShowForm(false);
  }

  function handleEdit(post: GdrbFacebookPost) {
    setEditingId(post.id);
    setForm({
      title: post.title,
      description: post.description ?? '',
      facebook_url: post.facebook_url,
      image_url: post.image_url ?? '',
      published_at: normalizeDatetimeForInput(post.published_at),
      is_active: post.is_active,
      sort_order: post.sort_order ?? 0,
    });
    setSelectedImageFile(null);
    setPreviewUrl(post.image_url ?? '');
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSuccessMessage('');
    setErrorMessage('');

    if (!form.title.trim()) {
      setErrorMessage('Indica o título da publicação.');
      return;
    }

    if (!form.facebook_url.trim()) {
      setErrorMessage('Indica o link da publicação no Facebook.');
      return;
    }

    if (!form.facebook_url.includes('facebook.com')) {
      setErrorMessage('O link deve ser uma publicação ou página do Facebook.');
      return;
    }

    setIsSaving(true);

    let uploadedImageUrl: string | null = null;

    try {
      uploadedImageUrl = await uploadSelectedImage();
    } catch (error) {
      setIsSaving(false);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível fazer upload da imagem.',
      );
      return;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      facebook_url: form.facebook_url.trim(),
      image_url: uploadedImageUrl,
      published_at: form.published_at
        ? new Date(form.published_at).toISOString()
        : null,
      is_active: form.is_active,
      sort_order: Number(form.sort_order) || 0,
    };

    const result = editingId
      ? await supabase
          .from('gdrb_facebook_posts')
          .update(payload)
          .eq('id', editingId)
      : await supabase.from('gdrb_facebook_posts').insert(payload);

    setIsSaving(false);

    if (result.error) {
      console.error('Erro ao guardar publicação do Facebook:', result.error);
      setErrorMessage('Não foi possível guardar a publicação.');
      return;
    }

    setSuccessMessage(
      editingId
        ? 'Publicação atualizada com sucesso.'
        : 'Publicação adicionada com sucesso.',
    );

    resetForm();
    await loadPosts();
  }

  async function handleToggleActive(post: GdrbFacebookPost) {
    setErrorMessage('');

    const { error } = await supabase
      .from('gdrb_facebook_posts')
      .update({ is_active: !post.is_active })
      .eq('id', post.id);

    if (error) {
      console.error('Erro ao alterar estado da publicação:', error);
      setErrorMessage('Não foi possível alterar o estado da publicação.');
      return;
    }

    await loadPosts();
  }

  async function handleDelete(post: GdrbFacebookPost) {
    const confirmDelete = window.confirm(
      `Tens a certeza que queres apagar a publicação "${post.title}"?`,
    );

    if (!confirmDelete) {
      return;
    }

    const { error } = await supabase
      .from('gdrb_facebook_posts')
      .delete()
      .eq('id', post.id);

    if (error) {
      console.error('Erro ao apagar publicação:', error);
      setErrorMessage('Não foi possível apagar a publicação.');
      return;
    }

    await loadPosts();
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
              Facebook.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-300">
              Adiciona publicações do Facebook ao site sem depender de API ou
              iframe. Cola o link da publicação, faz upload da imagem e controla o
              que aparece na página principal.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={loadPosts}
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
                setSelectedImageFile(null);
                setPreviewUrl('');
                setShowForm(!showForm);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-red-700 px-6 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-red-800"
            >
              <Plus size={18} />
              Nova publicação
            </button>
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-sm border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <h2 className="font-serif text-3xl font-light text-[#24180f]">
              Como funciona
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-600">
              O Facebook continua a ser a fonte de verdade. No admin apenas
              selecionas as publicações que devem aparecer no site. A homepage
              mostra no máximo as 6 publicações ativas, respeitando a ordem
              definida aqui.
            </p>
          </div>

          <a
            href="https://www.facebook.com/G.D.R.BoaVista"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[#24180f] px-5 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-red-700"
          >
            Página oficial
            <ExternalLink size={16} />
          </a>
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
                {editingId ? 'Editar publicação' : 'Nova publicação'}
              </h2>

              <p className="mt-2 text-sm text-zinc-500">
                Cola o link do Facebook, faz upload da imagem e preenche os dados que vão aparecer no site.
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
            <div className="md:col-span-2">
              <label className="text-sm font-black text-zinc-800">
                Título curto *
              </label>

              <input
                type="text"
                value={form.title}
                onChange={(event) => handleChange('title', event.target.value)}
                placeholder="Ex: Dia de jogo, Captação de atletas, Resultado do fim de semana"
                className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-black text-zinc-800">
                Link da publicação no Facebook *
              </label>

              <input
                type="url"
                value={form.facebook_url}
                onChange={(event) =>
                  handleChange('facebook_url', event.target.value)
                }
                placeholder="https://www.facebook.com/..."
                className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
              />

              <p className="mt-2 text-xs leading-5 text-zinc-500">
                Este link será usado nos botões “Gosto / comentar” e “Ver publicação”.
              </p>
            </div>

            <div>
              <label className="text-sm font-black text-zinc-800">
                Imagem da publicação
              </label>

              <div className="mt-2 rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-4">
                {imagePreview ? (
                  <div className="overflow-hidden rounded-md border border-zinc-200 bg-white">
                    <img
                      src={imagePreview}
                      alt="Pré-visualização da publicação"
                      className="h-44 w-full object-cover"
                    />

                    <div className="flex items-center justify-between gap-3 p-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500">
                        <ImageIcon size={15} />
                        {selectedImageFile
                          ? selectedImageFile.name
                          : 'Imagem atual da publicação'}
                      </div>

                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="inline-flex items-center gap-1 rounded-md border border-red-200 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-50"
                      >
                        <X size={14} />
                        Remover
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-md bg-white px-4 py-8 text-center transition hover:bg-red-50">
                    <Upload size={30} className="text-red-700" />

                    <span className="mt-3 text-sm font-black text-zinc-800">
                      Fazer upload da imagem
                    </span>

                    <span className="mt-1 text-xs leading-5 text-zinc-500">
                      JPG, PNG ou WebP até 6MB. Se não enviares imagem, o site mostra o símbolo do Boavista.
                    </span>

                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                )}

                {imagePreview && (
                  <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-md border border-zinc-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-zinc-700 hover:border-red-700 hover:text-red-700">
                    <Upload size={14} />
                    Trocar imagem
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-black text-zinc-800">
                Data da publicação
              </label>

              <input
                type="datetime-local"
                value={form.published_at}
                onChange={(event) =>
                  handleChange('published_at', event.target.value)
                }
                className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
              />
            </div>

            <div>
              <label className="text-sm font-black text-zinc-800">
                Ordem / posição
              </label>

              <input
                type="number"
                value={form.sort_order}
                onChange={(event) =>
                  handleChange('sort_order', Number(event.target.value))
                }
                className="mt-2 w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-red-700 focus:ring-4 focus:ring-red-100"
              />

              <p className="mt-2 text-xs leading-5 text-zinc-500">
                Quanto menor o número, mais acima aparece. A homepage mostra até 6.
              </p>
            </div>

            <div>
              <label className="text-sm font-black text-zinc-800">
                Visibilidade
              </label>

              <label className="mt-2 flex cursor-pointer items-start gap-3 rounded-md border border-zinc-200 bg-white px-4 py-4 text-sm text-zinc-700 hover:border-red-200 hover:bg-red-50">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) =>
                    handleChange('is_active', event.target.checked)
                  }
                  className="mt-1"
                />

                <span>
                  <span className="block font-black text-zinc-800">
                    Publicação ativa
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-zinc-500">
                    Se estiver ativa, pode aparecer na homepage.
                  </span>
                </span>
              </label>
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-black text-zinc-800">
                Descrição curta
              </label>

              <textarea
                value={form.description}
                onChange={(event) =>
                  handleChange('description', event.target.value)
                }
                rows={4}
                placeholder="Texto curto para aparecer no card da homepage."
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
              {isSaving ? 'A guardar...' : 'Guardar publicação'}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="mt-8 rounded-sm border border-zinc-200 bg-white p-8 text-zinc-600 shadow-sm">
          A carregar publicações...
        </div>
      ) : posts.length === 0 ? (
        <div className="mt-8 rounded-sm border border-dashed border-zinc-300 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-700">
            <ThumbsUp size={28} />
          </div>

          <h2 className="mt-5 font-serif text-3xl font-light text-[#24180f]">
            Sem publicações
          </h2>

          <p className="mt-3 text-zinc-500">
            Ainda não existem publicações do Facebook selecionadas.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-5">
          {posts.map((post) => (
            <article
              key={post.id}
              className="overflow-hidden rounded-sm border border-zinc-200 bg-white shadow-sm"
            >
              <div className={post.is_active ? 'h-1.5 bg-red-700' : 'h-1.5 bg-zinc-300'} />

              <div className="grid gap-6 p-7 lg:grid-cols-[180px_1fr_auto] lg:items-start">
                <div className="overflow-hidden rounded-sm bg-[#24180f]">
                  {post.image_url ? (
                    <img
                      src={post.image_url}
                      alt={post.title}
                      className="h-36 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-36 items-center justify-center p-5">
                      <img
                        src="/logo-gdr-boavista-header-256.png"
                        alt="GDR Boavista"
                        className="h-20 w-20 object-contain"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-red-700">
                      Facebook
                    </span>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        post.is_active
                          ? 'bg-green-50 text-green-700'
                          : 'bg-zinc-100 text-zinc-700'
                      }`}
                    >
                      {post.is_active ? 'Ativa' : 'Inativa'}
                    </span>

                    <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-700">
                      Posição {post.sort_order ?? 0}
                    </span>

                    <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-700">
                      {formatDate(post.published_at)}
                    </span>
                  </div>

                  <h3 className="mt-5 font-serif text-4xl font-light leading-tight text-[#24180f]">
                    {post.title}
                  </h3>

                  {post.description && (
                    <p className="mt-4 text-sm leading-7 text-zinc-600">
                      {post.description}
                    </p>
                  )}

                  <a
                    href={post.facebook_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-5 inline-flex items-center gap-2 text-sm font-black uppercase tracking-wide text-red-700 hover:text-[#24180f]"
                  >
                    <LinkIcon size={16} />
                    Abrir publicação original
                    <ExternalLink size={15} />
                  </a>
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <button
                    type="button"
                    onClick={() => handleEdit(post)}
                    className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-bold text-zinc-700 hover:border-red-700 hover:text-red-700"
                  >
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleActive(post)}
                    className="inline-flex items-center gap-2 rounded-md border border-zinc-200 px-4 py-2 text-sm font-bold text-zinc-700 hover:border-red-700 hover:text-red-700"
                  >
                    {post.is_active ? <EyeOff size={16} /> : <Eye size={16} />}
                    {post.is_active ? 'Desativar' : 'Ativar'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(post)}
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
