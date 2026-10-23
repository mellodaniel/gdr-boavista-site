-- Private match sheets. Does not publish results or modify existing rosters.
begin;
create table public.gdrb_match_sheet_teams (
 age_group text primary key references public.gdrb_age_groups(name),
 roster_key text, field_size integer not null check(field_size in(5,7,9,11)),
 period_minutes integer not null check(period_minutes between 1 and 60),
 periods integer not null default 2 check(periods between 1 and 6),
 reentry boolean not null default false, record_goals boolean not null default false
);
insert into public.gdrb_match_sheet_teams(age_group,roster_key,field_size,period_minutes,reentry,record_goals)
select name,case name when 'Seniores' then 'senior' when 'Juniores' then 'junior' else null end,
case when name in('ABCs','Petizes','Traquinas A','Traquinas B') then 5 when name in('Benjamins A','Benjamins B') then 7 when name in('Sub-12','Sub-13') then 9 else 11 end,
case when name in('Seniores','Juniores') then 45 when name='Juvenis' then 40 when name='Iniciados' then 35 else 25 end,
name not in('Seniores','Juniores','Juvenis','Iniciados'),not outcome_only from public.gdrb_age_groups;
create table public.gdrb_match_sheet_access (
 user_id uuid not null references auth.users(id) on delete cascade,
 age_group text not null references public.gdrb_match_sheet_teams(age_group),
 can_edit boolean not null default true, primary key(user_id,age_group)
);
create function public.gdrb_sheet_allowed(p_group text,p_write boolean default false)
returns boolean language sql stable security definer set search_path='' as $$
 select public.gdrb_gallery_is_admin() or exists(select 1 from public.gdrb_match_sheet_access where user_id=auth.uid() and age_group=p_group and (not p_write or can_edit));
$$;
create table public.gdrb_match_sheets (
 id uuid primary key, age_group text not null references public.gdrb_match_sheet_teams(age_group),
 calendar_match_id uuid unique references public.gdrb_matches(id) on delete set null,
 recorder_id uuid not null references auth.users(id), revision integer not null check(revision>0),
 document jsonb not null, created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.gdrb_match_sheet_versions (
 sheet_id uuid not null references public.gdrb_match_sheets(id),revision integer not null,
 document jsonb not null,changed_by uuid not null references auth.users(id),created_at timestamptz not null default now(),
 primary key(sheet_id,revision)
);
create table public.gdrb_match_sheet_deliveries (
 id uuid primary key, sheet_id uuid not null references public.gdrb_match_sheets(id), revision integer not null,
 user_id uuid not null references auth.users(id),recipients text[] not null,
 status text not null default 'pending' check(status in('pending','sent','failed')),
 provider_id text,created_at timestamptz not null default now(),sent_at timestamptz,
 foreign key(sheet_id,revision) references public.gdrb_match_sheet_versions(sheet_id,revision)
);
create index on public.gdrb_match_sheets(age_group,updated_at desc);
create index on public.gdrb_match_sheet_deliveries(user_id,created_at desc);
alter table public.gdrb_match_sheet_teams enable row level security;
alter table public.gdrb_match_sheet_access enable row level security;
alter table public.gdrb_match_sheets enable row level security;
alter table public.gdrb_match_sheet_versions enable row level security;
alter table public.gdrb_match_sheet_deliveries enable row level security;
revoke all on public.gdrb_match_sheet_teams,public.gdrb_match_sheet_access,public.gdrb_match_sheets,public.gdrb_match_sheet_versions,public.gdrb_match_sheet_deliveries from anon,authenticated;
grant select on public.gdrb_match_sheet_teams,public.gdrb_match_sheet_access,public.gdrb_match_sheets,public.gdrb_match_sheet_versions,public.gdrb_match_sheet_deliveries to authenticated;
grant update(roster_key,field_size,period_minutes,periods,reentry) on public.gdrb_match_sheet_teams to authenticated;
grant all on public.gdrb_match_sheet_teams,public.gdrb_match_sheet_access,public.gdrb_match_sheets,public.gdrb_match_sheet_versions,public.gdrb_match_sheet_deliveries to service_role;
create policy teams_read on public.gdrb_match_sheet_teams for select to authenticated using(public.gdrb_sheet_allowed(age_group));
create policy teams_admin on public.gdrb_match_sheet_teams for update to authenticated using(public.gdrb_gallery_is_admin()) with check(public.gdrb_gallery_is_admin());
create policy access_read on public.gdrb_match_sheet_access for select to authenticated using(user_id=auth.uid() or public.gdrb_gallery_is_admin());
create policy sheets_read on public.gdrb_match_sheets for select to authenticated using(public.gdrb_sheet_allowed(age_group));
create policy versions_read on public.gdrb_match_sheet_versions for select to authenticated using(exists(select 1 from public.gdrb_match_sheets s where s.id=sheet_id));
create policy deliveries_read on public.gdrb_match_sheet_deliveries for select to authenticated using(exists(select 1 from public.gdrb_match_sheets s where s.id=sheet_id));

create function public.gdrb_save_match_sheet(p_document jsonb,p_revision integer)
returns integer language plpgsql security definer set search_path='' as $$
declare sid uuid; grp text; old public.gdrb_match_sheets; cfg public.gdrb_match_sheet_teams; v integer; item jsonb; player_id uuid;
begin
 if auth.uid() is null then raise insufficient_privilege; end if;
 if p_revision is null or p_revision<0 or p_document is null or octet_length(p_document::text)>1048576 or p_document->>'schema' is distinct from '1' or jsonb_typeof(p_document->'squad') is distinct from 'array' or jsonb_typeof(p_document->'events') is distinct from 'array' or jsonb_typeof(p_document->'rules') is distinct from 'object' or jsonb_typeof(p_document->'clock') is distinct from 'object' then raise exception 'Ficha inválida'; end if;
 sid:=(p_document->>'id')::uuid;grp:=p_document->>'ageGroup';
 if not public.gdrb_sheet_allowed(grp,true) then raise insufficient_privilege;end if;
 select * into cfg from public.gdrb_match_sheet_teams where age_group=grp;
 if not found or cfg.roster_key is null then raise exception 'Associa primeiro o plantel ao escalão';end if;
 if coalesce(length(btrim(p_document->>'opponent')),0) not between 1 and 120 or coalesce(length(btrim(p_document->>'recorder')),0) not between 1 and 100 or coalesce(p_document->>'status','') not in('draft','live','interval','finished') or coalesce(p_document->>'date','')='' or length(coalesce(p_document->>'notes',''))>4000 then raise exception 'Preenche os dados obrigatórios';end if;
 perform (p_document->>'date')::date;
 if jsonb_array_length(p_document->'squad')>50 or jsonb_array_length(p_document->'events')>2000 then raise exception 'Demasiados registos';end if;
 if coalesce((p_document#>>'{rules,fieldSize}')::integer,0) not in(5,7,9,11) or coalesce((p_document#>>'{rules,periodMinutes}')::integer,0) not between 1 and 60 or coalesce((p_document#>>'{rules,periods}')::integer,0) not between 1 and 6 or jsonb_typeof(p_document#>'{rules,recordGoals}') is distinct from 'boolean' or jsonb_typeof(p_document#>'{rules,reentry}') is distinct from 'boolean' then raise exception 'Configuração inválida';end if;
 if exists(select 1 from jsonb_array_elements(p_document->'events') e where coalesce(e->>'kind','') not in('goal','yellow','second_yellow','red','substitution','note') or coalesce(e->>'side','') not in('club','opponent') or jsonb_typeof(e->'note') is distinct from 'string' or length(e->>'note')>1500 or jsonb_typeof(e->'createdAt') is distinct from 'string' or jsonb_typeof(e->'ownGoal') is distinct from 'boolean' or coalesce((e->>'period')::integer,0) not between 1 and (p_document#>>'{rules,periods}')::integer or coalesce((e->>'minute')::integer,-1) not between 0 and 360 or coalesce((e->>'added')::integer,-1) not between 0 and 60) then raise exception 'Evento inválido';end if;
 if (select count(*) from jsonb_array_elements(p_document->'squad'))<>(select count(distinct p->>'id') from jsonb_array_elements(p_document->'squad') p) then raise exception 'Jogadores repetidos';end if;
 if (select count(*) from jsonb_array_elements(p_document->'events'))<>(select count(distinct e->>'id') from jsonb_array_elements(p_document->'events') e) then raise exception 'Eventos repetidos';end if;
 -- The existing club policy determines whether a team may record goals.
 if coalesce((p_document#>>'{rules,recordGoals}')::boolean,false) is distinct from cfg.record_goals then raise exception 'A configuração de resultados mudou. Revê a ficha.';end if;
 if not cfg.record_goals and exists(select 1 from jsonb_array_elements(p_document->'events') e where e->>'kind'='goal') then raise exception 'Este escalão não regista golos';end if;
 if p_document->>'status'='finished' and not cfg.record_goals and coalesce(p_document->>'outcome','') not in('win','loss') then raise exception 'Indica vitória ou derrota';end if;
 -- Serialize creation and optimistic updates, including requests from two devices.
 perform pg_advisory_xact_lock(hashtextextended(sid::text,0));
 select * into old from public.gdrb_match_sheets where id=sid for update;
 if found then
   if old.recorder_id<>auth.uid() or old.age_group<>grp then raise insufficient_privilege;end if;
   if old.revision<>p_revision then raise exception using errcode='40001',message='FICHA_CONFLICTO';end if;
   if old.document=p_document then return old.revision;end if;
 elsif p_revision<>0 then raise exception using errcode='40001',message='FICHA_CONFLICTO';end if;
 -- New players must belong to the selected roster. Existing historical snapshots remain valid after transfers.
 for item in select value from jsonb_array_elements(p_document->'squad') loop
   player_id:=(item->>'id')::uuid;
   if not exists(select 1 from jsonb_array_elements(coalesce(old.document->'squad','[]')) p where p->>'id'=player_id::text)
    and not exists(select 1 from public.gdrb_roster_players p where p.id=player_id and p.team_key=cfg.roster_key and p.is_active and p.roster_group<>'Equipa técnica') then raise exception 'Jogador fora do plantel';end if;
 end loop;
 if nullif(p_document->>'calendarId','') is not null and not exists(select 1 from public.gdrb_matches where id=(p_document->>'calendarId')::uuid and team_name=grp) then raise exception 'O jogo selecionado pertence a outro escalão';end if;
 v:=coalesce(old.revision,0)+1;
 insert into public.gdrb_match_sheets(id,age_group,calendar_match_id,recorder_id,revision,document)
 values(sid,grp,nullif(p_document->>'calendarId','')::uuid,auth.uid(),v,p_document)
 on conflict(id) do update set document=excluded.document,calendar_match_id=excluded.calendar_match_id,revision=v,updated_at=now();
 insert into public.gdrb_match_sheet_versions(sheet_id,revision,document,changed_by) values(sid,v,p_document,auth.uid());
 return v;
end;$$;

create function public.gdrb_sheet_roster(p_group text)
returns table(id uuid,name text,shirt_number integer,position text,photo_url text)
language plpgsql security definer set search_path='' as $$
begin
 if not public.gdrb_sheet_allowed(p_group) then raise insufficient_privilege;end if;
 return query select p.id,p.name,p.shirt_number::integer,p.position,p.photo_url from public.gdrb_roster_players p
 join public.gdrb_match_sheet_teams t on t.roster_key=p.team_key where t.age_group=p_group and p.is_active and p.roster_group<>'Equipa técnica' order by p.shirt_number nulls last,p.name;
end;$$;

create function public.gdrb_sheet_grant(p_email text,p_group text,p_edit boolean,p_remove boolean default false)
returns void language plpgsql security definer set search_path='' as $$
declare uid uuid;
begin
 if not public.gdrb_gallery_is_admin() then raise insufficient_privilege;end if;
 select id into uid from auth.users where lower(email)=lower(btrim(p_email));
 if uid is null then raise exception 'Utilizador não encontrado. Cria primeiro a conta no sistema.';end if;
 if p_remove then delete from public.gdrb_match_sheet_access where user_id=uid and age_group=p_group;
 else insert into public.gdrb_match_sheet_access values(uid,p_group,p_edit) on conflict(user_id,age_group) do update set can_edit=excluded.can_edit;end if;
end;$$;

create function public.gdrb_sheet_reserve_email(p_id uuid,p_sheet uuid,p_revision integer,p_recipients text[])
returns public.gdrb_match_sheet_deliveries language plpgsql security definer set search_path='' as $$
declare sheet public.gdrb_match_sheets; delivery public.gdrb_match_sheet_deliveries;
begin
 if auth.uid() is null then raise insufficient_privilege;end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,1));
 select * into sheet from public.gdrb_match_sheets where id=p_sheet for update;
 if not found or sheet.recorder_id<>auth.uid() or not public.gdrb_sheet_allowed(sheet.age_group,true) then raise insufficient_privilege;end if;
 if sheet.revision<>p_revision or sheet.document->>'status'<>'finished' then raise exception 'Finaliza e sincroniza a ficha antes de enviar';end if;
 if coalesce(cardinality(p_recipients),0) not between 1 and 5 then raise exception 'Indica entre 1 e 5 destinatários';end if;
 select * into delivery from public.gdrb_match_sheet_deliveries where id=p_id;
 if found then
   if delivery.user_id<>auth.uid() or delivery.sheet_id<>p_sheet or delivery.revision<>p_revision or delivery.recipients<>p_recipients then raise insufficient_privilege;end if;
   return delivery;
 end if;
 if (select count(*) from public.gdrb_match_sheet_deliveries where user_id=auth.uid() and created_at>now()-interval '1 hour')>=10 then raise exception 'Limite de envios atingido. Tenta mais tarde.';end if;
 insert into public.gdrb_match_sheet_deliveries(id,sheet_id,revision,user_id,recipients) values(p_id,p_sheet,p_revision,auth.uid(),p_recipients) returning * into delivery;
 return delivery;
end;$$;

revoke all on function public.gdrb_sheet_allowed(text,boolean),public.gdrb_save_match_sheet(jsonb,integer),public.gdrb_sheet_roster(text),public.gdrb_sheet_grant(text,text,boolean,boolean),public.gdrb_sheet_reserve_email(uuid,uuid,integer,text[]) from public,anon;
grant execute on function public.gdrb_sheet_allowed(text,boolean),public.gdrb_save_match_sheet(jsonb,integer),public.gdrb_sheet_roster(text),public.gdrb_sheet_grant(text,text,boolean,boolean),public.gdrb_sheet_reserve_email(uuid,uuid,integer,text[]) to authenticated;
notify pgrst,'reload schema';
commit;
