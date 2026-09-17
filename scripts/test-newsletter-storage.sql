begin;
select set_config('request.jwt.claim.sub', (select id::text from auth.users where lower(email)='developer@gdrboavista.local' limit 1), true);
set local role authenticated;
insert into storage.objects (bucket_id,name) values ('gdrb-newsletter-images','__newsletter_permissions_test__.jpg');
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000000', true);
set local role authenticated;
do $$ begin
  begin
    insert into storage.objects (bucket_id,name) values ('gdrb-newsletter-images','__newsletter_unauthorized_test__.jpg');
    raise exception 'FAILED: unauthorized upload was allowed';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select jsonb_build_object(
 'images_column', exists(select 1 from information_schema.columns where table_schema='public' and table_name='gdrb_communications' and column_name='images' and data_type='jsonb'),
 'bucket', (select jsonb_build_object('public',public,'limit',file_size_limit,'mime',allowed_mime_types) from storage.buckets where id='gdrb-newsletter-images'),
 'permissions_test','Admin allowed; unauthorized user blocked. Test writes rolled back.'
) as verification;
rollback;
