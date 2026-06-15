import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  CalendarDays,
  FileText,
  Home,
  Image,
  LogOut,
  Mail,
  Menu,
  Newspaper,
  Shield,
  Trophy,
  Users,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const adminNavigation = [
  { label: 'Dashboard', path: '/admin', icon: BarChart3 },
  { label: 'Conteúdos', path: '/admin/conteudos', icon: FileText },
  { label: 'Notícias', path: '/admin/noticias', icon: Newspaper },
  { label: 'Equipas', path: '/admin/equipas', icon: Trophy },
  { label: 'Jogos / Agenda', path: '/admin/jogos', icon: CalendarDays },
  { label: 'Patrocinadores', path: '/admin/patrocinadores', icon: Shield },
  { label: 'Sócios', path: '/admin/socios', icon: Users },
  { label: 'Contactos', path: '/admin/contactos', icon: Mail },
  { label: 'Galeria', path: '/admin/galeria', icon: Image },
];

export function AdminLayout() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const navClass = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? 'flex items-center gap-3 rounded-2xl bg-red-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-red-950/20'
      : 'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-zinc-600 transition hover:bg-zinc-100 hover:text-red-600';

  async function handleLogout() {
    setIsLoggingOut(true);
    await supabase.auth.signOut();
    setIsLoggingOut(false);
    navigate('/admin/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-950">
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/admin" className="flex items-center gap-3">
            <img
              src="/logo-gdr-boavista-header-256.png"
              alt="GDR Boavista"
              className="h-12 w-12 object-contain"
            />

            <div>
              <p className="text-sm font-black uppercase">GDR Boavista</p>
              <p className="text-xs text-zinc-500">Admin</p>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setIsOpen((value) => !value)}
            className="rounded-xl border border-zinc-200 p-2"
            aria-label="Abrir menu"
          >
            <Menu size={22} />
          </button>
        </div>

        {isOpen && (
          <div className="border-t border-zinc-200 bg-white px-4 py-4">
            <nav className="flex flex-col gap-2">
              {adminNavigation.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/admin'}
                    className={navClass}
                    onClick={() => setIsOpen(false)}
                  >
                    <Icon size={18} />
                    {item.label}
                  </NavLink>
                );
              })}

              <Link
                to="/"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-zinc-600 hover:bg-zinc-100"
              >
                <Home size={18} />
                Ver site
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold text-red-600 hover:bg-red-50"
              >
                <LogOut size={18} />
                {isLoggingOut ? 'A sair...' : 'Sair'}
              </button>
            </nav>
          </div>
        )}
      </header>

      <div className="mx-auto flex max-w-[1600px]">
        <aside className="sticky top-0 hidden h-screen w-80 shrink-0 border-r border-zinc-200 bg-white p-5 lg:block">
          <Link
            to="/admin"
            className="flex items-center gap-4 rounded-3xl bg-zinc-950 p-4 text-white"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white p-2">
              <img
                src="/logo-gdr-boavista-header-256.png"
                alt="GDR Boavista"
                className="h-full w-full object-contain"
              />
            </div>

            <div>
              <p className="text-lg font-black uppercase leading-tight">
                GDR Boavista
              </p>
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-red-400">
                Admin
              </p>
            </div>
          </Link>

          <nav className="mt-6 flex flex-col gap-2">
            {adminNavigation.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/admin'}
                  className={navClass}
                >
                  <Icon size={18} />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          <div className="absolute bottom-5 left-5 right-5 space-y-2">
            <Link
              to="/"
              className="flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-bold text-zinc-700 transition hover:border-red-600 hover:text-red-600"
            >
              <Home size={18} />
              Ver site
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogOut size={18} />
              {isLoggingOut ? 'A sair...' : 'Sair'}
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}