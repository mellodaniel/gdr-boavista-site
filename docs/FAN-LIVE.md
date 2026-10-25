# Bancada digital — teste por link

A página `/acompanhar-jogo` acompanha as fichas em modo de leitura, sem menu público, sitemap ou indexação. O token fica no fragmento do URL, com `no-referrer` e respostas `no-store`. O acesso é por posse do link: qualquer pessoa pode reenviá-lo.

Na ficha, ativar **Relato para adeptos**, aguardar sincronização e copiar o link dos adeptos. O jogo aparece antes de iniciar, com contagem decrescente na página dos adeptos. Desativar a opção, arquivar ou apagar retira o jogo na próxima atualização. Fichas antigas começam sem partilha. O link permite consultar todos os jogos explicitamente partilhados, selecionando o jogo indicado no fragmento quando disponível. Jogos finalizados permanecem consultáveis até retirar a partilha.

A API projeta apenas identificação pública do jogo, início previsto em Europe/Lisbon, marcador/resultado, relógio e golos, cartões e substituições. Exclui notas (incluindo notas anexas a eventos), observações ditadas, responsável, contactos e plantel completo. Apenas nomes/números envolvidos em eventos públicos são incluídos. Todos os escalões mostram o resultado numérico calculado pelos eventos de golo, incluindo fichas com a antiga opção recordGoals=false. Corrigir/apagar um evento na ficha atualiza o relato.

O token de leitura é derivado no servidor por HMAC da chave existente, com domínio específico. Não permite editar fichas, obter a chave de edição ou solicitar um novo link. Não há migração SQL nem variável de ambiente adicional. Rodar MATCH_SHEET_LINK_KEY invalida ambos os links; não existe revogação por destinatário.

Atualização automática a cada 15 segundos com a página visível. Não é push: depende da sincronização e da ligação da equipa. Falhas mantêm a última leitura identificada como desatualizada. Cada leitor ativo gera aproximadamente quatro consultas por minuto; monitorizar uso de funções/base de dados antes de divulgação alargada e considerar cache de curta duração/SSE se necessário.

SMS adiado: implica custo por mensagem, fornecedor, consentimento/cancelamento e prevenção de notificações duplicadas. Esta fase não recolhe números de telefone.

Validação: `npm run test:fan-live`, `npm run test:match-sheet`, `npm run build`. Demonstração sintética exclusivamente no servidor local em `/scripts/fixtures/fan-live.html`, com variante de viewport móvel em `/scripts/fixtures/fan-mobile.html`; não incluída no build de produção.

## Parceiros no relato
Os parceiros ativos da Administração aparecem em duas posições rotativas, seguindo a ordem configurada. Cada posição avança a cada 10 segundos; os lados mostram parceiros distintos quando há pelo menos dois. No computador são laterais com acompanhamento da rolagem; em ecrãs até 1000px passam para cima e para baixo do relato. Não apresenta contador nem controlos de rotação. A rotação suspende durante foco, passagem do rato e quando a página está oculta. Sem parceiros não há espaços vazios; com um parceiro ambas as posições mostram a mesma marca. A lista é consultada ao abrir e de cinco em cinco minutos. Links externos abrem noutro separador sem transmitir o endereço do relato.

O countdown aparece apenas na página dos adeptos e atualiza a cada segundo, sincronizado com a última hora do servidor. Não inicia partidas: ao chegar a zero aguarda a confirmação de início na ficha. Horários ausentes/inválidos mostram “Horário por confirmar”. Rascunhos partilhados nunca expõem eventos ou resultados. O relógio da ficha não é alterado.

Emblemas do marcador: GDRBoavista 870 × 1024 px e Portomosense 600 × 600 px, apresentados a 108px (76px em telemóvel), aproximadamente 40% maiores. O Portomosense é reconhecido pelo nome e variantes. Outros adversários podem receber uma imagem através de “Emblema do adversário” na preparação (PNG/JPEG/WebP, mínimo 300px por dimensão, até 160KB); é guardada na ficha e publicada com o relato. Ao selecionar adversários já existentes, reutiliza a imagem das fichas carregadas. Não faz buscas automáticas de emblemas por nomes ambíguos: sem imagem conhecida apresenta um escudo neutro com indicação de emblema por associar.
