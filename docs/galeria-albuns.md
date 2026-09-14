# Galeria por álbuns

## Testar localmente

Na pasta do projeto, executar `npm run dev` e abrir http://localhost:5173/admin/galeria. Entrar com admin ou developer.

1. Criar um álbum com título, descrição, data e categoria. É criado em rascunho.
2. Selecionar várias fotografias e clicar em Carregar fotografias. Testar também HEIC.
3. Confirmar o progresso individual, pausar e continuar; ficheiros inválidos não impedem os restantes. Repetir apenas os falhados.
4. Escolher capa, alterar a ordem e ampliar uma fotografia.
5. Publicar e abrir /galeria: entrar no álbum, navegar com setas, Escape e deslizar no telemóvel.
6. Passar a rascunho e confirmar que desaparece da galeria pública.

## Base de dados

Migração: `supabase/migrations/20260914170000_gallery_albums.sql`. Aplicada ao projeto ligado em 14/09/2026, após validação com rollback. As tabelas antigas e os ficheiros existentes são preservados. Fotografias antigas visíveis vão para Memórias do clube; ocultas para Fotografias por organizar (rascunho).

O ambiente local usa o Supabase remoto configurado no .env: os álbuns criados no teste ficam nessa base. O site publicado continua com o código anterior até novo deploy. Não publicar álbuns de teste como conteúdo definitivo.

As permissões de gestão das novas tabelas e caminhos de armazenamento são limitadas às contas admin@gdrboavista.local e developer@gdrboavista.local. As políticas anteriores não são alteradas. Para futuros administradores, rever a função gdrb_gallery_is_admin.

## Fotografias e limites

- Entrada até 40 MB e resolução descodificada até 60 megapíxeis.
- HEIC/HEIF convertido no navegador; falha de conversão oferece alternativa JPEG. O conversor só é carregado quando necessário.
- JPEG otimizado até 2400 px no lado maior e miniatura até 640 px, preservando proporção. Transparência fica branca; GIF torna-se imagem estática.
- Fila sequencial para limitar memória; falhas individuais podem ser repetidas. IDs estáveis evitam duplicação após perda de resposta.
- A fila existe durante esta página. Manter a página aberta. Recarregar/sair perde ficheiros pendentes; as fotografias já concluídas permanecem no álbum.
- Rascunho controla visibilidade no site. O bucket é público: quem já tiver a ligação direta de uma imagem ainda a pode abrir.
- Apagar uma fotografia nova remove os ficheiros associados. Imagens migradas mantêm os ficheiros antigos para preservar compatibilidade.

Sem commit nem deploy automático.
