begin;
insert into public.gdrb_gallery_albums(id,title,is_published) values
 ('a1444444-0000-4000-8000-000000000001','Teste temporário publicado',true),
 ('a1444444-0000-4000-8000-000000000002','Teste temporário rascunho',false);
insert into public.gdrb_gallery_photos(id,album_id,image_url,thumbnail_url) values
 ('b1444444-0000-4000-8000-000000000001','a1444444-0000-4000-8000-000000000001','https://example.invalid/test.jpg','https://example.invalid/test.jpg'),
 ('b1444444-0000-4000-8000-000000000002','a1444444-0000-4000-8000-000000000002','https://example.invalid/test.jpg','https://example.invalid/test.jpg');
set local role anon;
do $$ begin
 if (select count(*) from public.gdrb_gallery_albums where id in ('a1444444-0000-4000-8000-000000000001','a1444444-0000-4000-8000-000000000002')) <> 1 then raise exception 'Anonymous album visibility failed'; end if;
 if (select count(*) from public.gdrb_gallery_photos where id in ('b1444444-0000-4000-8000-000000000001','b1444444-0000-4000-8000-000000000002')) <> 1 then raise exception 'Anonymous photo visibility failed'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','089f0166-1c69-4142-a56c-657b5e880cb3',true);
set local role authenticated;
do $$ begin
 if not public.gdrb_gallery_is_admin() then raise exception 'Developer access failed'; end if;
 if (select count(*) from public.gdrb_gallery_albums where id in ('a1444444-0000-4000-8000-000000000001','a1444444-0000-4000-8000-000000000002')) <> 2 then raise exception 'Developer draft visibility failed'; end if;
end $$;
select public.gdrb_gallery_reorder_photos('a1444444-0000-4000-8000-000000000001',array['b1444444-0000-4000-8000-000000000001'::uuid]);
do $$ begin
 begin
  perform public.gdrb_gallery_reorder_photos('a1444444-0000-4000-8000-000000000001',array['b1444444-0000-4000-8000-000000000002'::uuid]);
  raise exception 'Ordering accepted foreign photo';
 exception when raise_exception then
  if SQLERRM = 'Ordering accepted foreign photo' then raise; end if;
 end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','c1444444-0000-4000-8000-000000000001',true);
set local role authenticated;
do $$ begin
 if public.gdrb_gallery_is_admin() then raise exception 'Nonadmin allowed'; end if;
 begin
  insert into public.gdrb_gallery_albums(title) values('Should fail');
  raise exception 'Nonadmin insert allowed';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
rollback;
