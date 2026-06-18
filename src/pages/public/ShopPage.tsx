import { ChevronRight, Clock, Package, ShieldCheck, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { trackAnalyticsEvent } from '../../lib/analytics';

const productExamples = [
  {
    name: 'T-shirt GDR Boavista',
    category: 'Vestuário',
    description: 'Modelo exemplo para atletas, sócios e simpatizantes.',
    price: 'Brevemente',
  },
  {
    name: 'Sweat de Treino',
    category: 'Vestuário',
    description: 'Produto exemplo para dias de treino e apoio à equipa.',
    price: 'Brevemente',
  },
  {
    name: 'Cachecol Oficial',
    category: 'Adeptos',
    description: 'Produto exemplo para apoiar o Boavista nos jogos.',
    price: 'Brevemente',
  },
  {
    name: 'Boné GDRB',
    category: 'Acessórios',
    description: 'Produto exemplo com identidade do clube.',
    price: 'Brevemente',
  },
  {
    name: 'Garrafa Desportiva',
    category: 'Treino',
    description: 'Produto exemplo para atletas e famílias.',
    price: 'Brevemente',
  },
  {
    name: 'Pack Família Boavista',
    category: 'Pack especial',
    description: 'Conjunto exemplo pensado para sócios e famílias.',
    price: 'Brevemente',
  },
];

const shopHighlights = [
  {
    icon: ShieldCheck,
    title: 'Produtos oficiais',
    description: 'A futura loja será pensada para valorizar a identidade do GDR Boavista.',
  },
  {
    icon: Package,
    title: 'Vestuário e acessórios',
    description: 'A página já prepara espaço para produtos do clube, packs e artigos de apoio.',
  },
  {
    icon: Clock,
    title: 'Disponível em breve',
    description: 'Nesta fase ainda não há venda online, carrinho ou pagamentos ativos.',
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
      <section className="relative overflow-hidden bg-[#24180f] py-24 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_right,rgba(220,38,38,0.35),transparent_34%)]" />
        <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-red-950/40" />

        <img
          src="/logo-gdr-boavista-header-256.png"
          alt=""
          className="absolute -right-24 top-24 h-[520px] w-[520px] object-contain opacity-[0.06]"
        />

        <div className="relative mx-auto max-w-7xl px-4">
          <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.45em] text-red-400">
                Loja Online
              </p>

              <h1 className="mt-8 font-serif text-6xl font-light leading-[0.95] tracking-tight md:text-8xl">
                Loja Oficial
                <br />
                GDR Boavista.
              </h1>

              <p className="mt-8 max-w-2xl text-lg leading-8 text-zinc-300">
                A loja online do GDR Boavista está em construção. Em breve
                poderás encontrar produtos oficiais do clube, pensados para
                atletas, famílias, sócios e todos os que vivem o Boavista.
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                <span className="inline-flex items-center justify-center gap-2 rounded-md bg-red-700 px-6 py-4 text-sm font-black uppercase tracking-wide text-white">
                  <Clock size={18} />
                  Brevemente disponível
                </span>

                <Link
                  to="/contactos"
                  onClick={() => trackShopClick('Contactos - loja')}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-6 py-4 text-sm font-black uppercase tracking-wide text-[#24180f] transition hover:bg-zinc-100"
                >
                  Falar com o clube
                  <ChevronRight size={18} />
                </Link>
              </div>
            </div>

            <div className="rounded-sm border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="flex items-center gap-5">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl bg-white p-3 shadow-2xl">
                  <img
                    src="/logo-gdr-boavista-header-256.png"
                    alt="GDR Boavista"
                    className="h-full w-full object-contain"
                  />
                </div>

                <div>
                  <p className="text-sm font-black uppercase tracking-[0.28em] text-red-300">
                    Em preparação
                  </p>

                  <h2 className="mt-2 font-serif text-4xl font-light">
                    Produtos oficiais do clube.
                  </h2>
                </div>
              </div>

              <div className="mt-8 rounded-sm bg-white p-6 text-[#24180f]">
                <ShoppingBag size={32} className="text-red-700" />

                <p className="mt-5 text-base leading-8 text-zinc-700">
                  Esta página é uma pré-visualização da futura loja. Ainda não é
                  possível comprar, reservar ou pagar produtos online.
                </p>
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
                  Aviso
                </p>

                <h2 className="mt-3 font-serif text-4xl font-light text-[#24180f]">
                  Loja em construção.
                </h2>

                <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-700">
                  Os produtos abaixo são exemplos para apresentação visual da
                  futura loja online. A venda de produtos será disponibilizada
                  numa fase posterior.
                </p>
              </div>

              <span className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-black uppercase tracking-wide text-red-700 shadow-sm">
                Lançamento em breve
              </span>
            </div>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {shopHighlights.map((item) => {
              const Icon = item.icon;

              return (
                <article
                  key={item.title}
                  className="rounded-sm border border-zinc-200 bg-white p-7 shadow-sm"
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
                Produtos exemplo
              </p>

              <h2 className="mt-5 font-serif text-5xl font-light text-[#24180f] md:text-6xl">
                Como será a loja.
              </h2>
            </div>

            <p className="max-w-md text-sm leading-7 text-zinc-500">
              Estes cards são apenas uma demonstração visual. A gestão real dos
              produtos, stock e pagamentos será feita numa fase futura.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {productExamples.map((product) => (
              <article
                key={product.name}
                className="group overflow-hidden rounded-sm border border-zinc-200 bg-[#f6f2ec] shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="h-1.5 bg-red-700" />

                <div className="relative flex h-64 items-center justify-center overflow-hidden bg-[#24180f]">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.32),transparent_38%)]" />

                  <img
                    src="/logo-gdr-boavista-header-256.png"
                    alt="GDR Boavista"
                    className="relative h-32 w-32 rounded-3xl bg-white p-4 shadow-2xl transition duration-500 group-hover:scale-105"
                  />

                  <span className="absolute right-5 top-5 rounded-full bg-red-700 px-4 py-2 text-xs font-black uppercase tracking-wide text-white">
                    Exemplo
                  </span>
                </div>

                <div className="bg-white p-7">
                  <div className="flex flex-wrap items-center gap-2">
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
                    Indisponível para venda
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
              Em breve, a loja oficial ficará disponível.
            </h2>
          </div>

          <Link
            to="/contactos"
            onClick={() => trackShopClick('Contactos - loja final')}
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
