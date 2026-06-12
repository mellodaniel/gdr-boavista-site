import { useEffect, useState } from 'react';
import {
  Activity,
  Mail,
  Newspaper,
  ShieldCheck,
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

export function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    memberRequests: 0,
    contactRequests: 0,
    publishedNews: 0,
    activeTeams: 0,
    activeSponsors: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      setLoading(true);

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

      setLoading(false);
    }

    loadStats();
  }, []);

  const cards = [
    {
      title: 'Pedidos de sócio',
      value: stats.memberRequests,
      description: 'Novos pedidos recebidos pelo formulário',
      icon: Users,
    },
    {
      title: 'Contactos',
      value: stats.contactRequests,
      description: 'Mensagens enviadas pelo formulário de contacto',
      icon: Mail,
    },
    {
      title: 'Notícias publicadas',
      value: stats.publishedNews,
      description: 'Notícias visíveis no site público',
      icon: Newspaper,
    },
    {
      title: 'Equipas ativas',
      value: stats.activeTeams,
      description: 'Escalões e equipas cadastradas',
      icon: Trophy,
    },
    {
      title: 'Patrocinadores ativos',
      value: stats.activeSponsors,
      description: 'Parceiros visíveis no site',
      icon: ShieldCheck,
    },
    {
      title: 'Estado do site',
      value: 'OK',
      description: 'Monitorização simples do website',
      icon: Activity,
    },
  ];

  return (
    <div>
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-red-600">
          Dashboard
        </p>

        <h2 className="mt-2 text-3xl font-black text-zinc-950">
          Visão geral do clube
        </h2>

        <p className="mt-3 max-w-3xl text-zinc-600">
          Nesta área será possível gerir conteúdos, notícias, equipas, sócios,
          patrocinadores, contactos e integrações do website.
        </p>
      </div>

      {loading ? (
        <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-8 text-zinc-600">
          A carregar dados do dashboard...
        </div>
      ) : (
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;

            return (
              <article
                key={card.title}
                className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="rounded-2xl bg-red-100 p-3 text-red-600">
                    <Icon size={24} />
                  </div>

                  <p className="text-3xl font-black">{card.value}</p>
                </div>

                <h3 className="mt-5 text-xl font-black">{card.title}</h3>
                <p className="mt-2 text-sm text-zinc-600">{card.description}</p>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}