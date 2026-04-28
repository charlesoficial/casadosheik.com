alter table categorias enable row level security;
alter table produtos enable row level security;

create policy "categorias_select_public"
on categorias
for select
to public
using (ativa = true and deleted_at is null);

create policy "categorias_select_authenticated"
on categorias
for select
to authenticated
using (auth.uid() is not null);

create policy "categorias_manage_authenticated"
on categorias
for all
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

create policy "produtos_select_public"
on produtos
for select
to public
using (disponivel = true and deleted_at is null);

create policy "produtos_select_authenticated"
on produtos
for select
to authenticated
using (auth.uid() is not null);

create policy "produtos_manage_authenticated"
on produtos
for all
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);
