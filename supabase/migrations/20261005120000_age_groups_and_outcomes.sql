begin;

create table public.gdrb_age_groups (
  name text primary key,
  sort_order integer not null unique,
  outcome_only boolean not null
);
alter table public.gdrb_age_groups enable row level security;
create policy "Age groups are public" on public.gdrb_age_groups for select using (true);
grant select on public.gdrb_age_groups to anon, authenticated;
insert into public.gdrb_age_groups values
 ('ABCs',1,true),('Petizes',2,true),('Traquinas A',3,true),('Traquinas B',4,true),
 ('Benjamins A',5,true),('Benjamins B',6,true),('Sub-12',7,true),('Sub-13',8,false),
 ('Iniciados',9,false),('Juvenis',10,false),('Juniores',11,false),('Seniores',12,false);

-- Preserve original rows in a private, RLS-protected audit table before conversion.
create table public.gdrb_age_group_migration_backup (source_table text not null, original_row jsonb not null, saved_at timestamptz not null default now());
alter table public.gdrb_age_group_migration_backup enable row level security;
revoke all on public.gdrb_age_group_migration_backup from anon, authenticated;
insert into public.gdrb_age_group_migration_backup(source_table,original_row)
 select 'gdrb_matches',to_jsonb(m) from public.gdrb_matches m where team_name not in ('Seniores','Juniores','Juvenis','Iniciados')
 union all select 'gdrb_teams',to_jsonb(t) from public.gdrb_teams t
 union all select 'gdrb_tournaments',to_jsonb(t) from public.gdrb_tournaments t;

alter table public.gdrb_matches add column result_outcome text check (result_outcome in ('win','loss'));
alter table public.tournament_matches add column result_winner text check (result_winner in ('a','b'));

-- Explicit historical mappings confirmed by the club, 5 October 2026.
update public.gdrb_matches set team_name=case team_name when 'Benjamins' then 'Benjamins B' when 'Infantis' then 'Sub-13' when 'ABC' then 'ABCs' end where team_name in ('Benjamins','Infantis','ABC');
update public.gdrb_tournaments set team_name=case team_name when 'Benjamins' then 'Benjamins B' when 'Infantis' then 'Sub-13' when 'ABC' then 'ABCs' end where team_name in ('Benjamins','Infantis','ABC');
update public.gdrb_teams set name=case name when 'Benjamins' then 'Benjamins B' when 'Infantis' then 'Sub-13' when 'ABC' then 'ABCs' end where name in ('Benjamins','Infantis','ABC');

create function public.gdrb_outcome_only(age_name text) returns boolean language sql stable set search_path=public as $$
 select coalesce((select outcome_only from public.gdrb_age_groups where name=age_name),age_name ~* '^(petiz|abc|traquin|benjam)');
$$;

update public.gdrb_matches set
 result_outcome=case when home_score>away_score then 'win' when home_score<away_score then 'loss' end,
 status=case when status='terminado' and (home_score is null or away_score is null or home_score=away_score) then 'aguardar_resultado' else status end,
 home_score=null,away_score=null
 where public.gdrb_outcome_only(team_name);

-- Preserve legacy combined teams for administrators; expose only the current catalogue.
update public.gdrb_teams set is_active=false where name not in (select name from public.gdrb_age_groups);
insert into public.gdrb_teams(name,category,football_type,sort_order,is_active)
 select a.name,case when a.sort_order<=4 then 'Escola de Futebol' when a.sort_order=12 then 'Seniores' else 'Formação' end,
 case when a.sort_order<=4 then 'Futebol 5' when a.sort_order<=6 then 'Futebol 7' when a.sort_order<=8 then 'Futebol 9' else 'Futebol 11' end,a.sort_order,true
 from public.gdrb_age_groups a where not exists(select 1 from public.gdrb_teams t where t.name=a.name);
update public.gdrb_teams t set sort_order=a.sort_order from public.gdrb_age_groups a where t.name=a.name;

create function public.gdrb_validate_match_result() returns trigger language plpgsql set search_path=public as $$
begin
 if (tg_op='INSERT' or new.team_name is distinct from old.team_name) and not exists(select 1 from gdrb_age_groups where name=new.team_name) then
   raise exception 'Seleciona um dos 12 escalões válidos.';
 end if;
 if gdrb_outcome_only(new.team_name) then
   if new.home_score is not null or new.away_score is not null then raise exception 'Até sub-12, usa apenas vitória ou derrota, sem golos.'; end if;
   if new.status='terminado' and new.result_outcome is null then raise exception 'Indica vitória ou derrota antes de terminar o jogo.'; end if;
 else
   if new.result_outcome is not null then raise exception 'A partir de sub-13, regista os golos das duas equipas.'; end if;
   if (new.home_score is null) <> (new.away_score is null) or new.home_score<0 or new.away_score<0 then raise exception 'Preenche os dois golos com inteiros não negativos.'; end if;
   if new.status='terminado' and (new.home_score is null or new.away_score is null) then raise exception 'Falta o resultado numérico.'; end if;
 end if;
 return new;
end; $$;
create trigger validate_age_group_match before insert or update on public.gdrb_matches for each row execute function public.gdrb_validate_match_result();

create function public.gdrb_validate_age_name() returns trigger language plpgsql set search_path=public as $$
declare new_name text; old_name text;
begin
 new_name := to_jsonb(new)->>tg_argv[0]; old_name := to_jsonb(old)->>tg_argv[0];
 if (tg_op='INSERT' or new_name is distinct from old_name) and not exists(select 1 from gdrb_age_groups where name=new_name) then raise exception 'Seleciona um dos 12 escalões válidos.'; end if;
 if tg_table_name='tournaments' and gdrb_outcome_only(new_name) and exists(select 1 from tournament_matches where tournament_id=new.id and (score_a is not null or score_b is not null)) then raise exception 'Revê os resultados existentes antes de mudar para um escalão sem golos.'; end if;
 if tg_table_name='tournaments' and not gdrb_outcome_only(new_name) and exists(select 1 from tournament_matches where tournament_id=new.id and result_winner is not null) then raise exception 'Revê os resultados existentes antes de mudar para um escalão com golos.'; end if;
 return new;
end; $$;
create trigger validate_age_name_team before insert or update on public.gdrb_teams for each row execute function public.gdrb_validate_age_name('name');
create trigger validate_age_name_participation before insert or update on public.gdrb_tournaments for each row execute function public.gdrb_validate_age_name('team_name');
create trigger validate_age_name_tournament before insert or update on public.tournaments for each row execute function public.gdrb_validate_age_name('age_group');

create function public.gdrb_validate_tournament_result() returns trigger language plpgsql set search_path=public as $$
declare age_name text;
begin
 select age_group into age_name from tournaments where id=new.tournament_id;
 if gdrb_outcome_only(age_name) then
   if new.score_a is not null or new.score_b is not null or new.penalty_score_a is not null or new.penalty_score_b is not null then raise exception 'Até sub-12, seleciona a equipa vencedora, sem golos.'; end if;
   if new.status in ('finished','no_show') and new.result_winner is null then raise exception 'Seleciona a equipa vencedora.'; end if;
   if new.result_winner is not null and (new.team_a_id is null or new.team_b_id is null or new.team_a_id=new.team_b_id) then raise exception 'Define as duas equipas antes do resultado.'; end if;
 elsif new.result_winner is not null then raise exception 'Neste escalão, regista o resultado numérico.';
 end if;
 return new;
end; $$;
create trigger validate_age_group_tournament_result before insert or update on public.tournament_matches for each row execute function public.gdrb_validate_tournament_result();

create function public.gdrb_validate_tournament_goal() returns trigger language plpgsql set search_path=public as $$
begin
 if exists(select 1 from tournament_matches m join tournaments t on t.id=m.tournament_id where m.id=new.match_id and gdrb_outcome_only(t.age_group)) then raise exception 'Até sub-12, não se registam golos.'; end if;
 return new;
end; $$;
create trigger validate_age_group_goal before insert or update on public.tournament_match_goals for each row execute function public.gdrb_validate_tournament_goal();

-- Confirmed by the club: 3 October, 09:30, away at Alcobaça, defeat.
insert into public.gdrb_matches(team_name,football_type,competition,opponent,match_date,match_time,venue_type,status,result_outcome,is_visible)
 select 'Sub-12','Futebol 9','Encontro','Ginásio de Alcobaça','2026-10-03','09:30','fora','terminado','loss',true
 where not exists(select 1 from public.gdrb_matches where team_name='Sub-12' and match_date='2026-10-03' and opponent ilike '%Alcobaça%');

notify pgrst,'reload schema';
commit;
