import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../../lib/supabase';
import { albumSelect, galleryBucket, galleryError, galleryPhotoSelect, uploadAlbumPhoto, type Album, type Photo } from '../../lib/gallery';
import { GalleryLightbox } from '../../components/GalleryLightbox';

type Job = { id: string; file: File; order: number; status: 'pending' | 'working' | 'done' | 'failed'; message: string };
const emptyForm = { title: '', description: '', category: 'GDR Boavista', event_date: '' };
const button = 'min-h-11 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40';
const input = 'mt-2 w-full rounded-lg border border-zinc-300 bg-white p-3 font-normal';

export function AdminGalleryPage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selected, setSelected] = useState<Album | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [dirty, setDirty] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [savedQueues, setSavedQueues] = useState<Record<string, Job[]>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [index, setIndex] = useState<number | null>(null);
  const stop = useRef(false);
  const active = useRef(false);
  const mounted = useRef(true);
  const locked = busy || uploading;
  const pending = jobs.filter(j => j.status === 'pending' || j.status === 'failed');

  const waitingElsewhere = Object.entries(savedQueues).filter(([id]) => id !== selected?.id).reduce((count, [, queue]) => count + queue.length, 0);

  async function loadAlbums() {
    const all: Album[] = [];
    for (let from = 0; ; from += 500) {
      const result = await supabase.from('gdrb_gallery_albums').select(albumSelect).order('created_at', { ascending: false }).range(from, from + 499);
      if (result.error) throw result.error;
      all.push(...result.data as Album[]);
      if (result.data.length < 500) break;
    }
    if (mounted.current) setAlbums(all);
  }
  useEffect(() => {
    mounted.current = true;
    void loadAlbums().catch(e => setError(galleryError(e))).finally(() => setLoading(false));
    return () => { mounted.current = false; stop.current = true; };
  }, []);
  useEffect(() => {
    if (!dirty && !uploading && !pending.length && !waitingElsewhere) return;
    const guard = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [dirty, uploading, pending.length, waitingElsewhere]);
  async function run(action: () => Promise<void>) {
    if (active.current) return;
    active.current = true; setBusy(true); setError(''); setSuccess('');
    try { await action(); } catch (e) { setError(galleryError(e)); }
    finally { active.current = false; setBusy(false); }
  }
  function canLeave() {
    if (locked || active.current) return false;
    if (dirty && !window.confirm('Sair sem guardar as alterações do álbum?')) return false;
    if (selected) setSavedQueues(current => ({ ...current, [selected.id]: pending }));
    return true;
  }
  function backToAlbums() {
    if (!canLeave()) return;
    setEditing(false); setSelected(null); setPhotos([]); setJobs([]);
    setForm(emptyForm); setDirty(false); setIndex(null); setError('');
    setSuccess(pending.length ? 'Podes reabrir o álbum para continuar a fila. Mantém esta página aberta.' : 'Estás na lista de álbuns.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  async function openAlbum(album: Album) {
    if (!canLeave()) return;
    await run(async () => {
      const all: Photo[] = [];
      for (let from = 0; ; from += 500) {
        const result = await supabase.from('gdrb_gallery_photos').select(galleryPhotoSelect).eq('album_id', album.id).order('sort_order').order('id').range(from, from + 499);
        if (result.error) throw result.error;
        all.push(...result.data as Photo[]);
        if (result.data.length < 500) break;
      }
      setSelected(album); setPhotos(all); setJobs(savedQueues[album.id] ?? []); setForm({ title: album.title, description: album.description ?? '', category: album.category, event_date: album.event_date ?? '' }); setDirty(false); setEditing(true); setIndex(null); window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
  function newAlbum() {
    if (!canLeave()) return;
    setSelected(null); setForm(emptyForm); setPhotos([]); setJobs([]); setDirty(false); setEditing(true); setError(''); setSuccess('');
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    await run(async () => {
      const payload = { title: form.title.trim(), description: form.description.trim() || null, category: form.category.trim() || 'GDR Boavista', event_date: form.event_date || null, updated_at: new Date().toISOString() };
      if (!payload.title) throw new Error('Indica o título do álbum.');
      const result = selected ? await supabase.from('gdrb_gallery_albums').update(payload).eq('id', selected.id).select(albumSelect).single() : await supabase.from('gdrb_gallery_albums').insert(payload).select(albumSelect).single();
      if (result.error) throw result.error;
      setSelected(result.data as Album); setDirty(false); setSuccess(result.data.is_published ? 'Alterações guardadas. O álbum está visível na galeria pública.' : 'Álbum guardado em rascunho. Clica em Publicar álbum quando estiver pronto para aparecer no site.'); await loadAlbums();
    });
  }
  async function updateAlbum(payload: Partial<Album>) {
    if (!selected) return;
    const result = await supabase.from('gdrb_gallery_albums').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', selected.id).select(albumSelect).single();
    if (result.error) throw result.error;
    setSelected(result.data as Album); await loadAlbums();
  }
  function addFiles(files: FileList | File[]) {
    if (!selected || locked) return;
    const existing = new Set(jobs.map(j => `${j.file.name}:${j.file.size}:${j.file.lastModified}`));
    let order = Math.max(-1, ...photos.map(p => p.sort_order), ...jobs.map(j => j.order)) + 1;
    const added: Job[] = [];
    for (const file of Array.from(files)) {
      const key = `${file.name}:${file.size}:${file.lastModified}`;
      if (existing.has(key)) continue;
      existing.add(key); added.push({ id: crypto.randomUUID(), file, order: order++, status: 'pending', message: 'À espera' });
    }
    setJobs(current => [...current, ...added]); setError(''); setSuccess('');
  }
  async function upload() {
    if (!selected || active.current || !pending.length) return;
    active.current = true; stop.current = false; setUploading(true); setError(''); setSuccess('');
    const albumId = selected.id;
    let cover = selected.cover_url;
    const patch = (id: string, value: Partial<Job>) => { if (mounted.current) setJobs(current => current.map(j => j.id === id ? { ...j, ...value } : j)); };
    try {
      // One conversion at a time keeps large mobile batches within memory limits.
      for (const job of pending) {
        if (stop.current) break;
        patch(job.id, { status: 'working', message: 'A preparar' });
        try {
          const photo = await uploadAlbumPhoto(albumId, job.file, job.id, job.order, stage => patch(job.id, { message: stage }));
          patch(job.id, { status: 'done', message: 'Concluída' });
          if (mounted.current) setPhotos(current => [...current.filter(p => p.id !== photo.id), photo].sort((a, b) => a.sort_order - b.sort_order));
          if (!cover) {
            const result = await supabase.from('gdrb_gallery_albums').update({ cover_url: photo.thumbnail_url }).eq('id', albumId).is('cover_url', null).select('id');
            if (result.error) { if (mounted.current) setError('Fotografia guardada, mas não foi possível definir a capa. Usa “Usar como capa”.'); }
            else { cover = photo.thumbnail_url; if (mounted.current && result.data.length) setSelected(a => a ? { ...a, cover_url: cover } : a); }
          }
        } catch (e) { patch(job.id, { status: 'failed', message: galleryError(e) }); }
      }
      if (mounted.current) { await loadAlbums(); setSuccess(stop.current ? 'Fila pausada. As fotografias concluídas foram guardadas.' : 'Processamento terminado. Consulta o resultado de cada fotografia abaixo.'); }
    } catch (e) { if (mounted.current) setError(galleryError(e)); }
    finally { active.current = false; if (mounted.current) setUploading(false); }
  }
  async function discard(job: Job) {
    if (job.status === 'pending') { setJobs(v => v.filter(j => j.id !== job.id)); return; }
    await run(async () => {
      // A lost response may still have committed the photo. Keep it in that case.
      const result = await supabase.from('gdrb_gallery_photos').select(galleryPhotoSelect).eq('id', job.id).maybeSingle();
      if (result.error) throw result.error;
      if (result.data) setPhotos(v => [...v.filter(p => p.id !== job.id), result.data as Photo].sort((a,b) => a.sort_order-b.sort_order));
      else if (selected) {
        const base = `galeria/albuns/${selected.id}/${job.id}`;
        const removed = await supabase.storage.from(galleryBucket).remove([`${base}.jpg`, `${base}-thumb.jpg`]);
        if (removed.error) throw removed.error;
      }
      setJobs(v => v.filter(j => j.id !== job.id)); await loadAlbums();
    });
  }
  async function movePhoto(position: number, offset: number) {
    await run(async () => {
      const next = [...photos]; [next[position], next[position + offset]] = [next[position + offset], next[position]];
      const result = await supabase.rpc('gdrb_gallery_reorder_photos', { target_album: selected!.id, photo_ids: next.map(p => p.id) });
      if (result.error) throw result.error;
      setPhotos(next.map((p, i) => ({ ...p, sort_order: i })));
    });
  }
  async function removePhoto(photo: Photo) {
    if (!window.confirm('Apagar esta fotografia do álbum?')) return;
    await run(async () => {
      const remaining = photos.filter(p => p.id !== photo.id);
      if (selected?.cover_url === photo.thumbnail_url || remaining.length === 0) await updateAlbum({ cover_url: remaining[0]?.thumbnail_url ?? null, ...(remaining.length === 0 ? { is_published: false } : {}) });
      const result = await supabase.from('gdrb_gallery_photos').delete().eq('id', photo.id).select('id').single();
      if (result.error) throw result.error;
      setPhotos(remaining); setJobs(v => v.filter(j => j.id !== photo.id));
      const paths = [photo.storage_path, photo.thumbnail_path].filter((p): p is string => !!p);
      if (paths.length) { const removed = await supabase.storage.from(galleryBucket).remove(paths); if (removed.error) throw new Error('Fotografia retirada do álbum, mas a limpeza do armazenamento falhou: ' + removed.error.message); }
      await loadAlbums(); setSuccess('Fotografia apagada.');
    });
  }
  const visible = albums.filter(a => `${a.title} ${a.category}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.3em] text-red-700">Administração</p><h1 className="mt-2 font-serif text-4xl text-[#24180f]">Galeria · Álbuns</h1><p className="mt-2 text-sm text-zinc-500">Organiza os momentos do clube e carrega várias fotografias de uma só vez.</p></div><button onClick={newAlbum} disabled={locked} className={`${button} border-red-700 bg-red-700! text-white`}>+ Criar álbum</button></header>
    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {success && <p role="status" className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">{success}</p>}
    {editing && <button onClick={backToAlbums} disabled={locked} className={button}>← Voltar aos álbuns</button>}
    {editing && <section className="space-y-6 rounded-xl border border-zinc-200 bg-white p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">{selected ? 'Editar álbum' : 'Novo álbum'}</h2><span className="rounded-full bg-zinc-100 px-3 py-1 text-sm">{selected?.is_published ? 'Publicado' : 'Rascunho'}</span></div>
      {selected && <p className={`rounded-lg p-4 text-sm ${selected.is_published ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>{selected.is_published ? 'Este álbum está visível na galeria pública.' : 'Este álbum está em rascunho e ainda não aparece no site. Guarda as alterações e clica em “Publicar álbum”.'}</p>}
      <form onSubmit={e => void save(e)}><fieldset disabled={locked} className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold sm:col-span-2">Título do álbum *<input required maxLength={160} value={form.title} onChange={e => { setForm({ ...form, title: e.target.value }); setDirty(true); }} className={input} placeholder="Ex.: Apresentação dos seniores 2026/27" /></label>
        <label className="text-sm font-bold sm:col-span-2">Descrição<textarea rows={3} maxLength={5000} value={form.description} onChange={e => { setForm({ ...form, description: e.target.value }); setDirty(true); }} className={input} placeholder="Uma breve descrição deste momento do clube." /></label>
        <label className="text-sm font-bold">Data do evento<input type="date" value={form.event_date} onChange={e => { setForm({ ...form, event_date: e.target.value }); setDirty(true); }} className={input} /></label>
        <label className="text-sm font-bold">Equipa ou categoria<input maxLength={80} value={form.category} onChange={e => { setForm({ ...form, category: e.target.value }); setDirty(true); }} className={input} /></label>
        <div className="flex flex-wrap gap-3 sm:col-span-2"><button type="submit" className={button}>{selected ? 'Guardar alterações' : 'Criar e adicionar fotografias'}</button>{selected && <button type="button" disabled={dirty || pending.length > 0 || (!selected.is_published && photos.length === 0)} onClick={() => void run(async () => { await updateAlbum({ is_published: !selected.is_published, cover_url: selected.cover_url ?? photos[0]?.thumbnail_url ?? null }); setSuccess(selected.is_published ? 'Álbum retirado da galeria pública.' : 'Álbum publicado.'); })} className={button}>{selected.is_published ? 'Passar a rascunho' : 'Publicar álbum'}</button>}{selected?.is_published && <a className={button} href={`/galeria/${selected.id}`} target="_blank" rel="noreferrer">Ver no site ↗</a>}</div>
      </fieldset></form>
      {selected && <>
        <div onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files); }} className="rounded-xl border-2 border-dashed border-red-200 bg-red-50/40 p-6 text-center"><p className="font-bold">Arrasta as fotografias para aqui</p><p className="mt-2 text-sm text-zinc-600">Seleciona 10, 20, 50 ou mais fotografias de uma vez. JPG, PNG, WebP, GIF e HEIC/HEIF, até 40 MB por ficheiro.</p><label className={`${button} mt-4 inline-block cursor-pointer`}>Selecionar fotografias<input aria-label="Selecionar várias fotografias" type="file" multiple disabled={locked} accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif" className="sr-only" onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }} /></label><p className="mt-3 text-xs text-zinc-500">As imagens são convertidas para JPEG e otimizadas. Os GIF ficam como imagem estática.</p>{selected.is_published && <p className="mt-2 text-xs text-red-800">Este álbum está publicado: as novas fotografias ficam visíveis à medida que são guardadas.</p>}</div>
        {jobs.length > 0 && <div className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-3"><p role="status" className="text-sm font-bold">{jobs.filter(j => j.status === 'done').length} de {jobs.length} concluídas · {jobs.filter(j => j.status === 'failed').length} com erro</p><div className="flex flex-wrap gap-2"><button className={button} disabled={locked || !pending.length} onClick={() => void upload()}>{jobs.some(j => j.status === 'failed') ? 'Continuar / repetir falhadas' : 'Carregar fotografias'}</button>{uploading && <button className={button} onClick={() => { stop.current = true; setSuccess('A terminar a fotografia atual antes de pausar…'); }}>Pausar</button>}<button className={button} disabled={locked} onClick={() => setJobs(v => v.filter(j => j.status !== 'done'))}>Limpar concluídas</button></div></div><progress aria-label="Fotografias concluídas" max={jobs.length} value={jobs.filter(j => j.status === 'done').length} className="h-2 w-full accent-red-700" /><ul className="max-h-64 divide-y overflow-auto rounded border border-zinc-200">{jobs.map(j => <li key={j.id} className="flex items-center justify-between gap-3 p-3 text-sm"><div className="min-w-0"><p className="truncate font-medium">{j.file.name}</p><p className={j.status === 'failed' ? 'text-red-700' : 'text-zinc-500'}>{j.message}</p></div>{(j.status === 'pending' || j.status === 'failed') && <button disabled={locked} className={button} onClick={() => void discard(j)}>Retirar</button>}</li>)}</ul><p className="text-xs text-zinc-500">Mantém esta página aberta até concluir. Se falhar uma fotografia, as restantes continuam.</p></div>}
        <div><h3 className="font-bold">Fotografias do álbum ({photos.length})</h3><p className="mt-1 text-sm text-zinc-500">Clica para ampliar. Escolhe a capa e ajusta a ordem com as setas.</p><div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">{photos.map((p, i) => <article key={p.id} className="overflow-hidden rounded-lg border border-zinc-200"><button className="block w-full" onClick={() => setIndex(i)} aria-label={`Ampliar fotografia ${i + 1}`}><img src={p.thumbnail_url} alt={`Fotografia ${i + 1}`} loading="lazy" className="aspect-[4/3] w-full object-cover" /></button><div className="space-y-2 p-2"><button disabled={locked || selected.cover_url === p.thumbnail_url} onClick={() => void run(() => updateAlbum({ cover_url: p.thumbnail_url }))} className={`${button} w-full px-2!`}>{selected.cover_url === p.thumbnail_url ? '✓ Capa do álbum' : 'Usar como capa'}</button><div className="flex flex-wrap gap-1"><button aria-label={`Mover fotografia ${i + 1} para trás`} className={button} disabled={locked || pending.length > 0 || i === 0} onClick={() => void movePhoto(i, -1)}>←</button><button aria-label={`Mover fotografia ${i + 1} para a frente`} className={button} disabled={locked || pending.length > 0 || i === photos.length - 1} onClick={() => void movePhoto(i, 1)}>→</button><button className={`${button} text-red-700`} disabled={locked} onClick={() => void removePhoto(p)}>Apagar</button></div></div></article>)}</div>{!photos.length && <p className="py-8 text-sm text-zinc-500">Adiciona as primeiras fotografias e publica o álbum quando estiver pronto.</p>}</div>
      </>}
      <div className="border-t border-zinc-200 pt-4"><button onClick={backToAlbums} disabled={locked} className={button}>← Voltar aos álbuns</button></div>
    </section>}
    {!editing && <section>{waitingElsewhere > 0 && <p role="status" className="mb-4 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">Tens {waitingElsewhere} fotografias por concluir. Reabre o respetivo álbum para continuar. Mantém esta página aberta para conservar a fila.</p>}<div className="flex flex-wrap items-center justify-between gap-4"><h2 className="text-xl font-bold">Os álbuns ({albums.length})</h2><input aria-label="Pesquisar álbuns" placeholder="Pesquisar álbum ou equipa…" value={search} onChange={e => setSearch(e.target.value)} className="rounded-lg border border-zinc-300 bg-white p-3 text-sm" /></div>{loading ? <p className="py-8">A carregar álbuns…</p> : <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{visible.map(a => <button key={a.id} disabled={locked} onClick={() => void openAlbum(a)} className={`overflow-hidden rounded-xl border bg-white text-left disabled:opacity-50 ${selected?.id === a.id ? 'border-red-700 ring-1 ring-red-700' : 'border-zinc-200'}`}>{a.cover_url ? <img src={a.cover_url} alt="" loading="lazy" className="aspect-[16/9] w-full object-cover" /> : <div className="flex aspect-[16/9] items-center justify-center bg-zinc-100 text-zinc-400">Sem capa</div>}<div className="p-4"><p className="text-xs font-bold text-red-700">{a.is_published ? 'Publicado' : 'Rascunho'} · {a.gdrb_gallery_photos?.[0]?.count ?? 0} fotografias</p><h3 className="mt-2 font-bold">{a.title}</h3>{!!savedQueues[a.id]?.length && <p className="mt-2 text-sm font-bold text-amber-800">{savedQueues[a.id].length} fotografias por concluir</p>}<p className="mt-1 text-sm text-zinc-500">{a.category}</p></div></button>)}</div>}{!loading && !visible.length && <p className="py-8 text-zinc-500">{search ? 'Nenhum álbum encontrado.' : 'Cria o primeiro álbum para começar.'}</p>}</section>}
    {index !== null && selected && <GalleryLightbox photos={photos} index={index} title={selected.title} onChange={setIndex} onClose={() => setIndex(null)} />}
  </div>;
}
