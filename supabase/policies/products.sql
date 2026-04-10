alter table categorias enable row level security;
alter table produtos enable row level security;

create policy "categorias_select_public"
on categorias
for select
using (true);

create policy "categorias_manage_authenticated"
on categorias
for all
to authenticated
using (true)
with check (true);

create policy "produtos_select_public"
on produtos
for select
using (true);

create policy "produtos_manage_authenticated"
on produtos
for all
to authenticated
using (true)
with check (true);
