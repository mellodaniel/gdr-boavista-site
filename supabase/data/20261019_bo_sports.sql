-- Source: FPF Centro de Resultados, season 2026/27; read 19 October 2026.
-- Public sporting data only. Existing games and access permissions are unchanged.
begin;
select pg_advisory_xact_lock(715,20261020);
insert into public.gdrb_competitions(team_name,season,name,phase,series,source_url,external_id) values ('Seniores','2026/27','CD LIZSPORT - DIV. HONRA - FUT.11','FASE ÚNICA','','https://resultados.fpf.pt/Competition/Details?competitionId=29885&seasonId=106#htmlSerieId_97965','FPF:97965') on conflict(team_name,season,name,phase,series) do nothing;
do $import$ declare cid uuid; begin select id into strict cid from public.gdrb_competitions where team_name='Seniores' and season='2026/27' and name='CD LIZSPORT - DIV. HONRA - FUT.11' and phase='FASE ÚNICA' and series=''; if not exists(select 1 from public.gdrb_standings_snapshots where id='90702a6d-8ac9-5f94-9328-d90ad922c977') then
insert into public.gdrb_standings_snapshots(id,as_of,round_label,expected_teams,source_name,source_url,checked_at,competition_id) values ('90702a6d-8ac9-5f94-9328-d90ad922c977','2026-10-19','Consulta de 19/10/2026. A FPF indica que os resultados só se tornam oficiais quinze dias após cada encontro.',16,'FPF / AF Leiria','https://resultados.fpf.pt/Competition/Details?competitionId=29885&seasonId=106#htmlSerieId_97965','2026-10-19T15:10:07.015Z',cid);
insert into public.gdrb_standings_rows(snapshot_id,position,club_name,is_boavista,played,won,drawn,lost,goals_for,goals_against,points) values
('90702a6d-8ac9-5f94-9328-d90ad922c977',1,'Up - União De Pombal',false,5,4,0,1,13,2,12),
('90702a6d-8ac9-5f94-9328-d90ad922c977',2,'Gd Guiense',false,5,4,0,1,13,7,12),
('90702a6d-8ac9-5f94-9328-d90ad922c977',3,'Ccr Alqueidão Serra',false,5,4,0,1,13,9,12),
('90702a6d-8ac9-5f94-9328-d90ad922c977',4,'Sce Bombarralense',false,4,3,1,0,6,1,10),
('90702a6d-8ac9-5f94-9328-d90ad922c977',5,'Sc Pombal',false,5,3,1,1,7,4,10),
('90702a6d-8ac9-5f94-9328-d90ad922c977',6,'Gd Peniche',false,5,2,3,0,8,4,9),
('90702a6d-8ac9-5f94-9328-d90ad922c977',7,'Id Vieirense',false,5,2,2,1,9,8,8),
('90702a6d-8ac9-5f94-9328-d90ad922c977',8,'Ad Portomosense',false,5,2,2,1,8,7,8),
('90702a6d-8ac9-5f94-9328-d90ad922c977',9,'Gc Alcobaça',false,5,2,1,2,10,5,7),
('90702a6d-8ac9-5f94-9328-d90ad922c977',10,'S Lisboa E Marinha',false,5,1,2,2,9,9,5),
('90702a6d-8ac9-5f94-9328-d90ad922c977',11,'Ac Marinhense',false,5,1,1,3,3,6,4),
('90702a6d-8ac9-5f94-9328-d90ad922c977',12,'A Beneditense Cd',false,5,1,1,3,5,10,4),
('90702a6d-8ac9-5f94-9328-d90ad922c977',13,'Scl Marrazes',false,5,1,1,3,4,11,4),
('90702a6d-8ac9-5f94-9328-d90ad922c977',14,'Caldas Sc "B"',false,5,1,0,4,5,9,3),
('90702a6d-8ac9-5f94-9328-d90ad922c977',15,'Gd Ilha',false,5,0,1,4,4,12,1),
('90702a6d-8ac9-5f94-9328-d90ad922c977',16,'Gdr Boavista',true,4,0,0,4,3,16,0);
update public.gdrb_standings_snapshots set is_published=true where id='90702a6d-8ac9-5f94-9328-d90ad922c977'; end if; end $import$;
insert into public.gdrb_competitions(team_name,season,name,phase,series,source_url,external_id) values ('Juniores','2026/27','JUNIORES / I DIVISÃO','1ª FASE','SERIE B','https://resultados.fpf.pt/Competition/Details?competitionId=30332&seasonId=106#htmlSerieId_99511','FPF:99511') on conflict(team_name,season,name,phase,series) do nothing;
do $import$ declare cid uuid; begin select id into strict cid from public.gdrb_competitions where team_name='Juniores' and season='2026/27' and name='JUNIORES / I DIVISÃO' and phase='1ª FASE' and series='SERIE B'; if not exists(select 1 from public.gdrb_standings_snapshots where id='c479d17f-27ed-5661-afae-79eeb8c14506') then
insert into public.gdrb_standings_snapshots(id,as_of,round_label,expected_teams,source_name,source_url,checked_at,competition_id) values ('c479d17f-27ed-5661-afae-79eeb8c14506','2026-10-19','Consulta de 19/10/2026. A FPF indica que os resultados só se tornam oficiais quinze dias após cada encontro.',8,'FPF / AF Leiria','https://resultados.fpf.pt/Competition/Details?competitionId=30332&seasonId=106#htmlSerieId_99511','2026-10-19T15:10:20.101Z',cid);
insert into public.gdrb_standings_rows(snapshot_id,position,club_name,is_boavista,played,won,drawn,lost,goals_for,goals_against,points) values
('c479d17f-27ed-5661-afae-79eeb8c14506',1,'Id Vieirense',false,2,2,0,0,4,2,6),
('c479d17f-27ed-5661-afae-79eeb8c14506',2,'Gd Guiense',false,1,1,0,0,5,0,3),
('c479d17f-27ed-5661-afae-79eeb8c14506',2,'Gd Santo Amaro',false,1,1,0,0,3,0,3),
('c479d17f-27ed-5661-afae-79eeb8c14506',4,'Cd Garcia',false,1,0,0,1,0,3,0),
('c479d17f-27ed-5661-afae-79eeb8c14506',4,'Gdr Boavista',true,1,0,0,1,2,3,0),
('c479d17f-27ed-5661-afae-79eeb8c14506',4,'Gdrc Unidos',false,1,0,0,1,0,5,0),
('c479d17f-27ed-5661-afae-79eeb8c14506',4,'Grap',false,0,0,0,0,0,0,0),
('c479d17f-27ed-5661-afae-79eeb8c14506',4,'Mr Football Academy',false,1,0,0,1,0,1,0);
update public.gdrb_standings_snapshots set is_published=true where id='c479d17f-27ed-5661-afae-79eeb8c14506'; end if; end $import$;
insert into public.gdrb_competitions(team_name,season,name,phase,series,source_url,external_id) values ('Juvenis','2026/27','JUVENIS / I DIV. FUT.11','1ª FASE','SERIE B','https://resultados.fpf.pt/Competition/Details?competitionId=30345&seasonId=106#htmlSerieId_99608','FPF:99608') on conflict(team_name,season,name,phase,series) do nothing;
do $import$ declare cid uuid; begin select id into strict cid from public.gdrb_competitions where team_name='Juvenis' and season='2026/27' and name='JUVENIS / I DIV. FUT.11' and phase='1ª FASE' and series='SERIE B'; if not exists(select 1 from public.gdrb_standings_snapshots where id='7e9619a3-0c2a-56de-9d44-f9bb312774e5') then
insert into public.gdrb_standings_snapshots(id,as_of,round_label,expected_teams,source_name,source_url,checked_at,competition_id) values ('7e9619a3-0c2a-56de-9d44-f9bb312774e5','2026-10-19','Consulta de 19/10/2026. A FPF indica que os resultados só se tornam oficiais quinze dias após cada encontro. O Boavista tem zero jogos contabilizados nesta classificação.',8,'FPF / AF Leiria','https://resultados.fpf.pt/Competition/Details?competitionId=30345&seasonId=106#htmlSerieId_99608','2026-10-19T15:10:42.091Z',cid);
insert into public.gdrb_standings_rows(snapshot_id,position,club_name,is_boavista,played,won,drawn,lost,goals_for,goals_against,points) values
('7e9619a3-0c2a-56de-9d44-f9bb312774e5',1,'Cd Caranguejeira',false,2,2,0,0,8,2,6),
('7e9619a3-0c2a-56de-9d44-f9bb312774e5',2,'Gd Ilha "B"',false,2,1,1,0,8,3,4),
('7e9619a3-0c2a-56de-9d44-f9bb312774e5',3,'Id Vieirense "B"',false,2,1,1,0,5,3,4),
('7e9619a3-0c2a-56de-9d44-f9bb312774e5',4,'Gdr Boavista',true,0,0,0,0,0,0,0),
('7e9619a3-0c2a-56de-9d44-f9bb312774e5',5,'Gdrc Unidos',false,1,0,0,1,1,6,0),
('7e9619a3-0c2a-56de-9d44-f9bb312774e5',6,'Grap "B"',false,1,0,0,1,2,5,0),
('7e9619a3-0c2a-56de-9d44-f9bb312774e5',7,'Gd Santo Amaro',false,2,0,0,2,1,6,0),
('7e9619a3-0c2a-56de-9d44-f9bb312774e5',8,'Académico De Pombal "B" (DS)',false,0,0,0,0,0,0,0);
update public.gdrb_standings_snapshots set is_published=true where id='7e9619a3-0c2a-56de-9d44-f9bb312774e5'; end if; end $import$;
insert into public.gdrb_competitions(team_name,season,name,phase,series,source_url,external_id) values ('Iniciados','2026/27','CD - 1ª DIVISÃO INICIADOS','1ª FASE','SERIE C','https://resultados.fpf.pt/Competition/Details?competitionId=30379&seasonId=106#htmlSerieId_99756','FPF:99756') on conflict(team_name,season,name,phase,series) do nothing;
do $import$ declare cid uuid; begin select id into strict cid from public.gdrb_competitions where team_name='Iniciados' and season='2026/27' and name='CD - 1ª DIVISÃO INICIADOS' and phase='1ª FASE' and series='SERIE C'; if not exists(select 1 from public.gdrb_standings_snapshots where id='e9712bc4-3f10-503e-87f5-c3af3dc0dc02') then
insert into public.gdrb_standings_snapshots(id,as_of,round_label,expected_teams,source_name,source_url,checked_at,competition_id) values ('e9712bc4-3f10-503e-87f5-c3af3dc0dc02','2026-10-19','Consulta de 19/10/2026. A FPF indica que os resultados só se tornam oficiais quinze dias após cada encontro.',8,'FPF / AF Leiria','https://resultados.fpf.pt/Competition/Details?competitionId=30379&seasonId=106#htmlSerieId_99756','2026-10-19T15:10:55.517Z',cid);
insert into public.gdrb_standings_rows(snapshot_id,position,club_name,is_boavista,played,won,drawn,lost,goals_for,goals_against,points) values
('e9712bc4-3f10-503e-87f5-c3af3dc0dc02',1,'Id Vieirense "B"',false,3,3,0,0,15,2,9),
('e9712bc4-3f10-503e-87f5-c3af3dc0dc02',2,'Gdr Boavista',true,3,3,0,0,14,6,9),
('e9712bc4-3f10-503e-87f5-c3af3dc0dc02',3,'Mr Football Academy',false,3,2,0,1,7,6,6),
('e9712bc4-3f10-503e-87f5-c3af3dc0dc02',4,'Ud Leiria "C"',false,1,1,0,0,5,0,3),
('e9712bc4-3f10-503e-87f5-c3af3dc0dc02',5,'Gdrc Unidos',false,1,0,0,1,1,3,0),
('e9712bc4-3f10-503e-87f5-c3af3dc0dc02',6,'Scl Marrazes "C"',false,2,0,0,2,4,10,0),
('e9712bc4-3f10-503e-87f5-c3af3dc0dc02',7,'Gd Santo Amaro',false,2,0,0,2,1,8,0),
('e9712bc4-3f10-503e-87f5-c3af3dc0dc02',8,'Academia Ccmi Leiria Feminino (Extra-Competição)',false,3,0,0,3,5,17,0);
update public.gdrb_standings_snapshots set is_published=true where id='e9712bc4-3f10-503e-87f5-c3af3dc0dc02'; end if; end $import$;
insert into public.gdrb_competitions(team_name,season,name,phase,series,source_url,external_id) values ('Sub-13','2026/27','CAMP. DIST. INFANTIS F.9','FASE ÚNICA','SERIE C','https://resultados.fpf.pt/Competition/Details?competitionId=30444&seasonId=106#htmlSerieId_99984','FPF:99984') on conflict(team_name,season,name,phase,series) do nothing;
do $import$ declare cid uuid; begin select id into strict cid from public.gdrb_competitions where team_name='Sub-13' and season='2026/27' and name='CAMP. DIST. INFANTIS F.9' and phase='FASE ÚNICA' and series='SERIE C'; if not exists(select 1 from public.gdrb_standings_snapshots where id='84354a44-90f8-5398-a7a1-0610c6894d67') then
insert into public.gdrb_standings_snapshots(id,as_of,round_label,expected_teams,source_name,source_url,checked_at,competition_id) values ('84354a44-90f8-5398-a7a1-0610c6894d67','2026-10-19','Consulta de 19/10/2026. A FPF indica que os resultados só se tornam oficiais quinze dias após cada encontro. A classificação FPF consultada ainda apresenta o Boavista com zero jogos; o resultado de 17/10/2026, já registado pelo clube, ainda não está refletido nesta classificação.',7,'FPF / AF Leiria','https://resultados.fpf.pt/Competition/Details?competitionId=30444&seasonId=106#htmlSerieId_99984','2026-10-19T15:12:12.815Z',cid);
insert into public.gdrb_standings_rows(snapshot_id,position,club_name,is_boavista,played,won,drawn,lost,goals_for,goals_against,points) values
('84354a44-90f8-5398-a7a1-0610c6894d67',1,'Scl Marrazes "A"',false,1,1,0,0,5,2,3),
('84354a44-90f8-5398-a7a1-0610c6894d67',2,'Bolatangente',false,1,1,0,0,3,1,3),
('84354a44-90f8-5398-a7a1-0610c6894d67',3,'Gdr Boavista',true,0,0,0,0,0,0,0),
('84354a44-90f8-5398-a7a1-0610c6894d67',3,'Ud Batalha',false,0,0,0,0,0,0,0),
('84354a44-90f8-5398-a7a1-0610c6894d67',3,'Ud Leiria "A"',false,0,0,0,0,0,0,0),
('84354a44-90f8-5398-a7a1-0610c6894d67',6,'Grap "A"',false,1,0,0,1,1,3,0),
('84354a44-90f8-5398-a7a1-0610c6894d67',7,'Academia Ccmi Leiria "A"',false,1,0,0,1,2,5,0);
update public.gdrb_standings_snapshots set is_published=true where id='84354a44-90f8-5398-a7a1-0610c6894d67'; end if; end $import$;
do $guard$ begin if not exists(select 1 from public.gdrb_matches where id='041930f4-c565-4214-9a6f-cd64c2798809' and team_name='Juniores' and match_date='2026-10-17' and lower(opponent)=lower('ID Vieirense') and status='terminado' and is_visible and home_score=2 and away_score=3) then raise exception 'Source/game mismatch: 041930f4-c565-4214-9a6f-cd64c2798809'; end if; end $guard$;
insert into public.gdrb_match_scorers(match_id,public_name,goals,kind,source_name,source_url,checked_at,is_published) values ('041930f4-c565-4214-9a6f-cd64c2798809','Guilherme Silva',1,'player','FPF / AF Leiria','https://resultados.fpf.pt/Match/GetMatchInformation?matchId=2687162','2026-10-19T15:10:28.189Z',true) on conflict(match_id,public_name,kind) do nothing;
insert into public.gdrb_match_scorers(match_id,public_name,goals,kind,source_name,source_url,checked_at,is_published) values ('041930f4-c565-4214-9a6f-cd64c2798809','Tomas Coelho',1,'player','FPF / AF Leiria','https://resultados.fpf.pt/Match/GetMatchInformation?matchId=2687162','2026-10-19T15:10:28.189Z',true) on conflict(match_id,public_name,kind) do nothing;
do $guard$ begin if (select coalesce(sum(goals),0) from public.gdrb_match_scorers where match_id='041930f4-c565-4214-9a6f-cd64c2798809' and is_published) <> 2 then raise exception 'Scorer total mismatch: 041930f4-c565-4214-9a6f-cd64c2798809'; end if; end $guard$;
do $guard$ begin if not exists(select 1 from public.gdrb_matches where id='dca9f512-d2df-4c07-9fde-452bbb8a07ac' and team_name='Iniciados' and match_date='2026-10-18' and lower(opponent)=lower('Academia CCMI Leiria Feminino (Extra-Competição)') and status='terminado' and is_visible and home_score=6 and away_score=3) then raise exception 'Source/game mismatch: dca9f512-d2df-4c07-9fde-452bbb8a07ac'; end if; end $guard$;
insert into public.gdrb_match_scorers(match_id,public_name,goals,kind,source_name,source_url,checked_at,is_published) values ('dca9f512-d2df-4c07-9fde-452bbb8a07ac','Autogolo do adversário',1,'opponent_own_goal','FPF / AF Leiria','https://resultados.fpf.pt/Match/GetMatchInformation?matchId=2684770','2026-10-19T15:11:15.705Z',true) on conflict(match_id,public_name,kind) do nothing;
insert into public.gdrb_match_scorers(match_id,public_name,goals,kind,source_name,source_url,checked_at,is_published) values ('dca9f512-d2df-4c07-9fde-452bbb8a07ac','Guilherme Alberto',1,'player','FPF / AF Leiria','https://resultados.fpf.pt/Match/GetMatchInformation?matchId=2684770','2026-10-19T15:11:15.705Z',true) on conflict(match_id,public_name,kind) do nothing;
insert into public.gdrb_match_scorers(match_id,public_name,goals,kind,source_name,source_url,checked_at,is_published) values ('dca9f512-d2df-4c07-9fde-452bbb8a07ac','Ary Deus',1,'player','FPF / AF Leiria','https://resultados.fpf.pt/Match/GetMatchInformation?matchId=2684770','2026-10-19T15:11:15.705Z',true) on conflict(match_id,public_name,kind) do nothing;
insert into public.gdrb_match_scorers(match_id,public_name,goals,kind,source_name,source_url,checked_at,is_published) values ('dca9f512-d2df-4c07-9fde-452bbb8a07ac','Tiago Lacerda',1,'player','FPF / AF Leiria','https://resultados.fpf.pt/Match/GetMatchInformation?matchId=2684770','2026-10-19T15:11:15.705Z',true) on conflict(match_id,public_name,kind) do nothing;
insert into public.gdrb_match_scorers(match_id,public_name,goals,kind,source_name,source_url,checked_at,is_published) values ('dca9f512-d2df-4c07-9fde-452bbb8a07ac','Santiago Norte',1,'player','FPF / AF Leiria','https://resultados.fpf.pt/Match/GetMatchInformation?matchId=2684770','2026-10-19T15:11:15.705Z',true) on conflict(match_id,public_name,kind) do nothing;
insert into public.gdrb_match_scorers(match_id,public_name,goals,kind,source_name,source_url,checked_at,is_published) values ('dca9f512-d2df-4c07-9fde-452bbb8a07ac','Gustavo Martins',1,'player','FPF / AF Leiria','https://resultados.fpf.pt/Match/GetMatchInformation?matchId=2684770','2026-10-19T15:11:15.705Z',true) on conflict(match_id,public_name,kind) do nothing;
do $guard$ begin if (select coalesce(sum(goals),0) from public.gdrb_match_scorers where match_id='dca9f512-d2df-4c07-9fde-452bbb8a07ac' and is_published) <> 6 then raise exception 'Scorer total mismatch: dca9f512-d2df-4c07-9fde-452bbb8a07ac'; end if; end $guard$;
do $guard$ begin if not exists(select 1 from public.gdrb_matches where id='09d5ee35-baaf-4dfa-8ccf-cfe00dacfb4e' and team_name='Iniciados' and match_date='2026-10-11' and lower(opponent)=lower('SCL Marrazes "C"') and status='terminado' and is_visible and home_score=5 and away_score=2) then raise exception 'Source/game mismatch: 09d5ee35-baaf-4dfa-8ccf-cfe00dacfb4e'; end if; end $guard$;
insert into public.gdrb_match_scorers(match_id,public_name,goals,kind,source_name,source_url,checked_at,is_published) values ('09d5ee35-baaf-4dfa-8ccf-cfe00dacfb4e','Tiago Lacerda',3,'player','FPF / AF Leiria','https://resultados.fpf.pt/Match/GetMatchInformation?matchId=2684740','2026-10-19T15:12:57.735Z',true) on conflict(match_id,public_name,kind) do nothing;
insert into public.gdrb_match_scorers(match_id,public_name,goals,kind,source_name,source_url,checked_at,is_published) values ('09d5ee35-baaf-4dfa-8ccf-cfe00dacfb4e','Ary Deus',1,'player','FPF / AF Leiria','https://resultados.fpf.pt/Match/GetMatchInformation?matchId=2684740','2026-10-19T15:12:57.735Z',true) on conflict(match_id,public_name,kind) do nothing;
insert into public.gdrb_match_scorers(match_id,public_name,goals,kind,source_name,source_url,checked_at,is_published) values ('09d5ee35-baaf-4dfa-8ccf-cfe00dacfb4e','Xavier Bento',1,'player','FPF / AF Leiria','https://resultados.fpf.pt/Match/GetMatchInformation?matchId=2684740','2026-10-19T15:12:57.735Z',true) on conflict(match_id,public_name,kind) do nothing;
do $guard$ begin if (select coalesce(sum(goals),0) from public.gdrb_match_scorers where match_id='09d5ee35-baaf-4dfa-8ccf-cfe00dacfb4e' and is_published) <> 5 then raise exception 'Scorer total mismatch: 09d5ee35-baaf-4dfa-8ccf-cfe00dacfb4e'; end if; end $guard$;
commit;
