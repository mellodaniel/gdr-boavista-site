-- Run after migration; every test write is rolled back.
begin;
do $$
declare age_name text; count_teams integer;
begin
 select count(*) into count_teams from public.gdrb_age_groups;
 if count_teams<>12 then raise exception 'Expected 12 age groups'; end if;
 foreach age_name in array array['ABCs','Petizes','Traquinas A','Traquinas B','Benjamins A','Benjamins B','Sub-12'] loop
   begin
     insert into public.gdrb_matches(team_name,competition,opponent,match_date,home_score,away_score,status) values(age_name,'TEST','TEST',current_date,1,0,'terminado');
     raise exception 'TEST_FAILED: score accepted';
   exception when raise_exception then if sqlerrm like 'TEST_FAILED%' then raise; end if; end;
   insert into public.gdrb_matches(team_name,competition,opponent,match_date,result_outcome,status,is_visible) values(age_name,'TEST','TEST',current_date,'win','terminado',false);
 end loop;
 begin
  insert into public.gdrb_matches(team_name,competition,opponent,match_date,status) values('Sub-12','TEST','TEST',current_date,'terminado');
  raise exception 'TEST_FAILED: missing outcome accepted';
 exception when raise_exception then if sqlerrm like 'TEST_FAILED%' then raise; end if; end;
 begin
  insert into public.gdrb_matches(team_name,competition,opponent,match_date,status) values('Sub-99','TEST','TEST',current_date,'agendado');
  raise exception 'TEST_FAILED: invalid age group accepted';
 exception when raise_exception then if sqlerrm like 'TEST_FAILED%' then raise; end if; end;
 insert into public.gdrb_matches(team_name,competition,opponent,match_date,home_score,away_score,status,is_visible) values('Sub-13','TEST','TEST',current_date,0,0,'terminado',false);
 if not exists(select 1 from public.gdrb_matches where team_name='Sub-12' and opponent='Ginásio de Alcobaça' and match_date='2026-10-03' and result_outcome='loss' and home_score is null and away_score is null) then raise exception 'Missing confirmed fixture'; end if;
end $$;
do $$
declare tid uuid; ta uuid; tb uuid;
begin
 insert into public.tournaments(name,slug,age_group,is_public) values('TEST','test-age-group-'||gen_random_uuid(),'Sub-12',false) returning id into tid;
 insert into public.tournament_teams(tournament_id,name) values(tid,'A') returning id into ta;
 insert into public.tournament_teams(tournament_id,name) values(tid,'B') returning id into tb;
 begin
  insert into public.tournament_matches(tournament_id,team_a_id,team_b_id,status,score_a,score_b) values(tid,ta,tb,'finished',1,0);
  raise exception 'TEST_FAILED: tournament numeric score accepted';
 exception when raise_exception then if sqlerrm like 'TEST_FAILED%' then raise; end if; end;
 begin
  insert into public.tournament_matches(tournament_id,team_a_id,team_b_id,status) values(tid,ta,tb,'finished');
  raise exception 'TEST_FAILED: tournament missing winner accepted';
 exception when raise_exception then if sqlerrm like 'TEST_FAILED%' then raise; end if; end;
 insert into public.tournament_matches(tournament_id,team_a_id,team_b_id,status,result_winner) values(tid,ta,tb,'finished','b');
end $$;
select 'Migration and result rules passed; all changes rolled back' as result;
rollback;

