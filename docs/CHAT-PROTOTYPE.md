# Bô — implementação publicada

Mascote aprovada em 19/10/2026. React + Supabase + OpenAI Responses, sem n8n. A versão de produção usa `api/chat.ts` e o motor comum `server/boChat.js`; o Vite chama o mesmo motor no desenvolvimento.

## Configuração privada

Vercel Production: `OPENAI_API_KEY` e `BOAVISTA_CHAT_SUPABASE_KEY` (chave de serviço do mesmo Supabase, só no servidor). Modelo fixo `gpt-6-luna`, standard, reasoning none, store false, máximo 1200 tokens de saída. Fontes lidas exclusivamente com `VITE_SUPABASE_ANON_KEY` para respeitar RLS; a chave de serviço é usada apenas nas funções de contabilidade. Desenvolvimento: `.env.development.local`, ignorado no Git. Nunca colocar segredos em variáveis VITE. A Vercel pode devolver placeholders ao descarregar segredos; não os utilizar como credenciais.

## Custo central

Migração `20261019180000_bo_production_security_budget.sql` cria o saldo mensal UTC e os pedidos. Antes de cada chamada, RPC `gdrb_chat_reserve` reserva 50000 micro-USD (0,05 USD), sob bloqueio transacional global; rejeita acima de 4500000 micro-USD (4,50 USD). Inclui reserva de 0,10 USD em outubro de 2026 pelos testes locais anteriores, cujo registo era inferior a esse valor. Não existe parâmetro de cliente que possa aumentar o limite.

Após usage confirmado, `gdrb_chat_settle` troca a reserva pelo custo conservador, sem desconto de cache: 0,25 USD/M entrada e 0,75 USD/M saída, verificados na documentação oficial em 19/10/2026. Entrada até 100000 bytes com margem de protocolo; limite de saída 1200. Chamadas sem usage, timeouts e falhas de liquidação retêm 0,05 USD. Não há retries automáticos pagos. As liquidações são idempotentes e debitam o mês original. O ciclo novo começa automaticamente em UTC. O contador local antigo já não é utilizado pelo servidor do chat.

Limites: oito pedidos por minuto por identificador, 60 por identificador diário, 40 globais/minuto. Identificadores HMAC do IP renovam diariamente; são limpos após 48h na próxima reserva. Vercel fornece o IP via x-forwarded-for. Não guardar perguntas/respostas, tokens de autenticação ou IPs em texto. A base guarda apenas contagem de tokens, custo e estado. O limite refere-se ao consumo da API deste chat, não a alojamento, impostos ou outras aplicações da conta. Rever tarifas antes de alterar modelo.

## Fontes e apresentação

Jogos: até 100 futuros e 100 anteriores, visíveis e não arquivados. Resultado por equipa tem semântica `home_score=Boavista`, mesmo fora. Pontuações de escalões qualitativos são removidas antes da chamada. Escalões/treinos partilhados com os módulos existentes, época 2026/27. Idade isolada pede ano de nascimento; A/B depende da coordenação.

Classificações: vista de última versão publicada, ligada à competição ativa da época e respetivas linhas. Incluir data da informação e aviso de revisão se >7 dias. Marcadores: apenas publicados, dos jogos terminados visíveis; lista parcial quando não cobre todos os golos. Alterações: só confirmadas, com valores antes/depois e fonte. Nenhuma ausência de linha prova ausência de jogo ou alteração. As novas tabelas não contêm dados fictícios e não são um acesso em tempo real à AFL.

O modelo escolhe referências, mas o servidor valida IDs de cartões, nomes de horários, fontes e rotas. Texto é renderizado por React sem HTML injetado. A conversa só mantém até oito mensagens no pedido e é descartada ao limpar/recarregar. `public/privacidade-bo.html` apresenta informação de IA, dados enviados à OpenAI, fornecedores, conservação e contacto do clube.

## Validação

- `npm run build`: TypeScript e build.
- `node scripts/test-bo-chat.mjs`: fontes com chave pública, tabelas novas, dados desatualizados, IDs inventados excluídos, orçamento/falha de fonte impedem API, timeout preserva reserva, origem e input.
- `scripts/test-bo-production.sql`: executar com migração em transação revertida; Developer CRUD completo, RLS para visitantes/utilizadores, teto, reserva duplicada, liquidação idempotente, rate limit.
- `scripts/test-bo-sports-sources.sql`: permissões e consistência das fontes.
- Testes reais do endpoint com contabilidade central, seguidos de verificação da versão alojada antes da promoção do domínio.

A pasta `.chat-private`, ficheiros `.env*` e diretório `.git` estão excluídos da publicação. O aviso de bundles grandes é anterior ao chat; o chat é carregado separadamente.
