import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { X } from 'lucide-react';

// Lisbon is UTC+01:00 on this date. Change the campaign ID for a new announcement.
export const presentationCampaign = {
  id: 'presentation-games-2026-09-12',
  startsAt: '2026-09-09T00:00:00+01:00',
  endsAt: '2026-09-12T16:00:00+01:00',
  poster: '/announcements/jogos-apresentacao-2026-09-12.png',
};

export function isPresentationCampaignActive(now = Date.now()) {
  return now >= Date.parse(presentationCampaign.startsAt) && now < Date.parse(presentationCampaign.endsAt);
}

export function PresentationGamesPopup() {
  const { pathname } = useLocation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const storageKey = `gdrb:announcement:closed:${presentationCampaign.id}`;

  useEffect(() => {
    if (pathname.startsWith('/newsletter/')) return;
    let dismissed = false;
    try { dismissed = sessionStorage.getItem(storageKey) === '1'; } catch { /* Storage can be unavailable. */ }
    if (dismissed) return;
    const timer = window.setTimeout(() => {
      if (isPresentationCampaignActive()) setOpen(true);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [pathname, storageKey]);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!isPresentationCampaignActive()) { setOpen(false); return; }
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    closeRef.current?.focus();
    document.body.style.overflow = 'hidden';
    let timer: number;
    const checkExpiry = () => {
      const remaining = Date.parse(presentationCampaign.endsAt) - Date.now();
      if (remaining <= 0) { setOpen(false); return; }
      timer = window.setTimeout(checkExpiry, Math.min(remaining, 60000));
    };
    checkExpiry();
    const onVisibility = () => {
      if (!isPresentationCampaignActive()) setOpen(false);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open]);

  function dismiss() {
    try { sessionStorage.setItem(storageKey, '1'); } catch { /* Closing must always work. */ }
    setOpen(false);
  }

  return (
    <dialog ref={dialogRef} aria-labelledby="presentation-games-title"
      aria-describedby="presentation-games-description"
      onCancel={(event) => { event.preventDefault(); dismiss(); }}
      onClick={(event) => { if (event.target === event.currentTarget) dismiss(); }}
      className="fixed inset-0 m-auto max-h-[94dvh] w-[min(92vw,560px)] max-w-none overflow-y-auto rounded-2xl border-0 bg-[#171717] p-0 text-white shadow-2xl backdrop:bg-black/75 backdrop:backdrop-blur-sm">
      {open && <div className="relative">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-[#171717] px-4 py-2">
          <h2 id="presentation-games-title" className="text-sm font-bold">Jogos de apresentação · 12 de setembro</h2>
          <button ref={closeRef} type="button" onClick={dismiss} aria-label="Fechar anúncio"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            <X size={22} />
          </button>
        </div>
        <p id="presentation-games-description" className="sr-only">Sábado, 12 de setembro. Seniores às 16h00: Boavista contra Marinhense. Juniores às 18h30: Boavista contra Ferreira do Zêzere. Traz a família e vem apoiar as nossas equipas.</p>
        <img src={presentationCampaign.poster} alt="A nossa força começa contigo. Jogos de apresentação do GDR Boavista: seniores às 16h00 e juniores às 18h30."
          className="block h-auto w-full" onError={() => setOpen(false)} />
        <button type="button" onClick={dismiss} className="w-full px-4 py-4 text-sm font-bold underline underline-offset-4 hover:bg-white/10">Continuar para o site</button>
      </div>}
    </dialog>
  );
}
