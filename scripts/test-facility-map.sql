BEGIN;
UPDATE public.gdrb_facility_maps SET key_hash=encode(sha256(convert_to('test-key','UTF8')),'hex') WHERE id='main';
SET LOCAL ROLE anon;
DO $$
DECLARE g jsonb:='{"id":"workflow-test","date":"2099-12-20","start":"10:00","end":"11:00","home":"GDRB","away":"Teste","level":"Teste","type":"Particular","field":"7","homeRoom":"2","awayRoom":"3","notes":"","roomStart":"09:30","roomEnd":"11:30"}'; result jsonb; blocked boolean; n integer;
BEGIN
 result:=public.gdrb_facility_map_day('2099-12-20');
 IF jsonb_array_length(result->'games')<>0 THEN RAISE EXCEPTION 'Test day already in use';END IF;
 blocked:=false;BEGIN PERFORM public.gdrb_facility_game_save('bad',g,-1);EXCEPTION WHEN SQLSTATE 'PT403' THEN blocked:=true;END;IF NOT blocked THEN RAISE EXCEPTION 'Bad key allowed';END IF;
 result:=public.gdrb_facility_game_save('test-key',g,-1);IF (result->>'_version')::integer<>0 THEN RAISE EXCEPTION 'Create version invalid';END IF;
 result:=public.gdrb_facility_game_save('test-key',g||'{"notes":"Edited"}',0);IF (result->>'_version')::integer<>1 THEN RAISE EXCEPTION 'Update version invalid';END IF;
 blocked:=false;BEGIN PERFORM public.gdrb_facility_game_save('test-key',g,0);EXCEPTION WHEN SQLSTATE 'PT409' THEN blocked:=true;END;IF NOT blocked THEN RAISE EXCEPTION 'Stale write allowed';END IF;
 blocked:=false;BEGIN PERFORM public.gdrb_facility_game_save('test-key',g||'{"id":"invalid","date":"2026-02-30"}',-1);EXCEPTION WHEN SQLSTATE 'PT400' THEN blocked:=true;END;IF NOT blocked THEN RAISE EXCEPTION 'Invalid date accepted';END IF;
 blocked:=false;BEGIN PERFORM public.gdrb_facility_game_save('test-key',g||'{"id":"invalid","field":null}',-1);EXCEPTION WHEN SQLSTATE 'PT400' THEN blocked:=true;END;IF NOT blocked THEN RAISE EXCEPTION 'Null field accepted';END IF;
 n:=public.gdrb_facility_map_copy_day('test-key','2099-12-20','2099-12-21');IF n<>1 THEN RAISE EXCEPTION 'Copy failed';END IF;
 blocked:=false;BEGIN PERFORM public.gdrb_facility_map_copy_day('test-key','2099-12-20','2099-12-21');EXCEPTION WHEN SQLSTATE 'PT409' THEN blocked:=true;END;IF NOT blocked THEN RAISE EXCEPTION 'Copied over occupied day';END IF;
 PERFORM public.gdrb_facility_game_delete('test-key','workflow-test',1);
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(public.gdrb_facility_map_deleted('test-key')) t WHERE t->'game'->>'id'='workflow-test') THEN RAISE EXCEPTION 'Trash missing';END IF;
 blocked:=false;BEGIN PERFORM public.gdrb_facility_game_save('test-key',g,1);EXCEPTION WHEN SQLSTATE 'PT409' THEN blocked:=true;END;IF NOT blocked THEN RAISE EXCEPTION 'Stale write resurrected deletion';END IF;
 result:=public.gdrb_facility_game_save('test-key',g,-1);
 IF (result->>'_version')::integer<>2 THEN RAISE EXCEPTION 'Restore must preserve version monotonicity';END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(public.gdrb_facility_map_deleted('test-key')) t WHERE t->'game'->>'id'='workflow-test') THEN RAISE EXCEPTION 'Restore did not clear trash';END IF;
 result:=public.gdrb_facility_map_read();
 PERFORM public.gdrb_facility_map_write('test-key',(result->>'revision')::integer,(SELECT jsonb_agg(CASE WHEN item->>'id'='workflow-test' THEN item||'{"notes":"Legacy edit"}'::jsonb ELSE item END) FROM jsonb_array_elements(result->'games') item));
 blocked:=false;BEGIN PERFORM public.gdrb_facility_game_save('test-key',g,2);EXCEPTION WHEN SQLSTATE 'PT409' THEN blocked:=true;END;IF NOT blocked THEN RAISE EXCEPTION 'Legacy client did not advance activity version';END IF;
END;
$$;
ROLLBACK;
SELECT 'PASS: create, edit, concurrency, invalid inputs, atomic copy, recoverable deletion and restore; rolled back' AS result;
