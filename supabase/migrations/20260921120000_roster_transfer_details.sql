BEGIN;
ALTER TABLE public.gdrb_roster_players
  ADD COLUMN transfer_status text CHECK (transfer_status IN ('Contratação', 'Renovação')),
  ADD COLUMN previous_club text,
  ADD CONSTRAINT roster_previous_club_requires_transfer CHECK (previous_club IS NULL OR (transfer_status IS NOT NULL AND transfer_status = 'Contratação'));
COMMIT;
