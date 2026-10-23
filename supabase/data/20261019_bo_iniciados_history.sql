begin;
-- FPF match 2684736, checked 19/10/2026: Xavier Bento 10',53'; Tiago Lacerda 70'.
do $$ begin
 if (select count(*) from public.gdrb_matches where team_name='Iniciados' and match_date='2026-10-05' and opponent='GDRC Unidos' and home_score=3 and away_score=1 and is_visible and status='arquivado')<>1 then raise exception 'Match mismatch'; end if;
end $$;
insert into public.gdrb_match_scorers(match_id,public_name,goals,kind,source_name,source_url,is_published)
select m.id,s.public_name,s.goals,'player','FPF / AF Leiria','https://resultados.fpf.pt/Match/GetMatchInformation?matchId=2684736',true
from public.gdrb_matches m cross join (values ('Xavier Bento',2),('Tiago Lacerda',1)) s(public_name,goals)
where m.team_name='Iniciados' and m.match_date='2026-10-05' and m.opponent='GDRC Unidos'
on conflict(match_id,public_name,kind) do nothing;
do $$ begin
 if (select sum(s.goals) from public.gdrb_match_scorers s join public.gdrb_matches m on m.id=s.match_id where m.team_name='Iniciados' and m.match_date='2026-10-05' and s.is_published)<>3 then raise exception 'Incomplete scorer total'; end if;
end $$;
commit;
