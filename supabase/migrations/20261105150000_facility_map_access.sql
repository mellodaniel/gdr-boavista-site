BEGIN;
CREATE FUNCTION public.gdrb_facility_map_access(p_key text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT p_key IS NOT NULL AND length(p_key)<=128 AND EXISTS (
 SELECT 1 FROM public.gdrb_facility_maps WHERE id='main' AND key_hash=encode(sha256(convert_to(p_key,'UTF8')),'hex'));
$$;
REVOKE ALL ON FUNCTION public.gdrb_facility_map_access(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gdrb_facility_map_access(text) TO anon,authenticated;
COMMIT;
