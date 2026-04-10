# TECH DEBT

## Compatibilidade estrutural ainda mantida

- `lib/supabase/` continua existindo como camada legada. Os wrappers novos em `lib/auth`, `lib/db`, `lib/realtime` e `lib/storage` ja estao no lugar, mas a remocao completa do legado exigiria uma segunda passada de imports e testes manuais.
- `lib/data.legacy.ts`, `lib/types.legacy.ts` e `lib/validators.legacy.ts` ainda concentram parte relevante da implementacao. Hoje `features/*/repositories` e `features/*/types` fazem re-export para manter compatibilidade.
- `lib/mock-data.ts` ainda e usado por `lib/data.legacy.ts` no fallback/demo. Mover isso para `tests/fixtures/` sem alterar comportamento exige uma migracao separada do fallback demo.

## Rotas e API

- O projeto agora possui `app/api/public/orders/` como espelho estrutural, mas as rotas originais em `app/api/orders/` foram mantidas por compatibilidade com o frontend atual.
- As rotas admin ja exigem auth no handler. Avaliar depois se vale estender o middleware para `api/admin/*` sem impactar o fluxo atual.

## Feature slicing incompleto por seguranca

- Alguns componentes ainda estao em `components/` por serem layout/shell ou por nao terem um destino inequivoco sem mudar contratos.
- Services foram criados como camada fina de organizacao. A migracao de regra de negocio das API routes para services ficou propositalmente fora desta etapa.

## Supabase

- `supabase/migrations/002_cash.sql` e `003_printers.sql` foram criados como placeholders reservados. A estrutura real segue consolidada em `001_initial.sql` e `schema.sql`.
- `supabase/policies/` foi extraido do schema atual, mas a evolucao ideal futura e tornar esses arquivos idempotentes por ambiente.
