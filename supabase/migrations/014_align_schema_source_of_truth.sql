-- Align production database with supabase/schema.sql source of truth.
-- No operational data is deleted here.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.fn_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_record_id uuid;
  v_before    jsonb;
  v_after     jsonb;
  v_user_id   uuid;
  v_user_email text;
  v_ip        inet;
begin
  if TG_OP = 'DELETE' then
    v_record_id := OLD.id;
    v_before    := row_to_json(OLD)::jsonb;
    v_after     := null;
  elsif TG_OP = 'INSERT' then
    v_record_id := NEW.id;
    v_before    := null;
    v_after     := row_to_json(NEW)::jsonb;
  else
    v_record_id := NEW.id;
    v_before    := row_to_json(OLD)::jsonb;
    v_after     := row_to_json(NEW)::jsonb;
  end if;

  begin
    v_user_id    := (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid;
    v_user_email := current_setting('request.jwt.claims', true)::jsonb ->> 'email';
  exception
    when others then
      v_user_id    := null;
      v_user_email := null;
  end;

  begin
    v_ip := (current_setting('request.headers', true)::jsonb ->> 'x-forwarded-for')::inet;
  exception
    when others then
      v_ip := null;
  end;

  begin
    insert into public.audit_log(tabela, operacao, registro_id, dados_antes, dados_depois, usuario_id, usuario_email, ip_address)
    values (TG_TABLE_NAME, TG_OP, v_record_id, v_before, v_after, v_user_id, v_user_email, v_ip);
  exception
    when others then null;
  end;

  if TG_OP = 'DELETE' then return OLD; end if;
  return NEW;
end;
$$;

create or replace function public.fn_cleanup_print_jobs(retention_days integer default 90)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_deleted integer;
begin
  delete from public.print_jobs
  where status in ('success', 'failed')
    and created_at < now() - (retention_days || ' days')::interval;
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

drop index if exists public.idx_mesa_contas_pedido_ids_gin;
create index idx_mesa_contas_pedido_ids_gin on public.mesa_contas using gin (pedido_ids);

drop policy if exists "restaurante_config_manage_admin" on public.restaurante_config;
drop policy if exists "restaurante_config_manage_authenticated" on public.restaurante_config;
drop policy if exists "restaurante_config_select_public" on public.restaurante_config;
drop policy if exists "restaurante_config_insert_authenticated" on public.restaurante_config;
drop policy if exists "restaurante_config_update_authenticated" on public.restaurante_config;
drop policy if exists "restaurante_config_delete_authenticated" on public.restaurante_config;
create policy "restaurante_config_select_public" on public.restaurante_config
for select to anon using (true);
create policy "restaurante_config_insert_authenticated" on public.restaurante_config
for insert to authenticated with check (auth.uid() is not null);
create policy "restaurante_config_update_authenticated" on public.restaurante_config
for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "restaurante_config_delete_authenticated" on public.restaurante_config
for delete to authenticated using (auth.uid() is not null);

drop policy if exists "categorias_manage_admin" on public.categorias;
drop policy if exists "categorias_select_admin" on public.categorias;
drop policy if exists "categorias_manage_authenticated" on public.categorias;
drop policy if exists "categorias_select_public" on public.categorias;
drop policy if exists "categorias_select_authenticated" on public.categorias;
drop policy if exists "categorias_insert_authenticated" on public.categorias;
drop policy if exists "categorias_update_authenticated" on public.categorias;
drop policy if exists "categorias_delete_authenticated" on public.categorias;
create policy "categorias_select_public" on public.categorias
for select to anon using (ativa = true and deleted_at is null);
create policy "categorias_select_authenticated" on public.categorias
for select to authenticated using (auth.uid() is not null);
create policy "categorias_insert_authenticated" on public.categorias
for insert to authenticated with check (auth.uid() is not null);
create policy "categorias_update_authenticated" on public.categorias
for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "categorias_delete_authenticated" on public.categorias
for delete to authenticated using (auth.uid() is not null);

drop policy if exists "produtos_manage_admin" on public.produtos;
drop policy if exists "produtos_select_admin" on public.produtos;
drop policy if exists "produtos_manage_authenticated" on public.produtos;
drop policy if exists "produtos_select_public" on public.produtos;
drop policy if exists "produtos_select_authenticated" on public.produtos;
drop policy if exists "produtos_insert_authenticated" on public.produtos;
drop policy if exists "produtos_update_authenticated" on public.produtos;
drop policy if exists "produtos_delete_authenticated" on public.produtos;
create policy "produtos_select_public" on public.produtos
for select to anon using (disponivel = true and deleted_at is null);
create policy "produtos_select_authenticated" on public.produtos
for select to authenticated using (auth.uid() is not null);
create policy "produtos_insert_authenticated" on public.produtos
for insert to authenticated with check (auth.uid() is not null);
create policy "produtos_update_authenticated" on public.produtos
for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "produtos_delete_authenticated" on public.produtos
for delete to authenticated using (auth.uid() is not null);

drop policy if exists "pedidos_manage_admin" on public.pedidos;
drop policy if exists "pedidos_manage_authenticated" on public.pedidos;
drop policy if exists "pedidos_select_authenticated" on public.pedidos;
drop policy if exists "pedidos_insert_authenticated" on public.pedidos;
drop policy if exists "pedidos_update_authenticated" on public.pedidos;
drop policy if exists "pedidos_delete_authenticated" on public.pedidos;
create policy "pedidos_select_authenticated" on public.pedidos
for select to authenticated using (auth.uid() is not null);
create policy "pedidos_insert_authenticated" on public.pedidos
for insert to authenticated with check (auth.uid() is not null);
create policy "pedidos_update_authenticated" on public.pedidos
for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "pedidos_delete_authenticated" on public.pedidos
for delete to authenticated using (auth.uid() is not null);

drop policy if exists "pedido_itens_manage_admin" on public.pedido_itens;
drop policy if exists "pedido_itens_manage_authenticated" on public.pedido_itens;
drop policy if exists "pedido_itens_select_authenticated" on public.pedido_itens;
drop policy if exists "pedido_itens_insert_authenticated" on public.pedido_itens;
drop policy if exists "pedido_itens_update_authenticated" on public.pedido_itens;
drop policy if exists "pedido_itens_delete_authenticated" on public.pedido_itens;
create policy "pedido_itens_select_authenticated" on public.pedido_itens
for select to authenticated using (auth.uid() is not null);
create policy "pedido_itens_insert_authenticated" on public.pedido_itens
for insert to authenticated with check (auth.uid() is not null);
create policy "pedido_itens_update_authenticated" on public.pedido_itens
for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "pedido_itens_delete_authenticated" on public.pedido_itens
for delete to authenticated using (auth.uid() is not null);

drop policy if exists "mesas_manage_admin" on public.mesas;
drop policy if exists "mesas_select_admin" on public.mesas;
drop policy if exists "mesas_manage_authenticated" on public.mesas;
drop policy if exists "mesas_select_public" on public.mesas;
drop policy if exists "mesas_select_authenticated" on public.mesas;
drop policy if exists "mesas_insert_authenticated" on public.mesas;
drop policy if exists "mesas_update_authenticated" on public.mesas;
drop policy if exists "mesas_delete_authenticated" on public.mesas;
create policy "mesas_select_public" on public.mesas
for select to anon using (ativa = true);
create policy "mesas_select_authenticated" on public.mesas
for select to authenticated using (auth.uid() is not null);
create policy "mesas_insert_authenticated" on public.mesas
for insert to authenticated with check (auth.uid() is not null);
create policy "mesas_update_authenticated" on public.mesas
for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "mesas_delete_authenticated" on public.mesas
for delete to authenticated using (auth.uid() is not null);

drop policy if exists "mesa_contas_manage_admin" on public.mesa_contas;
drop policy if exists "mesa_contas_manage_authenticated" on public.mesa_contas;
drop policy if exists "mesa_contas_select_authenticated" on public.mesa_contas;
drop policy if exists "mesa_contas_insert_authenticated" on public.mesa_contas;
drop policy if exists "mesa_contas_update_authenticated" on public.mesa_contas;
drop policy if exists "mesa_contas_delete_authenticated" on public.mesa_contas;
create policy "mesa_contas_select_authenticated" on public.mesa_contas
for select to authenticated using (auth.uid() is not null);
create policy "mesa_contas_insert_authenticated" on public.mesa_contas
for insert to authenticated with check (auth.uid() is not null);
create policy "mesa_contas_update_authenticated" on public.mesa_contas
for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "mesa_contas_delete_authenticated" on public.mesa_contas
for delete to authenticated using (auth.uid() is not null);

drop policy if exists "caixa_fechamentos_manage_admin" on public.caixa_fechamentos;
drop policy if exists "caixa_fechamentos_manage_authenticated" on public.caixa_fechamentos;
drop policy if exists "caixa_fechamentos_select_authenticated" on public.caixa_fechamentos;
drop policy if exists "caixa_fechamentos_insert_authenticated" on public.caixa_fechamentos;
drop policy if exists "caixa_fechamentos_update_authenticated" on public.caixa_fechamentos;
drop policy if exists "caixa_fechamentos_delete_authenticated" on public.caixa_fechamentos;
create policy "caixa_fechamentos_select_authenticated" on public.caixa_fechamentos
for select to authenticated using (auth.uid() is not null);
create policy "caixa_fechamentos_insert_authenticated" on public.caixa_fechamentos
for insert to authenticated with check (auth.uid() is not null);
create policy "caixa_fechamentos_update_authenticated" on public.caixa_fechamentos
for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "caixa_fechamentos_delete_authenticated" on public.caixa_fechamentos
for delete to authenticated using (auth.uid() is not null);

drop policy if exists "caixa_movimentacoes_manage_admin" on public.caixa_movimentacoes;
drop policy if exists "caixa_movimentacoes_manage_authenticated" on public.caixa_movimentacoes;
drop policy if exists "caixa_movimentacoes_select_authenticated" on public.caixa_movimentacoes;
drop policy if exists "caixa_movimentacoes_insert_authenticated" on public.caixa_movimentacoes;
drop policy if exists "caixa_movimentacoes_update_authenticated" on public.caixa_movimentacoes;
drop policy if exists "caixa_movimentacoes_delete_authenticated" on public.caixa_movimentacoes;
create policy "caixa_movimentacoes_select_authenticated" on public.caixa_movimentacoes
for select to authenticated using (auth.uid() is not null);
create policy "caixa_movimentacoes_insert_authenticated" on public.caixa_movimentacoes
for insert to authenticated with check (auth.uid() is not null);
create policy "caixa_movimentacoes_update_authenticated" on public.caixa_movimentacoes
for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "caixa_movimentacoes_delete_authenticated" on public.caixa_movimentacoes
for delete to authenticated using (auth.uid() is not null);

drop policy if exists "printers_manage_admin" on public.printers;
drop policy if exists "printers_manage_authenticated" on public.printers;
drop policy if exists "printers_select_authenticated" on public.printers;
drop policy if exists "printers_insert_authenticated" on public.printers;
drop policy if exists "printers_update_authenticated" on public.printers;
drop policy if exists "printers_delete_authenticated" on public.printers;
create policy "printers_select_authenticated" on public.printers
for select to authenticated using (auth.uid() is not null);
create policy "printers_insert_authenticated" on public.printers
for insert to authenticated with check (auth.uid() is not null);
create policy "printers_update_authenticated" on public.printers
for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "printers_delete_authenticated" on public.printers
for delete to authenticated using (auth.uid() is not null);

drop policy if exists "order_settings_manage_admin" on public.order_settings;
drop policy if exists "order_settings_manage_authenticated" on public.order_settings;
drop policy if exists "order_settings_select_authenticated" on public.order_settings;
drop policy if exists "order_settings_insert_authenticated" on public.order_settings;
drop policy if exists "order_settings_update_authenticated" on public.order_settings;
drop policy if exists "order_settings_delete_authenticated" on public.order_settings;
create policy "order_settings_select_authenticated" on public.order_settings
for select to authenticated using (auth.uid() is not null);
create policy "order_settings_insert_authenticated" on public.order_settings
for insert to authenticated with check (auth.uid() is not null);
create policy "order_settings_update_authenticated" on public.order_settings
for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "order_settings_delete_authenticated" on public.order_settings
for delete to authenticated using (auth.uid() is not null);

drop policy if exists "print_jobs_manage_admin" on public.print_jobs;
drop policy if exists "print_jobs_manage_authenticated" on public.print_jobs;
drop policy if exists "print_jobs_select_authenticated" on public.print_jobs;
drop policy if exists "print_jobs_insert_authenticated" on public.print_jobs;
drop policy if exists "print_jobs_update_authenticated" on public.print_jobs;
drop policy if exists "print_jobs_delete_authenticated" on public.print_jobs;
create policy "print_jobs_select_authenticated" on public.print_jobs
for select to authenticated using (auth.uid() is not null);
create policy "print_jobs_insert_authenticated" on public.print_jobs
for insert to authenticated with check (auth.uid() is not null);
create policy "print_jobs_update_authenticated" on public.print_jobs
for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "print_jobs_delete_authenticated" on public.print_jobs
for delete to authenticated using (auth.uid() is not null);

drop policy if exists "audit_log_manage_admin" on public.audit_log;
drop policy if exists "audit_log_manage_authenticated" on public.audit_log;
drop policy if exists "audit_log_select_authenticated" on public.audit_log;
drop policy if exists "audit_log_insert_authenticated" on public.audit_log;
create policy "audit_log_select_authenticated" on public.audit_log
for select to authenticated using (auth.uid() is not null);
create policy "audit_log_insert_authenticated" on public.audit_log
for insert to authenticated with check (auth.uid() is not null);
