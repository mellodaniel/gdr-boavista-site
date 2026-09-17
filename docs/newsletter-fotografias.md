# Fotografias nas comunicações

Em Administração → Comunicações, depois da mensagem, selecionar até 10 fotografias. São convertidas para JPEG com máximo de 1200 px no lado maior, incluindo HEIC/HEIF. Acrescentar legendas opcionais (300 caracteres), ordenar e pré-visualizar em computador/telemóvel. O envio é bloqueado durante o carregamento. Falhas individuais mantêm as fotografias concluídas.

As imagens aparecem depois do texto em ambos os modelos de email. O rascunho de sessão, a edição, a duplicação e o envio preservam a lista. Retirar uma imagem não apaga o ficheiro, porque pode estar referenciado num email enviado ou numa cópia.

Migração necessária: `supabase/migrations/20260917170000_newsletter_images.sql`. Acrescenta `images` à comunicação e um bucket público exclusivo para JPEG. Apenas os administradores já reconhecidos pela galeria podem carregar; não permite sobrescrever ou apagar fotografias enviadas. Não altera destinatários, políticas das comunicações nem a galeria.

Verificação: `node scripts/test-newsletter-images.mjs` e `npm run build`. Testar upload autenticado, legenda, ordem, retirar, atualização da prévia e envio de teste explicitamente autorizado antes de enviar uma campanha. Nenhuma newsletter é enviada durante estes testes automatizados.

Migração aplicada ao Supabase ligado em 17/09/2026 e registada no histórico. Teste transacional confirmou INSERT autorizado para developer e bloqueado para identidade não autorizada, com rollback. Build e testes de renderização passaram. O lint dos ficheiros novos/auxiliares passou; a página de comunicações mantém 3 erros e 1 aviso já existentes antes da alteração. O teste visual autenticado fica para o utilizador, pois o navegador local abriu no login.
