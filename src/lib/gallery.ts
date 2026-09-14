import { supabase } from './supabase';

export type Album = {
  id: string; title: string; description: string | null; event_date: string | null;
  category: string; is_published: boolean; cover_url: string | null; created_at: string;
  gdrb_gallery_photos?: { count: number }[];
};
export type Photo = {
  id: string; album_id: string; image_url: string; thumbnail_url: string;
  storage_path: string | null; thumbnail_path: string | null; sort_order: number;
  width: number | null; height: number | null; original_name: string | null;
};
export const galleryBucket = 'gdrb-gallery-images';
export const albumSelect = '*,gdrb_gallery_photos(count)';
export const galleryPhotoSelect = 'id,album_id,image_url,thumbnail_url,storage_path,thumbnail_path,sort_order,width,height,original_name';
export function galleryError(error: unknown): string {
  const text = error && typeof error === 'object' && 'message' in error ? String(error.message) : String(error);
  if (/schema cache|does not exist|could not find.*table/i.test(text)) return 'É necessário executar a migração dos álbuns no SQL Editor do Supabase. Consulta docs/galeria-albuns.md no projeto.';
  if (/row-level|permission|unauthorized|jwt/i.test(text)) return 'A sessão não tem permissão para esta operação. Entra com a conta admin ou developer e confirma que a migração foi aplicada.';
  if (/fetch|timeout|network/i.test(text)) return 'A ligação ao servidor falhou. As fotografias concluídas foram mantidas; tenta novamente as que falharam.';
  return text;
}
export function formatAlbumDate(date: string | null) {
  return date ? new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${date}T12:00:00`)) : '';
}

function canvasBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Não foi possível preparar esta fotografia.')), 'image/jpeg', quality));
}
export async function prepareGalleryPhoto(file: File) {
  if (file.size > 40 * 1024 * 1024) throw new Error('O ficheiro ultrapassa 40 MB. Escolhe uma versão mais pequena.');
  const isHeic = /\.(heic|heif)$/i.test(file.name) || /image\/(heic|heif)/i.test(file.type);
  let input: Blob = file;
  if (isHeic) {
    try {
      const { heicTo } = await import('heic-to');
      input = await heicTo({ blob: file, type: 'image/jpeg', quality: 0.92 });
    } catch { throw new Error('Não foi possível converter este HEIC. Exporta esta fotografia como JPEG e tenta novamente.'); }
  } else if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type) && !/\.(jpe?g|png|webp|gif)$/i.test(file.name)) {
    throw new Error('Formato não suportado. Usa JPG, PNG, WebP, GIF, HEIC ou HEIF.');
  }
  const url = URL.createObjectURL(input);
  try {
    const image = new Image(); image.src = url;
    await image.decode();
    if (!image.naturalWidth || image.naturalWidth * image.naturalHeight > 60000000) throw new Error('A resolução desta fotografia é demasiado elevada. Exporta uma versão mais pequena.');
    const create = async (edge: number, quality: number) => {
      const scale = Math.min(1, edge / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('O navegador não conseguiu preparar a fotografia.');
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      const blob = await canvasBlob(canvas, quality);
      const result = { blob, width: canvas.width, height: canvas.height };
      canvas.width = 1; canvas.height = 1;
      return result;
    };
    return { full: await create(2400, 0.86), thumbnail: await create(640, 0.78) };
  } finally { URL.revokeObjectURL(url); }
}

export async function uploadAlbumPhoto(albumId: string, file: File, id: string, order: number, onStage: (stage: string) => void): Promise<Photo> {
  const existing = await supabase.from('gdrb_gallery_photos').select(galleryPhotoSelect).eq('id', id).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return existing.data as Photo;
  onStage('A preparar');
  const { full, thumbnail } = await prepareGalleryPhoto(file);
  const base = `galeria/albuns/${albumId}/${id}`;
  const storage = supabase.storage.from(galleryBucket);
  onStage('A carregar');
  for (const [path, blob] of [[`${base}.jpg`, full.blob], [`${base}-thumb.jpg`, thumbnail.blob]] as const) {
    const { error } = await storage.upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: true });
    if (error) throw error;
  }
  onStage('A guardar');
  const photo: Photo = {
    id, album_id: albumId, image_url: storage.getPublicUrl(`${base}.jpg`).data.publicUrl,
    thumbnail_url: storage.getPublicUrl(`${base}-thumb.jpg`).data.publicUrl,
    storage_path: `${base}.jpg`, thumbnail_path: `${base}-thumb.jpg`, sort_order: order,
    width: full.width, height: full.height, original_name: file.name,
  };
  // Stable IDs make retrying a failed request safe without duplicating a photograph.
  const { error } = await supabase.from('gdrb_gallery_photos').upsert(photo, { onConflict: 'id' });
  if (error) throw error;
  return photo;
}
