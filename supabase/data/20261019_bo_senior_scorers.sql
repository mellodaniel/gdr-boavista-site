begin;
do $$ begin
 if not exists(select 1 from public.gdrb_matches where id='b315a657-7c13-47b9-a937-1c95f9eeaf98' and team_name='Seniores' and match_date='2026-09-27' and home_score=3 and away_score=6 and is_visible and status='arquivado') then raise exception 'Match changed'; end if;
end $$;
update public.gdrb_match_scorers set is_published=true where match_id='b315a657-7c13-47b9-a937-1c95f9eeaf98' and public_name in ('Alexandre Fernandes','Romeu Neca','Gabriel Santos') and goals=1 and kind='player' and source_url='https://resultados.fpf.pt/Match/GetMatchInformation?matchId=2582729';
commit;
