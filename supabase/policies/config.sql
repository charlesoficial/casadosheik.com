alter table restaurante_config enable row level security;
alter table mesas enable row level security;
alter table mesa_contas enable row level security;
alter table caixa_fechamentos enable row level security;
alter table caixa_movimentacoes enable row level security;
alter table printers enable row level security;
alter table order_settings enable row level security;
alter table print_jobs enable row level security;

create policy "restaurante_config_select_public"
on restaurante_config
for select
using (true);

create policy "restaurante_config_manage_authenticated"
on restaurante_config
for all
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

create policy "mesas_select_public"
on mesas
for select
to public
using (ativa = true);

create policy "mesas_select_authenticated"
on mesas
for select
to authenticated
using (auth.uid() is not null);

create policy "mesas_manage_authenticated"
on mesas
for all
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

create policy "mesa_contas_manage_authenticated"
on mesa_contas
for all
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

create policy "caixa_fechamentos_manage_authenticated"
on caixa_fechamentos
for all
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

create policy "caixa_movimentacoes_manage_authenticated"
on caixa_movimentacoes
for all
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

create policy "printers_manage_authenticated"
on printers
for all
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

create policy "order_settings_manage_authenticated"
on order_settings
for all
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

create policy "print_jobs_manage_authenticated"
on print_jobs
for all
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);
