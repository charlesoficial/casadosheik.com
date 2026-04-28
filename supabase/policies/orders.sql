alter table pedidos enable row level security;
alter table pedido_itens enable row level security;

create policy "pedidos_manage_authenticated"
on pedidos
for all
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

create policy "pedido_itens_manage_authenticated"
on pedido_itens
for all
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);
