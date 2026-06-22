import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { TournamentManagerTournament } from '../types/tournamentManager';

export default function PublicTournamentPage() {
  const { slug } = useParams();

  const [tournament, setTournament] = useState<TournamentManagerTournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function loadTournament() {
      if (!slug) return;

      setLoading(true);
      setErrorMessage('');

      const { data, error } = await supabase.from('tournaments').select('*').eq('slug', slug).single();

      if (error) {
        setErrorMessage('Torneio não encontrado.');
        setLoading(false);
        return;
      }

      setTournament(data);
      setLoading(false);
    }

    loadTournament();
  }, [slug]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-16">
        <div className="mx-auto max-w-5xl text-slate-600">A carregar torneio...</div>
      </main>
    );
  }

  if (errorMessage || !tournament) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-16">
        <div className="mx-auto max-w-5xl rounded-2xl bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Torneio não encontrado</h1>
          <p className="mt-2 text-slate-600">O torneio que procuras não existe ou foi removido.</p>
          <Link to="/" className="mt-6 inline-flex rounded-xl bg-green-700 px-5 py-3 text-sm font-semibold text-white hover:bg-green-800">
            Voltar ao site
          </Link>
        </div>
      </main>
    );
  }

  if (!tournament.is_public) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-16">
        <div className="mx-auto max-w-5xl rounded-2xl bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-green-700">Gestor de Torneios Boavista</p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">{tournament.name}</h1>
          <p className="mt-4 text-slate-600">Este torneio ainda não está publicado.</p>
          <Link to="/" className="mt-6 inline-flex rounded-xl bg-green-700 px-5 py-3 text-sm font-semibold text-white hover:bg-green-800">
            Voltar ao site
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="bg-green-800 px-6 py-16 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-green-100">GDR Boavista</p>
          <h1 className="mt-3 text-4xl font-bold md:text-5xl">{tournament.name}</h1>

          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            {tournament.age_group && <span className="rounded-full bg-white/15 px-4 py-2">{tournament.age_group}</span>}
            {tournament.football_type && <span className="rounded-full bg-white/15 px-4 py-2">{tournament.football_type}</span>}
            {tournament.location && <span className="rounded-full bg-white/15 px-4 py-2">{tournament.location}</span>}
          </div>
        </div>
      </section>

      <section className="px-6 py-12">
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 shadow-sm md:col-span-2">
            <h2 className="text-2xl font-bold text-slate-900">Informação do torneio</h2>
            <p className="mt-4 whitespace-pre-line text-slate-600">
              {tournament.description || 'Informação do torneio em breve.'}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Contactos</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <p><strong className="text-slate-900">Local:</strong> {tournament.location || '-'}</p>
              <p><strong className="text-slate-900">Morada:</strong> {tournament.address || '-'}</p>
              <p><strong className="text-slate-900">Telefone:</strong> {tournament.contact_phone || '-'}</p>
              <p><strong className="text-slate-900">Email:</strong> {tournament.contact_email || '-'}</p>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-6 grid max-w-6xl gap-6 md:grid-cols-3">
          <PlaceholderCard title="Equipas" text="As equipas participantes serão apresentadas aqui." />
          <PlaceholderCard title="Calendário" text="Os jogos e horários serão apresentados aqui." />
          <PlaceholderCard title="Classificação" text="A classificação será atualizada durante o torneio." />
        </div>
      </section>
    </main>
  );
}

function PlaceholderCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <h3 className="text-xl font-bold text-slate-900">{title}</h3>
      <p className="mt-3 text-sm text-slate-600">{text}</p>
    </div>
  );
}
