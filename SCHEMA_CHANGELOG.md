# SCHEMA_CHANGELOG.md — Sistema Restaurante v2.0.0

**Data de geração:** 2026-04-25  
**Stack:** Next.js 14 + Supabase (PostgreSQL + RLS + Realtime + Storage)  
**Modo:** Single-tenant (um restaurante, um admin)

---

## 1. Issues Encontrados na Análise Cruzada (Código × Banco)

### ISSUE-001 — Campo `mesa` legado em `pedidos` ⚠️ Severidade: Alta

| Campo | Tipo | Status |
|-------|------|--------|
| `mesa` | `text` | Legado, mas **ativamente usado** |
| `mesa_numero` | `integer (FK → mesas.numero)` | FK tipada, coexiste |

**Análise detalhada:**  
O campo `mesa` (text) é usado por todo o frontend: queries de `mesa_contas`, exibição em telas operacionais, filtros em `getAdminOrders`, `closeTableAccount`, e `getFinancialHistoryDetail`. O campo `mesa_numero` (integer FK) foi adicionado para integridade referencial.

Em `createOrderFromCheckout()` (data.legacy.ts:878-886), o frontend preenche AMBOS os campos simultaneamente:
```typescript
const parsedMesaNumero = payload.tipo === "mesa" && sanitizedTable && /^\d+$/.test(sanitizedTable)
  ? Number(sanitizedTable) : null;
const orderInsert = {
  mesa: sanitizedTable,
  mesa_numero: parsedMesaNumero,
  // ...
};
```

**Decisão:** Manter ambos os campos. Documentar no schema que `mesa` é legado mas ativo. NÃO remover sem migração completa de todas as queries.

---

### ISSUE-002 — `fn_audit_log()` não popula `ip_address` ⚠️ Severidade: Média

A coluna `ip_address` (inet) existia na tabela `audit_log`, mas a função `fn_audit_log()` nunca a populava — o INSERT listava apenas `tabela, operacao, registro_id, dados_antes, dados_depois, usuario_id, usuario_email`.

**Correção aplicada:** FIX-001 (ver seção 2).

---

### ISSUE-003 — REVOKE redundantes de anon em pedidos/pedido_itens ⚠️ Severidade: Baixa

```sql
-- Original (redundante):
revoke select, insert on pedidos from anon;
revoke select, insert on pedido_itens from anon;
```

Com RLS habilitado e nenhuma política para o role `anon`, essas tabelas já são inacessíveis para anon. O REVOKE é ruído.

**Correção aplicada:** FIX-002 (ver seção 2).

---

### ISSUE-004 — Políticas RLS single-role ℹ️ Severidade: Baixa (informativo)

Todas as políticas RLS concedem `ALL` ao role `authenticated` sem restrição adicional. Isso é **aceitável e intencional** para single-tenant (um restaurante, um admin). Documentado explicitamente no schema.

**Ação:** Nenhuma correção necessária. Documentação adicionada ao schema.

---

### ISSUE-005 — Storage bucket `produtos` sem políticas UPDATE/DELETE ❌ Severidade: Alta

O schema original possuía:
```sql
-- Existiam os DROP (indicando intenção de criar):
drop policy if exists "produtos_authenticated_update" on storage.objects;
drop policy if exists "produtos_authenticated_delete" on storage.objects;

-- Mas os CREATE nunca foram adicionados!
-- Apenas existiam:
create policy "produtos_public_read" ...    -- SELECT ✅
create policy "produtos_authenticated_insert" ... -- INSERT ✅
-- UPDATE ❌ AUSENTE
-- DELETE ❌ AUSENTE
```

Isso impediria o admin de substituir ou deletar imagens de produtos via Storage.

**Correção aplicada:** FIX-003 (ver seção 2).

---

### ISSUE-006 — Idempotência incompleta nas políticas RLS ⚠️ Severidade: Média

O schema original NÃO tinha `DROP POLICY IF EXISTS` antes dos `CREATE POLICY` das tabelas principais (linhas 560-675). Embora as tabelas fossem droppadas com CASCADE (o que remove as políticas indiretamente), isso dependia de um efeito colateral e não era explícito.

**Correção aplicada:** Adicionado `DROP POLICY IF EXISTS` antes de cada `CREATE POLICY` em todas as tabelas.

---

## 2. Fixes Aplicados com Justificativa

### FIX-001 — `fn_audit_log()` popula `ip_address`

**Baseado em:** ISSUE-002  
**Arquivo:** `schema.sql` → função `fn_audit_log()`

**Antes:**
```sql
insert into audit_log(tabela, operacao, registro_id, dados_antes, dados_depois, usuario_id, usuario_email)
values (TG_TABLE_NAME, TG_OP, v_record_id, v_before, v_after, v_user_id, v_user_email);
```

**Depois:**
```sql
-- Nova variável:
v_ip inet;

-- Nova extração (com fallback):
begin
  v_ip := (current_setting('request.headers', true)::jsonb ->> 'x-forwarded-for')::inet;
exception
  when others then v_ip := null;
end;

-- INSERT atualizado:
insert into audit_log(tabela, operacao, registro_id, dados_antes, dados_depois, usuario_id, usuario_email, ip_address)
values (TG_TABLE_NAME, TG_OP, v_record_id, v_before, v_after, v_user_id, v_user_email, v_ip);
```

**Nota:** O `current_setting('request.headers', true)` retorna NULL (sem erro) quando não há contexto PostgREST. O bloco EXCEPTION trata qualquer outro cenário (IP malformado, header ausente).

---

### FIX-002 — Removidos REVOKE redundantes

**Baseado em:** ISSUE-003  
**Arquivo:** `schema.sql` → seção de políticas RLS

**Removido:**
```sql
revoke select, insert on pedidos from anon;
revoke select, insert on pedido_itens from anon;
```

**Justificativa:** A proteção contra acesso anônimo é garantida por:
1. RLS habilitado nas tabelas (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`)
2. Ausência de política para o role `anon` nessas tabelas

Comentário explicativo adicionado no schema na seção de políticas de `pedidos`.

---

### FIX-003 — Políticas UPDATE e DELETE no bucket `produtos`

**Baseado em:** ISSUE-005 + check `storage_policies`  
**Arquivo:** `schema.sql` → seção de Storage

**Adicionado:**
```sql
create policy "produtos_authenticated_update"
on storage.objects
for update
to authenticated
using (bucket_id = 'produtos');

create policy "produtos_authenticated_delete"
on storage.objects
for delete
to authenticated
using (bucket_id = 'produtos');
```

**Justificativa:** Sem essas políticas, o admin não poderia substituir ou remover imagens de produtos. Mesmo que o frontend atual só faça INSERT, a ausência de DELETE causa acúmulo de imagens órfãs no storage.

---

### FIX-004 — Documentação da cobertura de GRANT para `audit_log`

**Baseado em:** check `grant_completeness`  
**Arquivo:** `schema.sql` → seção de GRANTS e tabela `audit_log`

**Ação:** Adicionados comentários explicativos confirmando que:
- `grant all privileges on all tables in schema public to authenticated` (executado APÓS a criação de `audit_log`) cobre a tabela automaticamente
- `alter default privileges ... grant all on tables to authenticated` garante cobertura para tabelas criadas no futuro

Nenhuma alteração funcional necessária.

---

### FIX-005 — Documentação da decisão sobre campo `mesa` legado

**Baseado em:** ISSUE-001 + check `mesa_field_sync`  
**Arquivo:** `schema.sql` → tabela `pedidos` e seção de comentários finais

**Ação:** Adicionados comentários detalhados explicando:
- Por que ambos os campos (`mesa` text e `mesa_numero` integer FK) coexistem
- Como o frontend sincroniza ambos no `createOrderFromCheckout()`
- O plano de deprecação (manter até migração completa)
- Quais queries usam cada campo

Nenhuma alteração funcional. O campo `mesa` NÃO foi removido.

---

## 3. Melhorias de Forma Aplicadas

| Melhoria | Descrição |
|----------|-----------|
| **DROP POLICY IF EXISTS** | Adicionado antes de **cada** `CREATE POLICY` (13 tabelas × políticas = 26 drops) |
| **DROP TRIGGER IF EXISTS** | Adicionado antes de **cada** `CREATE TRIGGER` (7 updated_at + 4 audit = 11 drops) |
| **DROP INDEX IF EXISTS** | Adicionado antes de **cada** `CREATE INDEX` (33+ índices) |
| **Cabeçalho enriquecido** | Data, versão, lista de migrations consolidadas, lista de fixes aplicados |
| **Seções numeradas** | Schema organizado em 16 seções na ordem oficial definida |
| **Comentários descritivos** | Cada tabela, função e decisão de design documentada com propósito |
| **Seção de decisões** | Bloco final com 4 decisões de design documentadas explicitamente |

---

## 4. Verificações Condicionais — Resultados

| # | Condição | Verificado | Resultado |
|---|----------|------------|-----------|
| 1 | Frontend usa Realtime em tabela não publicada | ✅ | **Não ocorre.** As 4 tabelas escutadas (pedidos, mesa_contas, caixa_fechamentos, caixa_movimentacoes) estão todas na publicação. |
| 2 | Frontend faz query sem filtrar `deleted_at IS NULL` | ✅ | **Apenas em `getMenuManagementData`.** Intencional: admin vê todos os itens incluindo deletados. Queries públicas filtram corretamente. |
| 3 | Frontend faz INSERT sem verificar existência em singletons | ✅ | **Não ocorre.** `restaurante_config` usa upsert com `onConflict: "id"`. `order_settings` faz check-then-update/insert. Seed usa `ON CONFLICT DO UPDATE`. |
| 4 | Enum value no frontend sem correspondência no banco | ✅ | **Não ocorre.** Todos os 13 enums conferidos — zero divergência. |

---

## 5. Decisões que Ficaram em Aberto

### 5.1 — `getMenuManagementData` não filtra soft delete

A tela de gerenciamento do admin mostra categorias e produtos com `deleted_at IS NOT NULL`. Isso pode ser intencional (para permitir restauração manual) ou um bug. O impacto é baixo: o admin vê itens deletados na listagem de gerenciamento, mas eles NÃO aparecem no cardápio público.

**Recomendação:** Se indesejado, adicionar filtro `.is("deleted_at", null)` nas queries de `getMenuManagementData` no frontend. O schema não precisa de alteração.

### 5.2 — `restaurante_config` upsert usa `onConflict: "id"`

A API route `restaurante-config/route.ts` faz upsert com `onConflict: "id"`. Se o body não contiver `id`, um novo registro é criado. Isso pode violar a constraint de singleton se a API for chamada erroneamente sem o `id` do registro existente.

**Recomendação:** Garantir que o frontend sempre busque o `id` existente antes de fazer PATCH. O singleton index `((true))` previne a criação de mais de um registro, mas a operação falharia com erro de constraint.

---

## 6. Checklist Final de Validação

- [x] Arquivo schema.sql não contém erros de sintaxe SQL
- [x] Todos os DROP usam IF EXISTS
- [x] Todos os CREATE POLICY são precedidos de DROP POLICY IF EXISTS
- [x] `fn_audit_log()` popula `ip_address` sem falhar se não disponível
- [x] Storage bucket 'produtos' tem políticas para SELECT, INSERT, UPDATE e DELETE
- [x] Todos os enums usados no frontend existem no banco
- [x] Todas as colunas referenciadas no frontend existem nas tabelas
- [x] Tabelas com Realtime estão na publicação `supabase_realtime`
- [x] GRANTs cobrem todas as tabelas incluindo `audit_log`
- [x] Soft delete: queries críticas filtram `deleted_at IS NULL`
- [x] Singletons (`restaurante_config`, `order_settings`) têm unique index on `((true))`
- [x] Cabeçalho do schema.sql tem data, versão e lista de mudanças
