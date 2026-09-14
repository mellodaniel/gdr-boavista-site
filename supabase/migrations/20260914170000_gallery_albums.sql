-- Additive migration: retains gdrb_gallery_items and all existing files.
begin;
create or replace function public.gdrb_gallery_is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from auth.users where id = (select auth.uid())
    and lower(email) in ('admin@gdrboavista.local', 'developer@gdrboavista.local'));
$$;
revoke all on function public.gdrb_gallery_is_admin() from public;
grant execute on function public.gdrb_gallery_is_admin() to authenticated;

create table if not exists public.gdrb_gallery_albums (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) > 0),
  description text,
  event_date date,
  category text not null default 'GDR Boavista',
  is_published boolean not null default false,
  cover_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  legacy_key text unique
);
create table if not exists public.gdrb_gallery_photos (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.gdrb_gallery_albums(id) on delete cascade,
  image_url text not null,
  thumbnail_url text not null,
  storage_path text,
  thumbnail_path text,
  original_name text,
  width integer,
  height integer,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  legacy_item_id uuid unique
);
create index if not exists gdrb_gallery_photos_album_order on public.gdrb_gallery_photos(album_id, sort_order, created_at);
create index if not exists gdrb_gallery_albums_published_date on public.gdrb_gallery_albums(is_published, event_date desc, created_at desc);
alter table public.gdrb_gallery_albums enable row level security;
alter table public.gdrb_gallery_photos enable row level security;
grant select on public.gdrb_gallery_albums, public.gdrb_gallery_photos to anon, authenticated;
grant insert, update, delete on public.gdrb_gallery_albums, public.gdrb_gallery_photos to authenticated;

drop policy if exists "Gallery albums public read" on public.gdrb_gallery_albums;
create policy "Gallery albums public read" on public.gdrb_gallery_albums for select to anon, authenticated using (is_published);
drop policy if exists "Gallery albums admin manage" on public.gdrb_gallery_albums;
create policy "Gallery albums admin manage" on public.gdrb_gallery_albums for all to authenticated using ((select public.gdrb_gallery_is_admin())) with check ((select public.gdrb_gallery_is_admin()));
drop policy if exists "Gallery photos public read" on public.gdrb_gallery_photos;
create policy "Gallery photos public read" on public.gdrb_gallery_photos for select to anon, authenticated using (exists (select 1 from public.gdrb_gallery_albums a where a.id = album_id and a.is_published));
drop policy if exists "Gallery photos admin manage" on public.gdrb_gallery_photos;
create policy "Gallery photos admin manage" on public.gdrb_gallery_photos for all to authenticated using ((select public.gdrb_gallery_is_admin())) with check ((select public.gdrb_gallery_is_admin()));

-- New upload paths stay under galeria/albuns. The old gallery policies remain unchanged.
drop policy if exists "Gallery albums storage insert" on storage.objects;
create policy "Gallery albums storage insert" on storage.objects for insert to authenticated with check (bucket_id = 'gdrb-gallery-images' and (storage.foldername(name))[1] = 'galeria' and (storage.foldername(name))[2] = 'albuns' and (select public.gdrb_gallery_is_admin()));
drop policy if exists "Gallery albums storage read" on storage.objects;
create policy "Gallery albums storage read" on storage.objects for select to authenticated using (bucket_id = 'gdrb-gallery-images' and (storage.foldername(name))[1] = 'galeria' and (storage.foldername(name))[2] = 'albuns' and (select public.gdrb_gallery_is_admin()));
drop policy if exists "Gallery albums storage update" on storage.objects;
create policy "Gallery albums storage update" on storage.objects for update to authenticated using (bucket_id = 'gdrb-gallery-images' and (storage.foldername(name))[1] = 'galeria' and (storage.foldername(name))[2] = 'albuns' and (select public.gdrb_gallery_is_admin())) with check (bucket_id = 'gdrb-gallery-images' and (storage.foldername(name))[1] = 'galeria' and (storage.foldername(name))[2] = 'albuns' and (select public.gdrb_gallery_is_admin()));
drop policy if exists "Gallery albums storage delete" on storage.objects;
create policy "Gallery albums storage delete" on storage.objects for delete to authenticated using (bucket_id = 'gdrb-gallery-images' and (storage.foldername(name))[1] = 'galeria' and (storage.foldername(name))[2] = 'albuns' and (select public.gdrb_gallery_is_admin()));

-- Preserve visible and hidden photos separately. Rerunning cannot duplicate them.
do $$
begin
  if to_regclass('public.gdrb_gallery_items') is not null then
    insert into public.gdrb_gallery_albums(title, description, is_published, legacy_key)
    select case when coalesce(is_active,false) then 'Memórias do clube' else 'Fotografias por organizar' end,
      'Fotografias da galeria anterior.', coalesce(is_active,false),
      case when coalesce(is_active,false) then 'legacy-visible' else 'legacy-hidden' end
    from public.gdrb_gallery_items where image_url is not null and btrim(image_url) <> ''
    group by coalesce(is_active,false) on conflict (legacy_key) do nothing;
    insert into public.gdrb_gallery_photos(album_id,image_url,thumbnail_url,sort_order,legacy_item_id,created_at)
    select a.id,i.image_url,i.image_url,coalesce(i.sort_order,0),i.id,coalesce(i.created_at,now())
    from public.gdrb_gallery_items i join public.gdrb_gallery_albums a
      on a.legacy_key = case when coalesce(i.is_active,false) then 'legacy-visible' else 'legacy-hidden' end
    where i.image_url is not null and btrim(i.image_url) <> ''
    on conflict (legacy_item_id) do nothing;
    update public.gdrb_gallery_albums a set cover_url =
      (select p.thumbnail_url from public.gdrb_gallery_photos p where p.album_id=a.id order by p.sort_order,p.created_at limit 1)
    where a.legacy_key is not null and a.cover_url is null;
  end if;
end $$;
create or replace function public.gdrb_gallery_reorder_photos(target_album uuid, photo_ids uuid[])
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if not public.gdrb_gallery_is_admin() then raise exception 'Sem permissão para ordenar fotografias'; end if;
  perform 1 from public.gdrb_gallery_albums where id=target_album for update;
  if cardinality(photo_ids) <> (select count(*) from public.gdrb_gallery_photos where album_id=target_album)
    or cardinality(photo_ids) <> (select count(distinct id) from unnest(photo_ids) as ids(id))
    or exists (select 1 from unnest(photo_ids) as ids(id) where not exists (select 1 from public.gdrb_gallery_photos p where p.id=ids.id and p.album_id=target_album))
  then raise exception 'As fotografias do álbum mudaram. Reabre o álbum e tenta novamente.'; end if;
  update public.gdrb_gallery_photos p set sort_order=ordered.position-1
    from unnest(photo_ids) with ordinality as ordered(id,position) where p.id=ordered.id and p.album_id=target_album;
end $$;
revoke all on function public.gdrb_gallery_reorder_photos(uuid,uuid[]) from public;
grant execute on function public.gdrb_gallery_reorder_photos(uuid,uuid[]) to authenticated;
notify pgrst, 'reload schema';
commit;
