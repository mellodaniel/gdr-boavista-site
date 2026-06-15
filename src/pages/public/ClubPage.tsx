import { HeartHandshake, ShieldCheck, Trophy, Users } from 'lucide-react';

const values = [
  {
    icon: Users,
    title: 'Comunidade',
    description:
      'Um clube feito por atletas, famílias, sócios, treinadores, patrocinadores e amigos.',
  },
  {
    icon: Trophy,
    title: 'Formação',
    description:
      'Acompanhamos os atletas desde os primeiros passos até à competição, com foco no crescimento humano e desportivo.',
  },
  {
    icon: HeartHandshake,
    title: 'União',
    description:
      'Valorizamos o compromisso, a entreajuda, o respeito e o orgulho de representar o GDR Boavista.',
  },
  {
    icon: ShieldCheck,
    title: 'Identidade',
    description:
      'Representamos Boavista com responsabilidade, dedicação e ligação à comunidade local.',
  },
];

const timeline = [
  {
    title: 'Formação',
    description:
      'Uma base forte para jovens atletas crescerem com disciplina, espírito de equipa e paixão pelo futebol.',
  },
  {
    title: 'Competição',
    description:
      'Equipas preparadas para competir, evoluir e representar o clube com orgulho em todos os escalões.',
  },
  {
    title: 'Comunidade',
    description:
      'Um espaço onde famílias, sócios e parceiros fazem parte ativa da vida do clube.',
  },
];

export function ClubPage() {
  return (
    <div className="bg-[#f6f2ec] text-zinc-950">
      <section className="relative overflow-hidden bg-[#24180f] py-24 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_right,rgba(220,38,38,0.28),transparent_34%)]" />
        <div className="absolute -right-32 top-12 h-96 w-96 rounded-full bg-red-700/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4">
          <div className="max-w-4xl">
            <p className="text-sm font-bold uppercase tracking-[0.45em] text-red-400">
              O Clube
            </p>

            <h1 className="mt-8 font-serif text-6xl font-light leading-[0.95] tracking-tight md:text-8xl">
              Mais do que futebol,
              <br />
              uma casa de formação.
            </h1>

            <p className="mt-8 max-w-2xl text-lg leading-8 text-zinc-300">
              O GDR Boavista é um clube de futebol, formação e comunidade. Uma
              casa construída por atletas, famílias, sócios, treinadores,
              patrocinadores e todos os que vivem o clube com orgulho.
            </p>
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mx-auto max-w-4xl">
            <p className="text-sm font-bold uppercase tracking-[0.45em] text-red-700">
              Quem somos
            </p>

            <h2 className="mt-8 font-serif text-5xl font-light leading-tight text-[#24180f] md:text-7xl">
              Crescemos com os atletas,
              <br />
              lado a lado com as famílias.
            </h2>

            <div className="mt-10 grid gap-8 text-base leading-8 text-zinc-600 md:grid-cols-2">
              <p>
                O Boavista representa a força da comunidade, o compromisso com a
                formação e o orgulho de vestir uma camisola que une diferentes
                gerações.
              </p>

              <p>
                Cada treino, cada jogo e cada conquista fazem parte de uma
                história construída por todos. O nosso objetivo é dar aos atletas
                um espaço seguro, organizado e motivador para evoluírem.
              </p>
            </div>
          </div>

          <div className="mt-16 grid gap-0 overflow-hidden rounded-sm bg-[#24180f] text-white md:grid-cols-4">
            {values.map((item, index) => {
              const Icon = item.icon;

              return (
                <article
                  key={item.title}
                  className={`p-8 text-center ${
                    index !== values.length - 1
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
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.45em] text-red-700">
                Identidade
              </p>

              <h2 className="mt-6 font-serif text-5xl font-light leading-tight text-[#24180f] md:text-6xl">
                Um clube com alma, responsabilidade e futuro.
              </h2>
            </div>

            <div className="grid gap-5">
              {timeline.map((item, index) => (
                <article
                  key={item.title}
                  className="rounded-sm border border-zinc-200 bg-[#f6f2ec] p-7"
                >
                  <div className="flex items-start gap-5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-700 text-sm font-black text-white">
                      {index + 1}
                    </div>

                    <div>
                      <h3 className="font-serif text-3xl font-light text-[#24180f]">
                        {item.title}
                      </h3>

                      <p className="mt-3 text-sm leading-7 text-zinc-600">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-red-700 py-20 text-white">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 px-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.35em] text-red-200">
              GDR Boavista
            </p>

            <h2 className="mt-4 font-serif text-5xl font-light">
              Uma família dentro e fora de campo.
            </h2>
          </div>

          <div className="max-w-md text-sm leading-7 text-red-100">
            Formação, competição, comunidade e orgulho. É assim que seguimos a
            construir o presente e o futuro do clube.
          </div>
        </div>
      </section>
    </div>
  );
}