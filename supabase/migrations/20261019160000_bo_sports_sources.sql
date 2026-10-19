-- Bô: additive sources. Existing gdrb_matches remains the only match catalogue.
begin;
create table public.gdrb_competitions (
  id uuid primary key default gen_random_uuid(),
  team_name text not null references public.gdrb_age_groups(name),
  season text not null check (season ~ '^[0-9]{4}/[0-9]{2}$'),
  name text not null check (length(btrim(name)) between 1 and 200),
  phase text not null default '',
  series text not null default '',
  source_url text check (source_url ~ '^https://'),
  external_id text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (team_name, season, name, phase, series)
);
create table public.gdrb_standings_snapshots (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.gdrb_competitions(id) on delete restrict,
  as_of date not null,
  round_label text,
  expected_teams integer not null check (expected_teams >= 2),
  source_name text not null check (length(btrim(source_name)) between 1 and 200),
  source_url text not null check (source_url ~ '^https://'),
  checked_at timestamptz not null default now(),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  check (as_of <= (checked_at at time zone 'Europe/Lisbon')::date)
);
create index gdrb_standings_latest on public.gdrb_standings_snapshots(competition_id,as_of desc,checked_at desc) where is_published;
create table public.gdrb_standings_rows (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.gdrb_standings_snapshots(id) on delete cascade,
  position integer not null check (position > 0),
  club_name text not null check (length(btrim(club_name)) between 1 and 200),
  is_boavista boolean not null default false,
  played integer not null check (played >= 0),
  won integer not null check (won >= 0),
  drawn integer not null check (drawn >= 0),
  lost integer not null check (lost >= 0),
  goals_for integer check (goals_for >= 0),
  goals_against integer check (goals_against >= 0),
  points integer not null, -- Official points may include deductions; never derive from scores.
  unique (snapshot_id,club_name),
  check (played = won + drawn + lost),
  check ((goals_for is null) = (goals_against is null))
);
create unique index gdrb_standings_one_boavista on public.gdrb_standings_rows(snapshot_id) where is_boavista;
create table public.gdrb_match_scorers (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.gdrb_matches(id) on delete cascade,
  public_name text not null check (length(btrim(public_name)) between 1 and 120),
  goals integer not null check (goals > 0),
  kind text not null default 'player' check (kind in ('player','opponent_own_goal')),
  source_name text not null check (length(btrim(source_name)) between 1 and 200),
  source_url text check (source_url ~ '^https://'),
  checked_at timestamptz not null default now(),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  unique(match_id,public_name,kind)
);
create table public.gdrb_match_schedule_changes (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.gdrb_matches(id) on delete cascade,
  previous_date date,
  new_date date,
  previous_time time,
  new_time time,
  previous_location text,
  new_location text,
  previous_status text,
  new_status text,
  detected_at timestamptz not null default now(),
  source_name text not null default 'Registo de jogos do clube',
  source_url text check (source_url ~ '^https://'),
  is_confirmed boolean not null default false
);
create index gdrb_schedule_changes_match on public.gdrb_match_schedule_changes(match_id,detected_at desc);

-- Validate a complete snapshot before publishing; rows can be changed only in drafts.
create function public.gdrb_validate_standings_snapshot() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.is_published then
    if exists(select 1 from public.gdrb_competitions c where c.id=new.competition_id and public.gdrb_outcome_only(c.team_name)) then
      raise exception 'Este escalão utiliza apenas vitória/derrota; não publicar classificação numérica.';
    end if;
    if not exists (select 1 from public.gdrb_standings_rows where snapshot_id=new.id and is_boavista)
       or (select count(*) from public.gdrb_standings_rows where snapshot_id=new.id) <> new.expected_teams then
      raise exception 'Importa a tabela completa, incluindo o Boavista, antes de publicar.';
    end if;
  end if;
  return new;
end; $$;
create trigger validate_bo_standings before insert or update on public.gdrb_standings_snapshots
for each row execute function public.gdrb_validate_standings_snapshot();
create function public.gdrb_lock_published_standings_rows() returns trigger
language plpgsql set search_path = '' as $$
declare published boolean;
begin
  if tg_op <> 'INSERT' then
    select is_published into published from public.gdrb_standings_snapshots where id=old.snapshot_id for update;
    if published then
      raise exception 'Despublica a versão antes de corrigir linhas; para a semana seguinte cria uma nova versão.';
    end if;
  end if;
  if tg_op <> 'DELETE' then
    select is_published into published from public.gdrb_standings_snapshots where id=new.snapshot_id for update;
    if published then
      raise exception 'Não é possível alterar linhas de uma versão publicada.';
    end if;
    return new;
  end if;
  return old;
end; $$;
create trigger lock_bo_standings_rows before insert or update or delete on public.gdrb_standings_rows
for each row execute function public.gdrb_lock_published_standings_rows();

-- Never store individual goal statistics for outcome-only age groups.
create function public.gdrb_validate_match_scorer() returns trigger
language plpgsql set search_path = '' as $$
declare m public.gdrb_matches; known_goals bigint;
begin
  -- Permit withdrawing an existing publication even after its result/age group changes.
  if tg_op='UPDATE' and old.is_published and not new.is_published and old.match_id=new.match_id then return new; end if;
  select * into m from public.gdrb_matches where id=new.match_id for update;
  if not found then raise exception 'Jogo não encontrado.'; end if;
  if public.gdrb_outcome_only(m.team_name) then raise exception 'Este escalão utiliza apenas vitória/derrota; não registar marcadores.'; end if;
  if new.is_published then
    if m.status <> 'terminado' or m.home_score is null then raise exception 'Confirma o resultado do jogo antes de publicar marcadores.'; end if;
    select coalesce(sum(goals),0) into known_goals from public.gdrb_match_scorers where match_id=new.match_id and is_published and id<>new.id;
    if known_goals+new.goals > m.home_score then raise exception 'Os golos dos marcadores ultrapassam o resultado do Boavista.'; end if;
  end if;
  return new;
end; $$;
create trigger validate_bo_scorer before insert or update on public.gdrb_match_scorers
for each row execute function public.gdrb_validate_match_scorer();

-- A correction to a result invalidates published scorers until reviewed again.
create function public.gdrb_unpublish_changed_match_scorers() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.gdrb_match_scorers set is_published=false where match_id=new.id and is_published;
  return new;
end; $$;
revoke all on function public.gdrb_unpublish_changed_match_scorers() from public,anon,authenticated;
create trigger unpublish_bo_scorers_after_correction after update of home_score,status,team_name on public.gdrb_matches
for each row when ((old.home_score,old.status,old.team_name) is distinct from (new.home_score,new.status,new.team_name))
execute function public.gdrb_unpublish_changed_match_scorers();

-- Captures future changes only. Review before publication: existing match write policy is broad.
create function public.gdrb_capture_match_schedule_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.gdrb_match_schedule_changes(match_id,previous_date,new_date,previous_time,new_time,previous_location,new_location,previous_status,new_status)
  values(new.id,old.match_date,new.match_date,old.match_time,new.match_time,old.location,new.location,old.status,new.status);
  return new;
end; $$;
revoke all on function public.gdrb_capture_match_schedule_change() from public,anon,authenticated;
create trigger capture_bo_schedule_change after update of match_date,match_time,location,status on public.gdrb_matches
for each row when ((old.match_date,old.match_time,old.location,old.status) is distinct from (new.match_date,new.match_time,new.location,new.status))
execute function public.gdrb_capture_match_schedule_change();

alter table public.gdrb_competitions enable row level security;
alter table public.gdrb_standings_snapshots enable row level security;
alter table public.gdrb_standings_rows enable row level security;
alter table public.gdrb_match_scorers enable row level security;
alter table public.gdrb_match_schedule_changes enable row level security;
-- Explicit privileges: anon never writes, including if project defaults grant broadly.
revoke all on public.gdrb_competitions,public.gdrb_standings_snapshots,public.gdrb_standings_rows,public.gdrb_match_scorers,public.gdrb_match_schedule_changes from anon,authenticated;
grant select on public.gdrb_competitions,public.gdrb_standings_snapshots,public.gdrb_standings_rows,public.gdrb_match_scorers,public.gdrb_match_schedule_changes to anon,authenticated;
grant insert,update,delete on public.gdrb_competitions,public.gdrb_standings_snapshots,public.gdrb_standings_rows,public.gdrb_match_scorers,public.gdrb_match_schedule_changes to authenticated;
grant all on public.gdrb_competitions,public.gdrb_standings_snapshots,public.gdrb_standings_rows,public.gdrb_match_scorers,public.gdrb_match_schedule_changes to service_role;

create policy bo_competitions_read on public.gdrb_competitions for select to anon,authenticated using(is_active);
create policy bo_snapshots_read on public.gdrb_standings_snapshots for select to anon,authenticated using(is_published and exists(select 1 from public.gdrb_competitions c where c.id=competition_id and c.is_active));
create policy bo_standings_read on public.gdrb_standings_rows for select to anon,authenticated using(exists(select 1 from public.gdrb_standings_snapshots s where s.id=snapshot_id and s.is_published));
create policy bo_scorers_read on public.gdrb_match_scorers for select to anon,authenticated using(is_published and exists(select 1 from public.gdrb_matches m where m.id=match_id and m.is_visible and m.status='terminado' and not public.gdrb_outcome_only(m.team_name)));
create policy bo_changes_read on public.gdrb_match_schedule_changes for select to anon,authenticated using(is_confirmed and exists(select 1 from public.gdrb_matches m where m.id=match_id and m.is_visible and m.status<>'arquivado'));
create policy bo_competitions_admin on public.gdrb_competitions for all to authenticated using((select public.gdrb_gallery_is_admin())) with check((select public.gdrb_gallery_is_admin()));
create policy bo_snapshots_admin on public.gdrb_standings_snapshots for all to authenticated using((select public.gdrb_gallery_is_admin())) with check((select public.gdrb_gallery_is_admin()));
create policy bo_standings_admin on public.gdrb_standings_rows for all to authenticated using((select public.gdrb_gallery_is_admin())) with check((select public.gdrb_gallery_is_admin()));
create policy bo_scorers_admin on public.gdrb_match_scorers for all to authenticated using((select public.gdrb_gallery_is_admin())) with check((select public.gdrb_gallery_is_admin()));
create policy bo_changes_admin on public.gdrb_match_schedule_changes for all to authenticated using((select public.gdrb_gallery_is_admin())) with check((select public.gdrb_gallery_is_admin()));

-- View respects caller RLS. Weekly age is metadata, not a claim that the source is current.
create view public.gdrb_latest_standings with (security_invoker=true) as
select distinct on (competition_id) id,competition_id,as_of,round_label,source_name,source_url,checked_at,
  checked_at < now()-interval '7 days' as needs_refresh
from public.gdrb_standings_snapshots where is_published
order by competition_id,as_of desc,checked_at desc,created_at desc,id;
grant select on public.gdrb_latest_standings to anon,authenticated,service_role;
comment on table public.gdrb_standings_snapshots is 'One complete official standings version per weekly update; keep prior versions. Do not calculate league tables from club matches.';
comment on table public.gdrb_match_scorers is 'Only publicly authorised display names. Sum may be partial; do not claim complete list unless equal to club score. home_score is Boavista goals even away.';
comment on table public.gdrb_match_schedule_changes is 'Future changes observed in club database, not an AFL notification. Admin confirmation required before public reading.';
notify pgrst,'reload schema';
commit;
