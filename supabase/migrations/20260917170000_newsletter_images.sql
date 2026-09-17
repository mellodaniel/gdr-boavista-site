begin;
alter table public.gdrb_communications add column if not exists images jsonb not null default '[]'::jsonb
  check (jsonb_typeof(images) = 'array' and jsonb_array_length(images) <= 10);
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gdrb-newsletter-images', 'gdrb-newsletter-images', true, 10485760, array['image/jpeg'])
on conflict (id) do nothing;
drop policy if exists "Newsletter photos admin insert" on storage.objects;
create policy "Newsletter photos admin insert" on storage.objects for insert to authenticated
with check (bucket_id = 'gdrb-newsletter-images' and (select public.gdrb_gallery_is_admin()));
-- Keep sent photos immutable: no update/delete policy, to preserve historic emails.
notify pgrst, 'reload schema';
commit;
