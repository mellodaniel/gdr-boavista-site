begin;
do $$
declare device uuid; activated uuid;
begin
 if has_table_privilege('anon','public.gdrb_tv_devices','SELECT') or has_table_privilege('authenticated','public.gdrb_tv_devices','SELECT') then raise exception 'Device secrets exposed'; end if;
 if has_function_privilege('anon','public.gdrb_tv_activate(text,text)','EXECUTE') or has_function_privilege('authenticated','public.gdrb_tv_activate(text,text)','EXECUTE') then raise exception 'Activation RPC exposed'; end if;
 insert into public.gdrb_tv_devices(name,activation_hash) values('TEST rollback','test-activation') returning id into device;
 activated:=public.gdrb_tv_activate('test-activation','test-session');
 if activated is distinct from device then raise exception 'Activation failed'; end if;
 if public.gdrb_tv_activate('test-activation','test-session-2') is not null then raise exception 'Activation reused'; end if;
 if not exists(select 1 from public.gdrb_tv_devices where id=device and activation_hash is null and session_hash='test-session' and activated_at is not null) then raise exception 'Session not stored'; end if;
 insert into public.gdrb_tv_devices(name,activation_hash,activation_expires_at) values('TEST expired','test-expired',now()-interval '1 minute');
 if public.gdrb_tv_activate('test-expired','test-session-3') is not null then raise exception 'Expired link accepted'; end if;
 insert into public.gdrb_tv_devices(name,activation_hash,revoked_at) values('TEST revoked','test-revoked',now());
 if public.gdrb_tv_activate('test-revoked','test-session-4') is not null then raise exception 'Revoked link accepted'; end if;
end $$;
select 'TV activation, replay prevention, expiry, revocation and privacy passed (rollback)' as result;
rollback;
