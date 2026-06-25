import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Download, QrCode, Share2, Smartphone } from 'lucide-react';

import { trackAnalyticsEvent } from '../../lib/analytics';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

function isIosDevice() {
  if (typeof window === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isStandaloneMode() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function AppInstallPage() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);

  const appUrl = 'https://gdrboavista.pt/app';

  const installationSteps = useMemo(
    () => [
      {
        title: '1. Aponte a câmara para o QR Code',
        text: 'Abra esta página no telemóvel através do QR Code ou diretamente em gdrboavista.pt/app.',
      },
      {
        title: '2. Instale no ecrã principal',
        text: isIos
          ? 'No iPhone, toque em Partilhar e depois em “Adicionar ao ecrã principal”.'
          : 'No Android, toque em “Instalar app” ou em “Adicionar ao ecrã principal”.',
      },
      {
        title: '3. Acompanhe o clube',
        text: 'Notícias, jogos, loja, sócios e contactos ficam sempre à mão.',
      },
    ],
    [isIos],
  );

  useEffect(() => {
    setIsIos(isIosDevice());
    setIsInstalled(isStandaloneMode());

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }

    function handleAppInstalled() {
      setIsInstalled(true);
      setInstallPrompt(null);
      trackAnalyticsEvent({
        eventName: 'pwa_installed',
        entityType: 'app',
        entityName: 'GDR Boavista PWA',
      });
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  async function handleInstallClick() {
    trackAnalyticsEvent({
      eventName: 'pwa_install_click',
      entityType: 'app',
      entityName: 'Instalar app - página app',
    });

    if (!installPrompt) return;

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;

    trackAnalyticsEvent({
      eventName: choice.outcome === 'accepted' ? 'pwa_install_accepted' : 'pwa_install_dismissed',
      entityType: 'app',
      entityName: 'GDR Boavista PWA',
      metadata: { platform: choice.platform },
    });

    setInstallPrompt(null);
  }

  async function handleShareClick() {
    trackAnalyticsEvent({
      eventName: 'pwa_share_click',
      entityType: 'app',
      entityName: 'Partilhar app',
    });

    if (navigator.share) {
      await navigator.share({
        title: 'App GDR Boavista',
        text: 'Instala a app do GDR Boavista no teu telemóvel.',
        url: appUrl,
      });
    } else {
      await navigator.clipboard.writeText(appUrl);
      alert('Link copiado para a área de transferência.');
    }
  }

  return (
    <div className="bg-[#f6f2ec]">
      <section className="relative overflow-hidden bg-[#24180f] text-white">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -right-24 top-10 h-96 w-96 rounded-full bg-red-700 blur-3xl" />
          <div className="absolute -left-28 bottom-0 h-80 w-80 rounded-full bg-white/20 blur-3xl" />
        </div>

        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-20 lg:grid-cols-[1fr_440px] lg:items-center lg:py-28">
          <div>
            <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.28em] text-red-200">
              <Smartphone size={16} />
              App instalável
            </div>

            <h1 className="mt-7 max-w-3xl font-serif text-5xl font-light leading-[1.02] md:text-7xl">
              Leve o GDR Boavista no telemóvel.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-300 md:text-lg">
              Instale a app do clube e acompanhe notícias, jogos, loja oficial,
              sócios e contactos a partir do ecrã principal do seu telemóvel.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {isInstalled ? (
                <div className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-4 text-sm font-black uppercase tracking-wide text-[#24180f]">
                  <CheckCircle2 size={18} />
                  App instalada
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleInstallClick}
                  disabled={!installPrompt}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-4 text-sm font-black uppercase tracking-wide text-[#24180f] shadow-xl shadow-black/20 transition hover:-translate-y-0.5 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Download size={18} />
                  {installPrompt ? 'Instalar app' : isIos ? 'Instalar no iPhone' : 'Abrir no telemóvel'}
                </button>
              )}

              <button
                type="button"
                onClick={handleShareClick}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 px-6 py-4 text-sm font-black uppercase tracking-wide text-white transition hover:-translate-y-0.5 hover:bg-white/15"
              >
                <Share2 size={18} />
                Partilhar link
              </button>
            </div>

            {!installPrompt && !isInstalled && (
              <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-400">
                No iPhone ou quando o botão de instalação não aparecer, use as
                instruções abaixo para adicionar ao ecrã principal.
              </p>
            )}
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white p-6 text-[#24180f] shadow-2xl shadow-black/30">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.28em] text-red-700">
                  QR Code oficial
                </p>
                <h2 className="mt-2 font-serif text-3xl font-light">
                  Instalar app
                </h2>
              </div>
              <QrCode className="text-red-700" size={34} />
            </div>

            <div className="mt-6 rounded-[1.5rem] bg-[#f6f2ec] p-5">
              <img
                src="/app-qr-code.png"
                alt="QR Code para instalar a app do GDR Boavista"
                className="mx-auto h-auto w-full max-w-[300px] rounded-2xl bg-white p-3 shadow-sm"
              />
            </div>

            <p className="mt-5 text-center text-sm font-semibold leading-6 text-zinc-600">
              Aponte a câmara do telemóvel e abra a página de instalação.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="grid gap-6 lg:grid-cols-3">
          {installationSteps.map((step) => (
            <article
              key={step.title}
              className="rounded-[1.7rem] border border-[#eadfd2] bg-white p-7 shadow-sm shadow-black/5"
            >
              <h3 className="font-serif text-2xl font-light text-[#24180f]">
                {step.title}
              </h3>
              <p className="mt-4 text-sm leading-7 text-zinc-600">
                {step.text}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20">
        <div className="grid gap-8 rounded-[2rem] border border-[#eadfd2] bg-white p-8 shadow-sm shadow-black/5 lg:grid-cols-[320px_1fr] lg:items-center">
          <div className="flex justify-center">
            <div className="flex h-44 w-44 items-center justify-center rounded-[2rem] bg-[#f6f2ec] p-5 ring-1 ring-[#eadfd2]">
              <img
                src="/icons/icon-512.png"
                alt="GDR Boavista"
                className="h-full w-full object-contain"
              />
            </div>
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-red-700">
              GDR Boavista no telemóvel
            </p>
            <h2 className="mt-3 font-serif text-4xl font-light text-[#24180f] md:text-5xl">
              Uma experiência simples para atletas, famílias e sócios.
            </h2>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-600 md:text-base">
              A app instalável usa o site oficial como base. Sempre que o clube
              atualiza notícias, jogos, loja ou contactos, a experiência fica
              atualizada automaticamente para todos.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
