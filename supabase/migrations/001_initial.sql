-- Schema completo do Sistema Restaurante.
-- Este arquivo e o source of truth para reconstrucoes completas do banco.

drop table if exists print_jobs cascade;
drop table if exists order_settings cascade;
drop table if exists printers cascade;
drop table if exists caixa_movimentacoes cascade;
drop table if exists caixa_fechamentos cascade;
drop table if exists mesa_contas cascade;
drop table if exists pedido_itens cascade;
drop table if exists pedidos cascade;
drop table if exists produtos cascade;
drop table if exists categorias cascade;
drop table if exists mesas cascade;
drop table if exists restaurante_config cascade;

drop function if exists set_updated_at() cascade;

drop type if exists print_job_status_enum cascade;
drop type if exists print_trigger_source_enum cascade;
drop type if exists print_transport_type_enum cascade;
drop type if exists printer_destination_enum cascade;
drop type if exists printer_type_enum cascade;
drop type if exists table_account_status_enum cascade;
drop type if exists cash_movement_type_enum cascade;
drop type if exists auto_print_trigger_status_enum cascade;
drop type if exists auto_print_mode_enum cascade;
drop type if exists alert_frequency_enum cascade;
drop type if exists alert_sound_enum cascade;
drop type if exists order_status_enum cascade;
drop type if exists order_kind_enum cascade;

create extension if not exists pgcrypto;

do $$ begin
  create type order_kind_enum as enum ('mesa', 'delivery', 'retirada');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type order_status_enum as enum ('novo', 'aceito', 'preparo', 'pronto', 'concluido', 'cancelado');
exception
  when duplicate_object then null;
end $$;

do $$ begin
create type alert_sound_enum as enum ('Alerta 1', 'Alerta 2', 'Alerta 3', 'Alerta 4', 'Alerta 5', 'Alerta 6', 'Alerta 7', 'Alerta 8');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type alert_frequency_enum as enum ('none', 'once_per_order', 'repeat_while_pending');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type auto_print_mode_enum as enum ('single_printer', 'by_destination');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type auto_print_trigger_status_enum as enum ('novo', 'aceito');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type printer_type_enum as enum ('usb', 'network');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type printer_destination_enum as enum ('caixa', 'cozinha', 'bar', 'delivery', 'geral');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type print_transport_type_enum as enum ('usb', 'network', 'manual');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type print_trigger_source_enum as enum ('test', 'auto_accept', 'manual_reprint');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type print_job_status_enum as enum ('pending', 'success', 'failed');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type table_account_status_enum as enum ('aberta', 'fechada');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type cash_movement_type_enum as enum ('sangria', 'suprimento');
exception
  when duplicate_object then null;
end $$;

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table restaurante_config (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  endereco text,
  telefone text,
  logo_url text,
  pedido_minimo numeric(10,2) not null default 0 check (pedido_minimo >= 0),
  taxa_entrega numeric(10,2) not null default 0 check (taxa_entrega >= 0),
  entrega_gratis_acima numeric(10,2) check (entrega_gratis_acima is null or entrega_gratis_acima >= 0),
  tempo_entrega_min integer check (tempo_entrega_min is null or tempo_entrega_min >= 0),
  tempo_retirada_min integer check (tempo_retirada_min is null or tempo_retirada_min >= 0),
  aberto boolean not null default true,
  horarios jsonb not null default '[]'::jsonb,
  formas_pagamento text[] not null default array['dinheiro', 'credito', 'debito', 'pix'],
  mensagem_boas_vindas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  ordem integer not null default 0 check (ordem >= 0),
  ativa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table produtos (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid references categorias(id) on delete set null,
  nome text not null,
  descricao text,
  preco numeric(10,2) not null check (preco >= 0),
  foto_url text,
  disponivel boolean not null default true,
  destaque boolean not null default false,
  ordem integer not null default 0 check (ordem >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table pedidos (
  id uuid primary key default gen_random_uuid(),
  numero bigint generated always as identity unique,
  tipo order_kind_enum not null,
  mesa text,
  status order_status_enum not null default 'novo',
  cliente_nome text,
  cliente_telefone text,
  endereco_entrega jsonb,
  forma_pagamento text,
  financeiro_forma_pagamento text,
  financeiro_fechado_em timestamptz,
  financeiro_fechado_por text,
  troco_para numeric(10,2) check (troco_para is null or troco_para >= 0),
  observacao_geral text,
  total numeric(10,2) not null check (total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pedidos_table_number_required check (
    (tipo = 'mesa' and mesa is not null and btrim(mesa) <> '') or
    tipo <> 'mesa'
  )
);

create table pedido_itens (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos(id) on delete cascade,
  produto_id uuid references produtos(id) on delete set null,
  produto_nome text not null,
  produto_preco numeric(10,2) not null check (produto_preco >= 0),
  quantidade integer not null default 1 check (quantidade > 0),
  observacao text,
  subtotal numeric(10,2) not null check (subtotal >= 0),
  created_at timestamptz not null default now()
);

create table mesas (
  id uuid primary key default gen_random_uuid(),
  numero integer not null unique check (numero > 0),
  ativa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table mesa_contas (
  id uuid primary key default gen_random_uuid(),
  mesa text not null,
  status table_account_status_enum not null default 'fechada',
  pedido_ids uuid[] not null default '{}',
  total numeric(10,2) not null default 0 check (total >= 0),
  forma_pagamento text,
  fechada_por text,
  fechada_em timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table caixa_fechamentos (
  id uuid primary key default gen_random_uuid(),
  referencia_data date not null,
  total numeric(10,2) not null default 0 check (total >= 0),
  pedidos_count integer not null default 0 check (pedidos_count >= 0),
  mesas_count integer not null default 0 check (mesas_count >= 0),
  totais_por_pagamento jsonb not null default '[]'::jsonb,
  observacao text,
  fechado_por text,
  fechado_em timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table caixa_movimentacoes (
  id uuid primary key default gen_random_uuid(),
  referencia_data date not null,
  tipo cash_movement_type_enum not null,
  valor numeric(10,2) not null check (valor > 0),
  observacao text,
  created_at timestamptz not null default now()
);

create table printers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type printer_type_enum not null,
  destination printer_destination_enum not null,
  printer_name text,
  ip_address text,
  port integer not null default 9100 check (port > 0 and port <= 65535),
  is_active boolean not null default true,
  auto_print_on_accept boolean not null default true,
  copies integer not null default 1 check (copies > 0 and copies <= 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint printers_usb_requires_printer_name check (
    (type = 'usb' and printer_name is not null and btrim(printer_name) <> '') or
    type <> 'usb'
  ),
  constraint printers_network_requires_ip check (
    (type = 'network' and ip_address is not null and btrim(ip_address) <> '') or
    type <> 'network'
  )
);

create table order_settings (
  id uuid primary key default gen_random_uuid(),
  enable_table_orders boolean not null default true,
  enable_delivery_orders boolean not null default true,
  enable_manual_orders boolean not null default true,
  enable_step_accepted boolean not null default true,
  enable_step_preparing boolean not null default true,
  enable_step_delivery boolean not null default false,
  notifications_enabled boolean not null default true,
  alert_sound alert_sound_enum not null default 'Alerta 1',
  alert_frequency alert_frequency_enum not null default 'repeat_while_pending',
  alert_volume integer not null default 70 check (alert_volume between 0 and 100),
  auto_print_enabled boolean not null default false,
  auto_print_mode auto_print_mode_enum not null default 'single_printer',
  default_auto_print_printer_id uuid references printers(id) on delete set null,
  auto_print_trigger_status auto_print_trigger_status_enum not null default 'aceito',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table print_jobs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references pedidos(id) on delete set null,
  printer_id uuid references printers(id) on delete set null,
  destination printer_destination_enum not null,
  transport_type print_transport_type_enum not null,
  trigger_source print_trigger_source_enum not null,
  status print_job_status_enum not null default 'pending',
  attempt_count integer not null default 1 check (attempt_count > 0),
  error_message text,
  payload_preview text,
  created_at timestamptz not null default now(),
  printed_at timestamptz
);

create index idx_restaurante_config_aberto on restaurante_config(aberto);

create index idx_categorias_ordem on categorias(ordem);
create index idx_categorias_ativa_ordem on categorias(ativa, ordem);
create index idx_categorias_nome_lower on categorias((lower(nome)));

create index idx_produtos_categoria on produtos(categoria_id);
create index idx_produtos_categoria_disponivel_ordem on produtos(categoria_id, disponivel, ordem);
create index idx_produtos_disponivel_ordem on produtos(disponivel, ordem);
create index idx_produtos_destaque on produtos(destaque);
create index idx_produtos_created_at on produtos(created_at desc);
create index idx_produtos_nome_lower on produtos((lower(nome)));
create index idx_produtos_disponivel_destaque on produtos(disponivel, destaque);

create index idx_pedidos_status_created_at on pedidos(status, created_at desc);
create index idx_pedidos_tipo_created_at on pedidos(tipo, created_at desc);
create index idx_pedidos_created_at on pedidos(created_at desc);
create index idx_pedidos_mesa on pedidos(mesa) where mesa is not null;
create index idx_pedidos_financeiro_fechado_em on pedidos(financeiro_fechado_em desc);

create index idx_pedido_itens_pedido_id on pedido_itens(pedido_id);
create index idx_pedido_itens_produto_id on pedido_itens(produto_id);
create index idx_pedido_itens_created_at on pedido_itens(created_at desc);

create index idx_mesas_ativa on mesas(ativa);
create index idx_mesa_contas_mesa_fechada_em on mesa_contas(mesa, fechada_em desc);
create index idx_caixa_fechamentos_referencia on caixa_fechamentos(referencia_data desc);
create index idx_caixa_fechamentos_referencia_fechado on caixa_fechamentos(referencia_data, fechado_em desc);
create index idx_caixa_movimentacoes_referencia_created on caixa_movimentacoes(referencia_data, created_at desc);

create index idx_printers_destination_active on printers(destination, is_active);
create index idx_printers_auto_print on printers(auto_print_on_accept);
create index idx_printers_created_at on printers(created_at desc);

create unique index idx_order_settings_singleton on order_settings ((true));
create index idx_order_settings_created_at on order_settings(created_at desc);

create index idx_print_jobs_order_created on print_jobs(order_id, created_at desc);
create index idx_print_jobs_printer_created on print_jobs(printer_id, created_at desc);
create index idx_print_jobs_status_created on print_jobs(status, created_at desc);
create index idx_print_jobs_created_at on print_jobs(created_at desc);

create trigger restaurante_config_set_updated_at
before update on restaurante_config
for each row execute function set_updated_at();

create trigger categorias_set_updated_at
before update on categorias
for each row execute function set_updated_at();

create trigger produtos_set_updated_at
before update on produtos
for each row execute function set_updated_at();

create trigger pedidos_set_updated_at
before update on pedidos
for each row execute function set_updated_at();

create trigger mesas_set_updated_at
before update on mesas
for each row execute function set_updated_at();

create trigger printers_set_updated_at
before update on printers
for each row execute function set_updated_at();

create trigger order_settings_set_updated_at
before update on order_settings
for each row execute function set_updated_at();

grant usage on schema public to anon, authenticated, service_role;

grant select on restaurante_config to anon;
grant select on categorias to anon;
grant select on produtos to anon;
grant select on mesas to anon;
grant usage, select on all sequences in schema public to anon;

grant all privileges on all tables in schema public to authenticated;
grant all privileges on all sequences in schema public to authenticated;

grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;

alter default privileges in schema public grant select on tables to anon;
alter default privileges in schema public grant usage, select on sequences to anon;
alter default privileges in schema public grant all on tables to authenticated;
alter default privileges in schema public grant all on sequences to authenticated;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;

alter table restaurante_config enable row level security;
alter table categorias enable row level security;
alter table produtos enable row level security;
alter table pedidos enable row level security;
alter table pedido_itens enable row level security;
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
to public
using (true);

create policy "restaurante_config_manage_authenticated"
on restaurante_config
for all
to authenticated
using (true)
with check (true);

create policy "categorias_select_public"
on categorias
for select
to public
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
to public
using (true);

create policy "produtos_manage_authenticated"
on produtos
for all
to authenticated
using (true)
with check (true);

create policy "pedidos_manage_authenticated"
on pedidos
for all
to authenticated
using (true)
with check (true);

create policy "pedido_itens_manage_authenticated"
on pedido_itens
for all
to authenticated
using (true)
with check (true);

create policy "mesas_select_public"
on mesas
for select
to public
using (true);

create policy "mesas_manage_authenticated"
on mesas
for all
to authenticated
using (true)
with check (true);

create policy "mesa_contas_manage_authenticated"
on mesa_contas
for all
to authenticated
using (true)
with check (true);

create policy "caixa_fechamentos_manage_authenticated"
on caixa_fechamentos
for all
to authenticated
using (true)
with check (true);

create policy "caixa_movimentacoes_manage_authenticated"
on caixa_movimentacoes
for all
to authenticated
using (true)
with check (true);

create policy "printers_manage_authenticated"
on printers
for all
to authenticated
using (true)
with check (true);

create policy "order_settings_manage_authenticated"
on order_settings
for all
to authenticated
using (true)
with check (true);

create policy "print_jobs_manage_authenticated"
on print_jobs
for all
to authenticated
using (true)
with check (true);

do $$
begin
  begin
    alter publication supabase_realtime add table pedidos;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end;
$$;

do $$
begin
  begin
    alter publication supabase_realtime add table mesa_contas;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end;
$$;

do $$
begin
  begin
    alter publication supabase_realtime add table caixa_fechamentos;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end;
$$;

do $$
begin
  begin
    alter publication supabase_realtime add table caixa_movimentacoes;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end;
$$;
