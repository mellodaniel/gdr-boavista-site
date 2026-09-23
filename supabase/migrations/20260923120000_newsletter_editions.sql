begin;
alter table public.gdrb_communications
  add column if not exists newsletter_edition bigint,
  add column if not exists newsletter_issued_at timestamptz;
create unique index if not exists gdrb_communications_newsletter_edition_key
  on public.gdrb_communications(newsletter_edition);
create sequence if not exists public.gdrb_newsletter_edition_seq;
create or replace function public.reserve_newsletter_edition(p_communication_id uuid)
returns table(newsletter_edition bigint, newsletter_issued_at timestamptz)
language plpgsql security definer set search_path = public
as $$
begin
  perform 1 from public.gdrb_communications c where c.id = p_communication_id for update;
  if not found then raise exception 'Comunicação não encontrada'; end if;
  return query update public.gdrb_communications c
    set newsletter_edition = coalesce(c.newsletter_edition, nextval('public.gdrb_newsletter_edition_seq')),
        newsletter_issued_at = coalesce(c.newsletter_issued_at, now())
    where c.id = p_communication_id
    returning c.newsletter_edition, c.newsletter_issued_at;
end;
$$;
revoke all on function public.reserve_newsletter_edition(uuid) from public, anon, authenticated;
grant execute on function public.reserve_newsletter_edition(uuid) to service_role;
revoke all on sequence public.gdrb_newsletter_edition_seq from public, anon, authenticated;
commit;
