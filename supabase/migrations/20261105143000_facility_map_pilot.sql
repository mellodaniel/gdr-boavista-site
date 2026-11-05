BEGIN;
CREATE TABLE public.gdrb_facility_maps (
 id text PRIMARY KEY CHECK (id='main'),
 games jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(games)='array'),
 revision integer NOT NULL DEFAULT 0 CHECK(revision>=0),
 updated_at timestamptz,
 key_hash text NOT NULL
);
ALTER TABLE public.gdrb_facility_maps ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gdrb_facility_maps FROM anon, authenticated;
CREATE FUNCTION public.gdrb_facility_map_read() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('games',games,'revision',revision,'updatedAt',updated_at)
 FROM public.gdrb_facility_maps WHERE id='main';
$$;
CREATE FUNCTION public.gdrb_facility_map_write(p_key text,p_revision integer,p_games jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb; g jsonb;
BEGIN
 IF p_key IS NULL OR length(p_key)>128 OR NOT EXISTS (
 SELECT 1 FROM public.gdrb_facility_maps WHERE id='main' AND key_hash=encode(sha256(convert_to(p_key,'UTF8')),'hex'))
 THEN RAISE EXCEPTION SQLSTATE 'PT403' USING MESSAGE='Link de gestão inválido.'; END IF;
 IF jsonb_typeof(p_games) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION SQLSTATE 'PT400' USING MESSAGE='Mapa inválido.'; END IF;
 IF jsonb_array_length(p_games)>300 OR octet_length(p_games::text)>200000 OR p_revision IS NULL OR p_revision<0 THEN RAISE EXCEPTION SQLSTATE 'PT400' USING MESSAGE='Mapa inválido.'; END IF;
 FOR g IN SELECT value FROM jsonb_array_elements(p_games) LOOP
 IF NOT (g ?& ARRAY['id','date','start','end','home','away','level','type','field','homeRoom','awayRoom','notes'])
 OR COALESCE(g->>'home','')='' OR COALESCE(g->>'level','')='' OR COALESCE(g->>'id','')=''
 OR (g->>'start') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' OR (g->>'end') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
 OR (g->>'end') <= (g->>'start') OR (g->>'date') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
 OR g->>'type' NOT IN ('Treino','Particular','Campeonato')
 OR (g->>'type'<>'Treino' AND COALESCE(g->>'away','')='')
 OR g->>'field' NOT IN ('1','2','3','4','5','6','7','8','9','10','7 + 8')
 OR g->>'homeRoom' NOT IN ('','1','2','3','4') OR g->>'awayRoom' NOT IN ('','1','2','3','4')
 THEN RAISE EXCEPTION SQLSTATE 'PT400' USING MESSAGE='Dados da atividade inválidos.'; END IF;
 END LOOP;
 IF (SELECT count(DISTINCT value->>'id') FROM jsonb_array_elements(p_games)) <> jsonb_array_length(p_games) THEN RAISE EXCEPTION SQLSTATE 'PT400' USING MESSAGE='Atividades repetidas.'; END IF;
 UPDATE public.gdrb_facility_maps SET games=p_games,revision=revision+1,updated_at=now()
 WHERE id='main' AND revision=p_revision
 RETURNING jsonb_build_object('games',games,'revision',revision,'updatedAt',updated_at) INTO result;
 IF result IS NULL THEN RAISE EXCEPTION SQLSTATE 'PT409' USING MESSAGE='O mapa foi alterado noutro dispositivo.'; END IF;
 RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.gdrb_facility_map_read() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.gdrb_facility_map_write(text,integer,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gdrb_facility_map_read() TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gdrb_facility_map_write(text,integer,jsonb) TO anon,authenticated;
COMMIT;
