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

## Primeira atualização real — 19/10/2026

Fonte: Centro de Resultados da FPF, AF Leiria, época 2026/27. Cinco classificações completas publicadas (47 linhas): Seniores, Divisão de Honra/fase única (16.º, 0 pontos, 4 jogos); Juniores, 1.ª Divisão/1.ª fase/Série B (4.º empatado, 0 pontos, 1 jogo); Juvenis, 1.ª Divisão/1.ª fase/Série B (4.º, 0 pontos, 0 jogos); Iniciados, 1.ª Divisão/1.ª fase/Série C (2.º, 9 pontos, 3 jogos); Sub-13, Infantis F.9/fase única/Série C (3.º empatado, 0 pontos, 0 jogos na fonte). As posições empatadas e a equipa desistente dos Juvenis foram preservadas exatamente como publicadas. Não recalcular pontos nem retirar equipas manualmente.

A tabela Sub-13 ainda não refletia o jogo de 17/10/2026 contra o Bolatangente. O resultado 1–4 do clube foi preservado. O utilizador confirmou que não sabe o marcador e pediu expressamente para deixar sem dados nesse jogo. O campo round_label comunica o atraso da fonte ao Bô. A FPF avisa que os resultados só se tornam oficiais quinze dias após cada encontro; essa ressalva também ficou guardada.

Marcadores: 11 registos publicados em 3 jogos públicos terminados, cobrindo os 13 golos do clube nesses jogos. Juniores 17/10: Guilherme Silva e Tomas Coelho (1 cada). Iniciados 11/10: Tiago Lacerda (3), Ary Deus e Xavier Bento (1 cada). Iniciados 18/10: Guilherme Alberto, Ary Deus, Tiago Lacerda, Santiago Norte e Gustavo Martins (1 cada), mais 1 autogolo do adversário, sem nomear a atleta adversária. Seniores 18/10: derrota 0–4 confirmada na ficha FPF 2582754, portanto sem marcador do Boavista. Juvenis: nenhum jogo realizado registado na fonte. Não foram desarquivados jogos nem fabricadas linhas com zero golos; isto não constitui um histórico integral de marcadores da época.

Importação reexecutável e transacional em `supabase/data/20261019_bo_sports.sql`, com validação prévia de IDs, equipa, data, adversário, estado e resultado dos jogos. Evidência consultada e linhas transcritas em `supabase/data/20261019_bo_sports.sources.json`. Foi testada com ROLLBACK antes da aplicação. As fontes são públicas e foram consultadas manualmente; não foi criada uma automatização semanal.

### Proteção adicional das respostas sobre marcadores

Os testes reais detetaram atribuição de um nome dos Juniores ao jogo sem marcador dos Sub-13 e um aviso incorreto de lista parcial quando havia autogolo. `server/boSportsAnswers.js` passa a construir as respostas sobre marcadores de um jogo diretamente dos registos confirmados, com equipa/data/adversário e total incluindo autogolos. Não chama a OpenAI para esses casos. Para perguntas que continuam a usar IA, os registos de marcadores ficam limitados ao escalão mencionado. Perguntas agregadas não são apresentadas como totais completos da época. Testes de regressão: `node scripts/test-bo-sports-answers.mjs`.


## Histórico público e correção dos Seniores — 19/10/2026

O utilizador confirmou que jogos arquivados com is_visible=true continuam a contar para o histórico e podem ser consultados pelo Bô. A migração 20261019190000 permite essa leitura e a publicação de marcadores de jogos arquivados com resultado confirmado, sem mudar o estado dos jogos. Jogos ocultos e marcadores em rascunho continuam protegidos. No contexto do Bô, estes jogos são tratados como terminados; o calendário mantém o estado arquivado na base. Arquivar um resultado confirmado não invalida os seus marcadores; corrigir golos ou escalão continua a invalidá-los.

Confirmada a ficha FPF https://resultados.fpf.pt/Match/GetMatchInformation?matchId=2582729: GD Guiense 6–3 GDR Boavista, 27/09/2026. Golos Boavista: Alexandre Fernandes (40'), Romeu Neca (43') e Gabriel Santos (67'), um cada. Registos publicados ligados ao jogo existente b315a657-7c13-47b9-a937-1c95f9eeaf98. O teste transacional confirmou acesso anónimo aos três marcadores e ausência de jogos ocultos/rascunhos, com ROLLBACK antes da aplicação. A automatização semanal foi atualizada para incluir o histórico visível e auditar lacunas.

## Revisão transversal do Bô — 19/10/2026

Foram concluídas 24 perguntas reais sobre informação institucional, contactos, história, formação, jogos, cinco classificações, marcadores, sócios, loja, parceiros, notícias, equipa técnica, galeria, torneios e privacidade. Nove perguntas adicionais confirmaram correções de contexto, escalão, época e jogo específico; a seguinte foi bloqueada pela proteção de frequência, que foi respeitada. Os restantes casos dessa segunda ronda não foram executados. Testes locais de regressão validaram fontes públicas, orçamento, privacidade, agregação e clarificações.

A revisão corrigiu a troca de escalão em perguntas de seguimento sobre rankings, a mudança entre época passada e atual e a seleção de um jogo mencionado anteriormente. Os totais publicados por jogador são agora calculados no servidor antes de serem apresentados à IA. A pesquisa privilegia a pergunta atual e evita que listas de atletas ocultem a informação do treinador. Perguntas de esclarecimento não exibem fontes ou cartões irrelevantes.

Ficha FPF 2684736: Iniciados, Boavista 3–1 GDRC Unidos, 05/10/2026. Foram confirmados e publicados Xavier Bento (10', 53') e Tiago Lacerda (70'), ligados ao jogo arquivado visível existente. Importação validada com ROLLBACK e aplicada através de supabase/data/20261019_bo_iniciados_history.sql. Os três jogos de Iniciados com marcadores publicados totalizam Tiago Lacerda 5, Xavier Bento 3, Ary Deus 2, Guilherme Alberto 1, Gustavo Martins 1, Santiago Norte 1, mais um autogolo adversário.

Permanecem sem nomes confirmados os golos dos amigáveis de Seniores e Juniores de 12/09, do encontro Sub-13 de 03/10 e dos Sub-13 contra Bolatangente de 17/10 (o utilizador pediu para deixar este último em branco). A data de fundação e o preço das quotas não constam das fontes consultadas. O Bô deve reconhecer estas lacunas. Mantém-se o bloqueio central mensal de 4,50 USD, com margem para o limite solicitado de 5 USD; nenhuma proteção foi levantada para realizar testes.
