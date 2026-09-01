import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  LineChart,
  Image,
  LogOut,
  Menu,
  Mail,
  MessageCircle,
  Newspaper,
  Shield,
  ShoppingBag,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

type AdminNavigationItem = {
  label: string;
  path: string;
  icon: typeof BarChart3;
};

type AdminNavigationGroup = {
  id: string;
  label: string;
  icon: typeof BarChart3;
  items: AdminNavigationItem[];
};

const topAdminNavigation: AdminNavigationItem[] = [
  { label: 'Dashboard', path: '/admin', icon: BarChart3 },
  { label: 'Analytics', path: '/admin/analytics', icon: LineChart },
];

const adminNavigationGroups: AdminNavigationGroup[] = [
  {
    id: 'conteudo',
    label: 'Conteúdo',
    icon: Newspaper,
    items: [
      { label: 'Notícias', path: '/admin/noticias', icon: Newspaper },
      { label: 'Publicações Facebook', path: '/admin/facebook', icon: MessageCircle },
      { label: 'Galeria', path: '/admin/galeria', icon: Image },
      { label: 'Parceiros', path: '/admin/patrocinadores', icon: Shield },
    ],
  },
  {
    id: 'futebol',
    label: 'Futebol',
    icon: Trophy,
    items: [
      { label: 'Equipas', path: '/admin/equipas', icon: Trophy },
      { label: 'Plantel Sénior', path: '/admin/equipas/seniores/plantel', icon: Users },
      { label: 'Jogos / Agenda', path: '/admin/jogos', icon: CalendarDays },
      { label: 'Participações em Torneios', path: '/admin/torneios', icon: Trophy },
      { label: 'Torneios do Clube', path: '/admin/gestor-torneios', icon: CalendarDays },
    ],
  },
  {
    id: 'comunidade',
    label: 'Comunidade',
    icon: Users,
    items: [
      { label: 'Sócios', path: '/admin/socios', icon: Users },
      { label: 'Contactos', path: '/admin/contactos', icon: Mail },
      { label: 'Subscritores', path: '/admin/subscritores', icon: Mail },
      { label: 'Comunicações', path: '/admin/comunicacoes', icon: Mail },
      { label: 'Importar Contactos', path: '/admin/importar-contactos', icon: Users },
    ],
  },
  {
    id: 'loja',
    label: 'Loja',
    icon: ShoppingBag,
    items: [
      { label: 'Produtos e Pedidos', path: '/admin/loja', icon: ShoppingBag },
    ],
  },
];

const fullAdminNavigation: AdminNavigationItem[] = [
  ...topAdminNavigation,
  ...adminNavigationGroups.flatMap((group) => group.items),
];

const tournamentManagerNavigation: AdminNavigationItem[] = [
  { label: 'Gestão de Torneios Boavista', path: '/admin/gestor-torneios', icon: CalendarDays },
];

function getResultsNavigation(tournamentId: string): AdminNavigationItem[] {
  return [
    { label: 'Lançar resultados', path: `/admin/resultados-torneio/${tournamentId}`, icon: Trophy },
  ];
}

type ResultAccess = {
  tournament_id: string;
};

function isTournamentManagerUser(email?: string | null) {
  if (!email) return false;

  const normalizedEmail = email.trim().toLowerCase();
  const username = normalizedEmail.split('@')[0];

  return username === 'torneios';
}

function isAdminItemActive(pathname: string, itemPath: string) {
  if (itemPath === '/admin') return pathname === '/admin';
  if (itemPath === '/admin/equipas') return pathname === '/admin/equipas';
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}

function getActiveAdminGroupId(pathname: string) {
  return adminNavigationGroups.find((group) =>
    group.items.some((item) => isAdminItemActive(pathname, item.path)),
  )?.id;
}

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [resultAccess, setResultAccess] = useState<ResultAccess | null>(null);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);
  const [openAdminGroups, setOpenAdminGroups] = useState<string[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadUser(sessionEmail?: string | null) {
      const email = sessionEmail?.trim().toLowerCase() ?? null;
      let access: ResultAccess | null = null;

      if (email && !isTournamentManagerUser(email)) {
        const { data, error } = await supabase
          .from('tournament_result_access')
          .select('tournament_id')
          .eq('user_email', email)
          .eq('is_active', true)
          .limit(1);

        if (!error && data && data.length > 0) {
          access = data[0] as ResultAccess;
        }
      }

      if (isMounted) {
        setUserEmail(email);
        setResultAccess(access);
        setIsLoadingPermissions(false);
      }
    }

    async function loadInitialUser() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      await loadUser(session?.user.email ?? null);
    }

    loadInitialUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoadingPermissions(true);
      void loadUser(session?.user.email ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const activeAdminGroupId = getActiveAdminGroupId(location.pathname);

  useEffect(() => {
    if (!activeAdminGroupId) return;

    setOpenAdminGroups((currentGroups) => {
      if (currentGroups.includes(activeAdminGroupId)) return currentGroups;
      return [...currentGroups, activeAdminGroupId];
    });
  }, [activeAdminGroupId]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  function toggleAdminGroup(groupId: string) {
    setOpenAdminGroups((currentGroups) =>
      currentGroups.includes(groupId)
        ? currentGroups.filter((currentGroup) => currentGroup !== groupId)
        : [...currentGroups, groupId],
    );
  }

  const isTournamentManager = isTournamentManagerUser(userEmail);
  const isResultsUser = Boolean(resultAccess);

  const adminNavigation = useMemo(() => {
    if (isLoadingPermissions) return [];
    if (resultAccess) return getResultsNavigation(resultAccess.tournament_id);
    return isTournamentManager ? tournamentManagerNavigation : fullAdminNavigation;
  }, [isLoadingPermissions, isTournamentManager, resultAccess]);

  const homePath = resultAccess
    ? `/admin/resultados-torneio/${resultAccess.tournament_id}`
    : isTournamentManager
      ? '/admin/gestor-torneios'
      : '/admin';

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate('/admin/login');
  }

  return (
    <div className="min-h-screen bg-[#f6f2ec] text-zinc-950">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-80 border-r border-zinc-200 bg-[#24180f] text-white lg:block">
        <div className="flex h-full flex-col">
          <div className="border-b border-white/10 p-7">
            <Link to={homePath} className="flex items-center gap-4">
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

              {!isLoadingPermissions && !isResultsUser && !isTournamentManager && (
                <>
                  {topAdminNavigation.map((item) => {
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

                  <div className="my-3 border-t border-white/10" />

                  {adminNavigationGroups.map((group) => {
                    const GroupIcon = group.icon;
                    const isOpen = openAdminGroups.includes(group.id);
                    const isActiveGroup = activeAdminGroupId === group.id;

                    return (
                      <div key={group.id} className="rounded-lg">
                        <button
                          type="button"
                          onClick={() => toggleAdminGroup(group.id)}
                          className={`flex w-full items-center justify-between rounded-md px-4 py-3 text-sm font-black uppercase tracking-[0.16em] transition ${
                            isActiveGroup
                              ? 'bg-white/10 text-white'
                              : 'text-zinc-400 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <span className="flex items-center gap-3">
                            <GroupIcon size={17} />
                            {group.label}
                          </span>

                          <ChevronDown
                            size={17}
                            className={`transition ${isOpen ? 'rotate-180' : ''}`}
                          />
                        </button>

                        {isOpen && (
                          <div className="mt-1 grid gap-1 border-l border-white/10 pl-3">
                            {group.items.map((item) => {
                              const Icon = item.icon;

                              return (
                                <NavLink
                                  key={item.path}
                                  to={item.path}
                                  end={item.path === '/admin' || item.path === '/admin/equipas'}
                                  className={({ isActive }) =>
                                    `group flex items-center gap-3 rounded-md px-4 py-2.5 text-sm font-bold transition ${
                                      isActive
                                        ? 'bg-red-700 text-white shadow-lg shadow-red-950/20'
                                        : 'text-zinc-300 hover:bg-white/10 hover:text-white'
                                    }`
                                  }
                                >
                                  <Icon size={16} />
                                  {item.label}
                                </NavLink>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}

              {!isLoadingPermissions && (isResultsUser || isTournamentManager) && adminNavigation.map((item) => {
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
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:h-20 lg:px-8">
            <div className="flex items-center gap-3 lg:hidden">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#24180f] text-white shadow-sm transition active:scale-95"
                aria-label="Abrir menu de administração"
              >
                <Menu size={21} />
              </button>

              <Link to={homePath} className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white p-2 shadow-sm ring-1 ring-zinc-200">
                  <img
                    src="/logo-gdr-boavista-header-256.png"
                    alt="GDR Boavista"
                    className="h-full w-full object-contain"
                  />
                </div>

                <div>
                  <p className="text-sm font-black uppercase leading-none text-[#24180f]">
                    GDR Boavista
                  </p>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-red-700">
                    Admin
                  </p>
                </div>
              </Link>
            </div>

            <div className="hidden lg:block">
              <p className="text-sm font-bold uppercase tracking-[0.35em] text-red-700">
                Administração
              </p>

              <p className="mt-1 font-serif text-3xl font-light text-[#24180f]">
                {isResultsUser ? 'Lançamento de Resultados' : isTournamentManager ? 'Gestão de Torneios' : 'Gestão do site'}
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
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-700 px-3 text-sm font-bold text-white transition hover:bg-[#24180f] lg:px-4"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          </div>

          {isMobileMenuOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <button
                type="button"
                aria-label="Fechar menu"
                className="absolute inset-0 bg-black/45 backdrop-blur-sm"
                onClick={() => setIsMobileMenuOpen(false)}
              />

              <div className="absolute inset-y-0 left-0 flex w-[88vw] max-w-sm flex-col bg-[#24180f] text-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/10 p-5">
                  <Link to={homePath} className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white p-2">
                      <img
                        src="/logo-gdr-boavista-header-256.png"
                        alt="GDR Boavista"
                        className="h-full w-full object-contain"
                      />
                    </div>

                    <div>
                      <p className="text-base font-black uppercase leading-none">GDR Boavista</p>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-red-400">
                        Administração
                      </p>
                    </div>
                  </Link>

                  <button
                    type="button"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white transition active:scale-95"
                    aria-label="Fechar menu de administração"
                  >
                    <X size={20} />
                  </button>
                </div>

                <nav className="flex-1 overflow-y-auto p-4">
                  {isLoadingPermissions && (
                    <div className="rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-zinc-400">
                      A carregar permissões...
                    </div>
                  )}

                  {!isLoadingPermissions && !isResultsUser && !isTournamentManager && (
                    <div className="grid gap-3">
                      <div className="grid gap-2">
                        {topAdminNavigation.map((item) => {
                          const Icon = item.icon;

                          return (
                            <NavLink
                              key={item.path}
                              to={item.path}
                              end={item.path === '/admin'}
                              className={({ isActive }) =>
                                `flex min-h-12 items-center gap-3 rounded-2xl px-4 text-sm font-black transition ${
                                  isActive
                                    ? 'bg-red-700 text-white shadow-lg shadow-red-950/20'
                                    : 'bg-white/5 text-zinc-200 active:bg-white/10'
                                }`
                              }
                            >
                              <Icon size={18} />
                              {item.label}
                            </NavLink>
                          );
                        })}
                      </div>

                      {adminNavigationGroups.map((group) => {
                        const GroupIcon = group.icon;
                        const isOpen = openAdminGroups.includes(group.id);
                        const isActiveGroup = activeAdminGroupId === group.id;

                        return (
                          <section key={group.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-2">
                            <button
                              type="button"
                              onClick={() => toggleAdminGroup(group.id)}
                              className={`flex min-h-12 w-full items-center justify-between rounded-xl px-3 text-sm font-black uppercase tracking-[0.14em] transition ${
                                isActiveGroup ? 'bg-white/10 text-white' : 'text-zinc-300 active:bg-white/10'
                              }`}
                            >
                              <span className="flex items-center gap-3">
                                <GroupIcon size={17} />
                                {group.label}
                              </span>

                              <ChevronDown
                                size={17}
                                className={`transition ${isOpen ? 'rotate-180' : ''}`}
                              />
                            </button>

                            {isOpen && (
                              <div className="mt-2 grid gap-1.5 border-l border-white/10 pl-2">
                                {group.items.map((item) => {
                                  const Icon = item.icon;

                                  return (
                                    <NavLink
                                      key={item.path}
                                      to={item.path}
                                      end={item.path === '/admin' || item.path === '/admin/equipas'}
                                      className={({ isActive }) =>
                                        `flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold transition ${
                                          isActive
                                            ? 'bg-red-700 text-white shadow-lg shadow-red-950/20'
                                            : 'text-zinc-300 active:bg-white/10'
                                        }`
                                      }
                                    >
                                      <Icon size={16} />
                                      {item.label}
                                    </NavLink>
                                  );
                                })}
                              </div>
                            )}
                          </section>
                        );
                      })}
                    </div>
                  )}

                  {!isLoadingPermissions && (isResultsUser || isTournamentManager) && (
                    <div className="grid gap-2">
                      {adminNavigation.map((item) => {
                        const Icon = item.icon;

                        return (
                          <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === '/admin'}
                            className={({ isActive }) =>
                              `flex min-h-12 items-center gap-3 rounded-2xl px-4 text-sm font-black transition ${
                                isActive
                                  ? 'bg-red-700 text-white shadow-lg shadow-red-950/20'
                                  : 'bg-white/5 text-zinc-200 active:bg-white/10'
                              }`
                            }
                          >
                            <Icon size={18} />
                            {item.label}
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </nav>

                <div className="border-t border-white/10 p-4">
                  <Link
                    to="/"
                    className="mb-3 flex min-h-11 items-center justify-center rounded-xl border border-white/10 px-4 text-sm font-bold text-zinc-300 transition active:bg-white/10"
                  >
                    Ver site público
                  </Link>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-black uppercase tracking-wide text-[#24180f] transition active:scale-[0.99]"
                  >
                    <LogOut size={17} />
                    Sair
                  </button>
                </div>
              </div>
            </div>
          )}       </header>

        <main className="mx-auto max-w-7xl px-3 py-5 sm:px-4 lg:px-8 lg:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
