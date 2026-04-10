-- Categorias iniciais do cardápio. Mantêm o fluxo público utilizável desde o primeiro import.
insert into categorias (nome, ordem, ativa)
values
  ('Almoco arabe', 1, true),
  ('Pastas', 2, true),
  ('Esfihas', 3, true),
  ('Shawarmas', 4, true),
  ('Kibe Cru', 5, true),
  ('Combos', 6, true),
  ('Saladas', 7, true),
  ('Porcoes', 8, true),
  ('Bebidas', 9, true)
on conflict (nome) do update
set
  ordem = excluded.ordem,
  ativa = excluded.ativa;
