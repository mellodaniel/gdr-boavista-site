-- Run in one transaction; test rows/fixture updates are rolled back.
create temporary table bo_test_ids(comp uuid, snapshot uuid, match uuid);
do $$
declare c uuid; s uuid; m uuid; n integer;
begin
  insert into public.gdrb_competitions(team_name,season,name,series)
  values('Seniores','2026/27','TEST ONLY - rollback','test') returning id into c;
  insert into public.gdrb_standings_snapshots(competition_id,as_of,source_name,source_url,expected_teams)
  values(c,current_date,'Teste','https://example.com/test',2) returning id into s;
  begin
    update public.gdrb_standings_snapshots set is_published=true where id=s;
    raise exception 'TEST FAIL: empty snapshot published';
  exception when raise_exception then if sqlerrm like 'TEST FAIL:%' then raise; end if; end;
  insert into public.gdrb_standings_rows(snapshot_id,position,club_name,is_boavista,played,won,drawn,lost,points)
  values(s,1,'GDR Boavista',true,1,1,0,0,3),(s,2,'Test opponent',false,1,0,0,1,0);
  update public.gdrb_standings_snapshots set is_published=true where id=s;
  begin
    update public.gdrb_standings_rows set points=9 where snapshot_id=s and is_boavista;
    raise exception 'TEST FAIL: published row altered';
  exception when raise_exception then if sqlerrm like 'TEST FAIL:%' then raise; end if; end;
  insert into public.gdrb_matches(team_name,football_type,competition,opponent,match_date,match_time,venue_type,status,home_score,away_score,is_visible)
  values('Seniores','Futebol 11','TEST ONLY','Test opponent',current_date,'15:00','fora','terminado',2,0,true) returning id into m;
  insert into public.gdrb_match_scorers(match_id,public_name,goals,source_name,is_published)
  values(m,'Test player',2,'Teste',true);
  begin
    insert into public.gdrb_match_scorers(match_id,public_name,goals,source_name,is_published)
    values(m,'Test extra',1,'Teste',true);
    raise exception 'TEST FAIL: scorer total overflow';
  exception when raise_exception then if sqlerrm like 'TEST FAIL:%' then raise; end if; end;
  update public.gdrb_matches set match_time='16:00' where id=m;
  select count(*) into n from public.gdrb_match_schedule_changes where match_id=m and previous_time='15:00' and new_time='16:00' and not is_confirmed;
  if n<>1 then raise exception 'TEST FAIL: schedule not tracked'; end if;
  update public.gdrb_matches set match_time='16:00' where id=m;
  select count(*) into n from public.gdrb_match_schedule_changes where match_id=m;
  if n<>1 then raise exception 'TEST FAIL: no-op duplicated history'; end if;
  insert into bo_test_ids values(c,s,m);
end; $$;
grant select on bo_test_ids to anon,authenticated;
set local role anon;
do $$
begin
  if not exists(select 1 from public.gdrb_latest_standings where competition_id=(select comp from bo_test_ids)) then raise exception 'TEST FAIL: published standings hidden'; end if;
  if (select count(*) from public.gdrb_match_scorers where match_id=(select match from bo_test_ids)) <> 1 then raise exception 'TEST FAIL: published scorers hidden'; end if;
  if exists(select 1 from public.gdrb_match_schedule_changes where match_id=(select match from bo_test_ids)) then raise exception 'TEST FAIL: unconfirmed history public'; end if;
  begin
    insert into public.gdrb_competitions(team_name,season,name) values('Seniores','2026/27','Unauthorized');
    raise exception 'TEST FAIL: anon write';
  exception when insufficient_privilege then null; end;
end; $$;
reset role;
-- Ordinary authenticated users do not have editorial privileges.
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
do $$
begin
  begin
    insert into public.gdrb_competitions(team_name,season,name) values('Seniores','2026/27','Unauthorized');
    raise exception 'TEST FAIL: ordinary account write';
  exception when insufficient_privilege then null; end;
end; $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
update public.gdrb_matches set home_score=1 where id=(select match from bo_test_ids);
do $$ begin
 if exists(select 1 from public.gdrb_match_scorers where match_id=(select match from bo_test_ids) and is_published) then raise exception 'TEST FAIL: corrected result kept stale scorers public'; end if;
end; $$;
update public.gdrb_standings_snapshots set is_published=false where id=(select snapshot from bo_test_ids);
set local role anon;
do $$
begin
 if exists(select 1 from public.gdrb_standings_rows where snapshot_id=(select snapshot from bo_test_ids)) then raise exception 'TEST FAIL: draft rows public'; end if;
end; $$;
reset role;
select 'PASS: snapshot validation, publication, immutable rows, scorer totals and correction invalidation, schedule capture, no-op, anonymous/ordinary-account write denial, draft confidentiality' as verification;
