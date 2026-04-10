-- Produtos iniciais do catálogo, com foco em vitrine funcional para demo e implantação.
insert into produtos (categoria_id, nome, descricao, preco, foto_url, disponivel, destaque, ordem)
select c.id, p.nome, p.descricao, p.preco, p.foto_url, p.disponivel, p.destaque, p.ordem
from (
  values
    ('Almoco arabe', 'Prato Kafta Arabe', 'Duas kaftas, arroz sirio, hommus e salada fattoush.', 60.00, 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80', true, true, 1),
    ('Almoco arabe', 'Prato Shish Tawook', 'Espetos de tawook, arroz sirio e babaganoush.', 56.00, 'https://images.unsplash.com/photo-1514326640560-7d063ef2aed5?auto=format&fit=crop&w=900&q=80', true, false, 2),
    ('Almoco arabe', 'Prato Falafel', 'Bolinho de grao-de-bico, arroz sirio, hommus e salada fresca.', 52.00, 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80', true, false, 3),
    ('Almoco arabe', 'Prato Misto do Sheik', 'Kafta, tawook, arroz sirio, batata e pasta da casa.', 68.00, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80', true, true, 4),
    ('Pastas', 'Hommus Tradicional', 'Pasta de grao-de-bico com tahine, azeite e pao arabe.', 24.00, 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80', true, false, 1),
    ('Pastas', 'Babaganoush', 'Pasta defumada de berinjela com tahine, azeite e pao arabe.', 26.00, 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80', true, false, 2),
    ('Pastas', 'Coalhada Seca', 'Coalhada seca temperada com azeite, zaatar e pao arabe.', 22.00, 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80', true, false, 3),
    ('Pastas', 'Trio de Pastas', 'Hommus, babaganoush e coalhada seca servidos com pao arabe.', 39.00, 'https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?auto=format&fit=crop&w=900&q=80', true, true, 4),
    ('Esfihas', 'Esfiha de Carne', 'Esfiha aberta com carne temperada e toque de limao.', 9.50, 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80', true, false, 1),
    ('Esfihas', 'Esfiha de Queijo', 'Esfiha aberta com mussarela, tomate e oregano.', 9.50, 'https://images.unsplash.com/photo-1601924582970-9238bcb495d9?auto=format&fit=crop&w=900&q=80', true, false, 2),
    ('Esfihas', 'Esfiha de Zaatar', 'Esfiha aberta com zaatar, azeite e toque citrico.', 8.50, 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=900&q=80', true, false, 3),
    ('Esfihas', 'Esfiha de Frango', 'Esfiha aberta de frango desfiado com tempero arabe.', 9.50, 'https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?auto=format&fit=crop&w=900&q=80', true, false, 4),
    ('Shawarmas', 'Shawarma de Frango', 'Frango marinado, picles, alho cremoso e fritas.', 31.00, 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=900&q=80', true, false, 1),
    ('Shawarmas', 'Shawarma de Carne', 'Carne temperada, tahine, picles e fritas crocantes.', 34.00, 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=900&q=80', true, false, 2),
    ('Shawarmas', 'Shawarma Misto', 'Frango com carne, molho especial e fritas.', 36.00, 'https://images.unsplash.com/photo-1520072959219-c595dc870360?auto=format&fit=crop&w=900&q=80', true, true, 3),
    ('Kibe Cru', 'Kibe Cru Tradicional', 'Kibe cru temperado com trigo fino, cebola e hortela.', 32.00, 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=80', true, false, 1),
    ('Kibe Cru', 'Kibe Cru Especial', 'Kibe cru com azeite, pimenta siria e acompanhamento de pao arabe.', 39.00, 'https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=900&q=80', true, true, 2),
    ('Combos', 'Combo Sheik', '2 shawarmas, 2 refrigerantes e porcao de fritas.', 74.00, 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&w=900&q=80', true, false, 1),
    ('Combos', 'Combo Familia Arabe', 'Prato misto, trio de pastas, 4 esfihas e 1 refrigerante 2L.', 138.00, 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=900&q=80', true, true, 2),
    ('Combos', 'Combo Casal Shawarma', '2 shawarmas mistos, fritas e 2 bebidas.', 82.00, 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&w=900&q=80', true, false, 3),
    ('Saladas', 'Fattoush', 'Mix de folhas, tomate, pepino, sumac e torradas de pao.', 28.00, 'https://images.unsplash.com/photo-1546793665-c74683f339c1?auto=format&fit=crop&w=900&q=80', true, false, 1),
    ('Saladas', 'Tabule', 'Triguilho fino, salsinha, tomate, hortela e limao.', 24.00, 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80', true, false, 2),
    ('Saladas', 'Salada do Sheik', 'Folhas, pepino, tomate, queijo e molho da casa.', 29.00, 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=900&q=80', true, false, 3),
    ('Porcoes', 'Kibe Frito', 'Porcao com 8 unidades de kibe dourado e limao.', 34.00, 'https://images.unsplash.com/photo-1604909052743-94e838986d24?auto=format&fit=crop&w=900&q=80', true, false, 1),
    ('Porcoes', 'Batata Frita', 'Porcao de batata frita sequinha com molho da casa.', 24.00, 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=900&q=80', true, false, 2),
    ('Porcoes', 'Pao Arabe Extra', 'Cesta com paes arabes quentinhos.', 12.00, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=80', true, false, 3),
    ('Porcoes', 'Molho de Alho Extra', 'Porcao extra do creme de alho tradicional da casa.', 7.00, 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=900&q=80', true, false, 4),
    ('Bebidas', 'Refrigerante 600ml', 'Coca-Cola, Guarana Antarctica ou Soda.', 8.00, 'https://images.unsplash.com/photo-1622484212850-eb596d769edc?auto=format&fit=crop&w=900&q=80', true, false, 1),
    ('Bebidas', 'Agua Mineral 500ml', 'Agua mineral sem gas.', 5.00, 'https://images.unsplash.com/photo-1622484212850-eb596d769edc?auto=format&fit=crop&w=900&q=80', true, false, 2),
    ('Bebidas', 'Suco Natural', 'Sabores limao, abacaxi ou maracuja.', 11.00, 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=900&q=80', true, false, 3),
    ('Bebidas', 'Cha Gelado da Casa', 'Cha gelado artesanal com limao e hortela.', 9.00, 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=900&q=80', true, false, 4)
) as p(categoria_nome, nome, descricao, preco, foto_url, disponivel, destaque, ordem)
join categorias c on c.nome = p.categoria_nome
where not exists (
  select 1
  from produtos existing
  where existing.nome = p.nome
);
