import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  ChevronRight,
  Mail,
  Menu,
  Phone,
  ShoppingBag,
  Smartphone,
  X,
} from 'lucide-react';
import { AnalyticsTracker } from '../components/public/AnalyticsTracker';
import { CookieConsentBanner } from '../components/public/CookieConsentBanner';
import { MobileBottomNavigation } from '../components/public/MobileBottomNavigation';
import { trackAnalyticsEvent } from '../lib/analytics';

const navigation = [
  { label: 'Clube', path: '/clube' },
  { label: 'Equipas', path: '/equipas' },
  { label: 'Jogos', path: '/resultados' },
  { label: 'Notícias', path: '/noticias' },
  { label: 'Sócios', path: '/socios' },
  { label: 'Galeria', path: '/galeria' },
  { label: 'Parceiros', path: '/parceiros' },
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
  const location = useLocation();

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isDesktopVisualMode = window.matchMedia('(min-width: 768px)').matches;

    if (prefersReducedMotion || !isDesktopVisualMode) {
      return undefined;
    }

    const sections = Array.from(
      document.querySelectorAll<HTMLElement>('.gdrb-public-page > section'),
    );

    sections.forEach((section) => section.classList.add('gdrb-reveal'));

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('gdrb-visible');
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.08,
        rootMargin: '0px 0px -8% 0px',
      },
    );

    sections.forEach((section, index) => {
      if (index === 0) {
        section.classList.add('gdrb-visible');
        return;
      }
      observer.observe(section);
    });

    return () => observer.disconnect();
  }, [location.pathname]);

  useEffect(() => {
    if (!isMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  function trackHeaderClick(eventName: string, entityName: string) {
    trackAnalyticsEvent({
      eventName,
      entityType: 'navigation',
      entityName,
    });
  }

  return (
    <div className="min-h-screen bg-[#f6f2ec] text-zinc-950 md:bg-transparent">
      <AnalyticsTracker />

      <a
        href="#conteudo-principal"
        className="fixed left-4 top-3 z-[100] -translate-y-24 rounded-full bg-[#24180f] px-4 py-2 text-sm font-bold text-white shadow-lg transition focus:translate-y-0"
      >
        Saltar para o conteúdo
      </a>

      <header className="sticky top-0 z-50 border-b border-[#eadfd2] bg-[#f6f2ec]/95 shadow-sm shadow-black/5 backdrop-blur-xl lg:border-white/60 lg:bg-[#fbf8f4]/82 lg:shadow-[0_12px_42px_-30px_rgba(55,34,21,0.45)]">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 md:h-20 md:px-4">
          <Link
            to="/"
            onClick={() => trackHeaderClick('navigation_click', 'Logo / Home')}
            className="flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white p-2 shadow-sm ring-1 ring-zinc-200 md:h-14 md:w-14">
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

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Navegação principal">
            {navigation.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => trackHeaderClick('navigation_click', item.label)}
                className={({ isActive }) =>
                  `rounded-full px-5 py-2 text-sm font-semibold transition md:px-4 ${
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
              onClick={() => trackHeaderClick('shop_click', 'Loja - menu principal')}
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
              onClick={() => trackHeaderClick('social_click', 'Instagram - header')}
            >
              <InstagramIcon />
            </a>

            <a
              href="https://www.facebook.com/G.D.R.BoaVista"
              target="_blank"
              rel="noreferrer"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 transition hover:border-red-700 hover:text-red-700"
              aria-label="Facebook GDR Boavista"
              onClick={() => trackHeaderClick('social_click', 'Facebook - header')}
            >
              <FacebookIcon />
            </a>
          </div>

          <button
            type="button"
            onClick={() => setIsMenuOpen(true)}
            className="flex h-11 w-11 touch-manipulation items-center justify-center rounded-full border border-zinc-200 bg-white text-[#24180f] transition active:scale-95 lg:hidden"
            aria-label="Abrir menu"
            aria-expanded={isMenuOpen}
            aria-controls="mobile-public-menu"
          >
            <Menu size={21} />
          </button>
        </div>
      </header>

      {isMenuOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            onClick={() => setIsMenuOpen(false)}
            aria-label="Fechar menu"
          />

          <aside
            id="mobile-public-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menu principal"
            className="absolute bottom-0 right-0 top-0 flex w-[88%] max-w-sm flex-col overflow-y-auto border-l border-[#eadfd2] bg-[#f6f2ec] shadow-[-24px_0_60px_rgba(36,24,15,0.18)]"
          >
            <div className="flex items-center justify-between border-b border-[#eadfd2] px-5 py-4">
              <Link
                to="/"
                className="flex items-center gap-3"
                onClick={() => trackHeaderClick('navigation_click', 'Logo / Home - menu mobile')}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white p-2 ring-1 ring-zinc-200">
                  <img
                    src="/logo-gdr-boavista-header-256.png"
                    alt="GDR Boavista"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div>
                  <p className="text-sm font-black uppercase tracking-tight text-[#24180f]">
                    GDR Boavista
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                    Menu
                  </p>
                </div>
              </Link>

              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                className="flex h-11 w-11 touch-manipulation items-center justify-center rounded-full border border-zinc-200 bg-white text-[#24180f] transition active:scale-95"
                aria-label="Fechar menu"
              >
                <X size={21} />
              </button>
            </div>

            <nav className="grid gap-1.5 px-4 py-4" aria-label="Menu completo">
              {navigation.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => trackHeaderClick('navigation_click', item.label)}
                  className={({ isActive }) =>
                    `flex min-h-12 items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold transition active:scale-[0.99] ${
                      isActive
                        ? 'bg-[#24180f] text-white'
                        : 'text-zinc-700 hover:bg-white'
                    }`
                  }
                >
                  <span>{item.label}</span>
                  <ChevronRight size={17} className="opacity-60" />
                </NavLink>
              ))}
            </nav>

            <div className="mt-auto border-t border-[#eadfd2] p-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
              <NavLink
                to="/loja"
                onClick={() => trackHeaderClick('shop_click', 'Loja - menu mobile')}
                className={({ isActive }) =>
                  `flex min-h-12 items-center justify-between rounded-2xl px-4 py-3 text-sm font-black uppercase tracking-wide transition active:scale-[0.99] ${
                    isActive ? 'bg-[#24180f] text-white' : 'bg-red-700 text-white'
                  }`
                }
              >
                <span className="inline-flex items-center gap-2">
                  <ShoppingBag size={18} />
                  Loja Online
                </span>
                <ChevronRight size={17} />
              </NavLink>

              <NavLink
                to="/app"
                onClick={() => trackHeaderClick('pwa_install_page_click', 'App - menu mobile')}
                className={({ isActive }) =>
                  `mt-2 flex min-h-12 items-center justify-between rounded-2xl border px-4 py-3 text-sm font-black uppercase tracking-wide transition active:scale-[0.99] ${
                    isActive
                      ? 'border-[#24180f] bg-[#24180f] text-white'
                      : 'border-zinc-200 bg-white text-zinc-700'
                  }`
                }
              >
                <span className="inline-flex items-center gap-2">
                  <Smartphone size={18} />
                  Instalar App
                </span>
                <ChevronRight size={17} />
              </NavLink>

              <div className="mt-4 flex items-center gap-2">
                <a
                  href="https://www.instagram.com/gdr_boavista_oficial/"
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white text-xs font-bold text-zinc-700"
                  onClick={() => trackHeaderClick('social_click', 'Instagram - menu mobile')}
                >
                  <InstagramIcon />
                  Instagram
                </a>
                <a
                  href="https://www.facebook.com/G.D.R.BoaVista"
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white text-xs font-bold text-zinc-700"
                  onClick={() => trackHeaderClick('social_click', 'Facebook - menu mobile')}
                >
                  <FacebookIcon />
                  Facebook
                </a>
              </div>
            </div>
          </aside>
        </div>
      )}

      <main id="conteudo-principal" className="pb-20 lg:pb-0">
        <Outlet />
      </main>

      <footer className="bg-[#24180f] pb-20 text-white lg:pb-0 lg:bg-[radial-gradient(circle_at_15%_0%,rgba(185,28,28,0.20),transparent_28rem),linear-gradient(135deg,#2b1b12_0%,#24180f_50%,#351818_100%)]">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 md:gap-10 md:px-4 md:py-14 lg:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white p-2 md:h-16 md:w-16">
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
              atletas, famílias, sócios, treinadores, parceiros e amigos.
            </p>
          </div>

          <div>
            <h3 className="font-serif text-2xl font-light">Contactos</h3>

            <div className="mt-5 grid gap-3 text-sm text-zinc-300">
              <a
                href="mailto:socios.gdrboavista@gmail.com"
                onClick={() => trackHeaderClick('contact_click', 'Email - footer')}
                className="flex min-h-11 items-center gap-3 rounded-xl pr-2 hover:text-red-400"
              >
                <Mail size={17} />
                socios.gdrboavista@gmail.com
              </a>

              <a
                href="tel:+351913030249"
                onClick={() => trackHeaderClick('contact_click', 'Telefone - footer')}
                className="flex min-h-11 items-center gap-3 rounded-xl pr-2 hover:text-red-400"
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
                onClick={() => trackHeaderClick('social_click', 'Instagram - footer')}
              >
                <InstagramIcon />
              </a>

              <a
                href="https://www.facebook.com/G.D.R.BoaVista"
                target="_blank"
                rel="noreferrer"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-red-700"
                aria-label="Facebook"
                onClick={() => trackHeaderClick('social_click', 'Facebook - footer')}
              >
                <FacebookIcon />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 py-5">
          <div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 px-5 text-xs font-semibold text-zinc-500 md:flex-row md:px-4">
            <p>© {new Date().getFullYear()} GDR Boavista.</p>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                to="/app"
                onClick={() => trackHeaderClick('pwa_install_page_click', 'App - footer')}
                className="inline-flex min-h-10 items-center gap-2 hover:text-red-400"
              >
                <Smartphone size={14} />
                Instalar app
              </Link>

              <Link
                to="/admin"
                onClick={() => trackHeaderClick('admin_click', 'Admin - footer')}
                className="inline-flex min-h-10 items-center hover:text-red-400"
              >
                Administração
              </Link>
            </div>
          </div>
        </div>
      </footer>

      <MobileBottomNavigation onOpenMenu={() => setIsMenuOpen(true)} />
      <CookieConsentBanner />
    </div>
  );
}
