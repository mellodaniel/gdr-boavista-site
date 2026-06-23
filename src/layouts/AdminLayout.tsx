import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  CalendarDays,
  LineChart,
  FileText,
  Image,
  LogOut,
  Mail,
  MessageCircle,
  Newspaper,
  Shield,
  Trophy,
  Users,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

type AdminNavigationItem = {
  label: string;
  path: string;
  icon: typeof BarChart3;
};

const fullAdminNavigation: AdminNavigationItem[] = [
  { label: 'Dashboard', path: '/admin', icon: BarChart3 },
  { label: 'Analytics', path: '/admin/analytics', icon: LineChart },
  { label: 'Conteúdos', path: '/admin/conteudos', icon: FileText },
  { label: 'Notícias', path: '/admin/noticias', icon: Newspaper },
  { label: 'Facebook', path: '/admin/facebook', icon: MessageCircle },
  { label: 'Equipas', path: '/admin/equipas', icon: Trophy },
  { label: 'Jogos / Agenda', path: '/admin/jogos', icon: CalendarDays },
  { label: 'Torneios', path: '/admin/torneios', icon: Trophy },
  { label: 'Gestão de Torneios Boavista', path: '/admin/gestor-torneios', icon: CalendarDays },
  { label: 'Parceiros', path: '/admin/patrocinadores', icon: Shield },
  { label: 'Sócios', path: '/admin/socios', icon: Users },
  { label: 'Contactos', path: '/admin/contactos', icon: Mail },
  { label: 'Galeria', path: '/admin/galeria', icon: Image },
];

const tournamentManagerNavigation: AdminNavigationItem[] = [
  { label: 'Gestão de Torneios Boavista', path: '/admin/gestor-torneios', icon: CalendarDays },
];

function isTournamentManagerUser(email?: string | null) {
  if (!email) return false;

  const normalizedEmail = email.trim().toLowerCase();
  const username = normalizedEmail.split('@')[0];

  return username === 'torneios';
}

export function AdminLayout() {
  const navigate = useNavigate();

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (isMounted) {
        setUserEmail(session?.user.email ?? null);
        setIsLoadingPermissions(false);
      }
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setUserEmail(session?.user.email ?? null);
        setIsLoadingPermissions(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const isTournamentManager = isTournamentManagerUser(userEmail);

  const adminNavigation = useMemo(() => {
    if (isLoadingPermissions) return [];
    return isTournamentManager ? tournamentManagerNavigation : fullAdminNavigation;
  }, [isLoadingPermissions, isTournamentManager]);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate('/admin/login');
  }

  return (
    <div className="min-h-screen bg-[#f6f2ec] text-zinc-950">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-80 border-r border-zinc-200 bg-[#24180f] text-white lg:block">
        <div className="flex h-full flex-col">
          <div className="border-b border-white/10 p-7">
            <Link to={isTournamentManager ? '/admin/gestor-torneios' : '/admin'} className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white p-2">
                <img
                  src="/logo-gdr-boavista-header-256.png"
                  alt="GDR Boavista"
                  className="h-full w-full object-contain"
                />
              </div>

              <div>
                <p className="text-xl font-black uppercase">GDR Boavista</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.25em] text-red-400">
                  Administração
                </p>
              </div>
            </Link>
          </div>

          <nav className="flex-1 overflow-y-auto p-5">
            <div className="grid gap-2">
              {isLoadingPermissions && (
                <div className="rounded-md border border-white/10 px-4 py-3 text-sm font-bold text-zinc-400">
                  A carregar permissões...
                </div>
              )}

              {adminNavigation.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/admin'}
                    className={({ isActive }) =>
                      `group flex items-center gap-3 rounded-md px-4 py-3 text-sm font-bold transition ${
                        isActive
                          ? 'bg-red-700 text-white shadow-lg shadow-red-950/20'
                          : 'text-zinc-300 hover:bg-white/10 hover:text-white'
                      }`
                    }
                  >
                    <Icon size={18} />
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
          </nav>

          <div className="border-t border-white/10 p-5">
            <Link
              to="/"
              className="mb-3 flex items-center justify-center rounded-md border border-white/10 px-4 py-3 text-sm font-bold text-zinc-300 transition hover:bg-white/10 hover:text-white"
            >
              Ver site público
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-white px-4 py-3 text-sm font-black uppercase tracking-wide text-[#24180f] transition hover:bg-red-700 hover:text-white"
            >
              <LogOut size={17} />
              Sair
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-80">
        <header className="sticky top-0 z-30 border-b border-zinc-200 bg-[#f6f2ec]/95 shadow-sm shadow-black/5 backdrop-blur-xl">
          <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 lg:px-8">
            <Link to={isTournamentManager ? '/admin/gestor-torneios' : '/admin'} className="flex items-center gap-3 lg:hidden">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white p-2 shadow-sm ring-1 ring-zinc-200">
                <img
                  src="/logo-gdr-boavista-header-256.png"
                  alt="GDR Boavista"
                  className="h-full w-full object-contain"
                />
              </div>

              <p className="text-lg font-black uppercase text-[#24180f]">
                GDR Boavista
              </p>
            </Link>

            <div className="hidden lg:block">
              <p className="text-sm font-bold uppercase tracking-[0.35em] text-red-700">
                Administração
              </p>

              <p className="mt-1 font-serif text-3xl font-light text-[#24180f]">
                {isTournamentManager ? 'Gestão de Torneios' : 'Gestão do site'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to="/"
                className="hidden rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-bold text-zinc-700 transition hover:border-red-700 hover:text-red-700 md:inline-flex"
              >
                Site público
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-md bg-red-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-[#24180f]"
              >
                <LogOut size={16} />
                Sair
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border-t border-zinc-200 px-4 py-3 lg:hidden">
            <nav className="flex min-w-max gap-2">
              {isLoadingPermissions && (
                <div className="rounded-full bg-white px-4 py-2 text-sm font-bold text-zinc-500">
                  A carregar permissões...
                </div>
              )}

              {adminNavigation.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/admin'}
                    className={({ isActive }) =>
                      `flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${
                        isActive
                          ? 'bg-[#24180f] text-white'
                          : 'bg-white text-zinc-700'
                      }`
                    }
                  >
                    <Icon size={16} />
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
