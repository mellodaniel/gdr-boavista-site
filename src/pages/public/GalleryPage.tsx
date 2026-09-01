import { useEffect, useMemo, useState } from 'react';
import { Camera, Image as ImageIcon, Trophy, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type GalleryItem = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  category: string | null;
  is_active: boolean;
  sort_order: number | null;
  created_at: string;
};

const fallbackGalleryItems = [
  {
    title: 'Treinos',
    description: 'Momentos de trabalho, evolução e aprendizagem.',
  },
  {
    title: 'Jogos',
    description: 'Competição, entrega e orgulho em representar o Boavista.',
  },
  {
    title: 'Formação',
    description: 'O crescimento dos atletas dentro e fora de campo.',
  },
  {
    title: 'Comunidade',
    description: 'Famílias, sócios e amigos que fazem parte do clube.',
  },
  {
    title: 'Eventos',
    description: 'Momentos especiais que aproximam todos do Boavista.',
  },
  {
    title: 'Conquistas',
    description: 'Memórias, vitórias e histórias para recordar.',
  },
];

const highlights = [
  {
    icon: Camera,
    title: 'Momentos',
    description: 'Registar os momentos importantes da vida do clube.',
  },
  {
    icon: Users,
    title: 'Famílias',
    description: 'Valorizar a presença de quem acompanha os atletas.',
  },
  {
    icon: Trophy,
    title: 'Orgulho',
    description: 'Guardar memórias da formação e da competição.',
  },
];

function normalizeCategory(category: string | null | undefined) {
  return category?.trim() || 'GDR Boavista';
}

export function GalleryPage() {
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [isLoadingGallery, setIsLoadingGallery] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [galleryUnavailable, setGalleryUnavailable] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadGalleryItems() {
      setIsLoadingGallery(true);

      const { data, error } = await supabase
        .from('gdrb_gallery_items')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (!isMounted) {
        return;
      }

      if (error) {
        console.error('Erro ao carregar galeria pública:', error);
        setGalleryItems([]);
        setGalleryUnavailable(true);
        setIsLoadingGallery(false);
        return;
      }

      setGalleryItems((data ?? []) as GalleryItem[]);
      setGalleryUnavailable(false);
      setIsLoadingGallery(false);
    }

    void loadGalleryItems();

    return () => {
      isMounted = false;
    };
  }, []);

  const availableCategories = useMemo(() => {
    const categories = new Set<string>();

    galleryItems.forEach((item) => {
      categories.add(normalizeCategory(item.category));
    });

    return ['Todas', ...Array.from(categories).sort((a, b) => a.localeCompare(b, 'pt-PT'))];
  }, [galleryItems]);

  const visibleGalleryItems = useMemo(() => {
    if (selectedCategory === 'Todas') {
      return galleryItems;
    }

    return galleryItems.filter((item) => normalizeCategory(item.category) === selectedCategory);
  }, [galleryItems, selectedCategory]);

  const hasRealGallery = galleryItems.length > 0;

  return (
    <div className="bg-[#f6f2ec] text-zinc-950">
      <section className="relative overflow-hidden bg-[#24180f] py-24 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_right,rgba(220,38,38,0.28),transparent_34%)]" />

        <div className="relative mx-auto max-w-7xl px-4">
          <div className="max-w-4xl">
            <p className="text-sm font-bold uppercase tracking-[0.45em] text-red-400">
              Galeria
            </p>

            <h1 className="mt-8 font-serif text-6xl font-light leading-[0.95] tracking-tight md:text-8xl">
              Memórias que
              <br />
              ficam no clube.
            </h1>

            <p className="mt-8 max-w-2xl text-lg leading-8 text-zinc-300">
              A galeria reúne momentos de treinos, jogos, eventos, conquistas e
              da comunidade que faz parte do GDR Boavista.
            </p>
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mx-auto max-w-4xl">
            <p className="text-sm font-bold uppercase tracking-[0.45em] text-red-700">
              Imagens
            </p>

            <h2 className="mt-8 font-serif text-5xl font-light leading-tight text-[#24180f] md:text-7xl">
              Cada imagem conta uma parte da nossa história.
            </h2>

            <div className="mt-10 grid gap-8 text-base leading-8 text-zinc-600 md:grid-cols-2">
              <p>
                O futebol também se vive nos pequenos momentos: a chegada ao
                campo, o treino, o apoio das famílias, a união da equipa e a
                celebração de cada conquista.
              </p>

              <p>
                Esta área apresenta fotografias e memórias do clube de forma
                organizada, simples e visual.
              </p>
            </div>
          </div>

          <div className="mt-16 grid gap-0 overflow-hidden rounded-sm bg-[#24180f] text-white md:grid-cols-3">
            {highlights.map((item, index) => {
              const Icon = item.icon;

              return (
                <article
                  key={item.title}
                  className={`p-10 text-center ${
                    index !== highlights.length - 1
                      ? 'border-b border-white/10 md:border-b-0 md:border-r'
                      : ''
                  }`}
                >
                  <Icon className="mx-auto text-red-500" size={30} />

                  <h3 className="mt-6 font-serif text-2xl font-light">
                    {item.title}
                  </h3>

                  <p className="mt-4 text-sm uppercase leading-6 tracking-[0.12em] text-zinc-400">
                    {item.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.45em] text-red-700">
                Categorias
              </p>

              <h2 className="mt-5 font-serif text-5xl font-light text-[#24180f] md:text-6xl">
                Galeria do Boavista
              </h2>
            </div>

            {hasRealGallery ? (
              <div className="flex flex-wrap gap-2">
                {availableCategories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setSelectedCategory(category)}
                    className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.16em] transition ${
                      selectedCategory === category
                        ? 'bg-red-700 text-white'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-red-50 hover:text-red-700'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {isLoadingGallery ? (
            <div className="mt-10 rounded-sm border border-zinc-200 bg-[#f6f2ec] p-10 text-center text-sm font-semibold text-zinc-500">
              A carregar galeria...
            </div>
          ) : hasRealGallery ? (
            <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {visibleGalleryItems.map((item) => (
                <article
                  key={item.id}
                  className="group overflow-hidden rounded-sm border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                >
                  {item.image_url ? (
                    <div className="h-72 overflow-hidden bg-[#f6f2ec]">
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="flex h-72 items-center justify-center bg-[#f6f2ec]">
                      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#24180f] text-red-500 transition duration-500 group-hover:scale-110">
                        <ImageIcon size={40} />
                      </div>
                    </div>
                  )}

                  <div className="p-7">
                    <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-red-700">
                      {normalizeCategory(item.category)}
                    </span>

                    <h3 className="mt-6 font-serif text-4xl font-light text-[#24180f]">
                      {item.title}
                    </h3>

                    {item.description ? (
                      <p className="mt-4 text-sm leading-7 text-zinc-600">
                        {item.description}
                      </p>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <>
              <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {fallbackGalleryItems.map((item) => (
                  <article
                    key={item.title}
                    className="group overflow-hidden rounded-sm border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div className="h-1.5 bg-red-700" />

                    <div className="flex h-64 items-center justify-center bg-[#f6f2ec]">
                      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#24180f] text-red-500 transition duration-500 group-hover:scale-110">
                        <ImageIcon size={40} />
                      </div>
                    </div>

                    <div className="p-7">
                      <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-red-700">
                        GDR Boavista
                      </span>

                      <h3 className="mt-6 font-serif text-4xl font-light text-[#24180f]">
                        {item.title}
                      </h3>

                      <p className="mt-4 text-sm leading-7 text-zinc-600">
                        {item.description}
                      </p>
                    </div>
                  </article>
                ))}
              </div>

              <div className="mt-12 rounded-sm border border-dashed border-zinc-300 bg-[#f6f2ec] p-10 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-700">
                  <Camera size={28} />
                </div>

                <h3 className="mt-5 font-serif text-3xl font-light text-[#24180f]">
                  Galeria em preparação
                </h3>

                <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-zinc-600">
                  {galleryUnavailable
                    ? 'A galeria dinâmica ainda não está configurada. Enquanto isso, mantemos as categorias base da página.'
                    : 'Em breve esta página poderá apresentar fotografias reais do clube, organizadas por treinos, jogos, equipas, eventos e momentos especiais.'}
                </p>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="bg-red-700 py-20 text-white">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 px-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.35em] text-red-200">
              Memórias
            </p>

            <h2 className="mt-4 font-serif text-5xl font-light">
              O Boavista também se constrói com imagens.
            </h2>
          </div>

          <p className="max-w-md text-sm leading-7 text-red-100">
            Cada fotografia ajuda a guardar a história do clube, dos atletas, das
            famílias e da comunidade.
          </p>
        </div>
      </section>
    </div>
  );
}
