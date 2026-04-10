# Auditoria Completa - Casa do Sheik

Data: 2026-04-07

## Escopo auditado

- Estrutura geral do projeto `app`, `features`, `components`, `lib`, `supabase`
- Schema do banco e aderencia com o codigo
- Rotas publicas e admin
- Tipagem TypeScript
- Componentes e fluxos principais:
  - cardapio do cliente
  - checkout
  - status do pedido
  - gestor de pedidos
  - cardapio admin
  - mesas e QR
  - impressoras

## O que foi encontrado

### Banco de dados

- A tabela `mesas` existia no schema, mas a tela [app/(admin)/admin/mesas/page.tsx](C:/Users/Servico/Documents/Projeto-Website/Sistema-Restaurante/app/(admin)/admin/mesas/page.tsx) ignorava o banco e gerava 15 mesas fixas.
- O schema usa `mesas.numero` como inteiro, mas `pedidos.mesa` e `mesa_contas.mesa` continuam como `text`. Isso funciona hoje, mas e uma inconsistencia estrutural.
- Todas as tabelas principais do fluxo operacional estao presentes no schema:
  - `restaurante_config`
  - `categorias`
  - `produtos`
  - `pedidos`
  - `pedido_itens`
  - `mesas`
  - `mesa_contas`
  - `caixa_fechamentos`
  - `caixa_movimentacoes`
  - `printers`
  - `order_settings`
  - `print_jobs`

### Codigo e arquitetura

- O painel admin ainda consumia detalhes e impressao de pedido por endpoints legados em `/api/orders/...`, apesar da estrutura nova separar `/api/admin/...`.
- A camada `features/*/repositories` existe, mas parte relevante da regra de negocio ainda continua centralizada em [lib/data.legacy.ts](C:/Users/Servico/Documents/Projeto-Website/Sistema-Restaurante/lib/data.legacy.ts).
- A area de impressoras ainda tinha uso de `any` para parse de resposta HTTP em [features/printers/components/printer-manager.tsx](C:/Users/Servico/Documents/Projeto-Website/Sistema-Restaurante/features/printers/components/printer-manager.tsx).
- Havia um texto com encoding quebrado no board de pedidos (`Â·`) em [features/orders/components/order-board.tsx](C:/Users/Servico/Documents/Projeto-Website/Sistema-Restaurante/features/orders/components/order-board.tsx).

### Rotas e navegacao

- Faltavam aliases da estrutura nova para:
  - `/api/admin/orders/[id]`
  - `/api/admin/orders/[id]/print`
- As rotas publicas e admin principais continuam existentes e compilando corretamente.

### TypeScript

- `npx tsc --noEmit` passou sem erros no projeto.
- O unico uso de `any` encontrado no codigo da aplicacao estava na area de impressoras e foi corrigido.

## O que foi corrigido

### 1. Mesas & QR agora usa o banco

Arquivos:

- [features/tables/repositories/table.repository.ts](C:/Users/Servico/Documents/Projeto-Website/Sistema-Restaurante/features/tables/repositories/table.repository.ts)
- [features/tables/services/table.service.ts](C:/Users/Servico/Documents/Projeto-Website/Sistema-Restaurante/features/tables/services/table.service.ts)
- [features/tables/types/index.ts](C:/Users/Servico/Documents/Projeto-Website/Sistema-Restaurante/features/tables/types/index.ts)
- [app/(admin)/admin/mesas/page.tsx](C:/Users/Servico/Documents/Projeto-Website/Sistema-Restaurante/app/(admin)/admin/mesas/page.tsx)

Correcao aplicada:

- criada leitura real da tabela `mesas`
- mantido fallback seguro para 15 mesas quando o banco nao estiver configurado ou a tabela nao existir
- a pagina admin agora monta os QR codes a partir das mesas ativas do banco

### 2. Consistencia de rotas admin de pedidos

Arquivos:

- [app/api/admin/orders/[id]/route.ts](C:/Users/Servico/Documents/Projeto-Website/Sistema-Restaurante/app/api/admin/orders/[id]/route.ts)
- [app/api/admin/orders/[id]/print/route.ts](C:/Users/Servico/Documents/Projeto-Website/Sistema-Restaurante/app/api/admin/orders/[id]/print/route.ts)
- [features/orders/components/order-board.tsx](C:/Users/Servico/Documents/Projeto-Website/Sistema-Restaurante/features/orders/components/order-board.tsx)

Correcao aplicada:

- criados aliases admin para detalhe e impressao de pedido
- o painel admin passou a consumir `/api/admin/orders/[id]` e `/api/admin/orders/[id]/print`
- mantida compatibilidade com as rotas antigas, sem quebrar o fluxo publico

### 3. Tipagem da area de impressoras

Arquivo:

- [features/printers/components/printer-manager.tsx](C:/Users/Servico/Documents/Projeto-Website/Sistema-Restaurante/features/printers/components/printer-manager.tsx)

Correcao aplicada:

- removido uso de `any`
- adicionado parser minimo para garantir `PrinterRecord` valido antes de atualizar estado
- preservado o comportamento atual da tela

### 4. Texto quebrado no board de pedidos

Arquivo:

- [features/orders/components/order-board.tsx](C:/Users/Servico/Documents/Projeto-Website/Sistema-Restaurante/features/orders/components/order-board.tsx)

Correcao aplicada:

- substituido separador quebrado `Â·` por ` - `

## Validacoes executadas

- `npm run build` -> passou
- `npx tsc --noEmit` -> passou

## Itens que ainda precisam de atencao manual ou decisao

### 1. Normalizacao de mesa no schema

Hoje existe esta divergencia:

- `mesas.numero` -> `integer`
- `pedidos.mesa` -> `text`
- `mesa_contas.mesa` -> `text`

Recomendacao futura:

- padronizar em uma migration posterior
- preferencialmente manter `numero` como referencia operacional e decidir se `pedidos.mesa` vira `integer` ou FK indireta

### 2. Legado ainda centralizado

Arquivos legados ainda concentram boa parte da regra:

- [lib/data.legacy.ts](C:/Users/Servico/Documents/Projeto-Website/Sistema-Restaurante/lib/data.legacy.ts)
- [lib/types.legacy.ts](C:/Users/Servico/Documents/Projeto-Website/Sistema-Restaurante/lib/types.legacy.ts)
- [lib/validators.legacy.ts](C:/Users/Servico/Documents/Projeto-Website/Sistema-Restaurante/lib/validators.legacy.ts)

Isso nao esta quebrado, mas ainda reduz o ganho real da reorganizacao por feature.

### 3. Rotas duplicadas por compatibilidade

Hoje coexistem:

- `/api/orders/...`
- `/api/public/orders/...`

Isso foi mantido para nao quebrar o sistema. Se quiser endurecer a arquitetura depois, vale escolher uma estrategia final e remover duplicidade com calma.

### 4. Compatibilidade antiga de Supabase

Ainda existem wrappers e espelhos entre:

- [lib/auth](C:/Users/Servico/Documents/Projeto-Website/Sistema-Restaurante/lib/auth)
- [lib/db](C:/Users/Servico/Documents/Projeto-Website/Sistema-Restaurante/lib/db)
- [lib/supabase](C:/Users/Servico/Documents/Projeto-Website/Sistema-Restaurante/lib/supabase)

Nao ha erro funcional nisso, mas ainda ha sobreposicao de camadas.

## Nota geral de saude do projeto

8.2 / 10

## Resumo final

O projeto esta funcional, compila, e os fluxos principais estao operacionais. Os maiores problemas encontrados nao eram falhas graves do produto, mas inconsistencias entre a arquitetura nova e o legado ainda mantido. As correcoes aplicadas nesta auditoria foram conservadoras, nao quebraram funcionalidades e melhoraram:

- aderencia ao schema
- consistencia das rotas admin
- tipagem
- qualidade do fluxo de mesas e QR
- limpeza visual de texto quebrado
