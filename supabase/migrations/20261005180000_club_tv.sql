begin;
alter table public.gdrb_sponsors
 add column tv_message text check (length(tv_message)<=220),
 add column tv_contact text check (length(tv_contact)<=160),
 add column show_on_tv boolean not null default true;

create table public.gdrb_tv_devices (
 id uuid primary key default gen_random_uuid(),
 name text not null check (length(name) between 1 and 80),
 activation_hash text unique,
 activation_expires_at timestamptz not null default (now()+interval '24 hours'),
 session_hash text unique,
 session_expires_at timestamptz,
 activated_at timestamptz,
 revoked_at timestamptz,
 created_at timestamptz not null default now(),
 created_by uuid references auth.users(id)
);
alter table public.gdrb_tv_devices enable row level security;
revoke all on public.gdrb_tv_devices from anon,authenticated;
-- Only the server holds service credentials. Device secrets are stored as hashes.
grant all on public.gdrb_tv_devices to service_role;

create function public.gdrb_tv_activate(key_hash text, new_session_hash text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare device_id uuid;
begin
 update public.gdrb_tv_devices set activation_hash=null,session_hash=new_session_hash,
   session_expires_at=now()+interval '365 days',activated_at=now()
 where activation_hash=key_hash and activation_expires_at>now() and revoked_at is null and activated_at is null
 returning id into device_id;
 return device_id;
end; $$;
revoke all on function public.gdrb_tv_activate(text,text) from public,anon,authenticated;
grant execute on function public.gdrb_tv_activate(text,text) to service_role;

-- Short descriptions grounded in the partners' existing published descriptions.
update public.gdrb_sponsors set tv_message=case name
 when 'EST by Vulcain' then 'Engenharia, automação industrial, quadros elétricos e soluções de AVAC.'
 when 'VMF Energia' then 'Combustíveis, lubrificantes e postos de abastecimento próximos da nossa comunidade.'
 when 'N.J Car' then 'Compra e venda de automóveis. Encontre a sua próxima viatura nos Pousos, Leiria.'
 when 'Tio Afonso Restaurante' then 'Boa comida, convívio e proximidade. À mesa com a nossa comunidade.'
 when 'Talho Fercarreira' then 'Carnes e enchidos tradicionais da Boa Vista. O sabor da nossa terra.'
 when 'Business Governance AI' then 'Tecnologia e soluções inteligentes para apoiar a evolução das empresas.'
 when 'EZLuga' then 'Uma plataforma que liga quem tem equipamentos para alugar a quem precisa deles.'
 when 'Puro Olhar Optica-médica' then 'Ótica e cuidados com a visão, com atendimento personalizado na Boa Vista.'
 when 'Fotos com Vida' then 'Fotografia desportiva para clubes, atletas e eventos. A emoção do jogo em imagens.'
 when 'Sumtek' then 'Informática, reparação de equipamentos e apoio técnico a empresas e particulares.'
 when 'Barba Negra Batalha' then 'Barbearia e cuidado masculino na Batalha. Cortes com atenção ao detalhe.'
 else null end
 where tv_message is null;
notify pgrst,'reload schema';
commit;
