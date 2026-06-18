import { useEffect, useState } from 'react';
import { setAnalyticsConsent, getAnalyticsConsent, trackAnalyticsEvent } from '../../lib/analytics';

export function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(getAnalyticsConsent() === null);
  }, []);

  function handleAccept() {
    setAnalyticsConsent('accepted');
    setIsVisible(false);
    trackAnalyticsEvent({ eventName: 'analytics_consent_accepted' });
  }

  function handleReject() {
    setAnalyticsConsent('rejected');
    setIsVisible(false);
  }

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[80] border-t border-zinc-200 bg-white shadow-2xl shadow-black/20">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 md:flex-row md:items-center md:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-red-700">
            Privacidade e dados
          </p>
          <p className="mt-2 text-sm leading-7 text-zinc-600">
            Usamos cookies e dados de navegação para medir visitas, páginas mais
            vistas, dispositivos e interações no site. Estes dados ajudam o GDR
            Boavista a melhorar o site e a apresentar relatórios aos parceiros.
          </p>
        </div>

        <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleReject}
            className="rounded-md border border-zinc-200 px-5 py-3 text-sm font-black uppercase tracking-wide text-zinc-700 transition hover:bg-zinc-100"
          >
            Recusar
          </button>

          <button
            type="button"
            onClick={handleAccept}
            className="rounded-md bg-red-700 px-5 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-[#24180f]"
          >
            Aceitar
          </button>
        </div>
      </div>
    </div>
  );
}
