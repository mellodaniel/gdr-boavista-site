import { useEffect, useRef, useState } from 'react';
import type { NewsletterImage } from '../../lib/newsletterTemplate.js';
import { prepareGalleryPhoto, galleryError } from '../../lib/gallery';
import { supabase } from '../../lib/supabase';

type Props = {
  images: NewsletterImage[];
  disabled: boolean;
  onChange: (images: NewsletterImage[]) => void;
  onUploadingChange: (busy: boolean) => void;
};
export function NewsletterPhotos({ images, disabled, onChange, onUploadingChange }: Props) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const active = useRef(false);
  const locked = busy || disabled;
  useEffect(() => {
    if (!busy) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [busy]);
  async function upload(files: File[]) {
    if (active.current || disabled || !files.length) return;
    if (files.length + images.length > 10) { setErrors(['Podes incluir até 10 fotografias por comunicação.']); return; }
    active.current = true; setBusy(true); onUploadingChange(true); setErrors([]);
    const uploaded = [...images];
    try {
      for (const [index, file] of files.entries()) {
        setProgress(`A preparar e carregar ${index + 1} de ${files.length}: ${file.name}`);
        try {
          const { full } = await prepareGalleryPhoto(file, 1200);
          const storage = supabase.storage.from('gdrb-newsletter-images');
          const path = `${crypto.randomUUID()}.jpg`;
          const { error } = await storage.upload(path, full.blob, { contentType: 'image/jpeg', cacheControl: '31536000' });
          if (error) throw error;
          uploaded.push({ url: storage.getPublicUrl(path).data.publicUrl, caption: '' });
          onChange([...uploaded]);
        } catch (error) {
          setErrors(current => [...current, `${file.name}: ${galleryError(error)}`]);
        }
      }
    } finally { active.current = false; setBusy(false); onUploadingChange(false); setProgress(''); }
  }
  function move(index: number, offset: number) {
    const next = [...images];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    onChange(next);
  }
  const button = 'rounded-lg border border-zinc-300 px-3 py-2 text-sm disabled:opacity-40';
  return <section aria-label="Fotografias da comunicação" className="mt-5 space-y-4 rounded-2xl border border-zinc-200 p-4">
    <div><h3 className="font-black">Fotografias</h3><p className="mt-1 text-sm text-zinc-600">Até 10 fotografias, apresentadas depois da mensagem. JPG, PNG, WebP, GIF ou HEIC, até 40 MB cada. São convertidas em fotografias JPEG; animações não são mantidas.</p></div>
    <label className="block text-sm font-bold">Adicionar fotografias
      <input className="mt-2 block w-full text-sm" type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif" disabled={locked || images.length >= 10}
        onChange={event => { const files = Array.from(event.target.files || []); event.target.value = ''; void upload(files); }} />
    </label>
    {busy && <p role="status" className="text-sm">{progress} — mantém esta comunicação aberta.</p>}
    {errors.length > 0 && <div role="alert" className="text-sm text-red-700">{errors.map((error, i) => <p key={i}>{error}</p>)}<p>As restantes fotografias foram mantidas. Podes selecionar novamente as que falharam.</p></div>}
    <div className="space-y-4">{images.map((photo, index) => <div key={photo.url} className="flex flex-col gap-3 rounded-xl bg-zinc-50 p-3 sm:flex-row">
      <img src={photo.url} alt={photo.caption || `Fotografia ${index + 1}`} className="h-32 w-full rounded-lg object-contain sm:w-44" />
      <div className="flex-1 space-y-3"><label className="block text-sm font-bold">Legenda da fotografia {index + 1} (opcional)
        <input className="mt-1 w-full rounded-lg border border-zinc-300 p-2 font-normal" maxLength={300} value={photo.caption} disabled={locked}
          onChange={event => onChange(images.map((item, i) => i === index ? { ...item, caption: event.target.value } : item))} />
      </label><div className="flex flex-wrap gap-2">
        <button type="button" className={button} disabled={locked || index === 0} onClick={() => move(index, -1)}>Subir</button>
        <button type="button" className={button} disabled={locked || index === images.length - 1} onClick={() => move(index, 1)}>Descer</button>
        <button type="button" className={button} disabled={locked} onClick={() => onChange(images.filter((_, i) => i !== index))}>Retirar</button>
      </div></div>
    </div>)}</div>
    <p className="text-xs text-zinc-500">Retirar remove a fotografia desta comunicação. Fotografias de emails já enviados continuam disponíveis.</p>
  </section>;
}
