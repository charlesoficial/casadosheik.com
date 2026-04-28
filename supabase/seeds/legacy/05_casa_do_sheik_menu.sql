-- =============================================================================
-- SEED 05 — Cardápio Real Casa do Sheik
-- Fonte: Goomer (store_id: 272620)
-- Adaptado em: 2026-04-10
-- =============================================================================
-- Este seed é idempotente: pode ser executado múltiplas vezes sem duplicar dados.
--   Categorias : ON CONFLICT (nome) DO UPDATE — atualiza ordem e ativa
--   Produtos   : INSERT ... WHERE NOT EXISTS (nome + categoria_id) — pula se já existe
--
-- AVISO: Este seed NÃO remove nem trunca dados existentes.
-- Produtos pré-existentes com nomes diferentes dos listados aqui são preservados.
-- Para substituir o cardápio de demonstração (seeds 02 e 03), execute antes:
--   UPDATE categorias SET deleted_at = now() WHERE nome IN
--     ('Almoco arabe','Pastas','Esfihas','Shawarmas','Kibe Cru','Combos',
--      'Saladas','Porcoes','Bebidas');
-- =============================================================================

-- -----------------------------------------------------------------------------
-- ETAPA 1 — CATEGORIAS (15 categorias reais)
-- ON CONFLICT (nome): atualiza ordem e garante ativa = true, deleted_at = null
-- -----------------------------------------------------------------------------

insert into categorias (nome, ordem, ativa, deleted_at)
values
  ('Almoço e jantar Árabe',  1,  true, null),
  ('Pastas',                  2,  true, null),
  ('Esfihas',                 3,  true, null),
  ('Shawarmas',               4,  true, null),
  ('Kibe Cru',                5,  true, null),
  ('Combos',                  6,  true, null),
  ('Saladas Árabe',           7,  true, null),
  ('Porções Extras',          8,  true, null),
  ('Kibe Frito',              9,  true, null),
  ('Porção',                  10, true, null),
  ('Refrigerantes 600ml',     11, true, null),
  ('Refrigerantes 1,5L',      12, true, null),
  ('Refrigerantes 2L',        13, true, null),
  ('Cerveja 600ml',           14, true, null),
  ('Cerveja Long Neck',       15, true, null)
on conflict (nome) do update
set
  ordem      = excluded.ordem,
  ativa      = excluded.ativa,
  deleted_at = excluded.deleted_at,
  updated_at = now();

-- -----------------------------------------------------------------------------
-- ETAPA 2 — PRODUTOS (53 produtos reais)
-- Estratégia: INSERT ... SELECT ... WHERE NOT EXISTS (nome + categoria_id)
-- A imagem usada é imagem_media (campo foto_url no schema atual).
-- Produtos já existentes com o mesmo nome na mesma categoria são preservados.
-- -----------------------------------------------------------------------------

insert into produtos (categoria_id, nome, descricao, preco, foto_url, disponivel, destaque, ordem)
select c.id, p.nome, p.descricao, p.preco, p.foto_url, true, false, p.ordem
from (
  values
  -- ===========================================================================
  -- Almoço e jantar Árabe
  -- ===========================================================================
  ('Almoço e jantar Árabe', 'Prato Kafta Árabe',
   '2 espetos de kafta, hommus e salada fattoush com pão casa do sheik, e arroz sírio.',
   60.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/11513771/picture/medium/260329132129',
   1),

  ('Almoço e jantar Árabe', 'Prato Falafel',
   'Falafel, arroz sírio e salada fattoush com pão árabe casa do sheik frito e homus.',
   60.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/11513790/picture/medium/260329132334',
   2),

  ('Almoço e jantar Árabe', 'Fatteh de Falafel',
   'Pão árabe crocante, arroz majuddara (arroz com lentilha), falafel dourado crocante, molho tahine cremoso, especiarias árabe com toque de sumac. Um prato leve, nutritivo e cheio de identidade.',
   60.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/12590850/picture/medium/260329145613',
   3),

  ('Almoço e jantar Árabe', 'Salada Fattoush',
   'Legumes frescos, pão árabe crocante, e um molho especial de fattoush que equilibra acidez e frescor.',
   50.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/12590857/picture/medium/260329145626',
   4),

  ('Almoço e jantar Árabe', 'Fatteh Shawarma',
   'Pão árabe crocante, arroz sírio bem temperado, shawarma suculento, macio e cheio de sabor, molho tahine cremoso. Especiarias árabes autênticas.',
   60.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/12590859/picture/medium/260329150424',
   5),

  -- ===========================================================================
  -- Pastas
  -- ===========================================================================
  ('Pastas', 'Hommus Tahine',
   'Porção de 200 gramas.',
   40.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/11030376/picture/medium/260329132628',
   1),

  ('Pastas', 'Coalhada Seca',
   'Acompanha: pão árabe casa do sheik. Porção de 200 gramas.',
   40.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/11030383/picture/medium/260329132638',
   2),

  ('Pastas', 'Babaghanouch',
   'Acompanhamento: pão árabe e azeite. Porção de 200 gramas.',
   40.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/11030402/picture/medium/260329132656',
   3),

  ('Pastas', 'Sahn Kibe Cru',
   'Prato com coalhada seca, tabule, pão sírio casa do sheik.',
   60.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/11048937/picture/medium/260329132758',
   4),

  -- ===========================================================================
  -- Esfihas
  -- ===========================================================================
  ('Esfihas', 'Esfiha de Carne',
   'Sabor árabe original.',
   11.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/10990488/picture/medium/260329132900',
   1),

  ('Esfihas', 'Esfiha Carne com Muçarela',
   'Sabor árabe original.',
   13.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/10990491/picture/medium/260329132925',
   2),

  ('Esfihas', 'Esfiha Muçarela',
   'Sabor árabe original.',
   11.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/10990495/picture/medium/260329132947',
   3),

  ('Esfihas', 'Esfiha Queijo Branco',
   'Sabor árabe original.',
   11.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/10990493/picture/medium/260329133009',
   4),

  ('Esfihas', 'Esfiha de Mahammara',
   'Sabor árabe original.',
   11.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/11514400/picture/medium/260329133029',
   5),

  ('Esfihas', 'Esfiha de Mahammara com Queijo',
   'Sabor árabe original.',
   13.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/11514403/picture/medium/260329133103',
   6),

  ('Esfihas', 'Esfiha Coalhada Seca',
   'Sabor árabe original.',
   12.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/11057594/picture/medium/260329133118',
   7),

  ('Esfihas', 'Esfiha Coalhada Seca com Zaatar',
   'Sabor árabe original.',
   13.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/11057596/picture/medium/260329133137',
   8),

  ('Esfihas', 'Esfiha de Zaatar com Queijo',
   'Sabor árabe original.',
   13.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/11083924/picture/medium/260329133159',
   9),

  -- ===========================================================================
  -- Shawarmas
  -- ===========================================================================
  ('Shawarmas', 'Shawarma do Sheik (Frango Especial)',
   'Frango suculento marinado no tempero exclusivo da casa do sheik, assado no ponto certo e envolvido no pão sírio quentinho com nosso molho de alho cremoso.',
   30.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/10990012/picture/medium/260329140822',
   1),

  ('Shawarmas', 'Shawarma de Carne',
   'No pão sírio casa do sheik, acompanha molho de alho.',
   30.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/10989968/picture/medium/260329133758',
   2),

  ('Shawarmas', 'Shawarma Misto',
   'No pão sírio casa do sheik, fatias de carne e frango temperadas. Acompanha: molho de alho.',
   30.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/10989963/picture/medium/260329133911',
   3),

  ('Shawarmas', 'Shawarma Kababe de Kafta',
   'No pão árabe casa do sheik. Acompanha: molho de alho.',
   30.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/11012798/picture/medium/260329134040',
   4),

  ('Shawarmas', 'Shawarma de Falafel (Vegetariano)',
   'No pão casa do sheik. Acompanha: molho de alho.',
   30.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/11026112/picture/medium/260329134208',
   5),

  -- ===========================================================================
  -- Kibe Cru
  -- ===========================================================================
  ('Kibe Cru', 'Kibe Cru',
   'Acompanha pão casa do sheik e azeite.',
   40.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/11027498/picture/medium/260329134559',
   1),

  -- ===========================================================================
  -- Combos
  -- ===========================================================================
  ('Combos', 'Shawarma Box',
   'Serve até 3 pessoas. Escolher 3 sabores. Acompanha batata e molho de alho. (Carne, Frango, Misto, Falafel, Kafta)',
   80.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/11083893/picture/medium/260329134857',
   1),

  ('Combos', 'Combo de Pastas Individual',
   'Kibe cru, Homus, Babaghanouch, Tabule e Coalhada Seca. Acompanha uma porção de pão árabe e azeite.',
   70.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/11030999/picture/medium/260210231112',
   2),

  ('Combos', 'Combo Vegetariano',
   'Homus, Falafel, Salada do Falafel, Babaghanouch, Coalhada Seca, + um tipo de salada à escolha.',
   80.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/11031016/picture/medium/260329141054',
   3),

  ('Combos', 'Combo 09 Esfihas',
   'Por favor colocar nas observações os sabores das 9 esfihas. Sabores: Carne, Queijo, Muçarela, Zaatar, Coalhada Seca, Espinafre, ou pode ser qualquer sabor + queijo.',
   80.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/11083901/picture/medium/260329141121',
   4),

  ('Combos', 'Combo Esfihas & Kibes',
   'O famoso Combo casa do sheik: 04 Esfihas de muçarela + 04 Esfihas de Carne + 02 Kibes à escolha.',
   90.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/11087789/picture/medium/260329141218',
   5),

  -- ===========================================================================
  -- Saladas Árabe
  -- ===========================================================================
  ('Saladas Árabe', 'Tabule',
   'Salada tradicional árabe, feita com temperos árabes originais.',
   30.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/11032814/picture/medium/260329141833',
   1),

  -- ===========================================================================
  -- Porções Extras
  -- ===========================================================================
  ('Porções Extras', 'Arroz Sírio',
   'Porção de 300gr.',
   10.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/11033018/picture/medium/260329141938',
   1),

  ('Porções Extras', 'Pão Árabe Original Casa do Sheik',
   'Porção de 4 Fatias de Pão Árabe.',
   5.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/11033062/picture/medium/260329142024',
   2),

  -- ===========================================================================
  -- Kibe Frito
  -- ===========================================================================
  ('Kibe Frito', 'Quibe de Carne',
   null,
   11.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/10628897/picture/medium/260210231217',
   1),

  ('Kibe Frito', 'Kibe Recheado com Mussarela',
   null,
   11.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/11514381/picture/medium/260210231230',
   2),

  -- ===========================================================================
  -- Porção
  -- ===========================================================================
  ('Porção', 'Batata Frita 500g',
   'Sequinha e crocante, acompanha molho de alho.',
   30.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/10989875/picture/medium/260210231319',
   1),

  ('Porção', 'Falafel',
   'Porção com 8 unidades de bolinhos de grão de bico temperado com especiarias.',
   30.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/11523666/picture/medium/250215165033',
   2),

  ('Porção', 'Peixe Frito',
   'Acompanha salada, batata frita e molho de alho.',
   60.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/10989898/picture/medium/240709213303',
   3),

  ('Porção', 'Mafufo Folha de Uva',
   'Porção com 400g.',
   40.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/11523829/picture/medium/260123162706',
   4),

  ('Porção', 'Mafufo',
   'Porção com 400g.',
   35.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/10989918/picture/medium/250828184307',
   5),

  -- ===========================================================================
  -- Refrigerantes 600ml
  -- ===========================================================================
  ('Refrigerantes 600ml', 'Coca-Cola 600ml',
   'Geladinha.',
   8.00,
   null,
   1),

  ('Refrigerantes 600ml', 'Guaraná 600ml',
   'Mineiro ou Antártica, geladinho.',
   8.00,
   null,
   2),

  -- ===========================================================================
  -- Refrigerantes 1,5L
  -- ===========================================================================
  ('Refrigerantes 1,5L', 'Coca-Cola 1,5L',
   'Geladinha.',
   12.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/10639320/picture/medium/250801163350',
   1),

  -- ===========================================================================
  -- Refrigerantes 2L
  -- ===========================================================================
  ('Refrigerantes 2L', 'Coca-Cola 2L',
   'Geladinha.',
   15.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/10639322/picture/medium/260329142632',
   1),

  ('Refrigerantes 2L', 'Mineiro 2L',
   'Geladinho.',
   12.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/10639325/picture/medium/250801163431',
   2),

  -- ===========================================================================
  -- Cerveja 600ml
  -- ===========================================================================
  ('Cerveja 600ml', 'Heineken 600ml',
   'Para consumir no local. Não fazemos entregas de bebidas alcoólicas.',
   15.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/12067019/picture/medium/250803000622',
   1),

  ('Cerveja 600ml', 'Budweiser 600ml',
   'Consumir apenas no estabelecimento. Não fazemos entregas.',
   15.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/12067024/picture/medium/260329142721',
   2),

  ('Cerveja 600ml', 'Stella Artois 600ml',
   'Consumir apenas no local. Não entregamos.',
   15.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/12067029/picture/medium/250803001531',
   3),

  ('Cerveja 600ml', 'Original 600ml',
   'Consumir no local. Não entregamos.',
   15.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/12068251/picture/medium/260329142734',
   4),

  ('Cerveja 600ml', 'Amstel 600ml',
   'Consumir no local. Não entregamos.',
   15.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/12068253/picture/medium/260329142749',
   5),

  -- ===========================================================================
  -- Cerveja Long Neck
  -- ===========================================================================
  ('Cerveja Long Neck', 'Budweiser Long Neck',
   'Consumir no local. Não entregamos.',
   8.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/12402551/picture/medium/251226131009',
   1),

  ('Cerveja Long Neck', 'Heineken Long Neck',
   null,
   10.00,
   null,
   2),

  ('Cerveja Long Neck', 'Amstel Long Neck',
   'Consumir no local. Não entregamos.',
   8.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/12068260/picture/medium/250803232618',
   3),

  ('Cerveja Long Neck', 'Stella Long Neck',
   null,
   10.00,
   null,
   4)

) as p(categoria_nome, nome, descricao, preco, foto_url, ordem)
join categorias c on c.nome = p.categoria_nome and c.deleted_at is null
where not exists (
  select 1 from produtos
  where nome       = p.nome
    and categoria_id = c.id
    and deleted_at is null
);

-- =============================================================================
-- RESULTADO ESPERADO
-- Categorias inseridas/atualizadas : 15
-- Produtos inseridos na 1ª execução: 53
-- Produtos inseridos em re-execução: 0 (idempotente)
-- =============================================================================
