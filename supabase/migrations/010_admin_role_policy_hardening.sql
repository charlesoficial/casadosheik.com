-- Restrict operational/admin data access to users explicitly marked as admin.
-- Safe for existing production data: no table/data deletion, only RLS policy changes.

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin';
$$;

drop policy if exists "audit_log_select_authenticated" on public.audit_log;
drop policy if exists "audit_log_insert_authenticated" on public.audit_log;
drop policy if exists "audit_log_manage_admin" on public.audit_log;
create policy "audit_log_manage_admin"
on public.audit_log
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "categorias_select_authenticated" on public.categorias;
drop policy if exists "categorias_manage_authenticated" on public.categorias;
drop policy if exists "categorias_insert_authenticated" on public.categorias;
drop policy if exists "categorias_update_authenticated" on public.categorias;
drop policy if exists "categorias_delete_authenticated" on public.categorias;
drop policy if exists "categorias_select_admin" on public.categorias;
drop policy if exists "categorias_manage_admin" on public.categorias;
create policy "categorias_select_admin"
on public.categorias
for select
to authenticated
using (public.is_admin());
create policy "categorias_manage_admin"
on public.categorias
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "produtos_select_authenticated" on public.produtos;
drop policy if exists "produtos_manage_authenticated" on public.produtos;
drop policy if exists "produtos_insert_authenticated" on public.produtos;
drop policy if exists "produtos_update_authenticated" on public.produtos;
drop policy if exists "produtos_delete_authenticated" on public.produtos;
drop policy if exists "produtos_select_admin" on public.produtos;
drop policy if exists "produtos_manage_admin" on public.produtos;
create policy "produtos_select_admin"
on public.produtos
for select
to authenticated
using (public.is_admin());
create policy "produtos_manage_admin"
on public.produtos
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "pedidos_manage_authenticated" on public.pedidos;
drop policy if exists "pedidos_select_authenticated" on public.pedidos;
drop policy if exists "pedidos_insert_authenticated" on public.pedidos;
drop policy if exists "pedidos_update_authenticated" on public.pedidos;
drop policy if exists "pedidos_delete_authenticated" on public.pedidos;
drop policy if exists "pedidos_manage_admin" on public.pedidos;
create policy "pedidos_manage_admin"
on public.pedidos
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "pedido_itens_manage_authenticated" on public.pedido_itens;
drop policy if exists "pedido_itens_select_authenticated" on public.pedido_itens;
drop policy if exists "pedido_itens_insert_authenticated" on public.pedido_itens;
drop policy if exists "pedido_itens_update_authenticated" on public.pedido_itens;
drop policy if exists "pedido_itens_delete_authenticated" on public.pedido_itens;
drop policy if exists "pedido_itens_manage_admin" on public.pedido_itens;
create policy "pedido_itens_manage_admin"
on public.pedido_itens
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "restaurante_config_manage_authenticated" on public.restaurante_config;
drop policy if exists "restaurante_config_select_authenticated" on public.restaurante_config;
drop policy if exists "restaurante_config_insert_authenticated" on public.restaurante_config;
drop policy if exists "restaurante_config_update_authenticated" on public.restaurante_config;
drop policy if exists "restaurante_config_delete_authenticated" on public.restaurante_config;
drop policy if exists "restaurante_config_manage_admin" on public.restaurante_config;
create policy "restaurante_config_manage_admin"
on public.restaurante_config
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "mesas_select_authenticated" on public.mesas;
drop policy if exists "mesas_manage_authenticated" on public.mesas;
drop policy if exists "mesas_insert_authenticated" on public.mesas;
drop policy if exists "mesas_update_authenticated" on public.mesas;
drop policy if exists "mesas_delete_authenticated" on public.mesas;
drop policy if exists "mesas_select_admin" on public.mesas;
drop policy if exists "mesas_manage_admin" on public.mesas;
create policy "mesas_select_admin"
on public.mesas
for select
to authenticated
using (public.is_admin());
create policy "mesas_manage_admin"
on public.mesas
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "mesa_contas_manage_authenticated" on public.mesa_contas;
drop policy if exists "mesa_contas_select_authenticated" on public.mesa_contas;
drop policy if exists "mesa_contas_insert_authenticated" on public.mesa_contas;
drop policy if exists "mesa_contas_update_authenticated" on public.mesa_contas;
drop policy if exists "mesa_contas_delete_authenticated" on public.mesa_contas;
drop policy if exists "mesa_contas_manage_admin" on public.mesa_contas;
create policy "mesa_contas_manage_admin"
on public.mesa_contas
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "caixa_fechamentos_manage_authenticated" on public.caixa_fechamentos;
drop policy if exists "caixa_fechamentos_select_authenticated" on public.caixa_fechamentos;
drop policy if exists "caixa_fechamentos_insert_authenticated" on public.caixa_fechamentos;
drop policy if exists "caixa_fechamentos_update_authenticated" on public.caixa_fechamentos;
drop policy if exists "caixa_fechamentos_delete_authenticated" on public.caixa_fechamentos;
drop policy if exists "caixa_fechamentos_manage_admin" on public.caixa_fechamentos;
create policy "caixa_fechamentos_manage_admin"
on public.caixa_fechamentos
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "caixa_movimentacoes_manage_authenticated" on public.caixa_movimentacoes;
drop policy if exists "caixa_movimentacoes_select_authenticated" on public.caixa_movimentacoes;
drop policy if exists "caixa_movimentacoes_insert_authenticated" on public.caixa_movimentacoes;
drop policy if exists "caixa_movimentacoes_update_authenticated" on public.caixa_movimentacoes;
drop policy if exists "caixa_movimentacoes_delete_authenticated" on public.caixa_movimentacoes;
drop policy if exists "caixa_movimentacoes_manage_admin" on public.caixa_movimentacoes;
create policy "caixa_movimentacoes_manage_admin"
on public.caixa_movimentacoes
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "printers_manage_authenticated" on public.printers;
drop policy if exists "printers_select_authenticated" on public.printers;
drop policy if exists "printers_insert_authenticated" on public.printers;
drop policy if exists "printers_update_authenticated" on public.printers;
drop policy if exists "printers_delete_authenticated" on public.printers;
drop policy if exists "printers_manage_admin" on public.printers;
create policy "printers_manage_admin"
on public.printers
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "order_settings_manage_authenticated" on public.order_settings;
drop policy if exists "order_settings_select_authenticated" on public.order_settings;
drop policy if exists "order_settings_insert_authenticated" on public.order_settings;
drop policy if exists "order_settings_update_authenticated" on public.order_settings;
drop policy if exists "order_settings_delete_authenticated" on public.order_settings;
drop policy if exists "order_settings_manage_admin" on public.order_settings;
create policy "order_settings_manage_admin"
on public.order_settings
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "print_jobs_manage_authenticated" on public.print_jobs;
drop policy if exists "print_jobs_select_authenticated" on public.print_jobs;
drop policy if exists "print_jobs_insert_authenticated" on public.print_jobs;
drop policy if exists "print_jobs_update_authenticated" on public.print_jobs;
drop policy if exists "print_jobs_delete_authenticated" on public.print_jobs;
drop policy if exists "print_jobs_manage_admin" on public.print_jobs;
create policy "print_jobs_manage_admin"
on public.print_jobs
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
