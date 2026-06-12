export function GalleryPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16">
      <p className="text-sm font-bold uppercase tracking-[0.25em] text-red-600">
        Galeria
      </p>

      <h1 className="mt-3 text-4xl font-black">Fotos e vídeos</h1>

      <p className="mt-4 max-w-3xl text-zinc-600">
        Galeria de equipas, jogos, eventos, torneios e momentos históricos do
        GDR Boavista.
      </p>

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {['Seniores', 'Formação', 'Eventos'].map((album) => (
          <article
            key={album}
            className="flex h-56 items-end rounded-3xl bg-zinc-950 p-6 text-white"
          >
            <h2 className="text-2xl font-black">{album}</h2>
          </article>
        ))}
      </div>
    </section>
  );
}