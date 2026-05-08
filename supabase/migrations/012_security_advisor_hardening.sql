-- Security/performance hardening from Supabase advisors.
-- No data is deleted. This only narrows function EXECUTE grants and RLS policy roles.

create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin';
$$;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_admin() to service_role;

revoke execute on function public.fn_audit_log() from public;
revoke execute on function public.fn_audit_log() from anon;
revoke execute on function public.fn_audit_log() from authenticated;
grant execute on function public.fn_audit_log() to service_role;

revoke execute on function public.fn_cleanup_print_jobs(integer) from public;
revoke execute on function public.fn_cleanup_print_jobs(integer) from anon;
revoke execute on function public.fn_cleanup_print_jobs(integer) from authenticated;
grant execute on function public.fn_cleanup_print_jobs(integer) to service_role;

-- Public buckets do not need a broad SELECT policy for public object URLs.
drop policy if exists "produtos_public_read" on storage.objects;

-- Public storefront reads are for anon clients. Admin authenticated users are
-- covered by *_manage_admin policies, so avoid duplicate permissive SELECTs.
drop policy if exists "restaurante_config_select_public" on public.restaurante_config;
create policy "restaurante_config_select_public"
on public.restaurante_config
for select
to anon
using (true);

drop policy if exists "categorias_select_public" on public.categorias;
create policy "categorias_select_public"
on public.categorias
for select
to anon
using (ativa = true and deleted_at is null);

drop policy if exists "produtos_select_public" on public.produtos;
create policy "produtos_select_public"
on public.produtos
for select
to anon
using (disponivel = true and deleted_at is null);

drop policy if exists "mesas_select_public" on public.mesas;
create policy "mesas_select_public"
on public.mesas
for select
to anon
using (ativa = true);

drop policy if exists "categorias_select_admin" on public.categorias;
drop policy if exists "produtos_select_admin" on public.produtos;
drop policy if exists "mesas_select_admin" on public.mesas;
