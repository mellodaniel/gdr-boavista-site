# Confirmações transitórias

As confirmações de ações usam `useFeedback` e `DismissibleFeedback` nas áreas de administração, torneios, formulários públicos, ficha de jogo e relato dos adeptos.

- Duração: seis segundos, reiniciada mesmo quando a nova confirmação tem texto igual.
- Fecho manual com botão acessível; erros de formulários têm também fecho manual.
- Confirmações limpam ao clicar noutra ação, editar uma pesquisa/campo, mudar filtros ou navegar. Ler ou clicar dentro do próprio aviso não o apaga.
- Cancelar/desmontar uma mensagem remove o temporizador e os listeners, evitando que um aviso antigo feche o seguinte.
- Mensagens de erro estruturadas (`type: error`) não desaparecem com o temporizador nem com cliques externos.
- Estados de carregamento, gravação de voz, sincronização, indisponibilidade, validação de dados e histórico do chat não são confirmações transitórias. Não ocultar esses estados através deste hook.
- O cancelamento de newsletter mantém o estado concluído separado da mensagem, para que o botão de cancelar não reapareça depois de esta fechar.

Para mensagens novas: estado `useFeedback('')` para confirmações ou `useFeedback<{type:'success'|'error';text:string}|null>(null)` para avisos mistos. O componente conserva a apresentação do banner e acrescenta o botão de fechar.

Validação: `npm run test:feedback`, testes das fichas/relato e build. A demonstração local `/scripts/fixtures/feedback.html` permite verificar tempo, filtro e fecho manual sem alterar dados reais.
