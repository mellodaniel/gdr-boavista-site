-- Run after both match-sheet migrations. Contains only isolated fixtures; always rolls back.
begin;
set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
select set_config('request.jwt.claim.role','service_role',true);
select set_config('request.jwt.claim.sub','',true);
do $$declare sid uuid:='99000000-0000-4000-8000-000000000010'; row public.gdrb_match_sheets; d jsonb;
begin
 d := '{"schema":1,"id":"99000000-0000-4000-8000-000000000010","ageGroup":"Seniores","season":"2026/2027","calendarId":null,"opponent":"Teste gestão","date":"2026-10-23","time":"15:00","venue":"Teste","competition":"Teste","home":true,"recorder":"Diretor teste","notes":"","status":"draft","outcome":"","rules":{"fieldSize":11,"periodMinutes":45,"periods":2,"reentry":false,"recordGoals":true},"clock":{"period":1,"elapsedMs":0,"startedAt":null},"squad":[],"events":[]}'::jsonb;
 if public.gdrb_save_match_sheet(d,0)<>1 then raise exception 'Shared create failed';end if;
 if (select recorder_id from public.gdrb_match_sheets where id=sid) is not null then raise exception 'Shared writer unexpectedly impersonates a user';end if;
 begin perform public.gdrb_manage_match_sheet(sid,1,'archive');raise exception 'Draft archived';exception when raise_exception then if sqlerrm='Draft archived' then raise;end if;end;
 d:=jsonb_set(d,'{status}','"finished"');
 perform public.gdrb_save_match_sheet(d,1);
 row:=public.gdrb_manage_match_sheet(sid,2,'archive');
 if row.archived_at is null or row.revision<>3 then raise exception 'Archive failed';end if;
 begin perform public.gdrb_save_match_sheet(d,2);raise exception 'Stale save accepted';exception when serialization_failure then null;end;
 begin perform public.gdrb_save_match_sheet(d,3);raise exception 'Archived save accepted';exception when serialization_failure then null;end;
 row:=public.gdrb_manage_match_sheet(sid,3,'trash');
 if row.deleted_at is null or row.archived_at is null then raise exception 'Trash lost archive metadata';end if;
 begin perform public.gdrb_manage_match_sheet(sid,3,'restore');raise exception 'Stale restore accepted';exception when serialization_failure then null;end;
 row:=public.gdrb_manage_match_sheet(sid,4,'restore');
 if row.deleted_at is not null or row.archived_at is null then raise exception 'Restore did not preserve archive state';end if;
 row:=public.gdrb_manage_match_sheet(sid,5,'unarchive');
 if row.archived_at is not null or row.revision<>6 then raise exception 'Unarchive failed';end if;
 if (select count(*) from public.gdrb_match_sheet_versions where sheet_id=sid)<>6 then raise exception 'History incomplete';end if;
 perform public.gdrb_sheet_roster('Seniores');
 -- A deleted running match freezes its clock.
 d:=jsonb_set(jsonb_set(d,'{status}','"live"'),'{clock,startedAt}',to_jsonb(extract(epoch from now())*1000-60000));
 perform public.gdrb_save_match_sheet(d,6);
 row:=public.gdrb_manage_match_sheet(sid,7,'trash');
 if row.document#>>'{clock,startedAt}' is not null or (row.document#>>'{clock,elapsedMs}')::numeric<60000 then raise exception 'Trash did not stop clock';end if;
end;$$;
reset role;
set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
select set_config('request.jwt.claim.role','anon',true);
do $$begin
 begin perform 1 from public.gdrb_match_sheets;raise exception 'Anonymous data leaked';exception when insufficient_privilege then null;end;
 begin perform public.gdrb_manage_match_sheet('99000000-0000-4000-8000-000000000010',8,'restore');raise exception 'Anonymous manage accepted';exception when insufficient_privilege then null;end;
 begin perform public.gdrb_sheet_roster('Seniores');raise exception 'Anonymous roster leaked';exception when insufficient_privilege then null;end;
end;$$;
reset role;
rollback;
