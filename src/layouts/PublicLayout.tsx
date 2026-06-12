import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Mail, Menu, Phone } from 'lucide-react';

const navigation = [
  { label: 'Início', path: '/' },
  { label: 'Clube', path: '/clube' },
  { label: 'Equipas', path: '/equipas' },
  { label: 'Notícias', path: '/noticias' },
  { label: 'Sócios', path: '/socios' },
  { label: 'Galeria', path: '/galeria' },
  { label: 'Patrocinadores', path: '/patrocinadores' },
  { label: 'Contactos', path: '/contactos' },
];

function InstagramIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="4"
        y="4"
        width="16"
        height="16"
        rx="5"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle
        cx="12"
        cy="12"
        r="3.5"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="17" cy="7" r="1.2" fill="currentColor" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M14.5 8.5V7.2c0-.6.4-1 1-1H18V3h-3.1C11.8 3 10 4.8 10 7.6v.9H7.5V12H10v9h4.1v-9h3.1l.5-3.5h-3.2Z" />
    </svg>
  );
}

export function PublicLayout() {
  const [isOpen, setIsOpen] = useState(false);

  const navClass = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? 'text-red-600 font-semibold'
      : 'text-zinc-700 hover:text-red-600 transition-colors';

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/logo-gdr-boavista-header-256.png"
              alt="GDR Boavista"
              className="h-16 w-16 object-contain"
            />

            <div>
              <p className="text-lg font-black uppercase leading-tight">
                GDR Boavista
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-5 text-sm lg:flex">
            {navigation.map((item) => (
              <NavLink key={item.path} to={item.path} className={navClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <a
              href="https://www.instagram.com/gdr_boavista_oficial/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 text-zinc-700 transition hover:border-red-600 hover:bg-red-600 hover:text-white"
              aria-label="Instagram do GDR Boavista"
              title="Instagram"
            >
              <InstagramIcon />
            </a>

            <a
              href="https://www.facebook.com/G.D.R.BoaVista"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 text-zinc-700 transition hover:border-red-600 hover:bg-red-600 hover:text-white"
              aria-label="Facebook do GDR Boavista"
              title="Facebook"
            >
              <FacebookIcon />
            </a>

            <Link
              to="/admin/login"
              className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
            >
              Admin
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen((value) => !value)}
            className="rounded-lg border border-zinc-200 p-2 lg:hidden"
            aria-label="Abrir menu"
          >
            <Menu size={22} />
          </button>
        </div>

        {isOpen && (
          <div className="border-t border-zinc-200 bg-white px-4 py-4 lg:hidden">
            <nav className="flex flex-col gap-3 text-sm">
              {navigation.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={navClass}
                  onClick={() => setIsOpen(false)}
                >
                  {item.label}
                </NavLink>
              ))}

              <div className="mt-2 flex gap-2">
                <a
                  href="https://www.instagram.com/gdr_boavista_oficial/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-700 hover:border-red-600 hover:bg-red-600 hover:text-white"
                >
                  <InstagramIcon />
                  Instagram
                </a>

                <a
                  href="https://www.facebook.com/G.D.R.BoaVista"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-700 hover:border-red-600 hover:bg-red-600 hover:text-white"
                >
                  <FacebookIcon />
                  Facebook
                </a>
              </div>

              <Link
                to="/admin/login"
                onClick={() => setIsOpen(false)}
                className="mt-2 rounded-lg bg-zinc-950 px-4 py-2 text-center text-sm font-semibold text-white"
              >
                Admin
              </Link>
            </nav>
          </div>
        )}
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="relative overflow-hidden border-t border-zinc-800 bg-zinc-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(220,38,38,0.18),transparent_32%)]" />

        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white p-2 shadow-xl">
                <img
                  src="/logo-gdr-boavista-header-256.png"
                  alt="GDR Boavista"
                  className="h-full w-full object-contain"
                />
              </div>

              <div>
                <p className="text-2xl font-black uppercase">GDR Boavista</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.28em] text-red-500">
                  Grupo Desportivo Recreativo Boavista
                </p>
              </div>
            </div>

            <p className="mt-5 max-w-xl text-sm leading-6 text-zinc-300">
              Formação, paixão e comunidade dentro e fora de campo. Um clube
              feito de atletas, famílias, sócios, treinadores, patrocinadores e
              todos os que vivem o Boavista com orgulho.
            </p>
          </div>

          <div>
            <p className="font-bold">Contactos</p>

            <div className="mt-4 space-y-3 text-sm text-zinc-300">
              <p className="flex items-center gap-2">
                <Phone size={16} className="text-red-500" />
                913 030 249 / 912 242 196
              </p>

              <p className="flex items-center gap-2">
                <Mail size={16} className="text-red-500" />
                socios.gdrboavista@gmail.com
              </p>
            </div>
          </div>

          <div>
            <p className="font-bold">Redes sociais</p>

            <div className="mt-4 flex flex-col gap-3 text-sm text-zinc-300">
              <a
                href="https://www.instagram.com/gdr_boavista_oficial/"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 hover:text-red-500"
              >
                <InstagramIcon />
                Instagram
              </a>

              <a
                href="https://www.facebook.com/G.D.R.BoaVista"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 hover:text-red-500"
              >
                <FacebookIcon />
                Facebook
              </a>
            </div>
          </div>
        </div>

        <div className="relative border-t border-white/10 px-4 py-4 text-center text-xs text-zinc-400">
          © {new Date().getFullYear()} GDR Boavista. Todos os direitos
          reservados.
        </div>
      </footer>
    </div>
  );
}