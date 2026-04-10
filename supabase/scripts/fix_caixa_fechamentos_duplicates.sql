-- =============================================================================
-- FIX: Duplicidade em caixa_fechamentos.referencia_data
-- Sistema Restaurante / Casa do Sheik
-- Data: 2026-04-10
-- Instrucoes: Execute cada ETAPA separadamente no Supabase SQL Editor.
--             Leia o resultado de cada etapa antes de avançar.
--             Nao execute ETAPA 6 sem antes validar ETAPA 3 e ETAPA 4.
-- =============================================================================

-- =============================================================================
-- ETAPA 1 — BACKUP PREVENTIVO
-- Cria uma copia de seguranca da tabela antes de qualquer alteracao.
-- Execute esta etapa PRIMEIRO. Se a tabela backup ja existir de uma execucao
-- anterior, o comando usa CREATE ... IF NOT EXISTS para nao falhar.
-- =============================================================================

CREATE TABLE IF NOT EXISTS caixa_fechamentos_backup_20260410 AS
  SELECT * FROM caixa_fechamentos;

-- Confirme o backup contando os registros:
SELECT
  (SELECT COUNT(*) FROM caixa_fechamentos)              AS registros_originais,
  (SELECT COUNT(*) FROM caixa_fechamentos_backup_20260410) AS registros_no_backup,
  CASE
    WHEN (SELECT COUNT(*) FROM caixa_fechamentos) =
         (SELECT COUNT(*) FROM caixa_fechamentos_backup_20260410)
    THEN 'BACKUP OK — pode prosseguir'
    ELSE 'BACKUP DIVERGENTE — nao prossiga'
  END AS status_backup;

-- =============================================================================
-- ETAPA 2 — DETECTAR DUPLICATAS
-- Mostra quais datas tem mais de um registro de fechamento.
-- Se retornar zero linhas: sem duplicatas — va direto para ETAPA 7.
-- =============================================================================

SELECT
  referencia_data,
  COUNT(*)                             AS total_registros,
  MIN(created_at)                      AS primeiro_registro,
  MAX(created_at)                      AS ultimo_registro,
  SUM(total)                           AS soma_total_financeiro,
  MIN(total)                           AS menor_total,
  MAX(total)                           AS maior_total,
  CASE
    WHEN MIN(total) = MAX(total) THEN 'IDENTICOS'
    ELSE 'DIVERGENCIA FINANCEIRA — revisar manualmente'
  END                                  AS alerta_financeiro
FROM caixa_fechamentos
GROUP BY referencia_data
HAVING COUNT(*) > 1
ORDER BY referencia_data DESC;

-- =============================================================================
-- ETAPA 3 — DETALHAR TODOS OS REGISTROS DUPLICADOS
-- Listagem completa dos registros em conflito com todos os campos relevantes.
-- Use esta visualizacao para decidir quais registros sao mais completos.
-- =============================================================================

SELECT
  cf.id,
  cf.referencia_data,
  cf.total,
  cf.pedidos_count,
  cf.mesas_count,
  cf.fechado_por,
  cf.fechado_em,
  cf.observacao,
  cf.created_at,
  -- Coluna auxiliar para identificar qual sera mantido
  ROW_NUMBER() OVER (
    PARTITION BY cf.referencia_data
    ORDER BY cf.created_at DESC NULLS LAST, cf.id DESC
  )                                    AS posicao,
  CASE
    ROW_NUMBER() OVER (
      PARTITION BY cf.referencia_data
      ORDER BY cf.created_at DESC NULLS LAST, cf.id DESC
    )
    WHEN 1 THEN 'MANTER (mais recente)'
    ELSE 'CANDIDATO A REMOCAO'
  END                                  AS acao_prevista
FROM caixa_fechamentos cf
WHERE cf.referencia_data IN (
  SELECT referencia_data
  FROM caixa_fechamentos
  GROUP BY referencia_data
  HAVING COUNT(*) > 1
)
ORDER BY cf.referencia_data DESC, posicao ASC;

-- =============================================================================
-- ETAPA 4 — RELATORIO: IDs QUE SERAO MANTIDOS
-- Um registro por data — o mais recente (created_at DESC, id DESC).
-- =============================================================================

WITH ranked AS (
  SELECT
    id,
    referencia_data,
    total,
    pedidos_count,
    fechado_por,
    fechado_em,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY referencia_data
      ORDER BY created_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM caixa_fechamentos
  WHERE referencia_data IN (
    SELECT referencia_data FROM caixa_fechamentos
    GROUP BY referencia_data HAVING COUNT(*) > 1
  )
)
SELECT
  id                                   AS id_a_manter,
  referencia_data,
  total,
  pedidos_count,
  fechado_por,
  fechado_em,
  created_at
FROM ranked
WHERE rn = 1
ORDER BY referencia_data DESC;

-- =============================================================================
-- ETAPA 5 — RELATORIO: IDs CANDIDATOS A REMOCAO (DRY RUN)
-- Registros que serao removidos — confirme antes de executar a remocao.
-- Nenhuma alteracao e feita aqui. So listagem.
-- =============================================================================

WITH ranked AS (
  SELECT
    id,
    referencia_data,
    total,
    pedidos_count,
    fechado_por,
    fechado_em,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY referencia_data
      ORDER BY created_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM caixa_fechamentos
)
SELECT
  id                                   AS id_candidato_remocao,
  referencia_data,
  total                                AS total_financeiro,
  pedidos_count,
  fechado_por,
  fechado_em,
  created_at,
  rn                                   AS posicao_no_grupo
FROM ranked
WHERE rn > 1
ORDER BY referencia_data DESC, rn ASC;

-- =============================================================================
-- ETAPA 5B — ALERTA DE DIVERGENCIA FINANCEIRA
-- Se esta query retornar linhas, os registros duplicados tem valores DIFERENTES.
-- Nao execute a remocao automatica nesses casos — revise manualmente.
-- =============================================================================

WITH ranked AS (
  SELECT
    id,
    referencia_data,
    total,
    ROW_NUMBER() OVER (
      PARTITION BY referencia_data
      ORDER BY created_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM caixa_fechamentos
),
keeper AS (
  SELECT referencia_data, total AS total_keeper
  FROM ranked WHERE rn = 1
),
candidates AS (
  SELECT r.referencia_data, r.id, r.total AS total_candidate
  FROM ranked r WHERE r.rn > 1
)
SELECT
  c.referencia_data,
  k.total_keeper      AS total_registro_mantido,
  c.id                AS id_candidato_remocao,
  c.total_candidate   AS total_candidato,
  ABS(k.total_keeper - c.total_candidate) AS diferenca
FROM candidates c
JOIN keeper k ON k.referencia_data = c.referencia_data
WHERE k.total_keeper <> c.total_candidate
ORDER BY c.referencia_data DESC;

-- Se retornar ZERO linhas: todos os duplicados sao financeiramente identicos — remocao segura.
-- Se retornar LINHAS: revisar manualmente qual registro e o correto antes de prosseguir.

-- =============================================================================
-- ETAPA 6 — REMOCAO SEGURA DOS DUPLICADOS
-- Execute APENAS se:
--   [x] Backup validado (ETAPA 1 retornou BACKUP OK)
--   [x] ETAPA 5 listou os candidatos e voce confirmou
--   [x] ETAPA 5B retornou ZERO linhas (sem divergencia financeira)
--       OU voce revisou manualmente e decidiu quais manter
--
-- Esta operacao e irreversivel no banco ao vivo (mas o backup garante rollback manual).
-- =============================================================================

-- Opcional: execute dentro de uma transacao para poder fazer ROLLBACK se necessario
-- BEGIN;

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY referencia_data
      ORDER BY created_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM caixa_fechamentos
)
DELETE FROM caixa_fechamentos
WHERE id IN (
  SELECT id FROM ranked WHERE rn > 1
);

-- Para confirmar quantos registros foram removidos, o Supabase SQL Editor mostra
-- "X rows deleted" no resultado.

-- Se usou BEGIN, execute COMMIT para confirmar ou ROLLBACK para desfazer:
-- COMMIT;
-- ROLLBACK;

-- =============================================================================
-- ETAPA 7 — VALIDACAO POS-REMOCAO
-- Deve retornar ZERO linhas para confirmar que a tabela esta pronta.
-- =============================================================================

SELECT
  referencia_data,
  COUNT(*) AS total_registros
FROM caixa_fechamentos
GROUP BY referencia_data
HAVING COUNT(*) > 1;

-- Resultado esperado: "(0 rows)" ou mensagem vazia.
-- Se ainda retornar linhas, nao aplique a migration 007.

-- =============================================================================
-- ETAPA 8 — CONTAGEM FINAL
-- Confirma quantos registros sobraram e valida integridade basica.
-- =============================================================================

SELECT
  COUNT(*)                                    AS total_registros,
  COUNT(DISTINCT referencia_data)             AS datas_unicas,
  MIN(referencia_data)                        AS data_mais_antiga,
  MAX(referencia_data)                        AS data_mais_recente,
  SUM(total)                                  AS faturamento_total_historico,
  CASE
    WHEN COUNT(*) = COUNT(DISTINCT referencia_data)
    THEN 'SEM DUPLICATAS — migration 007 pode ser aplicada'
    ELSE 'AINDA HA DUPLICATAS — nao aplique migration 007'
  END                                         AS veredito
FROM caixa_fechamentos;

-- =============================================================================
-- ETAPA 9 — APLICAR MIGRATION 007 (referencia)
-- Quando ETAPA 8 retornar "SEM DUPLICATAS", execute o arquivo:
--   supabase/migrations/007_production_hardening.sql
-- no Supabase Dashboard > SQL Editor.
--
-- O comando que cria a constraint de unicidade e este:
-- =============================================================================

-- PREVIEW (nao executar aqui — ja esta na migration 007):
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_caixa_fechamentos_referencia_unique
--   ON caixa_fechamentos (referencia_data);

-- =============================================================================
-- ETAPA 10 — VALIDAR CONSTRAINT APLICADA
-- Apos rodar migration 007, confirme que o indice existe:
-- =============================================================================

SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'caixa_fechamentos'
  AND indexname = 'idx_caixa_fechamentos_referencia_unique';

-- Resultado esperado:
--   indexname: idx_caixa_fechamentos_referencia_unique
--   indexdef:  CREATE UNIQUE INDEX ... ON caixa_fechamentos (referencia_data)

-- =============================================================================
-- ETAPA 11 — TESTE DE PROTECAO (opcional mas recomendado)
-- Tenta inserir um fechamento duplicado para confirmar que o banco rejeita.
-- Deve retornar erro de unique constraint.
-- =============================================================================

-- ATENCAO: execute dentro de uma transacao e faca ROLLBACK — apenas para teste.
-- BEGIN;
-- INSERT INTO caixa_fechamentos (referencia_data, total, pedidos_count, mesas_count, totais_por_pagamento)
-- VALUES (CURRENT_DATE, 0, 0, 0, '[]');
-- -- Se chegar aqui sem erro, a constraint NAO foi aplicada corretamente.
-- ROLLBACK;
-- -- Se retornar "ERROR: duplicate key value violates unique constraint", a protecao esta ativa.

-- =============================================================================
-- LIMPEZA DO BACKUP (opcional — so execute depois de tudo validado)
-- =============================================================================

-- DROP TABLE IF EXISTS caixa_fechamentos_backup_20260410;

-- =============================================================================
-- FIM DO SCRIPT
-- =============================================================================
