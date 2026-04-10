-- IMPORTANTE: a coluna correta em restaurante_config e `formas_pagamento`.
-- Nao usar `formas_pagaamento`.

insert into restaurante_config (
  id,
  nome,
  descricao,
  endereco,
  telefone,
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
  'Culinaria Arabe',
  'Avenida Vinte de Agosto, 2190 - Setor Central, Catalao - GO',
  '(64) 99999-0000',
  '/logo.png',
  20,
  0,
  120,
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
  logo_url = excluded.logo_url,
  pedido_minimo = excluded.pedido_minimo,
  taxa_entrega = excluded.taxa_entrega,
  entrega_gratis_acima = excluded.entrega_gratis_acima,
  tempo_entrega_min = excluded.tempo_entrega_min,
  tempo_retirada_min = excluded.tempo_retirada_min,
  aberto = excluded.aberto,
  horarios = excluded.horarios,
  formas_pagamento = excluded.formas_pagamento,
  mensagem_boas_vindas = excluded.mensagem_boas_vindas;
