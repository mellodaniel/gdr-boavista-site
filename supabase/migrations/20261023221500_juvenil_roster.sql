-- Plantel Juvenis: nomes e camisolas confirmados em 23/10/2026.
-- Reexecutável; preserva outros dados dos jogadores existentes.
BEGIN;

LOCK TABLE public.gdrb_roster_players IN SHARE ROW EXCLUSIVE MODE;

DO $$
DECLARE
  jogador record;
BEGIN
  FOR jogador IN
    SELECT * FROM (VALUES
      (14, 'Aleksandr Bystrov'),
      (9, 'Alex Monteiro'),
      (7, 'Diogo Joaquim'),
      (77, 'Enzo Abrantes'),
      (54, 'Francisco Duarte'),
      (50, 'Gabriel Matos'),
      (49, 'Joaquim Duarte'),
      (1, 'Martim Coelho'),
      (8, 'Martim Fiuza'),
      (6, 'Matias Lagoa'),
      (23, 'Rafael Patricio'),
      (44, 'Rodrigo Cerqueira'),
      (12, 'Rodrigo Marques'),
      (33, 'Tomas Abreu'),
      (34, 'Tomas Outeiro'),
      (10, 'Tomas Santos'),
      (3, 'Arthur Mello'),
      (4, 'David Caseiro'),
      (22, 'Diogo Fernandes'),
      (51, 'Ruben Henriques'),
      (60, 'Santiago Teixeira')
    ) AS lista(numero, nome)
  LOOP
    UPDATE public.gdrb_roster_players
    SET shirt_number = jogador.numero
    WHERE team_key = 'juvenil' AND name = jogador.nome;

    IF NOT FOUND THEN
      INSERT INTO public.gdrb_roster_players (
        team_key, name, shirt_number, roster_group,
        position, photo_url, height, birth_year, nationality,
        transfer_status, previous_club, notes, is_active, sort_order
      ) VALUES (
        'juvenil', jogador.nome, jogador.numero, 'Jogadores',
        NULL, NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, true, 0
      );
    END IF;
  END LOOP;
END $$;

UPDATE public.gdrb_match_sheet_teams
SET roster_key = 'juvenil'
WHERE age_group = 'Juvenis';

COMMIT;

SELECT shirt_number AS camisola, name AS nome
FROM public.gdrb_roster_players
WHERE team_key = 'juvenil'
ORDER BY shirt_number, name;
