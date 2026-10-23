# Ficha virtual de jogo

Área privada em `/ficha-de-jogo`, acessível também pelo menu Futebol do backoffice e pelos atalhos PWA. O emblema oficial existente é apresentado na página, na impressão e no PDF. Implementação preparada sobre o commit `f02568a`, numa branch isolada `codex/ficha-jogo-virtual`.

## Utilização

1. Entrar com uma conta do clube. Os administradores atuais (`gdrb_gallery_is_admin`) têm acesso; outras contas precisam de autorização por escalão.
2. Selecionar escalão, escolher o jogo da agenda ou preencher um particular, identificar responsável e convocados, titulares, capitão e números de camisola. Confirmar formato, duração e reentradas.
3. Iniciar o jogo. Golo, cartões, substituição e nota fixam o minuto ao abrir o registo. É possível corrigir e remover eventos; o resultado e os jogadores em campo são recalculados. O cronómetro usa instantes persistidos, recuperando o tempo após suspensão do ecrã.
4. Rever, preencher observações e finalizar. Imprimir a versão local ou descarregar o PDF da versão sincronizada. Enviar por email após confirmar os destinatários. Uma correção requer reabertura e uma nova versão.

## Ativação no ambiente existente

Não é necessária uma nova aplicação, domínio ou biblioteca npm. São necessários os serviços já utilizados: Vercel, Supabase e Resend.

1. Atualizar esta branch com a versão remota atual antes de publicar. O acesso à rede estava indisponível durante a implementação, pelo que a base local não foi comparada com o GitHub em tempo real.
2. Aplicar `supabase/migrations/20261023120000_match_sheets.sql` primeiro num ambiente de teste com as migrations anteriores. A migration é aditiva: não altera os jogadores nem publica resultados.
3. Executar `scripts/test-match-sheet-rls.sql` nesse ambiente de teste; a transação faz rollback. Os testes SQL precisam de PostgreSQL/Supabase e não foram executados no ambiente de desenvolvimento desta entrega.
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

Não foram aplicadas alterações à base em produção, enviados emails reais nem publicada uma versão. A validação visual da interface no navegador, a instalação PWA num dispositivo real e os testes SQL ficam pendentes por limitações de rede/execução deste ambiente.
