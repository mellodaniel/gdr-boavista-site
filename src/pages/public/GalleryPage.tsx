import { useEffect, useMemo, useState } from 'react';
import { Camera, ChevronDown, ChevronUp, Image as ImageIcon } from 'lucide-react';
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

function normalizeCategory(category: string | null | undefined) {
  return category?.trim() || 'GDR Boavista';
}

export function GalleryPage() {
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [isLoadingGallery, setIsLoadingGallery] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [galleryUnavailable, setGalleryUnavailable] = useState(false);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);

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
  const displayedItems = hasRealGallery ? visibleGalleryItems : fallbackGalleryItems;

  function toggleItem(id: string) {
    setExpandedItemId((current) => (current === id ? null : id));
  }

  return (
    <div className="bg-[#f6f2ec] text-zinc-950">
      <section className="relative overflow-hidden bg-[#24180f] py-14 text-white md:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_right,rgba(220,38,38,0.28),transparent_34%)]" />

        <div className="relative mx-auto max-w-7xl px-4">
          <div className="max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-[0.32em] text-red-400 md:text-sm md:tracking-[0.45em]">
              Galeria
            </p>

            <h1 className="mt-5 font-serif text-4xl font-light leading-[0.98] tracking-tight md:mt-8 md:text-8xl">
              Memórias do
              <br />
              Boavista.
            </h1>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-zinc-300 md:mt-8 md:text-lg md:leading-8">
              Treinos, jogos, eventos e momentos da comunidade do GDR Boavista.
            </p>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-24">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.32em] text-red-700 md:text-sm md:tracking-[0.45em]">
                Imagens
              </p>

              <h2 className="mt-3 font-serif text-3xl font-light text-[#24180f] md:mt-5 md:text-6xl">
                Galeria do clube
              </h2>
            </div>

            {hasRealGallery ? (
              <div className="rounded-sm border border-zinc-200 bg-white p-3 shadow-sm md:border-0 md:bg-transparent md:p-0 md:shadow-none">
                <button
                  type="button"
                  onClick={() => setIsCategoriesOpen((current) => !current)}
                  className="flex w-full items-center justify-between gap-4 text-left md:hidden"
                >
                  <span>
                    <span className="block text-xs font-black uppercase tracking-[0.18em] text-red-700">
                      Categorias
                    </span>
                    <span className="mt-1 block text-sm font-semibold text-zinc-600">
                      {selectedCategory}
                    </span>
                  </span>
                  {isCategoriesOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>

                <div className={`${isCategoriesOpen ? 'flex' : 'hidden'} mt-3 flex-wrap gap-2 md:mt-0 md:flex`}>
                  {availableCategories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(category);
                        setIsCategoriesOpen(false);
                      }}
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
              </div>
            ) : null}
          </div>

          {isLoadingGallery ? (
            <div className="mt-8 rounded-sm border border-zinc-200 bg-white p-8 text-center text-sm font-semibold text-zinc-500 md:mt-10 md:p-10">
              A carregar galeria...
            </div>
          ) : (
            <div className="mt-8 grid gap-3 md:mt-10 md:grid-cols-2 md:gap-6 xl:grid-cols-3">
              {displayedItems.map((item) => {
                const itemId = 'id' in item ? item.id : item.title;
                const imageUrl = 'image_url' in item ? item.image_url : null;
                const category = 'category' in item ? normalizeCategory(item.category) : 'GDR Boavista';
                const isExpanded = expandedItemId === itemId;

                return (
                  <article
                    key={itemId}
                    className="group overflow-hidden rounded-sm border border-zinc-200 bg-white shadow-sm transition md:hover:-translate-y-1 md:hover:shadow-xl"
                  >
                    {imageUrl ? (
                      <div className="h-52 overflow-hidden bg-[#f6f2ec] md:h-72">
                        <img
                          src={imageUrl}
                          alt={item.title}
                          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div className="flex h-44 items-center justify-center bg-[#f6f2ec] md:h-72">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#24180f] text-red-500 transition duration-500 group-hover:scale-110 md:h-24 md:w-24">
                          <ImageIcon size={32} />
                        </div>
                      </div>
                    )}

                    <div className="p-4 md:p-7">
                      <span className="rounded-full bg-red-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-red-700 md:text-xs">
                        {category}
                      </span>

                      <h3 className="mt-4 font-serif text-2xl font-light leading-tight text-[#24180f] md:mt-6 md:text-4xl">
                        {item.title}
                      </h3>

                      {item.description ? (
                        <p className={`${isExpanded ? 'block' : 'hidden'} mt-3 text-sm leading-7 text-zinc-600 md:block`}>
                          {item.description}
                        </p>
                      ) : null}

                      {item.description ? (
                        <button
                          type="button"
                          onClick={() => toggleItem(itemId)}
                          className="mt-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-red-700 md:hidden"
                        >
                          {isExpanded ? 'Fechar' : 'Detalhes'}
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {!isLoadingGallery && !hasRealGallery ? (
            <div className="mt-8 rounded-sm border border-dashed border-zinc-300 bg-white p-6 text-center md:mt-12 md:p-10">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-700 md:h-16 md:w-16">
                <Camera size={24} />
              </div>
              <h3 className="mt-4 font-serif text-2xl font-light text-[#24180f] md:text-3xl">
                Galeria em preparação
              </h3>
              {galleryUnavailable ? (
                <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-zinc-600">
                  A galeria dinâmica ainda não está configurada.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
