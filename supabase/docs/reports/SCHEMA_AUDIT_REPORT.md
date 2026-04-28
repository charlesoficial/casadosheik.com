# Schema Audit Report — Sistema Restaurante
Data: 2026-04-10
Gerado por: project_analysis_engine v1.0

---

## 1. Resumo Executivo

| Categoria         | Total encontrado |
|-------------------|-----------------|
| CRÍTICOS          | 3               |
| ALTOS             | 4               |
| MÉDIOS            | 4               |
| PERFORMANCE       | 5               |
| **Total**         | **16**          |

---

## 2. Problemas CRÍTICOS

### [C-01] Conflito de grants entre `001_initial.sql` e `schema.sql`

**Arquivo:** `supabase/migrations/001_initial.sql` linha 386–388
**Impacto:** Qualquer tabela criada no futuro ficará acessível para usuários anônimos.

`001_initial.sql` contém:
```sql
alter default privileges in schema public grant select on tables to anon;
alter default privileges in schema public grant usage, select on sequences to anon;
```

`schema.sql` (source of truth) contém:
```sql
alter default privileges in schema public revoke all on tables from anon;
```

Esses comandos são **opostos**. O migration 005 corrigiu o acesso direto a `pedidos`/`pedido_itens`, mas o `alter default privileges` da migration 001 ainda afeta todas as tabelas criadas *após* aquele migration. Qualquer nova tabela adicionada ao banco receberá `SELECT` para `anon` automaticamente.

**Correção:** migration 007 aplica `revoke` explícito de default privileges para anon.

---

### [C-02] `restaurante_config` sem enforcement de singleton

**Arquivo:** `supabase/schema.sql` linha 125–143
**Impacto:** Múltiplas linhas podem existir na tabela. O código usa `.limit(1).maybeSingle()`, então quaisquer dados extras ficam silenciosos e inacessíveis — mas podem ser inseridos por qualquer usuário autenticado.

Compare com `order_settings`, que tem:
```sql
create unique index idx_order_settings_singleton on order_settings ((true));
```

`restaurante_config` não tem proteção equivalente.

**Correção:** migration 007 adiciona `create unique index idx_restaurante_config_singleton on restaurante_config ((true))`.

---

### [C-03] `caixa_fechamentos` sem proteção contra duplo fechamento no mesmo dia

**Arquivo:** `supabase/schema.sql` linha 233–244
**Impacto:** Nada impede que o operador feche o caixa duas vezes no mesmo dia, gerando duplicidade financeira. O código tenta evitar isso em nível de aplicação (campo `alreadyClosed`), mas não há constraint no banco.

**Correção:** migration 007 adiciona `create unique index idx_caixa_fechamentos_referencia_unique on caixa_fechamentos (referencia_data)`.

---

## 3. Problemas ALTOS

### [A-01] Inconsistência de tipo: `pedidos.mesa` (TEXT) vs `mesas.numero` (INTEGER)

**Arquivos:** `schema.sql` linha 173 e 212
**Impacto:** Não é possível fazer JOIN direto sem CAST. Não há FK. Um valor inválido como `"abc"` pode ser armazenado em `pedidos.mesa`.

Documentado também em `AUDITORIA.md` item "Normalização de mesa no schema".

**Correção:** migration 007 adiciona `mesa_numero integer` como coluna auxiliar em `pedidos` para FK futura, sem remover `mesa text` (mantém compatibilidade). Uma migration posterior poderá migrar os dados e remover `mesa text`.

---

### [A-02] `restaurante_config` — coluna `telefone` usada semanticamente como WhatsApp

**Arquivo:** `lib/data.legacy.ts` linha 415
**Impacto:** O código faz `whatsapp: data?.telefone ?? restaurant.whatsapp`. A coluna `telefone` no banco é utilizada pelo sistema como o número de WhatsApp, mas o nome da coluna não exprime isso. Isso causa confusão futura de manutenção.

**Correção:** migration 007 adiciona coluna `whatsapp text` em `restaurante_config`. O sistema pode gradualmente migrar de `telefone` para `whatsapp`.

---

### [A-03] `001_initial.sql` é idêntico ao `schema.sql` exceto nos grants

**Impacto:** Os dois arquivos devem representar coisas diferentes:
- `schema.sql` = estado atual completo (para reconstrução do zero)
- `001_initial.sql` = primeiro migration incremental

Na prática, ambos fazem DROP + CREATE de tudo. Se alguém rodar migrations em ordem e depois rodar schema.sql, haverá conflito. Se rodar apenas migrations, o grant bug do [C-01] permanece.

**Recomendação:** `001_initial.sql` deve ser simplificado para conter apenas o estado original, sem os grants incorretos. O `schema.sql` deve ser a fonte de verdade atualizada.

---

### [A-04] Migrations 002 e 003 são stubs vazios

**Arquivos:** `supabase/migrations/002_cash.sql`, `003_printers.sql`
**Impacto:** Essas migrations foram criadas como reservas mas nunca receberam conteúdo. Ferramentas de migration (como `supabase db push`) podem interpretá-las de formas inesperadas. Além disso, as estruturas que deveriam vir nelas já estão em `001_initial.sql`.

**Recomendação:** Documentar claramente no header que são stubs intencionais (já estão comentadas — ok), mas manter consistência.

---

## 4. Problemas MÉDIOS

### [M-01] Sem soft delete em `produtos` e `categorias`

**Impacto:** Produtos e categorias deletados somem permanentemente. Não há como recuperar ou auditar o histórico de cardápio. Hoje a solução é `disponivel=false` / `ativa=false`, mas isso não é soft delete — o registro pode ser deletado via admin.

**Correção:** migration 007 adiciona `deleted_at timestamptz` em `produtos` e `categorias`, com índices parciais para filtragem.

---

### [M-02] Sem tabela de audit log

**Impacto:** Não há rastreamento de quem alterou pedidos, preços ou configurações. Em caso de disputas operacionais, não há histórico.

**Correção:** migration 007 cria tabela `audit_log` com trigger automático em tabelas críticas.

---

### [M-03] `pedido_itens` sem `updated_at`

**Impacto:** Inconsistência com o padrão das outras tabelas. Itens do pedido não deveriam ser alterados após criação, mas a ausência do campo significa que não há rastreamento se forem.

**Nota:** Baixa prioridade — itens são imutáveis por design. Não incluído na migration.

---

### [M-04] `mesa_contas.pedido_ids` é `uuid[]` (array desnormalizado)

**Impacto:** Impossível fazer FK integrity em array de UUIDs. Não há como garantir que os IDs referenciados existem em `pedidos`. Consultas com `.contains()` são mais lentas que JOINs.

**Recomendação futura:** Criar tabela `mesa_conta_pedidos (mesa_conta_id, pedido_id)` para normalizar. Não incluído nesta migration por impacto em código.

---

## 5. Problemas de PERFORMANCE

### [P-01] Índice composto faltando: `pedidos(status, tipo, created_at)`

O admin board filtra pedidos por status E tipo simultaneamente. O índice atual `idx_pedidos_status_created_at` cobre apenas `(status, created_at)`. Um filtro por `tipo` força varredura extra.

**Correção:** migration 007 adiciona `idx_pedidos_status_tipo_created on pedidos(status, tipo, created_at desc)`.

---

### [P-02] Índice faltando: `pedidos(numero)`

O `numero` tem UNIQUE constraint (que cria índice implícito), mas queries de busca por número de pedido funcionam. OK — não precisa de índice separado.

---

### [P-03] Sem índice em `mesas(numero)`

`mesas.numero` tem constraint UNIQUE, então o índice já existe implicitamente. OK.

---

### [P-04] Índice faltando: `produtos(deleted_at)` (após soft delete)

Após adicionar `deleted_at`, todas as queries que listam produtos disponíveis precisarão filtrar `deleted_at IS NULL`. Migration 007 já inclui índice parcial.

---

### [P-05] `print_jobs` sem particionamento por data

Em operação contínua, `print_jobs` acumulará registros indefinidamente. Para produção de longo prazo, recomenda-se particionamento por mês ou rotina de limpeza.

**Recomendação:** Adicionar job periódico de limpeza de `print_jobs` com mais de 90 dias. Fora do escopo desta migration.

---

## 6. Consistência de Tipos TypeScript vs Schema SQL

| Campo TypeScript | Tipo TS | Coluna DB | Tipo DB | Status |
|---|---|---|---|---|
| `RestaurantConfig.whatsapp` | `string` | `telefone` | `text` | ⚠️ Mapeado manualmente — semântica incorreta |
| `RestaurantConfig.cuisine` | `string` | — | — | ⚠️ Hard-coded como "Culinaria Arabe" no código |
| `OrderDetail.kind` | `"mesa"\|"delivery"\|"retirada"` | `tipo` | `order_kind_enum` | ✅ Compatível |
| `OrderDetail.table` | `string\|null` | `mesa` | `text` | ⚠️ Tipo correto mas sem FK |
| `PrinterRecord.isActive` | `boolean` | `is_active` | `boolean` | ✅ |
| `CashMovementRecord.amount` | `number` | `valor` | `numeric(10,2)` | ✅ |

---

## 7. Mapa de Entidades vs Código

| Entidade esperada | Tabela DB | Repository | Status |
|---|---|---|---|
| usuarios | `auth.users` (Supabase) | `lib/auth/` | ✅ Gerenciado pelo Supabase Auth |
| clientes | Campo em `pedidos` | inline | ⚠️ Sem tabela dedicada — clientes são campos no pedido |
| pedidos | `pedidos` + `pedido_itens` | `order.repository.ts` → `data.legacy.ts` | ✅ |
| produtos | `produtos` | `menu.repository.ts` → `data.legacy.ts` | ✅ |
| pagamentos | Campos em `pedidos` + `mesa_contas` | inline | ⚠️ Sem tabela dedicada de pagamentos |
| logs | — | — | ❌ Ausente |
| configuracoes | `restaurante_config` + `order_settings` | inline | ✅ |

---

## 8. Ações Aplicadas na Migration 007

- [x] Fixar default privileges para anon (revoke)
- [x] Adicionar singleton constraint em `restaurante_config`
- [x] Adicionar coluna `whatsapp` em `restaurante_config`
- [x] Adicionar `deleted_at` em `produtos` e `categorias`
- [x] Adicionar unique constraint em `caixa_fechamentos(referencia_data)`
- [x] Adicionar índice composto `pedidos(status, tipo, created_at)`
- [x] Adicionar `mesa_numero integer` em `pedidos` (FK auxiliar)
- [x] Criar tabela `audit_log`
- [x] Adicionar trigger de auditoria em `pedidos`, `produtos`, `categorias`
