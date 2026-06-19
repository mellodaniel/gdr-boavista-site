import { useEffect, useState } from "react";
import { ExternalLink, Handshake, ShieldCheck, Trophy } from "lucide-react";
import { supabase } from "../../lib/supabase";
import type { GdrbSponsor } from "../../types/database";

export function SponsorsPage() {
  const [sponsors, setSponsors] = useState<GdrbSponsor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSponsors() {
      setIsLoading(true);

      const { data, error } = await supabase
        .from("gdrb_sponsors")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (error) {
        console.error("Erro ao carregar parceiros:", error);
      }

      setSponsors(data ?? []);
      setIsLoading(false);
    }

    loadSponsors();
  }, []);

  return (
    <div className="bg-[#f6f2ec] text-zinc-950">
      <section className="relative overflow-hidden bg-[#24180f] py-24 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_right,rgba(220,38,38,0.28),transparent_34%)]" />

        <div className="relative mx-auto max-w-7xl px-4">
          <div className="max-w-4xl">
            <p className="text-sm font-bold uppercase tracking-[0.45em] text-red-400">
              Parceiros e Apoios
            </p>

            <h1 className="mt-8 font-serif text-6xl font-light leading-[0.95] tracking-tight md:text-8xl">
              Parceiros que
              <br />
              caminham connosco.
            </h1>

            <p className="mt-8 max-w-2xl text-lg leading-8 text-zinc-300">
              O apoio das marcas, empresas e entidades parceiras é essencial
              para fortalecer a formação, melhorar condições e ajudar o GDR
              Boavista a crescer.
            </p>
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mx-auto max-w-4xl">
            <p className="text-sm font-bold uppercase tracking-[0.45em] text-red-700">
              Apoio ao clube
            </p>

            <h2 className="mt-8 font-serif text-5xl font-light leading-tight text-[#24180f] md:text-7xl">
              Valorizar quem acredita no Boavista.
            </h2>

            <div className="mt-10 grid gap-8 text-base leading-8 text-zinc-600 md:grid-cols-2">
              <p>
                Cada apoio ajuda o clube a criar melhores condições para os
                atletas, equipas técnicas, famílias e comunidade.
              </p>

              <p>
                As nossas marcas parceiras fazem parte da construção diária do
                projeto desportivo e social do GDR Boavista.
              </p>
            </div>
          </div>

          <div className="mt-16 grid gap-0 overflow-hidden rounded-sm bg-[#24180f] text-white md:grid-cols-3">
            <article className="border-b border-white/10 p-10 text-center md:border-b-0 md:border-r">
              <Handshake className="mx-auto text-red-500" size={30} />
              <h3 className="mt-6 font-serif text-2xl font-light">Parceria</h3>
              <p className="mt-4 text-sm uppercase leading-6 tracking-[0.12em] text-zinc-400">
                Relações próximas com empresas e entidades que apoiam o clube.
              </p>
            </article>

            <article className="border-b border-white/10 p-10 text-center md:border-b-0 md:border-r">
              <ShieldCheck className="mx-auto text-red-500" size={30} />
              <h3 className="mt-6 font-serif text-2xl font-light">Confiança</h3>
              <p className="mt-4 text-sm uppercase leading-6 tracking-[0.12em] text-zinc-400">
                Apoio com impacto direto na organização e evolução do Boavista.
              </p>
            </article>

            <article className="p-10 text-center">
              <Trophy className="mx-auto text-red-500" size={30} />
              <h3 className="mt-6 font-serif text-2xl font-light">Formação</h3>
              <p className="mt-4 text-sm uppercase leading-6 tracking-[0.12em] text-zinc-400">
                Contributo importante para o crescimento dos jovens atletas.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.45em] text-red-700">
                Parceiros
              </p>

              <h2 className="mt-5 font-serif text-5xl font-light text-[#24180f] md:text-6xl">
                Os nossos parceiros
              </h2>

              <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-600">
                Marcas, empresas e entidades que apoiam o GDR Boavista e ajudam
                o clube a crescer dentro e fora de campo.
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="mt-10 rounded-sm border border-zinc-200 bg-[#f6f2ec] p-8 text-zinc-600">
              A carregar parceiros...
            </div>
          ) : sponsors.length === 0 ? (
            <div className="mt-10 rounded-sm border border-dashed border-zinc-300 bg-[#f6f2ec] p-10 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-700">
                <Handshake size={28} />
              </div>

              <h3 className="mt-5 font-serif text-3xl font-light text-[#24180f]">
                Parceiros em atualização
              </h3>

              <p className="mt-3 text-zinc-500">
                Em breve serão apresentados aqui os parceiros do GDR Boavista.
              </p>
            </div>
          ) : (
            <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {sponsors.map((sponsor) => (
                <article
                  key={sponsor.id}
                  className="group overflow-hidden rounded-sm border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="h-1.5 bg-red-700" />

                  <div className="flex min-h-[180px] items-center justify-center bg-[#f6f2ec] p-8">
                    {sponsor.logo_url ? (
                      <img
                        src={sponsor.logo_url}
                        alt={sponsor.name}
                        className="max-h-28 max-w-full object-contain transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#24180f] text-red-500">
                        <Handshake size={38} />
                      </div>
                    )}
                  </div>

                  <div className="p-7">
                    <h3 className="font-serif text-4xl font-light leading-tight text-[#24180f]">
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
                        className="mt-7 inline-flex items-center gap-2 rounded-md bg-[#24180f] px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700"
                      >
                        Visitar parceiro
                        <ExternalLink size={16} />
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="bg-red-700 py-20 text-white">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 px-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.35em] text-red-200">
              Apoiar o Boavista
            </p>

            <h2 className="mt-4 font-serif text-5xl font-light">
              A sua marca também pode fazer parte desta história.
            </h2>
          </div>

          <p className="max-w-md text-sm leading-7 text-red-100">
            O apoio de empresas e entidades locais ajuda o clube a criar
            melhores condições para todos os escalões.
          </p>
        </div>
      </section>
    </div>
  );
}
