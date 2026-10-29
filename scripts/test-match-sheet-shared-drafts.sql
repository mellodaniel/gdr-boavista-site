-- Isolated fixtures; always rolled back. Apply the shared-drafts migration first.
begin;
set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
select set_config('request.jwt.claim.role','service_role',true);
select set_config('request.jwt.claim.sub','',true);
do $$declare sid uuid:=gen_random_uuid(); d jsonb; v integer;
begin
 d:=jsonb_build_object('schema',1,'id',sid,'ageGroup','Seniores','season','2026/2027','calendarId',null,'opponent','','date','','time','','venue','','competition','','home',true,'recorder','','notes','','status','draft','outcome','','rules','{"fieldSize":11,"periodMinutes":45,"periods":2,"reentry":false,"recordGoals":true}'::jsonb,'clock','{"period":1,"elapsedMs":0,"startedAt":null}'::jsonb,'squad','[]'::jsonb,'events','[]'::jsonb);
 v:=public.gdrb_save_match_sheet(d,0);
 if v<>1 or (select document from public.gdrb_match_sheets where id=sid)<>d then raise exception 'Incomplete draft was not preserved';end if;
 d:=d||'{"opponent":"Teste sincronização","date":"2026-10-31"}'::jsonb;
 if public.gdrb_save_match_sheet(d,1)<>2 then raise exception 'Draft could not be continued';end if;
 begin perform public.gdrb_save_match_sheet(d||'{"notes":"stale"}',1);raise exception 'Stale save accepted';exception when serialization_failure then null;end;
 begin perform public.gdrb_save_match_sheet(d||'{"status":"live"}',2);raise exception 'Missing responsible accepted';exception when raise_exception then if sqlerrm='Missing responsible accepted' then raise;end if;end;
 if (select count(*) from public.gdrb_match_sheet_versions where sheet_id=sid)<>2 then raise exception 'History lost';end if;
end;$$;
reset role;
set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
select set_config('request.jwt.claim.role','anon',true);
do $$begin
 begin perform public.gdrb_save_match_sheet('{}'::jsonb,0);raise exception 'Anonymous save accepted';exception when insufficient_privilege then null;end;
end;$$;
reset role;
rollback;
select 'PASS: draft persistence, continuation, conflict, live validation and access; fixtures rolled back' as verification;
