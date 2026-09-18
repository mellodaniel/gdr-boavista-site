BEGIN;
ALTER TABLE public.gdrb_roster_players DROP CONSTRAINT gdrb_roster_players_group_valid;
ALTER TABLE public.gdrb_roster_players ADD CONSTRAINT gdrb_roster_players_group_valid CHECK (roster_group IN ('Guarda-redes', 'Defesas', 'Médios', 'Avançados', 'Equipa técnica', 'Jogadores'));
COMMIT;
