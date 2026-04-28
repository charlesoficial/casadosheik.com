-- =============================================================================
-- VALIDAÇÃO PÓS-IMPORT — Cardápio Casa do Sheik
-- Execute após rodar 05_casa_do_sheik_menu.sql
-- Cada query deve retornar o valor esperado indicado no comentário.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- V-01: Contagem de categorias ativas (esperado: 15 ou mais)
-- -----------------------------------------------------------------------------
SELECT
  COUNT(*)                         AS total_categorias_ativas,
  COUNT(*) FILTER (WHERE nome IN (
    'Almoço e jantar Árabe', 'Pastas', 'Esfihas', 'Shawarmas',
    'Kibe Cru', 'Combos', 'Saladas Árabe', 'Porções Extras',
    'Kibe Frito', 'Porção', 'Refrigerantes 600ml', 'Refrigerantes 1,5L',
    'Refrigerantes 2L', 'Cerveja 600ml', 'Cerveja Long Neck'
  ))                               AS categorias_do_seed,
  CASE
    WHEN COUNT(*) FILTER (WHERE nome IN (
      'Almoço e jantar Árabe', 'Pastas', 'Esfihas', 'Shawarmas',
      'Kibe Cru', 'Combos', 'Saladas Árabe', 'Porções Extras',
      'Kibe Frito', 'Porção', 'Refrigerantes 600ml', 'Refrigerantes 1,5L',
      'Refrigerantes 2L', 'Cerveja 600ml', 'Cerveja Long Neck'
    )) = 15
    THEN 'OK — todas as 15 categorias presentes'
    ELSE 'FALHA — categorias faltando, verifique V-02'
  END                              AS status
FROM categorias
WHERE ativa = true AND deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- V-02: Categorias do seed por nome (deve listar exatamente 15 linhas)
-- -----------------------------------------------------------------------------
SELECT nome, ordem, ativa
FROM categorias
WHERE nome IN (
  'Almoço e jantar Árabe', 'Pastas', 'Esfihas', 'Shawarmas',
  'Kibe Cru', 'Combos', 'Saladas Árabe', 'Porções Extras',
  'Kibe Frito', 'Porção', 'Refrigerantes 600ml', 'Refrigerantes 1,5L',
  'Refrigerantes 2L', 'Cerveja 600ml', 'Cerveja Long Neck'
)
AND deleted_at IS NULL
ORDER BY ordem;

-- -----------------------------------------------------------------------------
-- V-03: Contagem de produtos ativos por categoria (deve cobrir as 15 categorias)
-- -----------------------------------------------------------------------------
SELECT
  c.nome                           AS categoria,
  COUNT(p.id)                      AS produtos_ativos,
  MIN(p.preco)                     AS menor_preco,
  MAX(p.preco)                     AS maior_preco,
  COUNT(p.id) FILTER (WHERE p.foto_url IS NOT NULL) AS com_foto
FROM categorias c
LEFT JOIN produtos p
  ON p.categoria_id = c.id
  AND p.disponivel = true
  AND p.deleted_at IS NULL
WHERE c.nome IN (
  'Almoço e jantar Árabe', 'Pastas', 'Esfihas', 'Shawarmas',
  'Kibe Cru', 'Combos', 'Saladas Árabe', 'Porções Extras',
  'Kibe Frito', 'Porção', 'Refrigerantes 600ml', 'Refrigerantes 1,5L',
  'Refrigerantes 2L', 'Cerveja 600ml', 'Cerveja Long Neck'
)
AND c.deleted_at IS NULL
GROUP BY c.nome, c.ordem
ORDER BY c.ordem;

-- Contagem esperada por categoria:
--   Almoço e jantar Árabe : 5
--   Pastas                : 4
--   Esfihas               : 9
--   Shawarmas             : 5
--   Kibe Cru              : 1
--   Combos                : 5
--   Saladas Árabe         : 1
--   Porções Extras        : 2
--   Kibe Frito            : 2
--   Porção                : 5
--   Refrigerantes 600ml   : 2
--   Refrigerantes 1,5L    : 1
--   Refrigerantes 2L      : 2
--   Cerveja 600ml         : 5
--   Cerveja Long Neck     : 4
--                   TOTAL : 53

-- -----------------------------------------------------------------------------
-- V-04: Total geral de produtos importados (esperado: 53 na 1ª execução)
-- -----------------------------------------------------------------------------
SELECT
  COUNT(*)                         AS total_produtos_seed,
  COUNT(*) FILTER (WHERE foto_url IS NOT NULL) AS com_foto,
  COUNT(*) FILTER (WHERE foto_url IS NULL)     AS sem_foto,
  COUNT(*) FILTER (WHERE descricao IS NULL)    AS sem_descricao,
  SUM(preco)                       AS soma_precos,
  MIN(preco)                       AS menor_preco,
  MAX(preco)                       AS maior_preco,
  ROUND(AVG(preco), 2)             AS preco_medio
FROM produtos p
JOIN categorias c ON c.id = p.categoria_id
WHERE c.nome IN (
  'Almoço e jantar Árabe', 'Pastas', 'Esfihas', 'Shawarmas',
  'Kibe Cru', 'Combos', 'Saladas Árabe', 'Porções Extras',
  'Kibe Frito', 'Porção', 'Refrigerantes 600ml', 'Refrigerantes 1,5L',
  'Refrigerantes 2L', 'Cerveja 600ml', 'Cerveja Long Neck'
)
AND p.disponivel = true
AND p.deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- V-05: Produtos sem foto (esperado: 6 itens — bebidas sem imagem no Goomer)
-- Coca-Cola 600ml, Guaraná 600ml, Heineken Long Neck, Stella Long Neck +
-- Quibe de Carne e Kibe Recheado com Mussarela têm foto, verificar se ok
-- -----------------------------------------------------------------------------
SELECT
  c.nome AS categoria,
  p.nome AS produto,
  p.preco
FROM produtos p
JOIN categorias c ON c.id = p.categoria_id
WHERE p.foto_url IS NULL
  AND p.deleted_at IS NULL
  AND c.deleted_at IS NULL
  AND c.nome IN (
    'Almoço e jantar Árabe', 'Pastas', 'Esfihas', 'Shawarmas',
    'Kibe Cru', 'Combos', 'Saladas Árabe', 'Porções Extras',
    'Kibe Frito', 'Porção', 'Refrigerantes 600ml', 'Refrigerantes 1,5L',
    'Refrigerantes 2L', 'Cerveja 600ml', 'Cerveja Long Neck'
  )
ORDER BY c.ordem, p.ordem;

-- -----------------------------------------------------------------------------
-- V-06: Idempotência — re-execute o seed e confirme que nenhum produto novo aparece
-- Esta query deve retornar o MESMO número de antes e depois da re-execução
-- -----------------------------------------------------------------------------
SELECT
  COUNT(*)                         AS total_produtos_ativos,
  now()                            AS verificado_em
FROM produtos
WHERE disponivel = true
  AND deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- V-07: Verificar se produtos de demonstração (seeds 02/03) ainda existem
-- Se existirem categorias como 'Almoco arabe', 'Porcoes', 'Bebidas', isso indica
-- que o cardápio de demo não foi desativado — pode ser desejável ou não.
-- -----------------------------------------------------------------------------
SELECT nome AS categoria_demo_ainda_ativa
FROM categorias
WHERE nome IN ('Almoco arabe', 'Porcoes', 'Bebidas', 'Saladas')
  AND deleted_at IS NULL
  AND ativa = true;

-- Resultado esperado se quiser apenas o cardápio real: "(0 rows)"
-- Para desativar as categorias demo sem perder produtos históricos, execute:
--   UPDATE categorias
--   SET deleted_at = now(), ativa = false
--   WHERE nome IN ('Almoco arabe', 'Porcoes', 'Bebidas', 'Saladas')
--     AND deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- V-08: Verificar acesso público (simula query do cardápio /menu)
-- Deve retornar todas as categorias do seed com seus produtos
-- -----------------------------------------------------------------------------
SELECT
  c.nome                           AS categoria,
  c.ordem                          AS ordem_categoria,
  COUNT(p.id)                      AS produtos_visiveis_no_menu
FROM categorias c
LEFT JOIN produtos p
  ON p.categoria_id = c.id
  AND p.disponivel = true
  AND p.deleted_at IS NULL
WHERE c.ativa = true
  AND c.deleted_at IS NULL
GROUP BY c.id, c.nome, c.ordem
ORDER BY c.ordem;

-- =============================================================================
-- FIM DA VALIDAÇÃO
-- Se todas as queries retornaram os valores esperados, o import está correto.
-- =============================================================================
