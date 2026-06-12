export function ClubPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16">
      <p className="text-sm font-bold uppercase tracking-[0.25em] text-red-600">
        O clube
      </p>

      <h1 className="mt-3 text-4xl font-black">GDR Boavista</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-3xl bg-zinc-950 p-8 text-white">
          <h2 className="text-2xl font-black">Formação, paixão e comunidade</h2>
          <p className="mt-4 text-zinc-300">
            O GDR Boavista é um clube de futebol de Leiria, ligado à formação,
            à comunidade e ao desenvolvimento dos atletas dentro e fora de campo.
          </p>
        </div>

        <div className="space-y-6 text-zinc-700">
          <p>
            Esta página será gerida pela área administrativa e poderá incluir a
            história do clube, missão, valores, direção, infraestruturas e
            documentos úteis.
          </p>

          <p>
            O objetivo é dar ao clube uma presença digital mais moderna,
            profissional e preparada para comunicar com sócios, atletas, pais,
            patrocinadores e comunidade.
          </p>
        </div>
      </div>
    </section>
  );
}