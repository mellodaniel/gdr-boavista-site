import { NavLink, Outlet } from 'react-router-dom';
import {
  BarChart3,
  FileText,
  Handshake,
  Home,
  Image,
  LogOut,
  Mail,
  Newspaper,
  Shield,
  Trophy,
  Users,
} from 'lucide-react';

const adminNavigation = [
  { label: 'Dashboard', path: '/admin', icon: BarChart3 },
  { label: 'Conteúdos', path: '/admin/conteudos', icon: FileText },
  { label: 'Notícias', path: '/admin/noticias', icon: Newspaper },
  { label: 'Equipas', path: '/admin/equipas', icon: Trophy },
  { label: 'Patrocinadores', path: '/admin/patrocinadores', icon: Handshake },
  { label: 'Sócios', path: '/admin/socios', icon: Users },
  { label: 'Contactos', path: '/admin/contactos', icon: Mail },
  { label: 'Galeria', path: '/admin/galeria', icon: Image },
];

export function AdminLayout() {
  const navClass = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? 'flex items-center gap-3 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white'
      : 'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-zinc-300 hover:bg-white/10 hover:text-white';

  return (
    <div className="min-h-screen bg-zinc-100">
      <aside className="fixed left-0 top-0 hidden h-screen w-72 bg-zinc-950 p-5 text-white lg:block">
        <div className="flex items-center gap-3 border-b border-white/10 pb-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-xs font-black text-red-600">
            GDRB
          </div>

          <div>
            <p className="font-black uppercase">GDR Boavista</p>
            <p className="text-xs uppercase tracking-[0.25em] text-red-500">
              Admin
            </p>
          </div>
        </div>

        <nav className="mt-6 space-y-2">
          {adminNavigation.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={navClass}
                end={item.path === '/admin'}
              >
                <Icon size={18} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="absolute bottom-5 left-5 right-5 space-y-2">
          <NavLink
            to="/"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-zinc-300 hover:bg-white/10 hover:text-white"
          >
            <Home size={18} />
            Ver site
          </NavLink>

          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-zinc-300 hover:bg-white/10 hover:text-white"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="border-b border-zinc-200 bg-white px-4 py-4 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-red-600">
                <Shield size={16} />
                Área administrativa
              </p>
              <h1 className="mt-1 text-2xl font-black text-zinc-950">
                Gestão do Website
              </h1>
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}