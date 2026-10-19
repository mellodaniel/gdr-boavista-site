# Bô — dados desportivos e atualização semanal

## Estrutura

Os jogos continuam em `gdrb_matches`. Não foi criado um segundo calendário, nem alterados resultados existentes.

| Tabela | Utilização |
|---|---|
| `gdrb_competitions` | Liga cada escalão à época, competição, fase/série e fonte oficial. |
| `gdrb_standings_snapshots` | Uma versão da classificação por atualização, com data de referência, fonte, data de consulta e número esperado de equipas. |
| `gdrb_standings_rows` | Todas as equipas dessa versão: posição, jogos, vitórias, empates, derrotas, golos e pontos oficiais. |
| `gdrb_match_scorers` | Marcadores do Boavista, ligados ao ID do jogo existente. |
| `gdrb_match_schedule_changes` | Histórico de mudanças de data, hora, local e estado nos jogos existentes, a partir da instalação. |

A vista `gdrb_latest_standings` devolve a versão publicada mais recente de cada competição e indica `needs_refresh` após sete dias sem consulta. Datas são guardadas explicitamente; não se calcula a classificação a partir dos resultados isolados do Boavista.

## Rotina semanal no Supabase Table Editor

1. Atualizar jogos e resultados no painel atual do site, como antes.
2. Em `gdrb_competitions`, cadastrar/confirmar o escalão, época, nome, fase, série e URL oficial. A correspondência com a AFL/FPF deve ser verificada; nenhuma foi inventada automaticamente.
3. Criar um rascunho em `gdrb_standings_snapshots`: `competition_id`, `as_of` (data da informação), `expected_teams`, `source_name`, `source_url`, `checked_at`. Manter `is_published=false`.
4. Inserir/importar todas as linhas em `gdrb_standings_rows`, usando esse `snapshot_id`. Marcar exatamente uma linha `is_boavista=true`. `points` é o valor da fonte, incluindo eventuais penalizações; nunca inferir pontos. Golos podem ficar nulos quando não publicados pela fonte.
5. Verificar a tabela inteira e mudar `is_published=true` na versão. A base exige o número de equipas declarado, a linha Boavista e coerência entre jogos/vitórias/empates/derrotas. A verificação não comprova a autenticidade da fonte: essa confirmação é editorial.
6. Na semana seguinte, criar outra versão; conservar as anteriores. Para corrigir uma versão já publicada, despublicá-la, corrigir e publicar novamente.
7. Registar marcadores com o `match_id` existente, nome autorizado para publicação, golos e fonte. Publicar só após confirmação. `kind=opponent_own_goal` representa um autogolo do adversário a favor do Boavista, sem necessidade de identificar o atleta. O total pode ser parcial: o chat deve dizê-lo enquanto não coincidir com os golos Boavista. `home_score` contém sempre os golos Boavista, mesmo num jogo fora. Mudança de resultado, escalão ou estado retira os marcadores da publicação até nova revisão.
8. Rever as mudanças em `gdrb_match_schedule_changes`, acrescentar a fonte quando disponível e marcar `is_confirmed=true` apenas depois da confirmação. O trigger regista alterações no site, não prova uma comunicação oficial AFL. Não reconstrói alterações anteriores à instalação.

A base respeita a regra existente de escalões com apenas vitória/derrota: não aceita novos marcadores nem publicação de classificações numéricas nesses escalões.

## Permissões

RLS ativa nas cinco tabelas. Visitantes e utilizadores normais só leem informação publicada/confirmada de competições ativas e jogos visíveis. Só os administradores já reconhecidos pela função `gdrb_gallery_is_admin()` e processos de servidor autorizados podem editar. Não foram criados utilizadores nem novas credenciais. O Table Editor do projeto continua disponível aos operadores autorizados do Supabase.

As versões em rascunho e mudanças não confirmadas não são públicas. Os marcadores só ficam públicos para jogos terminados e visíveis. A vista de classificações respeita as permissões do utilizador que a consulta.

## Limites desta entrega

Estrutura e histórico instalados, sem classificações ou marcadores fictícios. Não foi ativada recolha automática da AFL nem agendada uma tarefa semanal: esta estrutura permite a atualização semanal pela equipa. O endpoint do Bô já lê estas tabelas com as permissões públicas, inclui a fonte e sinaliza versões com mais de sete dias. A recolha automática continua por implementar. Uma verificação semanal não garante aviso imediato de alterações; para alertas próximos de jogos será necessária maior frequência.

A mascote Bô foi aprovada e integrada. A publicação usa contabilidade central no Supabase com limite efetivo de 4,50 USD/mês UTC, partilhado entre visitantes e instâncias.

## Correção de permissões aplicada

A migração `20261019180000_bo_production_security_budget.sql` remove a escrita pública dos jogos e limita a leitura pública aos visíveis e não arquivados. Admin e Developer mantêm todas as operações sobre jogos e fontes através da função existente `gdrb_gallery_is_admin()`. O teste SQL verificou explicitamente criação, leitura de ocultos, atualização e eliminação pelo Developer; utilizadores comuns e visitantes não podem escrever. As alterações de calendário continuam a exigir confirmação editorial antes de aparecer no chat.

## Validação

Migração `20261019160000_bo_sports_sources.sql`. Teste `scripts/test-bo-sports-sources.sql`, executado na mesma transação da migração e revertido antes da aplicação definitiva: publicação incompleta bloqueada, versões publicadas protegidas contra edição de linhas, rascunhos privados, totais dos marcadores limitados ao resultado, invalidação após correção, histórico de horário e ausência de duplicações em updates sem mudança, escrita anónima e de utilizador normal bloqueada.
