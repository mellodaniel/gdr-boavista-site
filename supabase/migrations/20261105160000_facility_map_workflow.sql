BEGIN;
CREATE TABLE public.gdrb_facility_map_trash(id text PRIMARY KEY, game jsonb NOT NULL, deleted_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.gdrb_facility_map_trash ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gdrb_facility_map_trash FROM anon,authenticated;
CREATE FUNCTION public.gdrb_facility_map_day(p_date text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE all_games jsonb; chosen text; today text:=to_char(now() AT TIME ZONE 'Europe/Lisbon','YYYY-MM-DD'); stamp timestamptz;
BEGIN
 SELECT games,updated_at INTO all_games,stamp FROM public.gdrb_facility_maps WHERE id='main';
 IF p_date IS NOT NULL THEN PERFORM p_date::date; chosen:=p_date;
 ELSE SELECT min(g->>'date') INTO chosen FROM jsonb_array_elements(all_games) g WHERE g->>'date'>=today;chosen:=coalesce(chosen,today); END IF;
 RETURN jsonb_build_object('date',chosen,'updatedAt',stamp,
 'games',coalesce((SELECT jsonb_agg(g ORDER BY g->>'start') FROM jsonb_array_elements(all_games) g WHERE g->>'date'=chosen),'[]'::jsonb),
 'dates',coalesce((SELECT jsonb_agg(d ORDER BY d) FROM (SELECT DISTINCT g->>'date' d FROM jsonb_array_elements(all_games) g) q),'[]'::jsonb),
 'teams',coalesce((SELECT jsonb_agg(t ORDER BY t) FROM (SELECT DISTINCT trim(t) t FROM jsonb_array_elements(all_games) g CROSS JOIN LATERAL unnest(ARRAY[g->>'home',g->>'away']) t WHERE trim(t)<>'') q),'[]'::jsonb),
 'levels',coalesce((SELECT jsonb_agg(l ORDER BY l) FROM (SELECT DISTINCT g->>'level' l FROM jsonb_array_elements(all_games) g) q),'[]'::jsonb));
END;
$$;
CREATE FUNCTION public.gdrb_facility_game_save(p_key text,p_game jsonb,p_version integer DEFAULT -1) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE doc jsonb; previous jsonb; saved jsonb; k text; arrival text; departure text; v integer;
BEGIN
 IF NOT public.gdrb_facility_map_access(p_key) THEN RAISE EXCEPTION SQLSTATE 'PT403' USING MESSAGE='Link de gestão inválido.';END IF;
 IF jsonb_typeof(p_game) IS DISTINCT FROM 'object' OR octet_length(p_game::text)>6000 THEN RAISE EXCEPTION SQLSTATE 'PT400' USING MESSAGE='Atividade inválida.';END IF;
 FOREACH k IN ARRAY ARRAY['id','date','start','end','home','away','level','type','field','homeRoom','awayRoom','notes'] LOOP
 IF jsonb_typeof(p_game->k) IS DISTINCT FROM 'string' THEN RAISE EXCEPTION SQLSTATE 'PT400' USING MESSAGE='Verifica os campos da atividade.';END IF;
 END LOOP;
 IF length(p_game->>'id') NOT BETWEEN 1 AND 80 OR length(trim(p_game->>'home')) NOT BETWEEN 1 AND 100 OR length(trim(p_game->>'level')) NOT BETWEEN 1 AND 100 OR length(p_game->>'away')>100 OR length(p_game->>'notes')>400
 OR p_game->>'date' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
 OR p_game->>'start' !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' OR p_game->>'end' !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' OR p_game->>'end'<=p_game->>'start'
 OR p_game->>'type' NOT IN ('Treino','Particular','Campeonato') OR (p_game->>'type'<>'Treino' AND trim(p_game->>'away')='')
 OR p_game->>'field' NOT IN ('1','2','3','4','5','6','7','8','9','10','7 + 8') OR p_game->>'homeRoom' NOT IN ('','1','2','3','4') OR p_game->>'awayRoom' NOT IN ('','1','2','3','4') THEN RAISE EXCEPTION SQLSTATE 'PT400' USING MESSAGE='Verifica equipas, data, horários e espaços.';END IF;
 BEGIN PERFORM (p_game->>'date')::date; EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION SQLSTATE 'PT400' USING MESSAGE='Data inválida.';END;
 arrival:=coalesce(p_game->>'roomStart','');departure:=coalesce(p_game->>'roomEnd','');
 IF (arrival<>'' OR departure<>'') AND (arrival !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' OR departure !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' OR arrival>p_game->>'start' OR departure<p_game->>'end' OR departure<=arrival) THEN RAISE EXCEPTION SQLSTATE 'PT400' USING MESSAGE='A utilização dos balneários deve abranger o jogo.';END IF;
 SELECT games INTO doc FROM public.gdrb_facility_maps WHERE id='main' FOR UPDATE;
 SELECT g INTO previous FROM jsonb_array_elements(doc) g WHERE g->>'id'=p_game->>'id';
 v:=CASE WHEN previous IS NULL THEN -1 ELSE coalesce((previous->>'_version')::integer,0) END;
 IF p_version IS NULL OR p_version<>v THEN RAISE EXCEPTION SQLSTATE 'PT409' USING MESSAGE='Esta atividade foi alterada. Atualiza o mapa; o teu rascunho está guardado.';END IF;
 IF previous IS NULL THEN SELECT coalesce((game->>'_version')::integer,0) INTO v FROM public.gdrb_facility_map_trash WHERE id=p_game->>'id';v:=coalesce(v,-1);END IF;
 saved:=p_game||jsonb_build_object('_version',v+1,'roomStart',arrival,'roomEnd',departure);
 UPDATE public.gdrb_facility_maps SET games=coalesce((SELECT jsonb_agg(g) FROM jsonb_array_elements(doc) g WHERE g->>'id'<>p_game->>'id'),'[]'::jsonb)||jsonb_build_array(saved),revision=revision+1,updated_at=now() WHERE id='main';
 DELETE FROM public.gdrb_facility_map_trash WHERE id=p_game->>'id';
 RETURN saved;
END;
$$;
CREATE FUNCTION public.gdrb_facility_game_delete(p_key text,p_id text,p_version integer) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE doc jsonb; previous jsonb;
BEGIN
 IF NOT public.gdrb_facility_map_access(p_key) THEN RAISE EXCEPTION SQLSTATE 'PT403' USING MESSAGE='Link inválido.';END IF;
 SELECT games INTO doc FROM public.gdrb_facility_maps WHERE id='main' FOR UPDATE;
 SELECT g INTO previous FROM jsonb_array_elements(doc) g WHERE g->>'id'=p_id;
 IF previous IS NULL OR coalesce((previous->>'_version')::integer,0) IS DISTINCT FROM p_version THEN RAISE EXCEPTION SQLSTATE 'PT409' USING MESSAGE='A atividade foi alterada. Atualiza o mapa.';END IF;
 INSERT INTO public.gdrb_facility_map_trash(id,game) VALUES(p_id,previous) ON CONFLICT(id) DO UPDATE SET game=excluded.game,deleted_at=now();
 UPDATE public.gdrb_facility_maps SET games=coalesce((SELECT jsonb_agg(g) FROM jsonb_array_elements(doc) g WHERE g->>'id'<>p_id),'[]'::jsonb),revision=revision+1,updated_at=now() WHERE id='main';
 RETURN true;
END;
$$;
CREATE FUNCTION public.gdrb_facility_map_deleted(p_key text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT public.gdrb_facility_map_access(p_key) THEN RAISE EXCEPTION SQLSTATE 'PT403' USING MESSAGE='Link inválido.';END IF;
 RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('game',game,'deletedAt',deleted_at) ORDER BY deleted_at DESC) FROM public.gdrb_facility_map_trash),'[]'::jsonb);
END;
$$;
REVOKE ALL ON FUNCTION public.gdrb_facility_map_day(text),public.gdrb_facility_game_save(text,jsonb,integer),public.gdrb_facility_game_delete(text,text,integer),public.gdrb_facility_map_deleted(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gdrb_facility_map_day(text),public.gdrb_facility_game_save(text,jsonb,integer),public.gdrb_facility_game_delete(text,text,integer),public.gdrb_facility_map_deleted(text) TO anon,authenticated;
CREATE FUNCTION public.gdrb_facility_map_copy_day(p_key text,p_source text,p_target text) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE doc jsonb; g jsonb; copied integer:=0;
BEGIN
 IF NOT public.gdrb_facility_map_access(p_key) THEN RAISE EXCEPTION SQLSTATE 'PT403' USING MESSAGE='Link inválido.';END IF;
 IF p_source=p_target OR p_source IS NULL OR p_target IS NULL THEN RAISE EXCEPTION SQLSTATE 'PT400' USING MESSAGE='Escolhe outra data.';END IF;
 BEGIN PERFORM p_source::date;PERFORM p_target::date;EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION SQLSTATE 'PT400' USING MESSAGE='Data inválida.';END;
 SELECT games INTO doc FROM public.gdrb_facility_maps WHERE id='main' FOR UPDATE;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(doc) item WHERE item->>'date'=p_target) THEN RAISE EXCEPTION SQLSTATE 'PT409' USING MESSAGE='O dia de destino já tem atividades. Escolhe um dia vazio.';END IF;
 FOR g IN SELECT value FROM jsonb_array_elements(doc) WHERE value->>'date'=p_source LOOP
 PERFORM public.gdrb_facility_game_save(p_key,g||jsonb_build_object('id',gen_random_uuid()::text,'date',p_target),-1);copied:=copied+1;
 END LOOP;
 IF copied=0 THEN RAISE EXCEPTION SQLSTATE 'PT400' USING MESSAGE='O dia de origem não tem atividades.';END IF;
 RETURN copied;
END;
$$;
REVOKE ALL ON FUNCTION public.gdrb_facility_map_copy_day(text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gdrb_facility_map_copy_day(text,text,text) TO anon,authenticated;

-- Keep already-open pilot pages compatible with per-activity revisions.
ALTER FUNCTION public.gdrb_facility_map_write(text,integer,jsonb) RENAME TO gdrb_facility_map_write_legacy;
REVOKE ALL ON FUNCTION public.gdrb_facility_map_write_legacy(text,integer,jsonb) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.gdrb_facility_map_write(p_key text,p_revision integer,p_games jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE previous_doc jsonb; response jsonb; updated_doc jsonb;
BEGIN
 IF NOT public.gdrb_facility_map_access(p_key) THEN RAISE EXCEPTION SQLSTATE 'PT403' USING MESSAGE='Link inválido.';END IF;
 SELECT games INTO previous_doc FROM public.gdrb_facility_maps WHERE id='main' FOR UPDATE;
 response:=public.gdrb_facility_map_write_legacy(p_key,p_revision,p_games);
 SELECT coalesce(jsonb_agg(g||jsonb_build_object('_version',CASE WHEN old IS NULL THEN 0 WHEN (g-'_version') IS DISTINCT FROM (old-'_version') THEN coalesce((old->>'_version')::integer,0)+1 ELSE coalesce((old->>'_version')::integer,0) END)),'[]'::jsonb) INTO updated_doc
 FROM jsonb_array_elements(p_games) g LEFT JOIN LATERAL (SELECT value old FROM jsonb_array_elements(previous_doc) WHERE value->>'id'=g->>'id') q ON true;
 INSERT INTO public.gdrb_facility_map_trash(id,game) SELECT old->>'id',old FROM jsonb_array_elements(previous_doc) old WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p_games) current_game WHERE current_game->>'id'=old->>'id') ON CONFLICT(id) DO UPDATE SET game=excluded.game,deleted_at=now();
 UPDATE public.gdrb_facility_maps SET games=updated_doc WHERE id='main';
 RETURN response||jsonb_build_object('games',updated_doc);
END;
$$;
REVOKE ALL ON FUNCTION public.gdrb_facility_map_write(text,integer,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gdrb_facility_map_write(text,integer,jsonb) TO anon,authenticated;

COMMIT;
