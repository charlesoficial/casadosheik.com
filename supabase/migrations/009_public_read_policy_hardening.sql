-- Endurece policies publicas para evitar exposicao anonima de registros
-- inativos, indisponiveis ou removidos por soft delete.

drop policy if exists "categorias_select_public" on public.categorias;
create policy "categorias_select_public"
on public.categorias
for select
to public
using (ativa = true and deleted_at is null);

drop policy if exists "categorias_select_authenticated" on public.categorias;
create policy "categorias_select_authenticated"
on public.categorias
for select
to authenticated
using (auth.uid() is not null);

drop policy if exists "produtos_select_public" on public.produtos;
create policy "produtos_select_public"
on public.produtos
for select
to public
using (disponivel = true and deleted_at is null);

drop policy if exists "produtos_select_authenticated" on public.produtos;
create policy "produtos_select_authenticated"
on public.produtos
for select
to authenticated
using (auth.uid() is not null);

drop policy if exists "mesas_select_public" on public.mesas;
create policy "mesas_select_public"
on public.mesas
for select
to public
using (ativa = true);

drop policy if exists "mesas_select_authenticated" on public.mesas;
create policy "mesas_select_authenticated"
on public.mesas
for select
to authenticated
using (auth.uid() is not null);
