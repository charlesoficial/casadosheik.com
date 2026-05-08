# Stability Audit - 2026-05-08

## Escopo

Auditoria focada em falhas criticas de runtime, banco, API, seguranca, impressao e estabilidade do projeto Casa do Sheik.

## Correcoes aplicadas

- Supabase: aplicada migration `012_security_advisor_hardening`.
- Supabase: `public.is_admin()` agora tem `search_path` fixo.
- Supabase: removido `EXECUTE` publico de `fn_audit_log()` e `fn_cleanup_print_jobs(integer)`.
- Supabase: removida policy ampla `produtos_public_read` em `storage.objects`.
- Supabase: policies publicas de `restaurante_config`, `categorias`, `produtos` e `mesas` ficaram restritas ao role `anon`.
- Supabase: policies redundantes `*_select_admin` removidas onde `*_manage_admin` ja cobria `SELECT`.
- Impressao: `lib/escpos.ts` corrigido para normalizar pontuacao Unicode sem caracteres corrompidos.
- Impressao: `wrapText()` agora quebra palavras longas dentro da largura do cupom.
- Impressao: `pairLine()` agora trunca texto longo com sufixo ASCII previsivel.

## Validacoes executadas

- `npm run typecheck`: passou.
- `npm run lint`: passou.
- `npm run build`: passou.
- `npm audit --audit-level=moderate`: 0 vulnerabilidades.
- Rotas locais testadas: `/`, `/menu`, `/produto`, `/checkout`, `/login` responderam `200`.
- APIs protegidas de impressao sem login responderam `401`, sem crash.
- Supabase anon: leitura publica preservada em `restaurante_config`, `categorias`, `produtos` e `mesas`.
- Supabase advisors: alertas de `SECURITY DEFINER`, `search_path`, bucket listing e policies duplicadas foram removidos.

## Pendencias nao criticas

- Supabase Auth: `Leaked Password Protection Disabled`. Requer ativacao no Dashboard/Auth; nao e corrigivel por migration SQL deste projeto.
- Supabase performance: advisors ainda listam indices nao usados como `INFO`. Nao foram removidos porque a base e pequena e o historico de uso pode nao representar carga real.
- Design System: `npm run lint:ds` ainda acusa 160 violacoes visuais em 5 arquivos. Nao classificadas como falha critica de estabilidade.

## Estado final

Falhas criticas automatizadas encontradas e corrigiveis neste ciclo: corrigidas.
Falhas restantes: configuracao externa do Supabase Auth e dividas visuais/performance informativas.
