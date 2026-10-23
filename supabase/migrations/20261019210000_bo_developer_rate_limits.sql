begin;
alter table public.gdrb_chat_requests add column audience text not null default 'public' check(audience in ('public','developer'));
-- Release existing rate identifiers only. Preserve every charge and reservation.
update public.gdrb_chat_requests set client_hash=null;
create function public.gdrb_chat_reserve_v2(request_id uuid, visitor_hash text, is_developer boolean) returns uuid
language plpgsql security definer set search_path='' as $$
declare m date := date_trunc('month',now() at time zone 'UTC')::date; spent bigint;
begin
 if visitor_hash is null or visitor_hash !~ '^[a-f0-9]{64}$' then raise exception 'CHAT_CLIENT'; end if;
 -- One short DB transaction serializes reservations across every server instance.
 perform pg_advisory_xact_lock(715,20261019);
 if exists(select 1 from public.gdrb_chat_requests where id=request_id) then raise exception 'CHAT_DUPLICATE'; end if;
 if is_developer is null then raise exception 'CHAT_CLIENT'; end if;
 if (select count(*) from public.gdrb_chat_requests where client_hash=visitor_hash and created_at>now()-interval '1 minute') >= (case when is_developer then 20 else 8 end) then raise exception 'CHAT_RATE_MINUTE'; end if;
 if not is_developer and (select count(*) from public.gdrb_chat_requests where client_hash=visitor_hash and created_at>now()-interval '24 hours')>=60 then raise exception 'CHAT_RATE_DAILY'; end if;
 if (select count(*) from public.gdrb_chat_requests where audience=case when is_developer then 'developer' else 'public' end and client_hash is not null and created_at>now()-interval '1 minute')>=40 then raise exception 'CHAT_RATE_BUSY'; end if;
 insert into public.gdrb_chat_budget_months(month) values(m) on conflict do nothing;
 select charged_microusd into spent from public.gdrb_chat_budget_months where month=m for update;
 if spent+50000>4500000 then raise exception 'CHAT_BUDGET'; end if;
 update public.gdrb_chat_budget_months set charged_microusd=charged_microusd+50000 where month=m;
 insert into public.gdrb_chat_requests(id,month,client_hash,audience) values(request_id,m,visitor_hash,case when is_developer then 'developer' else 'public' end);
 -- No questions or answers stored. Remove old pseudonymous rate identifiers.
 update public.gdrb_chat_requests set client_hash=null where client_hash is not null and created_at<now()-interval '48 hours';
 return request_id;
end; $$;

revoke all on function public.gdrb_chat_reserve_v2(uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.gdrb_chat_reserve_v2(uuid,text,boolean) to service_role;
commit;
