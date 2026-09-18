-- Integration checks: all fixtures and operations are rolled back.
begin;
insert into public.gdrb_roster_players(id,team_key,name,roster_group,is_active) values
('d9180000-0000-4000-8000-000000000001','junior','TESTE JUNIOR VISIVEL','Guarda-redes',true),
('d9180000-0000-4000-8000-000000000002','junior','TESTE JUNIOR OCULTO','Defesas',false),
('d9180000-0000-4000-8000-000000000003','senior','TESTE SENIOR','Médios',true);
set local role anon;
do $$ begin
 if (select count(*) from public.gdrb_roster_players where id::text like 'd9180000-%' and team_key='junior') <> 1 then raise exception 'Public junior visibility failed'; end if;
 begin
  insert into public.gdrb_roster_players(team_key,name,roster_group) values('junior','UNAUTHORIZED','Médios');
  raise exception 'Anonymous write allowed';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',(select id::text from auth.users where email='admin@gdrboavista.local'),true);
set local role authenticated;
do $$ begin
 if auth.uid() is null then raise exception 'Missing admin account'; end if;
 if (select count(*) from public.gdrb_roster_players where id::text like 'd9180000-%' and team_key='junior') <> 2 then raise exception 'Admin visibility failed'; end if;
 update public.gdrb_roster_players set name='TESTE EDITADO' where id='d9180000-0000-4000-8000-000000000001' and team_key='junior';
 if not found then raise exception 'Update failed'; end if;
 insert into public.gdrb_roster_players(id,team_key,name,roster_group,is_active) values('d9180000-0000-4000-8000-000000000004','junior','TESTE STAFF','Equipa técnica',false);
 delete from public.gdrb_roster_players where id='d9180000-0000-4000-8000-000000000004' and team_key='junior';
 if not found then raise exception 'Delete failed'; end if;
 insert into storage.objects(bucket_id,name) values('gdrb-roster-images','junior/teste-admin-d9180000.png');
end $$;
reset role;
select set_config('request.jwt.claim.sub',(select id::text from auth.users where email='developer@gdrboavista.local'),true);
set local role authenticated;
do $$ begin
 if auth.uid() is null then raise exception 'Missing developer account'; end if;
 if (select count(*) from public.gdrb_roster_players where id::text like 'd9180000-%' and team_key='junior') <> 2 then raise exception 'Admin visibility failed'; end if;
 update public.gdrb_roster_players set name='TESTE EDITADO' where id='d9180000-0000-4000-8000-000000000001' and team_key='junior';
 if not found then raise exception 'Update failed'; end if;
 insert into public.gdrb_roster_players(id,team_key,name,roster_group,is_active) values('d9180000-0000-4000-8000-000000000004','junior','TESTE STAFF','Equipa técnica',false);
 delete from public.gdrb_roster_players where id='d9180000-0000-4000-8000-000000000004' and team_key='junior';
 if not found then raise exception 'Delete failed'; end if;
 insert into storage.objects(bucket_id,name) values('gdrb-roster-images','junior/teste-developer-d9180000.png');
end $$;
reset role;
rollback;
