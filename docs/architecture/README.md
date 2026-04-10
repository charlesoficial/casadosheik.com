# Arquitetura

## Visao geral

O projeto foi reorganizado para uma base mais proxima de Feature-Sliced Design, mantendo o comportamento existente.

- `app/`
  - route groups para separar experiencia publica e admin sem mudar URL
  - rotas de API separadas entre `admin` e `public`
- `features/`
  - componentes, repositories, services, types, validators e hooks por dominio
- `components/`
  - layout/admin/ui compartilhada
- `store/`
  - estado global com Zustand
- `lib/`
  - infraestrutura transversal: auth, db, security, realtime, printing, storage, observability, utils e constants
- `supabase/`
  - `schema.sql` como source of truth
  - `migrations/`, `seeds/` e `policies/` organizados

## Estrutura principal

```text
app/
  (public)/
    layout.tsx
    menu/
    checkout/
    produto/[id]/
    pedido/[id]/status/
  (admin)/
    layout.tsx
    admin/
      pedidos/
      cardapio/
      mesas/
      caixa/
      historico/
      configuracoes/
  login/
  api/
    admin/
    orders/
    public/orders/

features/
  auth/
  orders/
  menu/
  cash/
  tables/
  printers/
  history/

components/
  admin/
  shared/
  ui/

store/
  cart.store.ts
  orders.store.ts
  ui.store.ts

lib/
  auth/
  db/
  realtime/
  printing/
  storage/
  observability/
  security/
  utils/
  constants/
```

## Compatibilidade mantida

Para nao quebrar o sistema durante a reorganizacao:

- `lib/data.ts`, `lib/types.ts` e `lib/validators.ts` continuam existindo como re-export
- `lib/data.legacy.ts`, `lib/types.legacy.ts` e `lib/validators.legacy.ts` concentram o legado ainda nao redistribuido integralmente
- `lib/supabase/` segue como camada de compatibilidade para wrappers novos em `lib/auth`, `lib/db`, `lib/realtime` e `lib/storage`

## Como rodar

```bash
npm install
npm run dev
```

Build de validacao:

```bash
npm run build
npx tsc --noEmit
```
