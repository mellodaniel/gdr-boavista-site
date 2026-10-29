-- Persist incomplete preparation without weakening live-game validation or revision checks.
begin;
create or replace function public.gdrb_save_match_sheet(p_document jsonb,p_revision integer)
returns integer language plpgsql security definer set search_path='' as $$
declare sid uuid; grp text; old public.gdrb_match_sheets; cfg public.gdrb_match_sheet_teams; v integer; item jsonb; player_id uuid; shared boolean:=coalesce(auth.role(),'')='service_role';
begin
 if not shared and auth.uid() is null then raise insufficient_privilege; end if;
 if p_revision is null or p_revision<0 or p_document is null or octet_length(p_document::text)>1048576 or p_document->>'schema' is distinct from '1' or jsonb_typeof(p_document->'squad') is distinct from 'array' or jsonb_typeof(p_document->'events') is distinct from 'array' or jsonb_typeof(p_document->'rules') is distinct from 'object' or jsonb_typeof(p_document->'clock') is distinct from 'object' then raise exception 'Ficha inválida'; end if;
 sid:=(p_document->>'id')::uuid;grp:=p_document->>'ageGroup';
 if not shared and not public.gdrb_sheet_allowed(grp,true) then raise insufficient_privilege;end if;
 select * into cfg from public.gdrb_match_sheet_teams where age_group=grp;
 if not found or cfg.roster_key is null then raise exception 'Associa primeiro o plantel ao escalão';end if;
 if jsonb_typeof(p_document->'opponent') is distinct from 'string' or jsonb_typeof(p_document->'recorder') is distinct from 'string' or jsonb_typeof(p_document->'date') is distinct from 'string' or length(p_document->>'opponent')>120 or length(p_document->>'recorder')>100 or coalesce(p_document->>'status','') not in('draft','live','interval','finished') or length(coalesce(p_document->>'notes',''))>4000 then raise exception 'Ficha inválida';end if;
 if p_document->>'status'<>'draft' and (length(btrim(p_document->>'opponent'))=0 or length(btrim(p_document->>'recorder'))=0 or p_document->>'date'='') then raise exception 'Preenche os dados obrigatórios';end if;
 if p_document->>'date'<>'' then perform (p_document->>'date')::date;end if;
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
   if (not shared and old.recorder_id is distinct from auth.uid()) or old.age_group<>grp then raise insufficient_privilege;end if;
   if old.revision<>p_revision then raise exception using errcode='40001',message='FICHA_CONFLICTO';end if;
   if old.archived_at is not null or old.deleted_at is not null then raise exception using errcode='40001',message='Restaura a ficha antes de editar';end if;
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


commit;
