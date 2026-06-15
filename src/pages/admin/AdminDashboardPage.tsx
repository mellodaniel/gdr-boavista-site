import { useEffect, useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  Mail,
  Newspaper,
  Shield,
  Trophy,
  Users,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

type DashboardStats = {
  memberRequests: number;
  contactRequests: number;
  publishedNews: number;
  activeTeams: number;
  activeSponsors: number;
};

const initialStats: DashboardStats = {
  memberRequests: 0,
  contactRequests: 0,
  publishedNews: 0,
  activeTeams: 0,
  activeSponsors: 0,
};

const cards = [
  {
    key: 'memberRequests',
    label: 'Pedidos de sócio',
    description: 'Registos recebidos pelo formulário de sócios',
    icon: Users,
  },
  {
    key: 'contactRequests',
    label: 'Contactos',
    description: 'Mensagens recebidas pelo formulário de contacto',
    icon: Mail,
  },
  {
    key: 'publishedNews',
    label: 'Notícias publicadas',
    description: 'Conteúdos visíveis na área pública de notícias',
    icon: Newspaper,
  },
  {
    key: 'activeTeams',
    label: 'Equipas ativas',
    description: 'Escalões visíveis na página pública de equipas',
    icon: Trophy,
  },
  {
    key: 'activeSponsors',
    label: 'Patrocinadores ativos',
    description: 'Parceiros visíveis na página pública de patrocinadores',
    icon: Shield,
  },
] as const;

export function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      setIsLoading(true);

      const [
        memberRequestsResult,
        contactRequestsResult,
        publishedNewsResult,
        activeTeamsResult,
        activeSponsorsResult,
      ] = await Promise.all([
        supabase
          .from('gdrb_member_requests')
          .select('*', { count: 'exact', head: true }),
        supabase
          .from('gdrb_contact_requests')
          .select('*', { count: 'exact', head: true }),
        supabase
          .from('gdrb_news')
          .select('*', { count: 'exact', head: true })
          .eq('is_published', true),
        supabase
          .from('gdrb_teams')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true),
        supabase
          .from('gdrb_sponsors')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true),
      ]);

      setStats({
        memberRequests: memberRequestsResult.count ?? 0,
        contactRequests: contactRequestsResult.count ?? 0,
        publishedNews: publishedNewsResult.count ?? 0,
        activeTeams: activeTeamsResult.count ?? 0,
        activeSponsors: activeSponsorsResult.count ?? 0,
      });

      setIsLoading(false);
    }

    loadStats();
  }, []);

  return (
    <div>
      <section className="relative overflow-hidden rounded-sm bg-[#24180f] p-8 text-white shadow-2xl shadow-zinc-950/10 md:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_right,rgba(220,38,38,0.28),transparent_34%)]" />

        <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.45em] text-red-400">
              Painel de administração
            </p>

            <h1 className="mt-6 font-serif text-5xl font-light leading-tight md:text-7xl">
              Gestão do site
              <br />
              GDR Boavista.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-300">
              Aqui podes acompanhar os principais dados recebidos pelo site e
              gerir conteúdos, jogos, equipas, notícias, sócios, contactos e
              patrocinadores.
            </p>
          </div>

          <div className="rounded-sm border border-white/10 bg-white/10 p-6 text-center backdrop-blur">
            <CheckCircle2 className="mx-auto text-red-400" size={32} />
            <p className="mt-4 font-serif text-3xl font-light">Online</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-[0.25em] text-zinc-400">
              Estado do site
            </p>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          const value = stats[card.key];

          return (
            <article
              key={card.key}
              className="group overflow-hidden rounded-sm border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="h-1.5 bg-red-700" />

              <div className="p-7">
                <div className="flex items-start justify-between gap-5">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-700">
                    <Icon size={25} />
                  </div>

                  <p className="font-serif text-6xl font-light leading-none text-[#24180f]">
                    {isLoading ? '...' : value}
                  </p>
                </div>

                <h2 className="mt-8 font-serif text-3xl font-light text-[#24180f]">
                  {card.label}
                </h2>

                <p className="mt-3 text-sm leading-7 text-zinc-600">
                  {card.description}
                </p>
              </div>
            </article>
          );
        })}

        <article className="group overflow-hidden rounded-sm border border-zinc-200 bg-[#24180f] text-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
          <div className="h-1.5 bg-red-700" />

          <div className="p-7">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-red-400">
              <BarChart3 size={25} />
            </div>

            <h2 className="mt-8 font-serif text-3xl font-light">
              Organização
            </h2>

            <p className="mt-3 text-sm leading-7 text-zinc-400">
              Mantém o site atualizado com jogos, notícias, resultados,
              patrocinadores e pedidos recebidos.
            </p>
          </div>
        </article>
      </section>

      <section className="mt-8 rounded-sm border border-zinc-200 bg-white p-7 shadow-sm">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.35em] text-red-700">
              Próximos passos
            </p>

            <h2 className="mt-5 font-serif text-4xl font-light text-[#24180f]">
              Manter o site vivo.
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-sm bg-[#f6f2ec] p-5">
              <p className="font-bold text-[#24180f]">Atualizar jogos</p>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                Registar jogos da semana e resultados terminados.
              </p>
            </div>

            <div className="rounded-sm bg-[#f6f2ec] p-5">
              <p className="font-bold text-[#24180f]">Publicar notícias</p>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                Manter a comunidade informada com novidades do clube.
              </p>
            </div>

            <div className="rounded-sm bg-[#f6f2ec] p-5">
              <p className="font-bold text-[#24180f]">Gerir sócios</p>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                Acompanhar pedidos recebidos pelo formulário público.
              </p>
            </div>

            <div className="rounded-sm bg-[#f6f2ec] p-5">
              <p className="font-bold text-[#24180f]">Valorizar parceiros</p>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                Atualizar patrocinadores e respetiva informação pública.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}