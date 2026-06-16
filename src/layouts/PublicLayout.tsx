import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Mail, Menu, Phone, X } from 'lucide-react';

const navigation = [
  { label: 'Clube', path: '/clube' },
  { label: 'Equipas', path: '/equipas' },
  { label: 'Jogos', path: '/resultados' },
  { label: 'Notícias', path: '/noticias' },
  { label: 'Sócios', path: '/socios' },
  { label: 'Galeria', path: '/galeria' },
  { label: 'Patrocinadores', path: '/patrocinadores' },
  { label: 'Contactos', path: '/contactos' },
];

function InstagramIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function FacebookIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M13.5 22v-8h2.7l.4-3.1h-3.1V8.9c0-.9.3-1.5 1.6-1.5h1.7V4.6c-.8-.1-1.6-.2-2.4-.2-2.4 0-4.1 1.5-4.1 4.2v2.3H8V14h2.8v8h2.7Z" />
    </svg>
  );
}

export function PublicLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f6f2ec] text-zinc-950">
      <header className="sticky top-0 z-50 border-b border-[#eadfd2] bg-[#f6f2ec]/95 shadow-sm shadow-black/5 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white p-2 shadow-sm ring-1 ring-zinc-200">
              <img
                src="/logo-gdr-boavista-header-256.png"
                alt="GDR Boavista"
                className="h-full w-full object-contain"
              />
            </div>

            <div>
              <p className="text-lg font-black uppercase leading-tight tracking-tight text-[#24180f]">
                GDR Boavista
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {navigation.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `rounded-full px-4 py-2 text-sm font-semibold transition ${
                    isActive
                      ? 'bg-[#24180f] text-white'
                      : 'text-zinc-600 hover:bg-white hover:text-red-700'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <NavLink
              to="/loja"
              className={({ isActive }) =>
                `inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-black uppercase tracking-wide shadow-sm transition ${
                  isActive
                    ? 'bg-[#24180f] text-white'
                    : 'bg-red-700 text-white hover:bg-[#24180f]'
                }`
              }
            >
              Loja
            </NavLink>

            <a
              href="https://www.instagram.com/gdr_boavista_oficial/"
              target="_blank"
              rel="noreferrer"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 transition hover:border-red-700 hover:text-red-700"
              aria-label="Instagram GDR Boavista"
            >
              <InstagramIcon />
            </a>

            <a
              href="https://www.facebook.com/G.D.R.BoaVista"
              target="_blank"
              rel="noreferrer"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 transition hover:border-red-700 hover:text-red-700"
              aria-label="Facebook GDR Boavista"
            >
              <FacebookIcon />
            </a>
          </div>

          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-white text-[#24180f] lg:hidden"
            aria-label="Abrir menu"
          >
            {isMenuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>

        {isMenuOpen && (
          <div className="border-t border-zinc-200 bg-[#f6f2ec] px-4 py-5 lg:hidden">
            <nav className="grid gap-2">
              {navigation.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={({ isActive }) =>
                    `rounded-2xl px-4 py-3 text-sm font-bold ${
                      isActive
                        ? 'bg-[#24180f] text-white'
                        : 'bg-white text-zinc-700'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}

              <NavLink
                to="/loja"
                onClick={() => setIsMenuOpen(false)}
                className={({ isActive }) =>
                  `rounded-2xl px-4 py-3 text-sm font-black uppercase tracking-wide ${
                    isActive
                      ? 'bg-[#24180f] text-white'
                      : 'bg-red-700 text-white'
                  }`
                }
              >
                Loja Online
              </NavLink>
            </nav>
          </div>
        )}
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="bg-[#24180f] text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 lg:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white p-2">
                <img
                  src="/logo-gdr-boavista-header-256.png"
                  alt="GDR Boavista"
                  className="h-full w-full object-contain"
                />
              </div>

              <div>
                <p className="text-2xl font-black uppercase">GDR Boavista</p>
                <p className="mt-1 text-xs font-black uppercase tracking-[0.28em] text-red-400">
                  Leiria · Futebol · Formação
                </p>
              </div>
            </div>

            <p className="mt-6 max-w-md text-sm leading-7 text-zinc-400">
              Clube de formação, competição e comunidade. Uma casa feita por
              atletas, famílias, sócios, treinadores, patrocinadores e amigos.
            </p>
          </div>

          <div>
            <h3 className="font-serif text-2xl font-light">Contactos</h3>

            <div className="mt-5 grid gap-3 text-sm text-zinc-300">
              <a
                href="mailto:socios.gdrboavista@gmail.com"
                className="flex items-center gap-3 hover:text-red-400"
              >
                <Mail size={17} />
                socios.gdrboavista@gmail.com
              </a>

              <a
                href="tel:+351913030249"
                className="flex items-center gap-3 hover:text-red-400"
              >
                <Phone size={17} />
                913 030 249 / 912 242 196
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-serif text-2xl font-light">Redes sociais</h3>

            <div className="mt-5 flex gap-3">
              <a
                href="https://www.instagram.com/gdr_boavista_oficial/"
                target="_blank"
                rel="noreferrer"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-red-700"
                aria-label="Instagram"
              >
                <InstagramIcon />
              </a>

              <a
                href="https://www.facebook.com/G.D.R.BoaVista"
                target="_blank"
                rel="noreferrer"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-red-700"
                aria-label="Facebook"
              >
                <FacebookIcon />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 py-5">
          <div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 px-4 text-xs font-semibold text-zinc-500 md:flex-row">
            <p>© {new Date().getFullYear()} GDR Boavista.</p>
            <Link to="/admin" className="hover:text-red-400">
              Administração
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}