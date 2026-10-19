begin;
-- Developer and admin keep full match management through the existing trusted helper.
drop policy if exists "Allow admin manage matches dev" on public.gdrb_matches;
drop policy if exists "Allow public read matches" on public.gdrb_matches;
create policy bo_matches_public_read on public.gdrb_matches for select to anon,authenticated using(is_visible and status<>'arquivado');
create policy bo_matches_admin_manage on public.gdrb_matches for all to authenticated
using((select public.gdrb_gallery_is_admin())) with check((select public.gdrb_gallery_is_admin()));
revoke all on public.gdrb_matches from anon,authenticated;
grant select on public.gdrb_matches to anon,authenticated;
grant insert,update,delete on public.gdrb_matches to authenticated;

create table public.gdrb_chat_budget_months (
 month date primary key check(extract(day from month)=1),
 charged_microusd bigint not null default 0 check(charged_microusd between 0 and 4500000)
);
create table public.gdrb_chat_requests (
 id uuid primary key,
 month date not null references public.gdrb_chat_budget_months(month),
 client_hash text check(client_hash is null or client_hash ~ '^[a-f0-9]{64}$'),
 created_at timestamptz not null default now(),
 charged_microusd bigint not null default 50000 check(charged_microusd between 0 and 50000),
 settled boolean not null default false,
 input_tokens integer,
 output_tokens integer
);
create index bo_chat_rate on public.gdrb_chat_requests(client_hash,created_at desc);
create index bo_chat_request_date on public.gdrb_chat_requests(created_at desc);
alter table public.gdrb_chat_budget_months enable row level security;
alter table public.gdrb_chat_requests enable row level security;
revoke all on public.gdrb_chat_budget_months,public.gdrb_chat_requests from anon,authenticated;
grant select on public.gdrb_chat_budget_months to authenticated;
create policy bo_chat_admin_budget_read on public.gdrb_chat_budget_months for select to authenticated using((select public.gdrb_gallery_is_admin()));
grant all on public.gdrb_chat_budget_months,public.gdrb_chat_requests to service_role;
-- Conservative carry-over of prototype testing (measured below USD 0.10 at migration).
insert into public.gdrb_chat_budget_months(month,charged_microusd) values('2026-10-01',100000);

create function public.gdrb_chat_reserve(request_id uuid, visitor_hash text) returns uuid
language plpgsql security definer set search_path='' as $$
declare m date := date_trunc('month',now() at time zone 'UTC')::date; spent bigint;
begin
 if visitor_hash is null or visitor_hash !~ '^[a-f0-9]{64}$' then raise exception 'CHAT_CLIENT'; end if;
 -- One short DB transaction serializes reservations across every server instance.
 perform pg_advisory_xact_lock(715,20261019);
 if exists(select 1 from public.gdrb_chat_requests where id=request_id) then raise exception 'CHAT_DUPLICATE'; end if;
 if (select count(*) from public.gdrb_chat_requests where client_hash=visitor_hash and created_at>now()-interval '1 minute')>=8
 or (select count(*) from public.gdrb_chat_requests where client_hash=visitor_hash and created_at>now()-interval '24 hours')>=60
 or (select count(*) from public.gdrb_chat_requests where created_at>now()-interval '1 minute')>=40 then raise exception 'CHAT_RATE'; end if;
 insert into public.gdrb_chat_budget_months(month) values(m) on conflict do nothing;
 select charged_microusd into spent from public.gdrb_chat_budget_months where month=m for update;
 if spent+50000>4500000 then raise exception 'CHAT_BUDGET'; end if;
 update public.gdrb_chat_budget_months set charged_microusd=charged_microusd+50000 where month=m;
 insert into public.gdrb_chat_requests(id,month,client_hash) values(request_id,m,visitor_hash);
 -- No questions or answers stored. Remove old pseudonymous rate identifiers.
 update public.gdrb_chat_requests set client_hash=null where client_hash is not null and created_at<now()-interval '48 hours';
 return request_id;
end; $$;
create function public.gdrb_chat_settle(request_id uuid, used_input integer, used_output integer) returns void
language plpgsql security definer set search_path='' as $$
declare r public.gdrb_chat_requests; actual bigint;
begin
 if used_input is null or used_output is null or used_input<0 or used_input>110000 or used_output<0 or used_output>1200 then raise exception 'CHAT_USAGE'; end if;
 -- USD .25/M input and .75/M output: conservative incl long-context/cache pricing.
 actual := ceil(used_input*0.25+used_output*0.75);
 perform pg_advisory_xact_lock(715,20261019);
 select * into r from public.gdrb_chat_requests where id=request_id for update;
 if not found then raise exception 'CHAT_UNKNOWN'; end if;
 if r.settled then return; end if;
 if actual>r.charged_microusd then raise exception 'CHAT_USAGE'; end if;
 update public.gdrb_chat_budget_months set charged_microusd=charged_microusd-r.charged_microusd+actual where month=r.month;
 update public.gdrb_chat_requests set charged_microusd=actual,settled=true,input_tokens=used_input,output_tokens=used_output where id=request_id;
end; $$;
revoke all on function public.gdrb_chat_reserve(uuid,text),public.gdrb_chat_settle(uuid,integer,integer) from public,anon,authenticated;
grant execute on function public.gdrb_chat_reserve(uuid,text),public.gdrb_chat_settle(uuid,integer,integer) to service_role;
comment on table public.gdrb_chat_budget_months is 'Central UTC monthly hard gate USD 4.50; includes outstanding reservations. No caller-provided limit.';
notify pgrst,'reload schema';
commit;
