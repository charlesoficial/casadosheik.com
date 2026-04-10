-- Endurece o acesso a pedidos removendo grants/policies anonimas diretas.
-- O acompanhamento publico passa a depender da API server-side com token assinado.

revoke select, insert on pedidos from anon;
revoke select, insert on pedido_itens from anon;

drop policy if exists "pedidos_select_public" on pedidos;
drop policy if exists "pedidos_insert_public" on pedidos;
drop policy if exists "pedido_itens_select_public" on pedido_itens;
drop policy if exists "pedido_itens_insert_public" on pedido_itens;
