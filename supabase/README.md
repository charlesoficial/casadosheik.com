# Supabase

Esta pasta agora tem um fluxo oficial simples.

## Importacao oficial

Para subir um banco novo do zero, use nesta ordem:

1. `schema.sql`
2. `seed.sql`
3. `bootstrap-admin.sql`

Cole somente SQL no editor SQL do Supabase. Comandos de terminal como
`supabase db dump -f backup.sql` nao devem ser colados no editor SQL.

## O que cada arquivo faz

- `schema.sql`: estrutura completa consolidada do banco, com RLS, indices, funcoes e storage.
- `seed.sql`: carga oficial inicial do restaurante.
- `bootstrap-admin.sql`: cria ou atualiza o usuario administrador no Supabase Auth.

## Antes de operar em producao

- Troque a senha padrao do admin antes de rodar `bootstrap-admin.sql`.
- Revise `seed.sql` se quiser que o admin inicial seja criado pela seed.
- Confirme as variaveis `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY` e `ORDER_PUBLIC_TOKEN_SECRET` no ambiente da aplicacao.
- O banco oficial tem 53 produtos. A pasta `RESTAURANTE.SQL/produtos.sql` tem 48
  arquivos de imagem porque 7 bebidas estao sem imagem local e 2 arquivos sao historicos.

## Pastas

- `migrations/`: historico incremental das mudancas.
- `policies/`: referencias separadas de policies.
- `scripts/`: scripts utilitarios e manutencao manual.
- `docs/reports/`: relatorios tecnicos antigos.
- `seeds/legacy/`: seeds antigos, demos e arquivos preservados apenas como referencia.

## Regra pratica

Se a ideia for "importar uma vez e subir tudo", use os 3 arquivos da raiz desta pasta.
Se a ideia for auditar historico, consulte `migrations/`.
