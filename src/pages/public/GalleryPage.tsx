import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { albumSelect, formatAlbumDate, galleryPhotoSelect, type Album, type Photo } from '../../lib/gallery';
import { GalleryLightbox } from '../../components/GalleryLightbox';

export function GalleryPage() {
  const { albumId } = useParams();
  return <GalleryContent key={albumId ?? 'albums'} albumId={albumId} />;
}

function GalleryContent({ albumId }: { albumId?: string }) {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [album, setAlbum] = useState<Album | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(12);
  const [index, setIndex] = useState<number | null>(null);
  const [shared, setShared] = useState('');
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        if (albumId) {
          const { data, error } = await supabase.from('gdrb_gallery_albums').select(albumSelect).eq('id', albumId).eq('is_published', true).maybeSingle();
          if (error) throw error;
          if (!data) { if (!cancelled) setError('Este álbum não está disponível.'); return; }
          const collected: Photo[] = [];
          // Fetch metadata in pages; image files are loaded only as they become visible.
          for (let start = 0; ; start += 500) {
            const result = await supabase.from('gdrb_gallery_photos').select(galleryPhotoSelect).eq('album_id', albumId).order('sort_order').order('id').range(start, start + 499);
            if (result.error) throw result.error;
            if (cancelled) return;
            collected.push(...result.data as Photo[]);
            if (result.data.length < 500) break;
          }
          if (!cancelled) { setAlbum(data as Album); setPhotos(collected); setLimit(48); }
        } else {
          const collected: Album[] = [];
          for (let start = 0; ; start += 500) {
            const result = await supabase.from('gdrb_gallery_albums').select(albumSelect).eq('is_published', true).order('event_date', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false }).range(start, start + 499);
            if (result.error) throw result.error;
            if (cancelled) return;
            collected.push(...result.data as Album[]);
            if (result.data.length < 500) break;
          }
          if (!cancelled) setAlbums(collected);
        }
      } catch { if (!cancelled) setError('Não foi possível carregar a galeria. Tenta atualizar a página.'); }
      finally { if (!cancelled) setLoading(false); }
    }
    void load(); return () => { cancelled = true; };
  }, [albumId]);
  const filtered = albums.filter(a => `${a.title} ${a.category} ${a.description ?? ''}`.toLocaleLowerCase('pt-PT').includes(search.trim().toLocaleLowerCase('pt-PT')));
  async function share() {
    try { if (navigator.share) await navigator.share({ title: album?.title, url: location.href }); else { await navigator.clipboard.writeText(location.href); setShared('Ligação copiada!'); } }
    catch (e) { if (!(e instanceof Error && e.name === 'AbortError')) setShared('Copia a ligação na barra de endereço para partilhar.'); }
  }
  return <main className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-20">
    {albumId && <Link to="/galeria" className="text-sm font-bold text-red-700">← Todos os álbuns</Link>}
    <p className="mt-6 text-xs font-bold uppercase tracking-[.3em] text-red-700">GDR Boavista · Galeria</p>
    <h1 className="mt-3 font-serif text-4xl text-[#24180f] sm:text-5xl">{album?.title ?? 'Memórias que nos unem'}</h1>
    {album ? <div className="mt-4 space-y-3"><p className="text-sm text-zinc-500">{album.category} {album.event_date && `· ${formatAlbumDate(album.event_date)}`} · {photos.length} fotografias</p><p className="max-w-3xl whitespace-pre-line text-zinc-600">{album.description}</p><button onClick={() => void share()} className="rounded border border-zinc-300 px-4 py-2 text-sm font-bold">Partilhar álbum</button><span className="ml-3 text-sm" role="status">{shared}</span></div> : !albumId && <p className="mt-4 text-zinc-600">Os jogos, as pessoas e os momentos que fazem parte da história do nosso clube.</p>}
    {loading ? <p className="py-16" role="status">A carregar fotografias…</p> : error ? <p role="alert" className="mt-8 rounded border border-red-200 bg-red-50 p-5 text-red-700">{error}</p> : album ? <>
      <div className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{photos.slice(0, limit).map((photo, i) => <button key={photo.id} onClick={() => setIndex(i)} aria-label={`Ampliar fotografia ${i + 1} de ${album.title}`} className="group overflow-hidden rounded-lg bg-zinc-100 focus-visible:outline-2 focus-visible:outline-red-700"><img src={photo.thumbnail_url} alt={`${album.title} — fotografia ${i + 1}`} loading="lazy" className="aspect-[4/3] w-full object-cover transition duration-300 group-hover:scale-105" /></button>)}</div>
      {!photos.length && <p className="py-12 text-zinc-500">As fotografias deste álbum estarão disponíveis em breve.</p>}
      {limit < photos.length && <button onClick={() => setLimit(v => v + 48)} className="mt-8 rounded bg-red-700 px-6 py-3 font-bold text-white">Ver mais fotografias ({photos.length - limit})</button>}
    </> : <>
      <div className="mt-8 flex flex-wrap items-end justify-between gap-5"><div><h2 className="font-serif text-3xl text-[#24180f]">Todos os álbuns</h2><p className="mt-2 text-sm text-zinc-500">{albums.length} {albums.length === 1 ? 'álbum disponível' : 'álbuns disponíveis'} · Mais recentes primeiro</p></div>{albums.length > 0 && <label className="block w-full text-sm font-bold sm:max-w-sm">Pesquisar álbuns<input value={search} onChange={e => { setSearch(e.target.value); setLimit(12); }} placeholder="Nome do álbum, equipa ou evento…" className="mt-2 w-full rounded border border-zinc-300 bg-white p-3 font-normal" /></label>}</div>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{filtered.slice(0, limit).map(a => <Link key={a.id} to={`/galeria/${a.id}`} className="group overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-lg"><div className="overflow-hidden bg-zinc-100">{a.cover_url ? <img src={a.cover_url} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover transition duration-300 group-hover:scale-105" /> : <div className="flex aspect-[4/3] items-center justify-center text-zinc-400">Álbum de fotografias</div>}</div><div className="p-5"><p className="text-xs font-bold uppercase tracking-wider text-red-700">{a.category}</p><h2 className="mt-2 font-serif text-2xl text-[#24180f]">{a.title}</h2><p className="mt-3 text-sm text-zinc-500">{formatAlbumDate(a.event_date)}{a.event_date && ' · '}{a.gdrb_gallery_photos?.[0]?.count ?? 0} fotografias</p><p className="mt-4 text-sm font-bold text-red-700">Ver álbum →</p></div></Link>)}</div>
      {!filtered.length && <p className="py-12 text-zinc-500">{search ? 'Nenhum álbum corresponde à pesquisa.' : 'Ainda não existem álbuns publicados. Em breve, novos momentos do clube para recordar.'}</p>}
      {search && <button onClick={() => { setSearch(''); setLimit(12); }} className="mt-5 text-sm font-bold text-red-700">Limpar pesquisa e ver todos os álbuns</button>}
      {limit < filtered.length && <button onClick={() => setLimit(v => v + 12)} className="mt-8 rounded bg-red-700 px-6 py-3 font-bold text-white">Ver mais álbuns</button>}
    </>}
    {index !== null && album && <GalleryLightbox photos={photos} index={index} title={album.title} onChange={setIndex} onClose={() => setIndex(null)} />}
  </main>;
}
