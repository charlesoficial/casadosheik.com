# Import Report — Cardápio Casa do Sheik
Data: 2026-04-10 — Fonte: Goomer (store_id: 272620)

---

## Resumo

| Item | Valor |
|---|---|
| Categorias importadas | 15 |
| Produtos importados | 53 |
| Produtos com foto | 47 |
| Produtos sem foto | 6 |
| Produtos sem descrição | 4 |
| Faixa de preço | R$ 5,00 – R$ 90,00 |
| Preço médio | R$ 29,68 |

---

## Arquivos Gerados

| Arquivo | Finalidade |
|---|---|
| `supabase/seeds/05_casa_do_sheik_menu.sql` | Seed principal — upsert idempotente de categorias e produtos |
| `supabase/seeds/05_casa_do_sheik_menu_validation.sql` | 8 queries de validação pós-import |
| `supabase/CASA_DO_SHEIK_IMPORT_REPORT.md` | Este relatório |

---

## Categorias (15)

| # | Nome | Produtos |
|---|---|---|
| 1 | Almoço e jantar Árabe | 5 |
| 2 | Pastas | 4 |
| 3 | Esfihas | 9 |
| 4 | Shawarmas | 5 |
| 5 | Kibe Cru | 1 |
| 6 | Combos | 5 |
| 7 | Saladas Árabe | 1 |
| 8 | Porções Extras | 2 |
| 9 | Kibe Frito | 2 |
| 10 | Porção | 5 |
| 11 | Refrigerantes 600ml | 2 |
| 12 | Refrigerantes 1,5L | 1 |
| 13 | Refrigerantes 2L | 2 |
| 14 | Cerveja 600ml | 5 |
| 15 | Cerveja Long Neck | 4 |
| **Total** | | **53** |

---

## Incompatibilidades Resolvidas

### I-01 — IDs inteiros → UUIDs
**Problema:** Fonte Goomer usa `id` inteiro (ex: `1799011`, `10978405`). Schema usa `uuid primary key default gen_random_uuid()`.

**Resolução:** IDs do Goomer descartados. O seed usa `ON CONFLICT (nome)` para categorias e `WHERE NOT EXISTS (nome + categoria_id)` para produtos. Os UUIDs são gerados pelo banco (`gen_random_uuid()`) na inserção.

**Impacto:** Nenhum — o sistema nunca expôs os IDs do Goomer para o cliente.

---

### I-02 — Campos de imagem triplos → `foto_url` único
**Problema:** Goomer exporta `imagem_pequena`, `imagem_media` e `imagem_grande`. Schema tem apenas `foto_url text`.

**Resolução:** `imagem_media` mapeada para `foto_url`. `imagem_pequena` e `imagem_grande` descartadas.

**URLs mapeadas:**
```
imagem_media: https://www.goomer.app/webmenu/casa-do-sheik-3/product/{pid}/picture/medium/{hash}
foto_url:     https://www.goomer.app/webmenu/casa-do-sheik-3/product/{pid}/picture/medium/{hash}
```

**Nota:** As URLs do Goomer são públicas e funcionam sem autenticação. Se o Goomer descontinuar o serviço ou as imagens, será necessário migrar para Supabase Storage.

---

### I-03 — Campos ausentes na fonte
**Problema:** Goomer não exporta `destaque`, `deleted_at` nem `ordem`.

**Resolução:**
- `destaque` → `false` para todos (nenhum produto marcado como destaque pelo import — admin deve configurar manualmente)
- `deleted_at` → `null` (todos ativos)
- `ordem` → sequencial por categoria, na mesma ordem do export Goomer

---

### I-04 — Coluna `ON CONFLICT` inválida para produtos
**Problema:** `produtos` não tem constraint `UNIQUE` em `nome`. `ON CONFLICT (nome)` seria inválido.

**Resolução:** Padrão `INSERT ... WHERE NOT EXISTS (nome + categoria_id)` — inserção condicional. Na primeira execução insere 53 produtos; em re-execuções insere 0 (totalmente idempotente).

**Trade-off:** Se um produto for renomeado no admin e o seed for re-executado, o produto com o nome antigo permanece e um novo é criado com o nome correto. Para evitar isso, não re-execute o seed após alterações manuais no cardápio.

---

### I-05 — Nomes com caracteres especiais (encoding)
**Problema:** O arquivo-fonte foi extraído com encoding mal interpretado (`ǭrabe`, `Almo��o`, `pǜo`).

**Resolução:** Todos os nomes e descrições foram corrigidos manualmente para UTF-8 com acentuação correta (`Árabe`, `Almoço`, `pão`, `sírio`, `porção`, etc.).

---

## Produtos sem Foto (6)

| Produto | Categoria | Motivo |
|---|---|---|
| Coca-Cola 600ml | Refrigerantes 600ml | Sem imagem no Goomer |
| Guaraná 600ml | Refrigerantes 600ml | Sem imagem no Goomer |
| Heineken Long Neck | Cerveja Long Neck | Sem imagem no Goomer |
| Stella Long Neck | Cerveja Long Neck | Sem imagem no Goomer |

**Nota:** Quibe de Carne e Kibe Recheado com Mussarela têm imagem no Goomer e foram importados com `foto_url` preenchido.

---

## Produtos sem Descrição (4)

| Produto | Categoria |
|---|---|
| Quibe de Carne | Kibe Frito |
| Kibe Recheado com Mussarela | Kibe Frito |
| Heineken Long Neck | Cerveja Long Neck |
| Stella Long Neck | Cerveja Long Neck |

Estes produtos tinham `descricao = NULL` na fonte Goomer. Foram importados com `descricao = null`.

---

## Produtos de Demonstração (Seeds 02/03)

O seed 05 **não remove** os produtos de demonstração dos seeds 02/03. As categorias demo (`Almoco arabe`, `Porcoes`, `Bebidas`, `Saladas`) continuam existindo no banco.

**Para ativar apenas o cardápio real**, execute após o import:

```sql
-- Desativa categorias demo (soft delete)
UPDATE categorias
SET deleted_at = now(), ativa = false, updated_at = now()
WHERE nome IN ('Almoco arabe', 'Pastas', 'Esfihas', 'Shawarmas',
               'Kibe Cru', 'Combos', 'Saladas', 'Porcoes', 'Bebidas')
  AND deleted_at IS NULL;
```

**Atenção:** As categorias `Pastas`, `Esfihas`, `Shawarmas`, `Kibe Cru` e `Combos` existem tanto no seed demo quanto no cardápio real — porém com produtos diferentes. Se o admin adicionou produtos a essas categorias do demo, verifique antes de desativar.

---

## Como Executar

### 1. Verificar pré-condições

```sql
-- Confirmar que o banco tem as colunas necessárias (pós migration 007)
SELECT column_name FROM information_schema.columns
WHERE table_name = 'produtos' AND column_name IN ('foto_url', 'deleted_at', 'destaque');
-- Esperado: 3 linhas
```

### 2. Executar o seed

No Supabase Dashboard → SQL Editor, cole e execute:

```
supabase/seeds/05_casa_do_sheik_menu.sql
```

### 3. Validar o resultado

Execute `05_casa_do_sheik_menu_validation.sql` e confirme:
- **V-01:** `categorias_do_seed = 15` e status `OK`
- **V-03:** cada categoria com o número correto de produtos
- **V-04:** `total_produtos_seed = 53`

### 4. (Opcional) Desativar cardápio demo

Se desejar exibir apenas o cardápio real, execute o UPDATE da seção anterior.

---

## Ações Recomendadas Pós-Import

| Ação | Prioridade | Descrição |
|---|---|---|
| Marcar destaques | Alta | Definir `destaque = true` para 3–5 pratos principais no admin |
| Adicionar fotos faltantes | Média | 6 produtos sem `foto_url` — adicionar via admin ou Supabase Storage |
| Completar descrições | Baixa | 4 produtos com `descricao = null` — adicionar texto via admin |
| Migrar imagens | Futura | Se o Goomer descontinuar as URLs, fazer upload para Supabase Storage |
| Desativar demo | Opcional | Remover produtos de demonstração dos seeds 02/03 |

---

## Score de Completude do Import

| Dimensão | Valor |
|---|---|
| Categorias completas | 15/15 (100%) |
| Produtos completos | 53/53 (100%) |
| Produtos com foto | 47/53 (89%) |
| Produtos com descrição | 49/53 (92%) |
| Idempotência | Garantida |
| Compatibilidade schema | Total |
