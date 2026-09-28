BEGIN;
ALTER TABLE public.gdrb_tournaments ADD COLUMN IF NOT EXISTS start_time time without time zone;
COMMENT ON COLUMN public.gdrb_tournaments.start_time IS 'Optional local start time on start_date; NULL means not yet confirmed.';
NOTIFY pgrst, 'reload schema';
COMMIT;
