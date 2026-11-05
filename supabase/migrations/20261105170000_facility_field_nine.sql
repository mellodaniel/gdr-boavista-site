-- Campo 9 is the combined playing area of Campos 7 and 8.
-- Normalize older clients too, preserving all other activity details.
CREATE OR REPLACE FUNCTION public.gdrb_facility_canonical_fields()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  SELECT coalesce(jsonb_agg(CASE WHEN g->>'field' = '7 + 8'
    THEN jsonb_set(jsonb_set(g, '{field}', '"9"'::jsonb), '{_version}',
      to_jsonb(coalesce((g->>'_version')::integer, 0) + 1))
    ELSE g END ORDER BY n), '[]'::jsonb)
  INTO NEW.games FROM jsonb_array_elements(NEW.games) WITH ORDINALITY AS items(g,n);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.gdrb_facility_canonical_fields() FROM PUBLIC;
CREATE TRIGGER facility_canonical_fields BEFORE INSERT OR UPDATE OF games
ON public.gdrb_facility_maps FOR EACH ROW
EXECUTE FUNCTION public.gdrb_facility_canonical_fields();
UPDATE public.gdrb_facility_maps SET games=games, revision=revision+1, updated_at=now()
WHERE EXISTS (SELECT 1 FROM jsonb_array_elements(games) g WHERE g->>'field'='7 + 8');
UPDATE public.gdrb_facility_map_trash SET game=jsonb_set(game,'{field}','"9"'::jsonb)
WHERE game->>'field'='7 + 8';
