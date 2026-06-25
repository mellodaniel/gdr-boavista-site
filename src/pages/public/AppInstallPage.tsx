import { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, Download, ExternalLink, QrCode, ShieldCheck, Smartphone } from 'lucide-react';

import { trackAnalyticsEvent } from '../../lib/analytics';

function isAndroidDevice() {
  if (typeof window === 'undefined') return false;
  return /android/i.test(window.navigator.userAgent);
}

export function AppInstallPage() {
  const apkUrl = '/downloads/gdr-boavista-android.apk';
  const siteUrl = 'https://gdrboavista.pt';
  const isAndroid = isAndroidDevice();

  const installSteps = useMemo(
    () => [
      {
        title: '1. Baixe a app Android',
        text: 'Toque no botão “Baixar app Android” para descarregar o ficheiro oficial da app.',
      },
      {
        title: '2. Autorize a instalação',
        text: 'O Android poderá pedir autorização para instalar apps fora da Google Play. Confirme apenas se o download foi feito no site oficial.',
      },
      {
        title: '3. Acompanhe o clube',
        text: 'Depois de instalada, abra a app GDR Boavista no telemóvel e acompanhe notícias, jogos, loja e contactos.',
      },
    ],
    [],
  );

  function handleAndroidDownload() {
    trackAnalyticsEvent({
      eventName: 'android_app_download_click',
      entityType: 'app',
      entityName: 'GDR Boavista Android APK',
    });

    window.location.href = apkUrl;
  }

  function handleOpenSite() {
    trackAnalyticsEvent({
      eventName: 'app_page_open_site_click',
      entityType: 'app',
      entityName: 'Abrir site oficial',
    });

    window.location.href = siteUrl;
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
              App Android oficial
            </div>

            <h1 className="mt-7 max-w-3xl font-serif text-5xl font-light leading-[1.02] md:text-7xl">
              Leve o GDR Boavista no telemóvel.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-300 md:text-lg">
              Baixe a app Android do clube e acompanhe notícias, jogos, loja oficial,
              sócios, parceiros e contactos numa experiência mais próxima de app.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleAndroidDownload}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-red-700 px-6 py-4 text-sm font-black uppercase tracking-wide text-white shadow-xl shadow-black/20 transition hover:-translate-y-0.5 hover:bg-red-800"
              >
                <Download size={18} />
                Baixar app Android
              </button>

              <button
                type="button"
                onClick={handleOpenSite}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 px-6 py-4 text-sm font-black uppercase tracking-wide text-white transition hover:-translate-y-0.5 hover:bg-white/15"
              >
                <ExternalLink size={18} />
                Abrir site oficial
              </button>
            </div>

            {!isAndroid && (
              <div className="mt-6 max-w-2xl rounded-2xl border border-white/10 bg-white/10 p-5 text-sm leading-7 text-zinc-200">
                <strong className="text-white">Nota:</strong> neste momento a app está disponível para Android.
                A versão para iPhone será disponibilizada em breve através da App Store.
              </div>
            )}
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white p-6 text-[#24180f] shadow-2xl shadow-black/30">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.28em] text-red-700">
                  QR Code oficial
                </p>
                <h2 className="mt-2 font-serif text-3xl font-light">
                  Baixar app
                </h2>
              </div>
              <QrCode className="text-red-700" size={34} />
            </div>

            <div className="mt-6 rounded-[1.5rem] bg-[#f6f2ec] p-5">
              <img
                src="/app-qr-code.png"
                alt="QR Code para abrir a página da app do GDR Boavista"
                className="mx-auto h-auto w-full max-w-[300px] rounded-2xl bg-white p-3 shadow-sm"
              />
            </div>

            <p className="mt-5 text-center text-sm font-semibold leading-6 text-zinc-600">
              Aponte a câmara do telemóvel e abra a página oficial da app.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="grid gap-6 lg:grid-cols-3">
          {installSteps.map((step) => (
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
              Download oficial Android
            </p>
            <h2 className="mt-3 font-serif text-4xl font-light text-[#24180f] md:text-5xl">
              Instale apenas através do site oficial.
            </h2>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-600 md:text-base">
              A app Android do GDR Boavista é disponibilizada diretamente em gdrboavista.pt.
              Ao instalar fora da Google Play, o Android poderá apresentar avisos de segurança.
              Confirme sempre que o download foi feito pelo site oficial do clube.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-[#f6f2ec] p-5">
                <ShieldCheck className="text-red-700" size={24} />
                <h3 className="mt-3 text-sm font-black uppercase tracking-wide text-[#24180f]">
                  App oficial
                </h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  Publicada e mantida pelo GDR Boavista.
                </p>
              </div>

              <div className="rounded-2xl bg-[#f6f2ec] p-5">
                <Download className="text-red-700" size={24} />
                <h3 className="mt-3 text-sm font-black uppercase tracking-wide text-[#24180f]">
                  Download direto
                </h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  Instalação por ficheiro APK no Android.
                </p>
              </div>

              <div className="rounded-2xl bg-[#f6f2ec] p-5">
                <CheckCircle2 className="text-red-700" size={24} />
                <h3 className="mt-3 text-sm font-black uppercase tracking-wide text-[#24180f]">
                  iPhone em breve
                </h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  A versão iOS será disponibilizada numa próxima fase.
                </p>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-900">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 shrink-0" size={20} />
                <p>
                  <strong>Aviso Android:</strong> se o telemóvel pedir autorização para instalar apps de fontes externas,
                  permita apenas se o ficheiro tiver sido descarregado a partir de <strong>gdrboavista.pt</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
