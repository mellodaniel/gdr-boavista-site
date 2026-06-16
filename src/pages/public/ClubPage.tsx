import {
  HeartHandshake,
  ShieldCheck,
  Trophy,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const values = [
  {
    title: 'Identidade Boavista',
    description:
      'Promover a prática do desporto, integrando os nossos atletas, sensibilizando-os para a identidade sui generis da nossa instituição, designadamente dando-lhes a conhecer a nossa história desportiva e social, a nossa ligação umbilical à freguesia de Santa Eufémia Boa Vista e à cidade de Leiria.',
  },
  {
    title: 'Promoção da atividade física',
    description:
      'Promover atividades físicas e a prática desportiva, entre a juventude, procurando dar a conhecer os benefícios do desporto, ao nível do desenvolvimento psicomotor e da preservação e potenciação de uma vida saudável por parte de cada atleta.',
  },
  {
    title: 'Formação global do atleta',
    description:
      'Acompanhar de forma global os nossos atletas, como desportistas, cidadãos e estudantes, procurando garantir que os mesmos não evoluam apenas na vertente desportiva e de fair-play, mas também na dimensão escolar, social e de cidadania.',
  },
  {
    title: 'Modelo formativo',
    description:
      'Adotar um modelo formativo permanente, procurando acentuar a dimensão coletiva do jogo, que se constrói através da identidade da equipa, mas também estimulando a decisão individual, a criatividade e a liberdade da tomada de decisão por parte de cada atleta.',
  },
];

const timeline = [
  {
    icon: Users,
    title: 'Formação',
    description:
      'Acompanhamento dos atletas em diferentes fases de crescimento.',
  },
  {
    icon: Trophy,
    title: 'Competição',
    description:
      'Participação desportiva com compromisso, respeito e ambição.',
  },
  {
    icon: HeartHandshake,
    title: 'Comunidade',
    description:
      'Ligação próxima às famílias, sócios, freguesia e cidade de Leiria.',
  },
];

export function ClubPage() {
  return (
    <div className="bg-[#f6f2ec] text-zinc-950">
      <section className="relative overflow-hidden bg-[#24180f] py-24 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_right,rgba(220,38,38,0.28),transparent_34%)]" />

        <div className="relative mx-auto max-w-7xl px-4">
          <div className="max-w-4xl">
            <p className="text-sm font-bold uppercase tracking-[0.45em] text-red-400">
              O clube
            </p>

            <h1 className="mt-8 font-serif text-6xl font-light leading-[0.95] tracking-tight md:text-8xl">
              Mais do que futebol,
              <br />
              uma casa de formação.
            </h1>

            <p className="mt-8 max-w-2xl text-lg leading-8 text-zinc-300">
              O Grupo Desportivo Recreativo Boavista é uma estrutura ligada à
              formação, à competição, à comunidade e aos valores que orientam o
              crescimento dos seus atletas.
            </p>
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mx-auto max-w-4xl">
            <p className="text-sm font-bold uppercase tracking-[0.45em] text-red-700">
              Identidade
            </p>

            <h2 className="mt-8 font-serif text-5xl font-light leading-tight text-[#24180f] md:text-7xl">
              Um clube com missão, visão e valores.
            </h2>

            <div className="mt-10 grid gap-8 text-base leading-8 text-zinc-600 md:grid-cols-2">
              <p>
                A estrutura do GDR Boavista trabalha para promover a formação,
                a integração global dos atletas e o desenvolvimento humano e
                desportivo de todos os que fazem parte do clube.
              </p>

              <p>
                O objetivo é criar um percurso sólido, organizado e positivo,
                onde cada atleta possa competir, crescer e representar o clube
                com orgulho.
              </p>
            </div>
          </div>

          <div className="mt-16 grid gap-0 overflow-hidden rounded-sm bg-[#24180f] text-white md:grid-cols-3">
            {timeline.map((item, index) => {
              const Icon = item.icon;

              return (
                <article
                  key={item.title}
                  className={`p-10 text-center ${
                    index !== timeline.length - 1
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
          <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.45em] text-red-700">
                Missão
              </p>

              <h2 className="mt-5 font-serif text-5xl font-light leading-tight text-[#24180f] md:text-6xl">
                Formar, integrar e preparar.
              </h2>
            </div>

            <div className="rounded-sm border border-zinc-200 bg-[#f6f2ec] p-8 shadow-sm">
              <p className="text-base leading-8 text-zinc-700">
                A estrutura do Grupo Desportivo e Recreativo da Boavista visa
                promover a formação e integração global dos atletas do clube nas
                vertentes social, académica e desportiva, através das suas
                diferentes modalidades.
              </p>

              <p className="mt-6 text-base leading-8 text-zinc-700">
                Tem como principal objetivo assegurar todo o percurso evolutivo
                dos jovens desportistas, desde a sua iniciação até ao patamar
                profissional, de forma que o clube venha a competir, no futuro,
                com uma maioria de atletas oriundos da formação.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.45em] text-red-700">
                Visão
              </p>

              <h2 className="mt-5 font-serif text-5xl font-light leading-tight text-[#24180f] md:text-6xl">
                Ser referência na formação.
              </h2>
            </div>

            <div className="rounded-sm border border-zinc-200 bg-white p-8 shadow-sm">
              <p className="text-base leading-8 text-zinc-700">
                A estrutura do Grupo Desportivo e Recreativo da Boavista
                pretende constituir-se como referência na promoção e
                sensibilização da prática desportiva, de acordo com as normas e
                as boas práticas internacionais para a atividade física e
                desportiva.
              </p>

              <p className="mt-6 text-base leading-8 text-zinc-700">
                O clube procura fomentar o espírito de fair-play entre todos os
                seus agentes e implementar uma cultura de jogo, modelo formativo
                de excelência, que proporcione contextos propícios ao
                desenvolvimento de todos os seus atletas, técnicos e
                colaboradores.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#24180f] py-24 text-white">
        <div className="mx-auto max-w-7xl px-4">
          <div className="max-w-4xl">
            <p className="text-sm font-bold uppercase tracking-[0.45em] text-red-400">
              Valores
            </p>

            <h2 className="mt-8 font-serif text-5xl font-light leading-tight md:text-7xl">
              Os princípios que orientam o GDR Boavista.
            </h2>

            <p className="mt-8 max-w-2xl text-base leading-8 text-zinc-300">
              O clube defende valores de liberdade, solidariedade, justiça,
              igualdade de oportunidades, não discriminação de origem, género,
              raça, credo ou orientação sexual.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2">
            {values.map((item) => (
              <article
                key={item.title}
                className="rounded-sm border border-white/10 bg-white/5 p-8"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-700 text-white">
                  <ShieldCheck size={22} />
                </div>

                <h3 className="mt-6 font-serif text-3xl font-light">
                  {item.title}
                </h3>

                <p className="mt-4 text-sm leading-7 text-zinc-400">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-4">
          <div className="rounded-sm border border-zinc-200 bg-[#f6f2ec] p-10 shadow-sm md:p-14">
            <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.45em] text-red-700">
                  GDR Boavista
                </p>

                <h2 className="mt-5 font-serif text-5xl font-light leading-tight text-[#24180f]">
                  Uma identidade construída todos os dias.
                </h2>

                <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-600">
                  A missão, visão e valores do clube são a base do trabalho com
                  atletas, equipas técnicas, famílias, sócios e comunidade.
                </p>
              </div>

              <Link
                to="/socios"
                className="inline-flex items-center justify-center rounded-md bg-red-700 px-6 py-4 text-sm font-black uppercase tracking-wide text-white transition hover:bg-[#24180f]"
              >
                Apoiar o clube
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}