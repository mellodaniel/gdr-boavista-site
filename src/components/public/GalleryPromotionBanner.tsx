import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { galleryPromotionEnd, galleryPromotionStart, isGalleryPromotionActive } from '../../lib/galleryPromotion';

export function GalleryPromotionBanner() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const boundary = now < galleryPromotionStart ? galleryPromotionStart : galleryPromotionEnd;
    const timer = now < boundary ? window.setTimeout(refresh, Math.min(boundary - now, 2147483647)) : undefined;
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [now]);
  if (!isGalleryPromotionActive(now)) return null;

  return (
    <section aria-label="Fotografias da apresentação das equipas" className="bg-[#f6f2ec] px-4 py-4 sm:px-6 lg:py-5">
      <Link to="/galeria/e426a552-daa0-4ef2-9103-93468bc6177c" className="group relative mx-auto grid max-w-7xl overflow-hidden rounded-xl border-t-4 border-red-600 bg-[#8f1020] shadow-lg ring-1 ring-black/10 focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-red-700 md:grid-cols-[42%_58%]">
        <div className="relative z-10 bg-gradient-to-br from-[#a41426] to-[#660b17] px-5 py-5 sm:px-7 md:py-6">
          <div className="flex items-center gap-3">
            <img src="/logo-gdr-boavista-header-256.png" alt="" className="h-12 w-12 rounded-lg bg-white p-1.5 object-contain" width="48" height="48" />
            <p className="text-[10px] font-bold uppercase tracking-[.22em] text-red-100 sm:text-xs">GDR Boavista · Galeria</p>
          </div>
          <h2 className="mt-3 font-serif text-3xl leading-[1.05] text-white lg:text-4xl">Um sábado para<br className="hidden md:block" /> recordar.</h2>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-red-50">Reviva a apresentação dos juniores e seniores.</p>
          <span className="mt-4 inline-flex min-h-11 items-center gap-4 rounded-lg bg-white px-5 py-2.5 text-sm font-bold text-[#8f1020] shadow-sm transition group-hover:bg-red-50">Ver fotografias <ArrowRight size={19} aria-hidden="true" /></span>
        </div>
        <div className="relative h-40 overflow-hidden sm:h-52 md:h-auto md:min-h-64">
          <img src="/announcements/apresentacao-galeria-2026-09-12.jpg" alt="Equipa do GDR Boavista reunida no campo no dia da apresentação" width="2400" height="1800" className="absolute inset-0 h-full w-full object-cover object-[center_72%]" />
          <span className="absolute bottom-3 right-3 rounded bg-black/65 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.18em] text-white">12 de setembro</span>
        </div>
      </Link>
    </section>
  );
}
