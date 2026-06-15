import { Camera, Image as ImageIcon, Trophy, Users } from 'lucide-react';

const galleryItems = [
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

export function GalleryPage() {
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
                Esta área será preparada para apresentar fotografias e memórias
                do clube de forma organizada, simples e visual.
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
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {galleryItems.map((item) => (
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
              Em breve esta página poderá apresentar fotografias reais do clube,
              organizadas por treinos, jogos, equipas, eventos e momentos
              especiais.
            </p>
          </div>
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