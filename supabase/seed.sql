-- =============================================================================
-- SEED COMPLETO - Casa do Sheik
-- Supabase/PostgreSQL + Supabase Auth
-- Seguro para reexecucao: nao remove, nao trunca e nao duplica dados.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- CONFIGURACAO BASE DO RESTAURANTE
-- -----------------------------------------------------------------------------

insert into restaurante_config (
  id,
  nome,
  descricao,
  endereco,
  telefone,
  whatsapp,
  logo_url,
  pedido_minimo,
  taxa_entrega,
  entrega_gratis_acima,
  tempo_entrega_min,
  tempo_retirada_min,
  aberto,
  horarios,
  formas_pagamento,
  mensagem_boas_vindas
)
values (
  '11111111-1111-1111-1111-111111111111',
  'Casa do Sheik',
  'Culinaria arabe',
  'Avenida Vinte de Agosto, 2190 - Setor Central, Catalao - GO',
  '(64) 99999-0000',
  '+55 64 99999-0000',
  '/logo.png',
  20.00,
  0.00,
  120.00,
  50,
  20,
  true,
  '[
    {"dia":"segunda","abertura":"11:00","fechamento":"23:00"},
    {"dia":"terca","abertura":"11:00","fechamento":"23:00"},
    {"dia":"quarta","abertura":"11:00","fechamento":"23:00"},
    {"dia":"quinta","abertura":"11:00","fechamento":"23:00"},
    {"dia":"sexta","abertura":"11:00","fechamento":"23:59"},
    {"dia":"sabado","abertura":"11:00","fechamento":"23:59"},
    {"dia":"domingo","abertura":"11:00","fechamento":"22:30"}
  ]'::jsonb,
  array['dinheiro', 'credito', 'debito', 'pix'],
  'Bem-vindo ao Casa do Sheik! Autentica culinaria arabe.'
)
on conflict (id) do update
set
  nome = excluded.nome,
  descricao = excluded.descricao,
  endereco = excluded.endereco,
  telefone = excluded.telefone,
  whatsapp = excluded.whatsapp,
  logo_url = excluded.logo_url,
  pedido_minimo = excluded.pedido_minimo,
  taxa_entrega = excluded.taxa_entrega,
  entrega_gratis_acima = excluded.entrega_gratis_acima,
  tempo_entrega_min = excluded.tempo_entrega_min,
  tempo_retirada_min = excluded.tempo_retirada_min,
  aberto = excluded.aberto,
  horarios = excluded.horarios,
  formas_pagamento = excluded.formas_pagamento,
  mensagem_boas_vindas = excluded.mensagem_boas_vindas,
  updated_at = now();

-- -----------------------------------------------------------------------------
-- MESAS DO RESTAURANTE
-- -----------------------------------------------------------------------------

insert into mesas (numero, ativa)
select numero, true
from generate_series(1, 20) as numero
on conflict (numero) do update
set
  ativa = excluded.ativa,
  updated_at = now();

-- -----------------------------------------------------------------------------
-- CATEGORIAS DO CARDAPIO
-- -----------------------------------------------------------------------------

insert into categorias (nome, ordem, ativa, deleted_at)
values
  ('Almoco e jantar Arabe', 1, true, null),
  ('Pastas', 2, true, null),
  ('Esfihas', 3, true, null),
  ('Shawarmas', 4, true, null),
  ('Kibe Cru', 5, true, null),
  ('Combos', 6, true, null),
  ('Saladas Arabe', 7, true, null),
  ('Porcoes Extras', 8, true, null),
  ('Kibe Frito', 9, true, null),
  ('Porcao', 10, true, null),
  ('Refrigerantes 600ml', 11, true, null),
  ('Refrigerantes 1,5L', 12, true, null),
  ('Refrigerantes 2L', 13, true, null),
  ('Cerveja 600ml', 14, true, null),
  ('Cerveja Long Neck', 15, true, null)
on conflict (nome) do update
set
  ordem = excluded.ordem,
  ativa = excluded.ativa,
  deleted_at = excluded.deleted_at,
  updated_at = now();

-- -----------------------------------------------------------------------------
-- PRODUTOS DO CARDAPIO
-- -----------------------------------------------------------------------------

insert into produtos (categoria_id, nome, descricao, preco, foto_url, disponivel, destaque, ordem)
select c.id, p.nome, p.descricao, p.preco, p.foto_url, true, false, p.ordem
from (
  values
  ('Almoco e jantar Arabe', 'Prato Kafta Arabe',
   '2 espetos de kafta, hommus e salada fattoush com pao casa do sheik, e arroz sirio.',
   60.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/11513771/picture/medium/260329132129',
   1),

  ('Almoco e jantar Arabe', 'Prato Falafel',
   'Falafel, arroz sirio e salada fattoush com pao arabe casa do sheik frito e homus.',
   60.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/11513790/picture/medium/260329132334',
   2),

  ('Almoco e jantar Arabe', 'Fatteh de Falafel',
   'Pao arabe crocante, arroz majuddara (arroz com lentilha), falafel dourado crocante, molho tahine cremoso, especiarias arabe com toque de sumac. Um prato leve, nutritivo e cheio de identidade.',
   60.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/12590850/picture/medium/260329145613',
   3),

  ('Almoco e jantar Arabe', 'Salada Fattoush',
   'Legumes frescos, pao arabe crocante, e um molho especial de fattoush que equilibra acidez e frescor.',
   50.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/12590857/picture/medium/260329145626',
   4),

  ('Almoco e jantar Arabe', 'Fatteh Shawarma',
   'Pao arabe crocante, arroz sirio bem temperado, shawarma suculento, macio e cheio de sabor, molho tahine cremoso. Especiarias arabes autenticas.',
   60.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/12590859/picture/medium/260329150424',
   5),

  ('Pastas', 'Hommus Tahine',
   'Porcao de 200 gramas.',
   40.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/11030376/picture/medium/260329132628',
   1),

  ('Pastas', 'Coalhada Seca',
   'Acompanha: pao arabe casa do sheik. Porcao de 200 gramas.',
   40.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/11030383/picture/medium/260329132638',
   2),

  ('Pastas', 'Babaghanouch',
   'Acompanhamento: pao arabe e azeite. Porcao de 200 gramas.',
   40.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/11030402/picture/medium/260329132656',
   3),

  ('Pastas', 'Sahn Kibe Cru',
   'Prato com coalhada seca, tabule, pao sirio casa do sheik.',
   60.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/11048937/picture/medium/260329132758',
   4),

  ('Esfihas', 'Esfiha de Carne',
   'Sabor arabe original.',
   11.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/10990488/picture/medium/260329132900',
   1),

  ('Esfihas', 'Esfiha Carne com Mucarela',
   'Sabor arabe original.',
   13.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/10990491/picture/medium/260329132925',
   2),

  ('Esfihas', 'Esfiha Mucarela',
   'Sabor arabe original.',
   11.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/10990495/picture/medium/260329132947',
   3),

  ('Esfihas', 'Esfiha Queijo Branco',
   'Sabor arabe original.',
   11.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/10990493/picture/medium/260329133009',
   4),

  ('Esfihas', 'Esfiha de Mahammara',
   'Sabor arabe original.',
   11.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/11514400/picture/medium/260329133029',
   5),

  ('Esfihas', 'Esfiha de Mahammara com Queijo',
   'Sabor arabe original.',
   13.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/11514403/picture/medium/260329133103',
   6),

  ('Esfihas', 'Esfiha Coalhada Seca',
   'Sabor arabe original.',
   12.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/11057594/picture/medium/260329133118',
   7),

  ('Esfihas', 'Esfiha Coalhada Seca com Zaatar',
   'Sabor arabe original.',
   13.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/11057596/picture/medium/260329133137',
   8),

  ('Esfihas', 'Esfiha de Zaatar com Queijo',
   'Sabor arabe original.',
   13.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/11083924/picture/medium/260329133159',
   9),

  ('Shawarmas', 'Shawarma do Sheik (Frango Especial)',
   'Frango suculento marinado no tempero exclusivo da casa do sheik, assado no ponto certo e envolvido no pao sirio quentinho com nosso molho de alho cremoso.',
   30.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/10990012/picture/medium/260329140822',
   1),

  ('Shawarmas', 'Shawarma de Carne',
   'No pao sirio casa do sheik, acompanha molho de alho.',
   30.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/10989968/picture/medium/260329133758',
   2),

  ('Shawarmas', 'Shawarma Misto',
   'No pao sirio casa do sheik, fatias de carne e frango temperadas. Acompanha: molho de alho.',
   30.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/10989963/picture/medium/260329133911',
   3),

  ('Shawarmas', 'Shawarma Kababe de Kafta',
   'No pao arabe casa do sheik. Acompanha: molho de alho.',
   30.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/11012798/picture/medium/260329134040',
   4),

  ('Shawarmas', 'Shawarma de Falafel (Vegetariano)',
   'No pao casa do sheik. Acompanha: molho de alho.',
   30.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/11026112/picture/medium/260329134208',
   5),

  ('Kibe Cru', 'Kibe Cru',
   'Acompanha pao casa do sheik e azeite.',
   40.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/11027498/picture/medium/260329134559',
   1),

  ('Combos', 'Shawarma Box',
   'Serve ate 3 pessoas. Escolher 3 sabores. Acompanha batata e molho de alho. (Carne, Frango, Misto, Falafel, Kafta)',
   80.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/11083893/picture/medium/260329134857',
   1),

  ('Combos', 'Combo de Pastas Individual',
   'Kibe cru, Homus, Babaghanouch, Tabule e Coalhada Seca. Acompanha uma porcao de pao arabe e azeite.',
   70.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/11030999/picture/medium/260210231112',
   2),

  ('Combos', 'Combo Vegetariano',
   'Homus, Falafel, Salada do Falafel, Babaghanouch, Coalhada Seca, mais um tipo de salada a escolha.',
   80.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/11031016/picture/medium/260329141054',
   3),

  ('Combos', 'Combo 09 Esfihas',
   'Por favor colocar nas observacoes os sabores das 9 esfihas. Sabores: Carne, Queijo, Mucarela, Zaatar, Coalhada Seca, Espinafre, ou qualquer sabor mais queijo.',
   80.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/11083901/picture/medium/260329141121',
   4),

  ('Combos', 'Combo Esfihas e Kibes',
   'O famoso Combo casa do sheik: 04 Esfihas de Mucarela, 04 Esfihas de Carne e 02 Kibes a escolha.',
   90.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/11087789/picture/medium/260329141218',
   5),

  ('Saladas Arabe', 'Tabule',
   'Salada tradicional arabe, feita com temperos arabes originais.',
   30.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/11032814/picture/medium/260329141833',
   1),

  ('Porcoes Extras', 'Arroz Sirio',
   'Porcao de 300gr.',
   10.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/11033018/picture/medium/260329141938',
   1),

  ('Porcoes Extras', 'Pao Arabe Original Casa do Sheik',
   'Porcao de 4 Fatias de Pao Arabe.',
   5.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/11033062/picture/medium/260329142024',
   2),

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

  ('Porcao', 'Batata Frita 500g',
   'Sequinha e crocante, acompanha molho de alho.',
   30.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/10989875/picture/medium/260210231319',
   1),

  ('Porcao', 'Falafel',
   'Porcao com 8 unidades de bolinhos de grao de bico temperado com especiarias.',
   30.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/11523666/picture/medium/250215165033',
   2),

  ('Porcao', 'Peixe Frito',
   'Acompanha salada, batata frita e molho de alho.',
   60.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/10989898/picture/medium/240709213303',
   3),

  ('Porcao', 'Mafufo Folha de Uva',
   'Porcao com 400g.',
   40.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/11523829/picture/medium/260123162706',
   4),

  ('Porcao', 'Mafufo',
   'Porcao com 400g.',
   35.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/10989918/picture/medium/250828184307',
   5),

  ('Refrigerantes 600ml', 'Coca-Cola 600ml',
   'Geladinha.',
   8.00,
   null,
   1),

  ('Refrigerantes 600ml', 'Guarana 600ml',
   'Mineiro ou Antartica, geladinho.',
   8.00,
   null,
   2),

  ('Refrigerantes 1,5L', 'Coca-Cola 1,5L',
   'Geladinha.',
   12.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/10639320/picture/medium/250801163350',
   1),

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

  ('Cerveja 600ml', 'Heineken 600ml',
   'Para consumir no local. Nao fazemos entregas de bebidas alcoolicas.',
   15.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/12067019/picture/medium/250803000622',
   1),

  ('Cerveja 600ml', 'Budweiser 600ml',
   'Consumir apenas no estabelecimento. Nao fazemos entregas.',
   15.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/12067024/picture/medium/260329142721',
   2),

  ('Cerveja 600ml', 'Stella Artois 600ml',
   'Consumir apenas no local. Nao entregamos.',
   15.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/12067029/picture/medium/250803001531',
   3),

  ('Cerveja 600ml', 'Original 600ml',
   'Consumir no local. Nao entregamos.',
   15.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/12068251/picture/medium/260329142734',
   4),

  ('Cerveja 600ml', 'Amstel 600ml',
   'Consumir no local. Nao entregamos.',
   15.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/12068253/picture/medium/260329142749',
   5),

  ('Cerveja Long Neck', 'Budweiser Long Neck',
   'Consumir no local. Nao entregamos.',
   8.00,
   'https://www.goomer.app/webmenu/casa-do-sheik-3/product/12402551/picture/medium/251226131009',
   1),

  ('Cerveja Long Neck', 'Heineken Long Neck',
   null,
   10.00,
   null,
   2),

  ('Cerveja Long Neck', 'Amstel Long Neck',
   'Consumir no local. Nao entregamos.',
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
  select 1
  from produtos existente
  where existente.nome = p.nome
    and existente.categoria_id = c.id
    and existente.deleted_at is null
);

-- -----------------------------------------------------------------------------
-- USUARIO ADMIN SUPABASE AUTH
-- Login: casadosheik@gmail.com
-- Senha: casadosheik!
-- -----------------------------------------------------------------------------

do $$
declare
  admin_email text := 'casadosheik@gmail.com';
  admin_password text := 'casadosheik!';
  admin_user_id uuid;
begin
  select id
  into admin_user_id
  from auth.users
  where email = admin_email
  limit 1;

  if admin_user_id is null then
    admin_user_id := gen_random_uuid();

    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      invited_at,
      confirmation_sent_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      created_at,
      updated_at,
      last_sign_in_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    values (
      '00000000-0000-0000-0000-000000000000',
      admin_user_id,
      'authenticated',
      'authenticated',
      admin_email,
      crypt(admin_password, gen_salt('bf')),
      now(),
      now(),
      now(),
      jsonb_build_object('provider', 'email', 'providers', array['email'], 'role', 'admin'),
      jsonb_build_object('role', 'admin', 'display_name', 'Casa do Sheik'),
      false,
      now(),
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
  else
    update auth.users
    set
      encrypted_password = crypt(admin_password, gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      raw_app_meta_data = jsonb_build_object('provider', 'email', 'providers', array['email'], 'role', 'admin'),
      raw_user_meta_data = jsonb_build_object('role', 'admin', 'display_name', 'Casa do Sheik'),
      updated_at = now()
    where id = admin_user_id;
  end if;

  if not exists (
    select 1
    from auth.identities
    where user_id = admin_user_id
      and provider = 'email'
  ) then
    insert into auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    )
    values (
      gen_random_uuid(),
      admin_user_id,
      jsonb_build_object('sub', admin_user_id::text, 'email', admin_email, 'email_verified', true, 'phone_verified', false),
      'email',
      admin_user_id::text,
      now(),
      now(),
      now()
    );
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- VALIDACAO FINAL
-- -----------------------------------------------------------------------------

select
  count(*) as total_categorias_ativas
from categorias
where ativa = true
  and deleted_at is null;

select
  count(*) as total_produtos_ativos
from produtos
where disponivel = true
  and deleted_at is null;

select
  count(*) as produtos_sem_categoria
from produtos p
left join categorias c on c.id = p.categoria_id
where p.deleted_at is null
  and (p.categoria_id is null or c.id is null or c.deleted_at is not null);

select
  count(*) as produtos_com_preco_nulo
from produtos
where deleted_at is null
  and preco is null;

select
  u.id,
  u.email,
  u.email_confirmed_at is not null as email_confirmado,
  exists (
    select 1
    from auth.identities i
    where i.user_id = u.id
      and i.provider = 'email'
  ) as identidade_email_criada
from auth.users u
where u.email = 'casadosheik@gmail.com';
