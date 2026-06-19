import { ChevronRight, Clock, Package, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { trackAnalyticsEvent } from '../../lib/analytics';

const productExamples = [
  {
    name: 'T-shirt GDR Boavista',
    category: 'Vestuário oficial',
    description: 'Uma peça pensada para atletas, famílias, sócios e simpatizantes do clube.',
    price: 'Brevemente',
    highlight: 'Vista o clube',
  },
  {
    name: 'Sweat de Treino',
    category: 'Treino',
    description: 'Ideal para dias de treino, deslocações e apoio às equipas nos jogos.',
    price: 'Brevemente',
    highlight: 'Formação',
  },
  {
    name: 'Cachecol Oficial',
    category: 'Adeptos',
    description: 'Para apoiar o Boavista nas bancadas, em casa e em todos os momentos.',
    price: 'Brevemente',
    highlight: 'Apoio',
  },
  {
    name: 'Boné GDRB',
    category: 'Acessórios',
    description: 'Artigo exemplo com identidade do clube para o dia a dia.',
    price: 'Brevemente',
    highlight: 'Identidade',
  },
  {
    name: 'Garrafa Desportiva',
    category: 'Treino',
    description: 'Produto exemplo para atletas, treinos, jogos e torneios.',
    price: 'Brevemente',
    highlight: 'Performance',
  },
  {
    name: 'Pack Família Boavista',
    category: 'Pack especial',
    description: 'Uma proposta futura para famílias que vivem o clube de perto.',
    price: 'Brevemente',
    highlight: 'Família',
  },
];

const shopHighlights = [
  {
    icon: ShieldCheck,
    title: 'Identidade oficial',
    description: 'A futura loja será pensada para reforçar a marca e o orgulho GDR Boavista.',
  },
  {
    icon: Package,
    title: 'Produtos para todos',
    description: 'Vestuário, acessórios, packs e artigos para atletas, famílias e sócios.',
  },
  {
    icon: Clock,
    title: 'Lançamento futuro',
    description: 'Nesta fase ainda não há carrinho, reservas ou pagamentos online.',
  },
];

export function ShopPage() {
  function trackShopClick(entityName: string) {
    trackAnalyticsEvent({
      eventName: 'shop_click',
      entityType: 'shop',
      entityName,
    });
  }

  return (
    <div className="bg-[#f6f2ec] text-zinc-950">
      <section className="relative overflow-hidden bg-[#24180f] py-24 text-white md:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_right,rgba(220,38,38,0.42),transparent_34%)]" />
        <div className="absolute inset-0 bg-gradient-to-br from-black/30 via-transparent to-red-950/50" />
        <div className="absolute -left-28 top-20 h-72 w-72 rounded-full bg-red-700/25 blur-3xl" />

        <img
          src="/logo-gdr-boavista-header-256.png"
          alt=""
          className="absolute -right-24 top-20 h-[560px] w-[560px] object-contain opacity-[0.07]"
        />

        <div className="relative mx-auto max-w-7xl px-4">
          <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.45em] text-red-300">
                Loja Online
              </p>

              <h1 className="mt-8 font-serif text-6xl font-light leading-[0.95] tracking-tight md:text-8xl">
                Vista o
                <br />
                Boavista.
              </h1>

              <p className="mt-8 max-w-2xl text-lg leading-8 text-zinc-300">
                A loja online do GDR Boavista está em preparação. Em breve,
                produtos oficiais do clube estarão disponíveis para atletas,
                famílias, sócios e todos os que vivem o Boavista.
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                <span className="inline-flex items-center justify-center gap-2 rounded-md bg-red-700 px-6 py-4 text-sm font-black uppercase tracking-wide text-white shadow-xl shadow-red-950/25">
                  <Clock size={18} />
                  Brevemente disponível
                </span>

                <Link
                  to="/contactos"
                  onClick={() => trackShopClick('Contactos - loja')}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-6 py-4 text-sm font-black uppercase tracking-wide text-[#24180f] transition hover:-translate-y-0.5 hover:bg-zinc-100"
                >
                  Falar com o clube
                  <ChevronRight size={18} />
                </Link>
              </div>

              <div className="mt-10 flex flex-wrap gap-3">
                {['T-shirts', 'Sweats', 'Cachecóis', 'Packs família'].map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative rounded-sm border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/25 backdrop-blur md:p-8">
              <div className="absolute -right-5 -top-5 rounded-full bg-red-700 px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-white shadow-xl">
                Em breve
              </div>

              <div className="rounded-sm bg-white p-6 text-[#24180f] shadow-2xl">
                <div className="flex items-center gap-5">
                  <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-3xl bg-[#f6f2ec] p-4 shadow-inner">
                    <img
                      src="/logo-gdr-boavista-header-256.png"
                      alt="GDR Boavista"
                      className="h-full w-full object-contain"
                    />
                  </div>

                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.28em] text-red-700">
                      Coleção futura
                    </p>

                    <h2 className="mt-2 font-serif text-4xl font-light leading-tight">
                      Produtos oficiais do clube.
                    </h2>
                  </div>
                </div>

                <div className="mt-8 grid gap-3 text-sm font-semibold text-zinc-700 sm:grid-cols-2">
                  <span className="rounded-md bg-[#f6f2ec] px-4 py-3">Sem pagamentos ativos</span>
                  <span className="rounded-md bg-[#f6f2ec] px-4 py-3">Sem reservas online</span>
                  <span className="rounded-md bg-[#f6f2ec] px-4 py-3">Catálogo visual</span>
                  <span className="rounded-md bg-[#f6f2ec] px-4 py-3">Lançamento futuro</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="rounded-sm border border-red-200 bg-red-50 p-7 shadow-sm">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.32em] text-red-700">
                  Loja em construção
                </p>

                <h2 className="mt-3 font-serif text-4xl font-light text-[#24180f]">
                  A venda online ainda não está ativa.
                </h2>

                <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-700">
                  Os produtos abaixo são exemplos para apresentação visual da futura loja.
                  A compra, reserva, stock e pagamentos serão disponibilizados numa fase posterior.
                </p>
              </div>

              <span className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-black uppercase tracking-wide text-red-700 shadow-sm">
                Preview da loja
              </span>
            </div>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {shopHighlights.map((item) => {
              const Icon = item.icon;

              return (
                <article
                  key={item.title}
                  className="rounded-sm border border-zinc-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-700">
                    <Icon size={26} />
                  </div>

                  <h3 className="mt-6 font-serif text-3xl font-light text-[#24180f]">
                    {item.title}
                  </h3>

                  <p className="mt-4 text-sm leading-7 text-zinc-600">
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
                Merchandising oficial
              </p>

              <h2 className="mt-5 font-serif text-5xl font-light text-[#24180f] md:text-6xl">
                Como será a loja.
              </h2>
            </div>

            <p className="max-w-md text-sm leading-7 text-zinc-500">
              Uma montra futura para produtos oficiais do GDR Boavista, com artigos pensados para a bancada, o treino e o dia a dia.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {productExamples.map((product) => (
              <article
                key={product.name}
                className="group overflow-hidden rounded-sm border border-zinc-200 bg-[#f6f2ec] shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="h-1.5 bg-red-700" />

                <div className="relative flex h-72 items-center justify-center overflow-hidden bg-[#24180f]">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.36),transparent_40%)]" />
                  <div className="absolute left-5 top-5 rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-white">
                    {product.highlight}
                  </div>

                  <img
                    src="/logo-gdr-boavista-header-256.png"
                    alt="GDR Boavista"
                    className="relative h-36 w-36 rounded-3xl bg-white p-5 shadow-2xl transition duration-500 group-hover:scale-105"
                  />
                </div>

                <div className="p-7">
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-red-700">
                      {product.category}
                    </span>

                    <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-600">
                      {product.price}
                    </span>
                  </div>

                  <h3 className="mt-6 font-serif text-4xl font-light leading-tight text-[#24180f]">
                    {product.name}
                  </h3>

                  <p className="mt-4 text-sm leading-7 text-zinc-600">
                    {product.description}
                  </p>

                  <button
                    type="button"
                    disabled
                    className="mt-7 inline-flex cursor-not-allowed items-center gap-2 rounded-md bg-zinc-200 px-5 py-3 text-sm font-black uppercase tracking-wide text-zinc-500"
                  >
                    Brevemente disponível
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#24180f] py-20 text-white">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 px-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.35em] text-red-300">
              Próxima fase
            </p>

            <h2 className="mt-4 font-serif text-5xl font-light">
              A loja oficial está a ganhar forma.
            </h2>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400">
              Esta página já prepara a experiência visual da futura loja online do GDR Boavista.
            </p>
          </div>

          <Link
            to="/contactos"
            onClick={() => trackShopClick('Contactar o clube - loja final')}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-6 py-4 text-sm font-black uppercase tracking-wide text-[#24180f] transition hover:bg-red-700 hover:text-white"
          >
            Contactar o clube
            <ChevronRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}
