-- Run on a disposable/staging Supabase database AFTER the migration. Always rolls back.
begin;
insert into auth.users(id,email) values
 ('11000000-0000-4000-8000-000000000001','match-sheet-test-1@example.invalid'),
 ('11000000-0000-4000-8000-000000000002','match-sheet-test-2@example.invalid');
insert into public.gdrb_match_sheet_access(user_id,age_group,can_edit) values
 ('11000000-0000-4000-8000-000000000001','Seniores',true),
 ('11000000-0000-4000-8000-000000000002','Juniores',true);
create temporary table fixture(document jsonb);
insert into fixture values ('{"schema":1,"id":"11000000-0000-4000-8000-000000000010","ageGroup":"Seniores","season":"2026/2027","calendarId":null,"opponent":"Teste","date":"2026-10-23","time":"15:00","venue":"Teste","competition":"Teste","home":true,"recorder":"Diretor teste","notes":"","status":"draft","outcome":"","rules":{"fieldSize":11,"periodMinutes":45,"periods":2,"reentry":false,"recordGoals":true},"clock":{"period":1,"elapsedMs":0,"startedAt":null},"squad":[],"events":[]}');
grant select on fixture to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000001',true);
do $$begin
 if public.gdrb_save_match_sheet((select document from fixture),0)<>1 then raise exception 'First revision failed';end if;
 if (select count(*) from public.gdrb_match_sheets where id='11000000-0000-4000-8000-000000000010')<>1 then raise exception 'Recorder cannot read sheet';end if;
 begin
  perform public.gdrb_save_match_sheet((select document from fixture),0);
  raise exception 'Stale update was accepted';
 exception when serialization_failure then null;end;
 if public.gdrb_save_match_sheet((select jsonb_set(document,'{notes}','"Corrigida"') from fixture),1)<>2 then raise exception 'Next revision failed';end if;
 if (select count(*) from public.gdrb_match_sheet_versions where sheet_id='11000000-0000-4000-8000-000000000010')<>2 then raise exception 'Revision audit missing';end if;
 begin
  update public.gdrb_match_sheets set revision=900 where id='11000000-0000-4000-8000-000000000010';
  raise exception 'Direct write bypassed RPC';
 exception when insufficient_privilege then null;end;
end;$$;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000002',true);
do $$begin
 if exists(select 1 from public.gdrb_match_sheets where id='11000000-0000-4000-8000-000000000010') then raise exception 'Cross-team read leaked';end if;
 if exists(select 1 from public.gdrb_match_sheet_versions where sheet_id='11000000-0000-4000-8000-000000000010') then raise exception 'Version history leaked';end if;
 begin perform public.gdrb_save_match_sheet((select document from fixture),2);raise exception 'Cross-team write accepted';exception when insufficient_privilege then null;end;
 begin perform public.gdrb_sheet_grant('match-sheet-test-2@example.invalid','Seniores',true,false);raise exception 'Non-admin granted access';exception when insufficient_privilege then null;end;
end;$$;
reset role;
insert into public.gdrb_match_sheet_access(user_id,age_group,can_edit) values('11000000-0000-4000-8000-000000000002','Seniores',false);
set local role authenticated;
do $$begin
 if not exists(select 1 from public.gdrb_match_sheets where id='11000000-0000-4000-8000-000000000010') then raise exception 'Read-only access failed';end if;
 begin perform public.gdrb_save_match_sheet((select document from fixture),2);raise exception 'Read-only account wrote data';exception when insufficient_privilege then null;end;
end;$$;
set local role anon;
do $$begin
 begin perform 1 from public.gdrb_match_sheets;raise exception 'Anonymous read accepted';exception when insufficient_privilege then null;end;
 begin perform public.gdrb_sheet_roster('Seniores');raise exception 'Anonymous roster access accepted';exception when insufficient_privilege then null;end;
end;$$;
reset role;
rollback;
