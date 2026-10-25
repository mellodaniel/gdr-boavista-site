# Ficha virtual de jogo — gestão e acesso por link

## Atualização: gestão sem login

Implementação local validada em 23/10/2026. A migration adicional foi aplicada no Supabase após validação com rollback, conforme resultado enviado pelo utilizador. O utilizador confirmou a configuração de MATCH_SHEET_LINK_KEY para Production e Preview na Vercel. A publicação e a validação funcional continuam pendentes. O estado da versão anterior encontra-se abaixo.

- A entrada passa a usar `/ficha-de-jogo#acesso=<chave>`, sem conta nem palavra-passe. Quem possui o link pode consultar, criar, editar, finalizar, arquivar, apagar e restaurar as fichas de todos os escalões configurados, incluindo as fichas anteriores.
- A chave é aleatória (pelo menos 32 bytes, codificados em base64url), verificada exclusivamente no servidor através de `MATCH_SHEET_LINK_KEY`. Não criar uma variável `VITE_` com a chave, não a guardar no Git nem a incluir no sitemap. O fragmento não é enviado na navegação HTTP nem no Referer. As APIs recebem a chave num cabeçalho e não permitem acesso sem ela. O módulo continua excluído de Analytics e de indexação.
- A página tem filtros Todas (ativas), Em preparação, Em curso, Finalizadas, Arquivo e Lixo; pesquisa por adversário, responsável, competição ou data; filtro por escalão; ordenação por data do jogo.
- Arquivar é permitido apenas após finalizar. Retirar do arquivo conserva o estado finalizado. Apagar é reversível e move para o lixo; restaurar preserva o estado anterior, incluindo o arquivo. Não existe eliminação definitiva nem limpeza automática.
- Arquivo e lixo mantêm a convocatória, os eventos, as revisões e os envios. Uma ficha no lixo não pode ser editada, enviada nem descarregada pela API. Arquivadas continuam disponíveis para consulta, impressão e PDF; é necessário retirar do arquivo para editar ou reenviar.
- As ações sobre fichas sincronizadas exigem ligação, uma revisão atual e ausência de alterações locais pendentes. Ações de gestão também incrementam a revisão para impedir que outro dispositivo volte a gravar uma ficha arquivada/apagada. Rascunhos locais incompletos podem ir para o lixo e ser restaurados sem rede.
- A gravação passa pela API do módulo. `service_role` permanece apenas no servidor; a base de dados continua sem permissões anónimas. As regras de plantel, escalão e resultados são preservadas. As configurações de contas e permissões não são expostas pelo link.
- O nome do responsável continua a ser obrigatório na ficha; não existe identificação individual de quem utiliza o link. Há um limite partilhado de 10 pedidos novos de email por hora; as tentativas repetidas mantêm a idempotência.

### Ativar esta atualização

1. Aplicar a migration adicional `20261023190000_match_sheet_management.sql` depois da migration original já instalada. Não reaplicar a original. A nova migration é transacional e não elimina fichas existentes.
2. Validar `scripts/test-match-sheet-management.sql` (sempre rollback), além dos testes RLS anteriores. A validação SQL de gestão passou no Supabase em 23/10/2026, com rollback confirmado pelo resultado enviado pelo utilizador. O teste usa agora JSON diretamente, sem tabela temporária. Os 45 testes Node e o build já passaram localmente; a aplicação definitiva da migration foi confirmada pelo utilizador no mesmo dia.
3. Configurar `MATCH_SHEET_LINK_KEY` no ambiente Preview do Vercel com uma chave aleatória nova de 32 bytes em base64url (43 caracteres). As variáveis Supabase e Resend existentes mantêm-se. Não usar a chave de teste dos testes automatizados.
4. Publicar a branch com a atualização. Apenas depois da publicação e da configuração é que o link completo permite entrar. Um endereço sem chave mostra uma instrução para abrir o link do clube, sem formulário de login.
5. Validar criação → finalização → arquivo → lixo → restauro, em dois dispositivos. Confirmar uma tentativa com link inválido e uma tentativa sem chave, e validar impressão/PDF e offline. Não enviar emails reais sem destinatários autorizados.
6. Partilhar o link completo com o responsável do clube. Alterar a chave revoga chamadas futuras da chave anterior; cópias já guardadas no dispositivo continuam nesse dispositivo. Cada chave usa um espaço próprio de armazenamento local. O botão Copiar link permite voltar a partilhá-lo.

## Referência da primeira versão (com login)

Área privada em `/ficha-de-jogo`, acessível também pelo menu Futebol do backoffice e pelos atalhos PWA. O emblema oficial existente é apresentado na página, na impressão e no PDF. Implementação preparada sobre o commit `f02568a`, numa branch isolada `codex/ficha-jogo-virtual`.

## Estado em 23/10/2026

Preview publicado: https://gdr-boavista-site-git-codex-fi-83c2da-daniels-projects-ded1651f.vercel.app/ficha-de-jogo

A migration foi aplicada ao projeto Supabase existente depois de validar a migration, os testes RLS e o carregamento do plantel numa única transação com rollback confirmado. Foram configurados 13 escalões; existem plantéis ativos apenas para Seniores e Juniores. Não reaplicar a migration neste projeto. O domínio de produção não foi alterado.

Corrigidos no GitHub: inclusão do script de build em `.vercelignore` (`9a40b72`) e declaração da coluna `position` na função de plantel (`3dcc8c1`). A página de entrada e o emblema foram verificados no browser. As variáveis necessárias a Supabase e Resend estão presentes no ambiente Preview, sem exposição dos seus valores. O fluxo autenticado completo, o envio real de email e o uso offline em dispositivos reais continuam pendentes do piloto.

## Utilização

1. Entrar com uma conta do clube. Os administradores atuais (`gdrb_gallery_is_admin`) têm acesso; outras contas precisam de autorização por escalão.
2. Selecionar escalão, escolher o jogo da agenda ou preencher um particular, identificar responsável e convocados, titulares, capitão e números de camisola. Confirmar formato, duração e reentradas.
3. Iniciar o jogo. Golo, cartões, substituição e nota fixam o minuto ao abrir o registo. É possível corrigir e remover eventos; o resultado e os jogadores em campo são recalculados. O cronómetro usa instantes persistidos, recuperando o tempo após suspensão do ecrã.
4. Rever, preencher observações e finalizar. Imprimir a versão local ou descarregar o PDF da versão sincronizada. Enviar por email após confirmar os destinatários. Uma correção requer reabertura e uma nova versão.

## Ativação no ambiente existente

Não é necessária uma nova aplicação, domínio ou biblioteca npm. São necessários os serviços já utilizados: Vercel, Supabase e Resend.

1. Atualizar esta branch com a versão remota atual antes de publicar. O utilizador executou fetch e push em 23/10/2026; a base foi comparada com o GitHub antes do primeiro envio. As correções seguintes foram publicadas pela interface do GitHub.
2. Aplicar `supabase/migrations/20261023120000_match_sheets.sql` primeiro num ambiente de teste com as migrations anteriores. A migration é aditiva: não altera os jogadores nem publica resultados.
3. Executar `scripts/test-match-sheet-rls.sql` nesse ambiente de teste; a transação faz rollback. A validação de 23/10/2026 combinou a migration e estes testes antes de qualquer commit, incluindo uma chamada autorizada à função de plantel. Todos passaram e o rollback foi confirmado antes da ativação.
4. Manter `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. Para a API, usar `SUPABASE_URL` (ou a variável pública equivalente), `SUPABASE_ANON_KEY` (ou equivalente), `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY` e `MATCH_SHEET_FROM` com um remetente verificado no Resend. Se `MATCH_SHEET_FROM` estiver ausente, a API aceita `CONTACT_NOTIFICATION_FROM` ou `NEWSLETTER_FROM`. As chaves privadas nunca são expostas no cliente.
5. Executar `npm run test:match-sheet` e `npm run build`. O build gera o inventário de recursos do service worker exclusivo da ficha. Publicar pelo fluxo habitual do repositório/Vercel.
6. Abrir `/ficha-de-jogo` como administrador. Seniores e Juniores ficam associados às chaves conhecidas `senior` e `junior`. Associar os restantes escalões a plantéis reais em Configuração; não são inventados nem duplicados jogadores.
7. Atribuir acesso às contas existentes por escalão. A página permite conceder edição, consulta ou remover acesso. A criação de contas mantém-se no sistema existente.

## Dados e acessos

- `gdrb_match_sheet_teams`: associação escalão/plantel e valores iniciais de duração/formato. As durações são valores iniciais editáveis, não uma afirmação sobre o regulamento de cada competição.
- `gdrb_match_sheet_access`: autorização por utilizador e escalão.
- `gdrb_match_sheets`: documento privado, versão e responsável. Um documento integra dados do jogo, cópias históricas dos jogadores, eventos e cronómetro, guardados atomicamente.
- `gdrb_match_sheet_versions`: cópia de cada revisão aceite no servidor.
- `gdrb_match_sheet_deliveries`: destinatários, versão do PDF e confirmação do serviço de email.
- RLS restringe leitura. Escrita e revisão passam por RPC com verificação de permissões, responsável e revisão esperada. Nem contas de consulta nem acesso anónimo podem gravar. A API consulta dados com o JWT do utilizador; utiliza a chave de serviço apenas para confirmar o estado do envio já autorizado.
- A ficha não atualiza o calendário público nem divulga os eventos. Escalões com a política existente `outcome_only` ficam sem golos, com vitória/derrota. A associação ao calendário evita duplicar fichas do mesmo jogo.

## Sem ligação e conflitos

Abrir e preparar o jogo com ligação, aguardar a instalação dos recursos e carregar o plantel antes de ir para o campo. A primeira utilização e o primeiro login exigem rede. As imagens dos jogadores são complementares e podem não estar disponíveis offline; os nomes, números e dados carregados ficam em IndexedDB, separados por utilizador.

Cada alteração é guardada localmente antes da sincronização. Uma falha de gravação local aparece como erro, sem indicação de sucesso. A sincronização é tentada após alterações, ao recuperar rede e periodicamente com a página aberta. Não depende de Background Sync e não promete sincronização com a aplicação fechada. O armazenamento do navegador pode ser removido pelo utilizador ou pelo sistema; não limpar dados do site antes de sincronizar.

Dois dispositivos com a mesma conta não substituem silenciosamente as alterações: uma revisão desatualizada produz conflito. A página permite guardar uma cópia JSON antes de carregar a versão do servidor. A cópia é de recuperação manual; não existe importação automática. Terminar sessão requer sincronizar as alterações e apaga os dados locais da conta.

Os pedidos de email guardam a chave de tentativa no dispositivo, preservando-a após reload. Repetir a mesma tentativa utiliza a chave de idempotência do Resend. Pedidos pendentes com mais de 23 horas exigem revisão do histórico, porque a janela do fornecedor é de 24 horas. “Aceite pelo serviço de email” não significa confirmação de entrega na caixa do destinatário.

## Verificação antes do piloto

- Testar em Safari/iPhone e Chrome/Android, com larguras de 320 px, tablet e orientação horizontal.
- Preparar uma convocatória real, passar a modo de avião, registar eventos, bloquear/reabrir e recuperar a ligação. Verificar que cada evento chega uma só vez.
- Abrir a mesma ficha em dois dispositivos e confirmar a apresentação do conflito.
- Verificar uma conta sem acesso, uma de consulta e outra com edição, incluindo chamada direta às APIs/RPC.
- Enviar uma ficha fictícia para um destinatário de teste autorizado, conferir o PDF, repetir a tentativa após falha e verificar o histórico.
- Imprimir uma ficha com muitos eventos e observações longas. O PDF usa fontes PDF padrão WinAnsi, com suporte para acentos portugueses; caracteres fora desse conjunto são substituídos por `?`.

## Validação realizada e limites

Testes automatizados de regras de jogo, cronómetro, armazenamento/sincronização com adaptadores em memória, conflitos, autorização da API, idempotência de email e estrutura do PDF. A compilação TypeScript e o build Vite foram executados. O PDF de teste foi renderizado e inspecionado visualmente.

Foi publicado um Preview no Vercel e ativado o esquema privado da ficha no Supabase existente. Os testes SQL de gravação, revisões, conflitos, leitura/escrita por escalão, consulta e bloqueio anónimo passaram; o carregamento do plantel também foi exercitado. O ecrã de entrada foi revisto no browser. Não foram enviados emails reais nem feita promoção para o domínio de produção. Faltam os testes completos com uma conta do clube e em dispositivos reais.

## Ditado nas observações — 25/10/2026

As observações finais e notas dos eventos permitem ditado em português. O navegador grava áudio mono, converte para WAV PCM de 16 kHz e limita cada gravação a 60 segundos. O endpoint privado `/api/match-sheet-transcribe` valida a chave da ficha, formato, tamanho, duração efetiva e silêncio antes de usar `gpt-4o-mini-transcribe` com a mesma `OPENAI_API_KEY` do Bô. Não altera `OPENAI_MODEL` nem o chat. A chave precisa de acesso ao endpoint de transcrição.

A resposta fica num campo editável de revisão. Apenas “Adicionar às observações” acrescenta o texto numa nova linha; respeita os limites de 4000/1500 caracteres sem truncar notas anteriores. Cancelar, fechar o formulário, perder a edição ou ocultar a página durante a gravação liberta o microfone. Cancelar um pedido já enviado não garante que o fornecedor deixe de o processar. O site não persiste áudio; a política de retenção do fornecedor continua aplicável.

A API não guarda texto nem áudio e não regista o conteúdo em logs. A proteção de rajada (10 pedidos por minuto/IP) é local a cada instância, não um orçamento global. Os limites de acesso, tamanho e duração aplicam-se a cada pedido. Falta de rede, permissão, fala ou serviço mantém a escrita manual. Não há envio automático posterior de gravações offline.

Validação: testes de API e de áudio em `scripts/test-match-sheet-transcription.mjs`. A fixture local `scripts/fixtures/dictation.html` testa o componente real com microfone e resposta simulados, sem recolher áudio nem consumir API. Não faz parte do build público. Testes em dispositivos físicos devem incluir Safari/iPhone e Chrome/Android, ruído, bloqueio de ecrã e recusa de permissão.

## Marcador para todos os escalões (25/10/2026)
Todos os escalões passam a permitir golos, empates e marcador numérico na ficha, PDF e relato dos adeptos. A antiga opção `recordGoals` permanece compatível com os documentos históricos, mas já não restringe a interface nem a validação; o servidor normaliza-a para true ao guardar. Ao guardar, o servidor ativa também record_goals na configuração desse escalão antes da validação SQL. Isto não altera resultados, eventos ou documentos históricos. As regras da agenda e de torneios são independentes desta ficha e não foram alteradas. Notas e comentários internos continuam excluídos do relato público.
