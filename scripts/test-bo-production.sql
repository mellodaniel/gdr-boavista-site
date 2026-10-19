-- Executed with migration in a transaction that is rolled back.
create temporary table bo_prod_test(id uuid);
grant all on bo_prod_test to authenticated,anon;
set local role authenticated;
select set_config('request.jwt.claim.sub','089f0166-1c69-4142-a56c-657b5e880cb3',true);
do $$ declare m uuid; c uuid;
begin
 if not public.gdrb_gallery_is_admin() then raise exception 'TEST: Developer lost admin'; end if;
 insert into public.gdrb_matches(team_name,football_type,competition,opponent,match_date,venue_type,status,is_visible)
 values('Seniores','Futebol 11','TEST ROLLBACK','TEST',current_date,'casa','agendado',false) returning id into m;
 insert into bo_prod_test values(m);
 if not exists(select 1 from public.gdrb_matches where id=m) then raise exception 'TEST: Developer cannot read hidden'; end if;
 update public.gdrb_matches set location='TEST LOCATION' where id=m;
 if not found then raise exception 'TEST: Developer cannot update'; end if;
 insert into public.gdrb_competitions(team_name,season,name) values('Seniores','2026/27','TEST ADMIN') returning id into c;
 update public.gdrb_competitions set phase='test' where id=c;
 delete from public.gdrb_competitions where id=c;
end; $$;
reset role;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
 if exists(select 1 from public.gdrb_matches where id=(select id from bo_prod_test)) then raise exception 'TEST: hidden exposed'; end if;
 begin
  update public.gdrb_matches set opponent='BAD' where id=(select id from bo_prod_test);
  raise exception 'TEST: anon write allowed';
 exception when insufficient_privilege then null; end;
 begin
  perform public.gdrb_chat_reserve(gen_random_uuid(),repeat('a',64));
  raise exception 'TEST: anon RPC allowed';
 exception when insufficient_privilege then null; end;
end; $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
do $$ begin
 update public.gdrb_matches set opponent='BAD' where id=(select id from bo_prod_test);
 if found then raise exception 'TEST: ordinary user can update'; end if;
 begin
  insert into public.gdrb_matches(team_name,football_type,competition,opponent,match_date,venue_type,status,is_visible) values('Seniores','Futebol 11','BAD','BAD',current_date,'casa','agendado',true);
  raise exception 'TEST: ordinary user can insert';
 exception when insufficient_privilege then null; end;
end; $$;
select set_config('request.jwt.claim.sub','089f0166-1c69-4142-a56c-657b5e880cb3',true);
do $$ begin
 delete from public.gdrb_matches where id=(select id from bo_prod_test);
 if not found then raise exception 'TEST: Developer cannot delete'; end if;
end; $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
do $$ declare m date:=date_trunc('month',now() at time zone 'UTC')::date; r uuid:=gen_random_uuid(); before_settle bigint; after_settle bigint;
begin
 insert into public.gdrb_chat_budget_months(month) values(m) on conflict do nothing;
 update public.gdrb_chat_budget_months set charged_microusd=4450000 where month=m;
 perform public.gdrb_chat_reserve(r,repeat('b',64));
 begin
  perform public.gdrb_chat_reserve(gen_random_uuid(),repeat('c',64));
  raise exception 'TEST: budget exceeded';
 exception when raise_exception then if sqlerrm<>'CHAT_BUDGET' then raise; end if; end;
 begin
  perform public.gdrb_chat_reserve(r,repeat('b',64));
  raise exception 'TEST: duplicate paid reservation';
 exception when raise_exception then if sqlerrm<>'CHAT_DUPLICATE' then raise; end if; end;
 perform public.gdrb_chat_settle(r,1000,100);
 select charged_microusd into before_settle from public.gdrb_chat_budget_months where month=m;
 if before_settle<>4450325 then raise exception 'TEST: settlement arithmetic'; end if;
 perform public.gdrb_chat_settle(r,0,0);
 select charged_microusd into after_settle from public.gdrb_chat_budget_months where month=m;
 if before_settle<>after_settle then raise exception 'TEST: duplicate refund'; end if;
 update public.gdrb_chat_budget_months set charged_microusd=0 where month=m;
 for i in 1..8 loop perform public.gdrb_chat_reserve(gen_random_uuid(),repeat('d',64)); end loop;
 begin
  perform public.gdrb_chat_reserve(gen_random_uuid(),repeat('d',64));
  raise exception 'TEST: rate exceeded';
 exception when raise_exception then if sqlerrm<>'CHAT_RATE' then raise; end if; end;
end; $$;
select 'PASS Developer full match CRUD + source editing; hidden visibility; anonymous/ordinary denial; central cap; duplicate reservation; exact/idempotent settlement; rate limit' as verification;
