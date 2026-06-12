import { useEffect, useState } from 'react';
import { ExternalLink, Handshake } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { GdrbSponsor } from '../../types/database';

export function SponsorsPage() {
  const [sponsors, setSponsors] = useState<GdrbSponsor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSponsors() {
      const { data, error } = await supabase
        .from('gdrb_sponsors')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Erro ao carregar patrocinadores:', error);
      }

      setSponsors(data ?? []);
      setLoading(false);
    }

    loadSponsors();
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-4 py-16">
      <p className="text-sm font-bold uppercase tracking-[0.25em] text-red-600">
        Patrocinadores
      </p>

      <h1 className="mt-3 text-4xl font-black">Apoiam o GDR Boavista</h1>

      <p className="mt-4 max-w-3xl text-zinc-600">
        Esta página é dedicada aos parceiros e patrocinadores que ajudam o clube
        a crescer e a desenvolver o futebol na comunidade.
      </p>

      {loading ? (
        <div className="mt-10 rounded-3xl border border-zinc-200 bg-white p-8 text-zinc-600">
          A carregar patrocinadores...
        </div>
      ) : sponsors.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-zinc-200 bg-white p-8 text-zinc-600">
          Ainda não existem patrocinadores ativos.
        </div>
      ) : (
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {sponsors.map((sponsor) => (
            <article
              key={sponsor.id}
              className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex h-32 items-center justify-center rounded-2xl bg-zinc-100 p-4">
                {sponsor.logo_url ? (
                  <img
                    src={sponsor.logo_url}
                    alt={sponsor.name}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <Handshake size={42} className="text-red-600" />
                )}
              </div>

              <span className="mt-5 inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-bold uppercase text-red-700">
                {sponsor.sponsor_level}
              </span>

              <h2 className="mt-4 text-xl font-black">{sponsor.name}</h2>

              {sponsor.description && (
                <p className="mt-3 text-sm text-zinc-600">
                  {sponsor.description}
                </p>
              )}

              {sponsor.website_url && (
                <a
                  href={sponsor.website_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-red-600 hover:text-red-700"
                >
                  <ExternalLink size={15} />
                  Visitar website
                </a>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}