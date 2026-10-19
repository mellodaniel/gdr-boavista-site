begin;
-- User confirmed that visible archived games remain public season history.
alter policy bo_matches_public_read on public.gdrb_matches using(is_visible);
alter policy bo_scorers_read on public.gdrb_match_scorers using(is_published and exists(select 1 from public.gdrb_matches m where m.id=match_id and m.is_visible and m.status in ('terminado','arquivado') and m.home_score is not null and m.away_score is not null and not public.gdrb_outcome_only(m.team_name)));
create or replace function public.gdrb_validate_match_scorer() returns trigger
language plpgsql set search_path = '' as $$
declare m public.gdrb_matches; known_goals bigint;
begin
  -- Permit withdrawing an existing publication even after its result/age group changes.
  if tg_op='UPDATE' and old.is_published and not new.is_published and old.match_id=new.match_id then return new; end if;
  select * into m from public.gdrb_matches where id=new.match_id for update;
  if not found then raise exception 'Jogo não encontrado.'; end if;
  if public.gdrb_outcome_only(m.team_name) then raise exception 'Este escalão utiliza apenas vitória/derrota; não registar marcadores.'; end if;
  if new.is_published then
    if m.status not in ('terminado','arquivado') or m.home_score is null or m.away_score is null then raise exception 'Confirma o resultado do jogo antes de publicar marcadores.'; end if;
    select coalesce(sum(goals),0) into known_goals from public.gdrb_match_scorers where match_id=new.match_id and is_published and id<>new.id;
    if known_goals+new.goals > m.home_score then raise exception 'Os golos dos marcadores ultrapassam o resultado do Boavista.'; end if;
  end if;
  return new;
end; $$;

-- Archiving a completed result is not a correction: preserve its validated scorers.
create or replace function public.gdrb_unpublish_changed_match_scorers() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 if old.status in ('terminado','arquivado') and new.status in ('terminado','arquivado')
 and (old.home_score,old.team_name) is not distinct from (new.home_score,new.team_name) then return new; end if;
 update public.gdrb_match_scorers set is_published=false where match_id=new.id and is_published;
 return new;
end; $$;
commit;
