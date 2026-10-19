-- Run after the new migration; all test changes roll back.
begin;

do $$
declare before_cost bigint; after_cost bigint; i integer; h text := repeat('a',64); devh text := repeat('b',64); rid uuid;
begin
 select charged_microusd into before_cost from public.gdrb_chat_budget_months where month=date_trunc('month',now())::date;
 insert into public.gdrb_chat_requests(id,month,client_hash,created_at,charged_microusd,settled)
 select gen_random_uuid(),date_trunc('month',now())::date,h,now()-interval '2 hours',0,true from generate_series(1,60);
 begin perform public.gdrb_chat_reserve_v2(gen_random_uuid(),h,false); raise exception 'Expected daily rejection'; exception when others then if sqlerrm<>'CHAT_RATE_DAILY' then raise; end if; end;
 insert into public.gdrb_chat_requests(id,month,client_hash,created_at,charged_microusd,settled,audience)
 select gen_random_uuid(),date_trunc('month',now())::date,devh,now()-interval '2 hours',0,true,'developer' from generate_series(1,60);
 rid:=gen_random_uuid(); perform public.gdrb_chat_reserve_v2(rid,devh,true);
 select charged_microusd into after_cost from public.gdrb_chat_budget_months where month=date_trunc('month',now())::date;
 if after_cost<>before_cost+50000 then raise exception 'Developer bypassed budget'; end if;
 if has_function_privilege('anon','public.gdrb_chat_reserve_v2(uuid,text,boolean)','execute') or has_function_privilege('authenticated','public.gdrb_chat_reserve_v2(uuid,text,boolean)','execute') then raise exception 'RPC publicly callable'; end if;
 update public.gdrb_chat_budget_months set charged_microusd=4500000 where month=date_trunc('month',now())::date;
 begin perform public.gdrb_chat_reserve_v2(gen_random_uuid(),devh,true); raise exception 'Expected budget rejection'; exception when others then if sqlerrm<>'CHAT_BUDGET' then raise; end if; end;
end $$;
rollback;
