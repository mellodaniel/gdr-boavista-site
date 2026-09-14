import { useEffect, useRef } from 'react';
import type { Photo } from '../lib/gallery';

export function GalleryLightbox({ photos, index, title, onChange, onClose }: { photos: Photo[]; index: number; title: string; onChange: (index: number) => void; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const touch = useRef<number | null>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    dialog.current?.showModal(); document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  const move = (direction: number) => onChange((index + direction + photos.length) % photos.length);
  const photo = photos[index];
  if (!photo) return null;
  return <dialog ref={dialog} aria-label={`Fotografias: ${title}`} onCancel={onClose}
    onKeyDown={event => { if (event.key === 'ArrowRight') { event.preventDefault(); move(1); } if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); } }}
    className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none bg-black/95 p-0 text-white backdrop:bg-black/90">
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-4 p-4"><div><p className="font-bold">{title}</p><p className="text-sm text-white/70" aria-live="polite">{index + 1} / {photos.length}</p></div><button autoFocus onClick={onClose} className="min-h-11 rounded border border-white/30 px-4">Fechar ✕</button></header>
      <div className="relative flex min-h-0 flex-1 items-center justify-center" onTouchStart={e => { touch.current = e.changedTouches[0].clientX; }} onTouchEnd={e => { if (touch.current !== null) { const delta = e.changedTouches[0].clientX - touch.current; if (Math.abs(delta) > 60) move(delta < 0 ? 1 : -1); } touch.current = null; }}>
        <img key={photo.id} src={photo.image_url} alt={`${title} — fotografia ${index + 1}`} className="h-full w-full object-contain px-2 sm:px-16" />
        {photos.length > 1 && <><button aria-label="Fotografia anterior" onClick={() => move(-1)} className="absolute left-2 rounded-full bg-black/70 px-4 py-3 text-2xl">‹</button><button aria-label="Fotografia seguinte" onClick={() => move(1)} className="absolute right-2 rounded-full bg-black/70 px-4 py-3 text-2xl">›</button></>}
      </div><p className="p-3 text-center text-xs text-white/60">Usa as setas ou desliza para ver mais fotografias.</p>
    </div>
  </dialog>;
}
