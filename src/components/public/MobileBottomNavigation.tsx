import { CalendarDays, Home, Menu, Newspaper, Users } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { trackAnalyticsEvent } from '../../lib/analytics';

type MobileBottomNavigationProps = {
  onOpenMenu: () => void;
};

const items = [
  { label: 'Início', path: '/', icon: Home },
  { label: 'Jogos', path: '/resultados', icon: CalendarDays },
  { label: 'Equipas', path: '/equipas', icon: Users },
  { label: 'Notícias', path: '/noticias', icon: Newspaper },
];

export function MobileBottomNavigation({ onOpenMenu }: MobileBottomNavigationProps) {
  function track(label: string) {
    trackAnalyticsEvent({
      eventName: 'navigation_click',
      entityType: 'navigation',
      entityName: `${label} - navegação inferior mobile`,
    });
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#eadfd2] bg-[#f6f2ec]/96 pb-[max(env(safe-area-inset-bottom),0.35rem)] shadow-[0_-12px_30px_rgba(36,24,15,0.08)] backdrop-blur-xl lg:hidden"
      aria-label="Navegação principal mobile"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5 px-2 pt-1.5">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={() => track(item.label)}
              className={({ isActive }) =>
                `flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-black uppercase tracking-[0.08em] transition active:scale-[0.97] ${
                  isActive ? 'text-red-700' : 'text-zinc-500'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`flex h-8 w-10 items-center justify-center rounded-full transition ${
                      isActive ? 'bg-red-700 text-white' : 'text-zinc-600'
                    }`}
                  >
                    <Icon size={18} strokeWidth={2.2} />
                  </span>
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}

        <button
          type="button"
          onClick={() => {
            track('Menu');
            onOpenMenu();
          }}
          className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-black uppercase tracking-[0.08em] text-zinc-500 transition active:scale-[0.97]"
          aria-label="Abrir menu completo"
        >
          <span className="flex h-8 w-10 items-center justify-center rounded-full text-zinc-600">
            <Menu size={19} strokeWidth={2.2} />
          </span>
          <span>Menu</span>
        </button>
      </div>
    </nav>
  );
}
