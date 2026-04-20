-- Schema completo do Sistema Restaurante.
-- Este arquivo e o source of truth para reconstrucoes completas do banco.
-- Ultima atualizacao: 2026-04-10 (migration 007_production_hardening)
--
-- Historico de migrations aplicados:
--   001_initial.sql         — Schema base + RLS + grants
--   002_cash.sql            — Reservado (estruturas de caixa ja em 001)
--   003_printers.sql        — Reservado (estruturas de impressora ja em 001)
--   004_alert_sounds.sql    — Ampliacao do enum alert_sound_enum
--   005_order_public_token  — Endurecimento de acesso publico a pedidos
--   006_storage_hardening   — Politicas de storage para imagens de produto
--   007_production_hardening — Correcoes criticas, audit log, soft delete, indices

drop table if exists audit_log cascade;
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
drop function if exists fn_audit_log() cascade;
drop function if exists fn_cleanup_print_jobs(integer) cascade;

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
  -- Mantem a auditoria basica de alteracao sem repetir logica em cada tabela.
  new.updated_at = now();
  return new;
end;
$$;

-- Configuracao institucional exibida no cardapio, checkout e telas operacionais.
-- Singleton: apenas uma linha permitida (idx_restaurante_config_singleton).
create table restaurante_config (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  endereco text,
  telefone text,               -- Telefone fixo ou de contato geral
  whatsapp text,               -- Numero do WhatsApp operacional (ex: +55 64 99999-9999)
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

-- Categorias organizam o cardapio admin e a vitrine publica.
create table categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  ordem integer not null default 0 check (ordem >= 0),
  ativa boolean not null default true,
  deleted_at timestamptz,      -- Soft delete: NULL = ativa, NOT NULL = deletada
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Produtos publicados no cardapio. O checkout usa este cadastro como fonte de verdade
-- para nome, preco e disponibilidade.
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
  deleted_at timestamptz,      -- Soft delete: NULL = disponivel para exibicao, NOT NULL = removido
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Pedido e o agregado principal da operacao. Ele representa tanto mesa quanto delivery/retirada.
create table pedidos (
  id uuid primary key default gen_random_uuid(),
  numero bigint generated always as identity unique,
  tipo order_kind_enum not null,
  mesa text,                   -- Identificador textual da mesa (legado — manter para compatibilidade)
  mesa_numero integer,         -- FK para mesas.numero — constraint adicionada via ALTER TABLE apos criacao de mesas
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

-- Itens do pedido preservam um snapshot do produto no momento da compra,
-- para nao depender de futuras alteracoes no cadastro do cardapio.
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

-- Mesas ativas geram QR Codes e ajudam a controlar consumo presencial.
create table mesas (
  id uuid primary key default gen_random_uuid(),
  numero integer not null unique check (numero > 0),
  ativa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- FK de pedidos.mesa_numero para mesas.numero adicionada apos criacao de mesas
-- (pedidos e criado antes de mesas para preservar a ordem original do schema)
alter table pedidos
  add constraint pedidos_mesa_numero_fk
  foreign key (mesa_numero) references mesas(numero) on delete set null;

-- Mesa_contas registra o fechamento financeiro separado da conclusao operacional do pedido.
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

-- Fechamento consolidado do caixa por dia, usado em historico e auditoria operacional.
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

-- Sangrias e suprimentos alteram o saldo fisico esperado do caixa sem mudar faturamento.
create table caixa_movimentacoes (
  id uuid primary key default gen_random_uuid(),
  referencia_data date not null,
  tipo cash_movement_type_enum not null,
  valor numeric(10,2) not null check (valor > 0),
  observacao text,
  created_at timestamptz not null default now()
);

-- Cadastro de impressoras por destino operacional.
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
  alert_volume integer not null default 100 check (alert_volume between 0 and 100),
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

create unique index idx_restaurante_config_singleton on restaurante_config ((true));
create index idx_restaurante_config_aberto on restaurante_config(aberto);

create index idx_categorias_ordem on categorias(ordem);
create index idx_categorias_ativa_ordem on categorias(ativa, ordem);
create index idx_categorias_nome_lower on categorias((lower(nome)));
create index idx_categorias_not_deleted on categorias(ordem) where deleted_at is null;

create index idx_produtos_categoria on produtos(categoria_id);
create index idx_produtos_categoria_disponivel_ordem on produtos(categoria_id, disponivel, ordem);
create index idx_produtos_disponivel_ordem on produtos(disponivel, ordem);
create index idx_produtos_destaque on produtos(destaque);
create index idx_produtos_created_at on produtos(created_at desc);
create index idx_produtos_nome_lower on produtos((lower(nome)));
create index idx_produtos_disponivel_destaque on produtos(disponivel, destaque);
create index idx_produtos_not_deleted on produtos(categoria_id, disponivel, ordem) where deleted_at is null;

create index idx_pedidos_status_created_at on pedidos(status, created_at desc);
create index idx_pedidos_status_tipo_created on pedidos(status, tipo, created_at desc);
create index idx_pedidos_ativos on pedidos(status, created_at desc) where status not in ('concluido', 'cancelado');
create index idx_pedidos_tipo_created_at on pedidos(tipo, created_at desc);
create index idx_pedidos_created_at on pedidos(created_at desc);
create index idx_pedidos_mesa on pedidos(mesa) where mesa is not null;
create index idx_pedidos_mesa_numero on pedidos(mesa_numero) where mesa_numero is not null;
create index idx_pedidos_financeiro_fechado_em on pedidos(financeiro_fechado_em desc);

create index idx_pedido_itens_pedido_id on pedido_itens(pedido_id);
create index idx_pedido_itens_produto_id on pedido_itens(produto_id);
create index idx_pedido_itens_created_at on pedido_itens(created_at desc);

create index idx_mesas_ativa on mesas(ativa);
create index idx_mesa_contas_mesa_fechada_em on mesa_contas(mesa, fechada_em desc);
create unique index idx_caixa_fechamentos_referencia_unique on caixa_fechamentos(referencia_data);
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

-- Trilha de auditoria para operacoes criticas em pedidos, produtos e configuracoes.
create table audit_log (
  id           uuid primary key default gen_random_uuid(),
  tabela       text not null,
  operacao     text not null check (operacao in ('INSERT', 'UPDATE', 'DELETE')),
  registro_id  uuid,
  dados_antes  jsonb,
  dados_depois jsonb,
  usuario_id   uuid,
  usuario_email text,
  ip_address   inet,
  created_at   timestamptz not null default now()
);

create index idx_audit_log_tabela_created on audit_log(tabela, created_at desc);
create index idx_audit_log_registro on audit_log(registro_id, tabela, created_at desc);
create index idx_audit_log_usuario on audit_log(usuario_id, created_at desc);

create or replace function fn_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record_id uuid;
  v_before    jsonb;
  v_after     jsonb;
  v_user_id   uuid;
  v_user_email text;
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

  -- Auditoria nao bloqueia operacao original caso falhe
  begin
    insert into audit_log(tabela, operacao, registro_id, dados_antes, dados_depois, usuario_id, usuario_email)
    values (TG_TABLE_NAME, TG_OP, v_record_id, v_before, v_after, v_user_id, v_user_email);
  exception
    when others then null;
  end;

  if TG_OP = 'DELETE' then return OLD; end if;
  return NEW;
end;
$$;

create trigger audit_pedidos
  after insert or update or delete on pedidos
  for each row execute function fn_audit_log();

create trigger audit_produtos
  after insert or update or delete on produtos
  for each row execute function fn_audit_log();

create trigger audit_categorias
  after insert or update or delete on categorias
  for each row execute function fn_audit_log();

create trigger audit_restaurante_config
  after insert or update or delete on restaurante_config
  for each row execute function fn_audit_log();

grant usage on schema public to anon, authenticated, service_role;

grant select on restaurante_config to anon;
grant select on categorias to anon;
grant select on produtos to anon;
grant select on mesas to anon;

grant all privileges on all tables in schema public to authenticated;
grant all privileges on all sequences in schema public to authenticated;

grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;

-- Garantir que tabelas futuras NAO sejam acessiveis por anon por padrao.
-- (Correge a grant erronea de 001_initial.sql que fazia grant select to anon)
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on functions from anon;
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

alter table audit_log enable row level security;

create policy "audit_log_manage_authenticated"
on audit_log
for all
to authenticated
using (true)
with check (true);

-- O acompanhamento publico de pedido agora depende exclusivamente da API server-side
-- com token assinado. O banco nao deve expor leitura ou escrita anonima de pedidos.
revoke select, insert on pedidos from anon;
revoke select, insert on pedido_itens from anon;

-- Funcao de retencao: limpa print_jobs resolvidos com mais de N dias (padrao 90).
-- Invocar periodicamente: SELECT fn_cleanup_print_jobs();
create or replace function fn_cleanup_print_jobs(retention_days integer default 90)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  delete from print_jobs
  where status in ('success', 'failed')
    and created_at < now() - (retention_days || ' days')::interval;
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

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

-- Storage minimo para imagens de produto.
-- Mantemos leitura publica apenas do bucket necessario e upload restrito ao autenticado.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'produtos',
  'produtos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "produtos_public_read" on storage.objects;
drop policy if exists "produtos_authenticated_insert" on storage.objects;
drop policy if exists "produtos_authenticated_update" on storage.objects;
drop policy if exists "produtos_authenticated_delete" on storage.objects;

create policy "produtos_public_read"
on storage.objects
for select
to public
using (bucket_id = 'produtos');

create policy "produtos_authenticated_insert"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'produtos');

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
